// Orchestrator - Coordinates agent workflows with error handling and persistence
import { nanoid } from 'nanoid';
import type { AgentId, AgentEvent } from '@shipwithai/core';
import { getEventBus, events } from '@shipwithai/core';

export interface WorkflowStep {
  id: string;
  agentId: AgentId;
  alternativeAgentIds?: AgentId[];
  task: string;
  taskInput?: Record<string, unknown>;
  dependencies: string[];
  status: 'pending' | 'ready' | 'running' | 'completed' | 'failed' | 'skipped' | 'escalated';
  retryCount: number;
  maxRetries: number;
  error?: string;
  result?: Record<string, unknown>;
  startedAt?: number;
  completedAt?: number;
}

export interface Workflow {
  id: string;
  projectId: string;
  steps: WorkflowStep[];
  status: 'planning' | 'running' | 'completed' | 'failed' | 'partial';
  createdAt: number;
  updatedAt: number;
}

// Persistence interface — implemented by project-store and firestore-store
export interface WorkflowStore {
  saveWorkflow(workflow: Workflow): Promise<void>;
  getWorkflow(workflowId: string): Promise<Workflow | null>;
  updateWorkflowStep(workflowId: string, stepId: string, updates: Partial<WorkflowStep>): Promise<void>;
  updateWorkflowStatus(workflowId: string, status: Workflow['status']): Promise<void>;
  listWorkflows(projectId: string): Promise<Workflow[]>;
  listRunningWorkflows(): Promise<Workflow[]>;
}

export class Orchestrator {
  private workflows: Map<string, Workflow> = new Map();
  private eventBus = getEventBus();
  private store?: WorkflowStore;
  private retryTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(store?: WorkflowStore) {
    this.store = store;

    // Subscribe to task events
    this.eventBus.subscribe((event) => {
      if (event.type === 'task.completed') {
        this.handleTaskCompleted(event);
      } else if (event.type === 'task.failed') {
        this.handleTaskFailed(event);
      }
    });
  }

  /**
   * Recover workflows from persistence on startup.
   */
  async recoverWorkflows(): Promise<number> {
    if (!this.store) return 0;

    const running = await this.store.listRunningWorkflows();
    for (const workflow of running) {
      this.workflows.set(workflow.id, workflow);

      // Re-execute any steps that were 'ready' but not yet running
      const readySteps = workflow.steps.filter((s) => s.status === 'ready');
      for (const step of readySteps) {
        this.executeStep(workflow, step);
      }
    }
    return running.length;
  }

  /**
   * Create a workflow from step definitions.
   */
  async createWorkflow(
    projectId: string,
    steps: Array<Omit<WorkflowStep, 'id' | 'status' | 'retryCount' | 'maxRetries'> & { maxRetries?: number }>
  ): Promise<Workflow> {
    const now = Date.now();
    const workflow: Workflow = {
      id: `wf_${nanoid()}`,
      projectId,
      steps: steps.map((step) => ({
        ...step,
        id: `step_${nanoid()}`,
        status: 'pending' as const,
        retryCount: 0,
        maxRetries: step.maxRetries ?? 2,
      })),
      status: 'planning',
      createdAt: now,
      updatedAt: now,
    };

    // Mark steps with no dependencies as ready
    for (const step of workflow.steps) {
      if (step.dependencies.length === 0) {
        step.status = 'ready';
      }
    }

    this.workflows.set(workflow.id, workflow);
    await this.persistWorkflow(workflow);
    return workflow;
  }

  /**
   * Start executing a workflow — runs all ready steps.
   */
  async startWorkflow(workflowId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) throw new Error(`Workflow ${workflowId} not found`);

    workflow.status = 'running';
    workflow.updatedAt = Date.now();
    await this.persistWorkflow(workflow);

    const readySteps = workflow.steps.filter((s) => s.status === 'ready');
    for (const step of readySteps) {
      this.executeStep(workflow, step);
    }
  }

  private async executeStep(workflow: Workflow, step: WorkflowStep): Promise<void> {
    step.status = 'running';
    step.startedAt = Date.now();
    workflow.updatedAt = Date.now();

    // Emit task assignment event
    events.taskAssigned('pm', step.agentId, workflow.projectId, step.id);

    await this.persistWorkflow(workflow);
  }

  /**
   * Handle successful task completion.
   */
  private async handleTaskCompleted(event: AgentEvent): Promise<void> {
    const { projectId, payload } = event;
    const taskId = payload.taskId as string;
    const result = payload.result as Record<string, unknown> | undefined;

    const workflow = this.findWorkflowByProject(projectId);
    if (!workflow) return;

    const step = workflow.steps.find((s) => s.id === taskId);
    if (step) {
      step.status = 'completed';
      step.completedAt = Date.now();
      step.result = result;
    }

    // Unblock dependent steps
    await this.checkAndExecuteReady(workflow);

    // Check if workflow is done
    await this.checkWorkflowCompletion(workflow);
  }

  /**
   * Handle task failure with retry, reroute, and escalation logic.
   */
  private async handleTaskFailed(event: AgentEvent): Promise<void> {
    const { projectId, payload } = event;
    const taskId = payload.taskId as string;
    const error = payload.error as string;

    const workflow = this.findWorkflowByProject(projectId);
    if (!workflow) return;

    const step = workflow.steps.find((s) => s.id === taskId);
    if (!step) return;

    step.error = error;
    step.retryCount++;

    // Strategy 1: Retry with exponential backoff
    if (step.retryCount <= step.maxRetries) {
      const delayMs = 1000 * Math.pow(2, step.retryCount - 1); // 1s, 2s, 4s
      step.status = 'ready';

      events.taskRetrying(step.agentId, workflow.projectId, step.id, step.retryCount, step.maxRetries);

      const timer = setTimeout(() => {
        this.executeStep(workflow, step);
        this.retryTimers.delete(step.id);
      }, delayMs);
      this.retryTimers.set(step.id, timer);

      await this.persistWorkflow(workflow);
      return;
    }

    // Strategy 2: Reroute to alternative agent
    if (step.alternativeAgentIds && step.alternativeAgentIds.length > 0) {
      const nextAgent = step.alternativeAgentIds.shift()!;
      step.agentId = nextAgent;
      step.retryCount = 0;
      step.status = 'ready';
      step.error = `Rerouted from previous agent. Original error: ${error}`;

      await this.executeStep(workflow, step);
      await this.persistWorkflow(workflow);
      return;
    }

    // Strategy 3: Mark as failed, skip dependents, escalate
    step.status = 'failed';

    // Skip dependent steps
    for (const depStep of workflow.steps) {
      if (depStep.dependencies.includes(step.id) && depStep.status === 'pending') {
        depStep.status = 'skipped';
        depStep.error = `Skipped: dependency "${step.task}" failed`;
      }
    }

    events.taskEscalated(step.agentId, workflow.projectId, step.id, `All retries and alternatives exhausted. Error: ${error}`);

    // Check if non-dependent steps can still proceed
    await this.checkAndExecuteReady(workflow);
    await this.checkWorkflowCompletion(workflow);
    await this.persistWorkflow(workflow);
  }

  /**
   * Check if any pending steps have all dependencies met and execute them.
   */
  private async checkAndExecuteReady(workflow: Workflow): Promise<void> {
    for (const step of workflow.steps) {
      if (step.status !== 'pending') continue;

      const allDepsResolved = step.dependencies.every((depId) => {
        const dep = workflow.steps.find((d) => d.id === depId);
        return dep && (dep.status === 'completed' || dep.status === 'skipped');
      });

      if (allDepsResolved) {
        // Only execute if all required deps completed (not skipped)
        const anyDepFailed = step.dependencies.some((depId) => {
          const dep = workflow.steps.find((d) => d.id === depId);
          return dep?.status === 'skipped' || dep?.status === 'failed';
        });

        if (anyDepFailed) {
          step.status = 'skipped';
          step.error = 'Skipped: one or more dependencies failed';
        } else {
          step.status = 'ready';
          await this.executeStep(workflow, step);
        }
      }
    }
  }

  /**
   * Check if workflow is complete (all steps resolved) and set final status.
   */
  private async checkWorkflowCompletion(workflow: Workflow): Promise<void> {
    const terminal = ['completed', 'failed', 'skipped', 'escalated'];
    const allResolved = workflow.steps.every((s) => terminal.includes(s.status));

    if (!allResolved) return;

    const allCompleted = workflow.steps.every((s) => s.status === 'completed');
    const anyFailed = workflow.steps.some((s) => s.status === 'failed' || s.status === 'skipped');

    if (allCompleted) {
      workflow.status = 'completed';
    } else if (anyFailed) {
      const someCompleted = workflow.steps.some((s) => s.status === 'completed');
      workflow.status = someCompleted ? 'partial' : 'failed';
    }

    workflow.updatedAt = Date.now();
    await this.persistWorkflow(workflow);
  }

  /**
   * Persist workflow to store if available.
   */
  private async persistWorkflow(workflow: Workflow): Promise<void> {
    if (this.store) {
      await this.store.saveWorkflow(workflow);
    }
  }

  private findWorkflowByProject(projectId?: string): Workflow | undefined {
    if (!projectId) return undefined;
    return Array.from(this.workflows.values()).find((w) => w.projectId === projectId);
  }

  // --- Public API ---

  getWorkflow(workflowId: string): Workflow | undefined {
    return this.workflows.get(workflowId);
  }

  getProjectWorkflows(projectId: string): Workflow[] {
    return Array.from(this.workflows.values()).filter((w) => w.projectId === projectId);
  }

  /**
   * Clean up timers on shutdown.
   */
  destroy(): void {
    for (const timer of this.retryTimers.values()) {
      clearTimeout(timer);
    }
    this.retryTimers.clear();
  }
}

// Singleton instance
let orchestratorInstance: Orchestrator | null = null;

export function getOrchestrator(store?: WorkflowStore): Orchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new Orchestrator(store);
  }
  return orchestratorInstance;
}

// Standard workflow templates (kept as defaults, PM can create custom via tools)
export const workflowTemplates = {
  fullProject: [
    { agentId: 'ux-analyst' as AgentId, task: 'Research and create user flows', dependencies: [] },
    { agentId: 'ui-designer' as AgentId, task: 'Create visual designs', dependencies: ['ux-analyst'] },
    { agentId: 'ui-developer' as AgentId, task: 'Build frontend components', dependencies: ['ui-designer'] },
    { agentId: 'backend-developer' as AgentId, task: 'Set up API integrations and data fetching', dependencies: ['ux-analyst'] },
    { agentId: 'solidity-developer' as AgentId, task: 'Write smart contracts', dependencies: ['ux-analyst'] },
    { agentId: 'solidity-auditor' as AgentId, task: 'Audit smart contracts', dependencies: ['solidity-developer'] },
    { agentId: 'unit-tester' as AgentId, task: 'Write unit tests', dependencies: ['ui-developer', 'backend-developer', 'solidity-developer'] },
    { agentId: 'qa-tester' as AgentId, task: 'End-to-end testing', dependencies: ['unit-tester'] },
    { agentId: 'infrastructure' as AgentId, task: 'Set up deployment', dependencies: ['qa-tester', 'solidity-auditor'] },
    { agentId: 'tech-writer' as AgentId, task: 'Write documentation', dependencies: ['infrastructure'] },
  ],
  web3Frontend: [
    { agentId: 'ux-analyst' as AgentId, task: 'Research and create user flows', dependencies: [] },
    { agentId: 'ui-designer' as AgentId, task: 'Create visual designs', dependencies: ['ux-analyst'] },
    { agentId: 'ui-developer' as AgentId, task: 'Build frontend with wallet integration', dependencies: ['ui-designer'] },
    { agentId: 'backend-developer' as AgentId, task: 'Set up API routes and data fetching', dependencies: ['ui-designer'] },
    { agentId: 'unit-tester' as AgentId, task: 'Write unit tests', dependencies: ['ui-developer', 'backend-developer'] },
    { agentId: 'qa-tester' as AgentId, task: 'End-to-end testing', dependencies: ['unit-tester'] },
    { agentId: 'marketing' as AgentId, task: 'Create launch content', dependencies: ['ui-developer'] },
    { agentId: 'tech-writer' as AgentId, task: 'Write documentation', dependencies: ['qa-tester'] },
  ],
  frontendOnly: [
    { agentId: 'ui-designer' as AgentId, task: 'Create visual designs', dependencies: [] },
    { agentId: 'ui-developer' as AgentId, task: 'Build frontend components', dependencies: ['ui-designer'] },
    { agentId: 'unit-tester' as AgentId, task: 'Write tests', dependencies: ['ui-developer'] },
    { agentId: 'qa-tester' as AgentId, task: 'QA testing', dependencies: ['unit-tester'] },
  ],
  contractOnly: [
    { agentId: 'solidity-developer' as AgentId, task: 'Write smart contracts', dependencies: [] },
    { agentId: 'unit-tester' as AgentId, task: 'Write contract tests', dependencies: ['solidity-developer'] },
    { agentId: 'solidity-auditor' as AgentId, task: 'Security audit', dependencies: ['unit-tester'] },
    { agentId: 'tech-writer' as AgentId, task: 'Write documentation', dependencies: ['solidity-auditor'] },
  ],
};
