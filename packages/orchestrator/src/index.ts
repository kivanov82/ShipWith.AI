// Orchestrator - Coordinates agent workflows
import { nanoid } from 'nanoid';
import type { Task, Project, AgentId, AgentEvent } from '@agentverse/core';
import { getEventBus, events } from '@agentverse/core';

export interface WorkflowStep {
  id: string;
  agentId: AgentId;
  task: string;
  dependencies: string[];
  status: 'pending' | 'ready' | 'running' | 'completed' | 'failed';
}

export interface Workflow {
  id: string;
  projectId: string;
  steps: WorkflowStep[];
  status: 'planning' | 'running' | 'completed' | 'failed';
}

export class Orchestrator {
  private workflows: Map<string, Workflow> = new Map();
  private eventBus = getEventBus();

  constructor() {
    // Subscribe to task completion events
    this.eventBus.subscribe((event) => {
      if (event.type === 'task.completed') {
        this.handleTaskCompleted(event);
      }
    });
  }

  // Create a new workflow from a project plan
  createWorkflow(projectId: string, steps: Omit<WorkflowStep, 'id' | 'status'>[]): Workflow {
    const workflow: Workflow = {
      id: `wf_${nanoid()}`,
      projectId,
      steps: steps.map((step) => ({
        ...step,
        id: `step_${nanoid()}`,
        status: 'pending',
      })),
      status: 'planning',
    };

    // Mark steps with no dependencies as ready
    workflow.steps.forEach((step) => {
      if (step.dependencies.length === 0) {
        step.status = 'ready';
      }
    });

    this.workflows.set(workflow.id, workflow);
    return workflow;
  }

  // Start executing a workflow
  async startWorkflow(workflowId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) throw new Error(`Workflow ${workflowId} not found`);

    workflow.status = 'running';

    // Execute all ready steps
    const readySteps = workflow.steps.filter((s) => s.status === 'ready');
    for (const step of readySteps) {
      await this.executeStep(workflow, step);
    }
  }

  private async executeStep(workflow: Workflow, step: WorkflowStep): Promise<void> {
    step.status = 'running';

    // Emit task assignment event
    events.taskAssigned('pm', step.agentId, workflow.projectId, step.id);

    // The actual agent invocation happens externally
    // This orchestrator just tracks state
  }

  private handleTaskCompleted(event: AgentEvent): void {
    const { projectId, payload } = event;
    const taskId = payload.taskId as string;

    // Find the workflow for this project
    const workflow = Array.from(this.workflows.values()).find(
      (w) => w.projectId === projectId
    );

    if (!workflow) return;

    // Mark the step as completed
    const step = workflow.steps.find((s) => s.id === taskId);
    if (step) {
      step.status = 'completed';
    }

    // Check if any blocked steps are now ready
    workflow.steps.forEach((s) => {
      if (s.status === 'pending') {
        const allDepsCompleted = s.dependencies.every((depId) => {
          const dep = workflow.steps.find((d) => d.id === depId);
          return dep?.status === 'completed';
        });

        if (allDepsCompleted) {
          s.status = 'ready';
          // Auto-execute the step
          this.executeStep(workflow, s);
        }
      }
    });

    // Check if workflow is complete
    const allCompleted = workflow.steps.every((s) => s.status === 'completed');
    if (allCompleted) {
      workflow.status = 'completed';
    }
  }

  getWorkflow(workflowId: string): Workflow | undefined {
    return this.workflows.get(workflowId);
  }

  getProjectWorkflows(projectId: string): Workflow[] {
    return Array.from(this.workflows.values()).filter(
      (w) => w.projectId === projectId
    );
  }
}

// Singleton instance
let orchestratorInstance: Orchestrator | null = null;

export function getOrchestrator(): Orchestrator {
  if (!orchestratorInstance) {
    orchestratorInstance = new Orchestrator();
  }
  return orchestratorInstance;
}

// Standard workflow templates
export const workflowTemplates = {
  // Full web3 frontend project pipeline
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

  // Web3 frontend app (no smart contracts)
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

  // Frontend-only project
  frontendOnly: [
    { agentId: 'ui-designer' as AgentId, task: 'Create visual designs', dependencies: [] },
    { agentId: 'ui-developer' as AgentId, task: 'Build frontend components', dependencies: ['ui-designer'] },
    { agentId: 'unit-tester' as AgentId, task: 'Write tests', dependencies: ['ui-developer'] },
    { agentId: 'qa-tester' as AgentId, task: 'QA testing', dependencies: ['unit-tester'] },
  ],

  // Smart contract only
  contractOnly: [
    { agentId: 'solidity-developer' as AgentId, task: 'Write smart contracts', dependencies: [] },
    { agentId: 'unit-tester' as AgentId, task: 'Write contract tests', dependencies: ['solidity-developer'] },
    { agentId: 'solidity-auditor' as AgentId, task: 'Security audit', dependencies: ['unit-tester'] },
    { agentId: 'tech-writer' as AgentId, task: 'Write documentation', dependencies: ['solidity-auditor'] },
  ],
};
