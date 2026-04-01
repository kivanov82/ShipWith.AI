/**
 * Orchestration Tools — PM agent uses these to create and manage workflows dynamically.
 *
 * Tools: create_workflow, get_workflow_status
 *
 * These replace the hardcoded workflow templates — the PM agent now decides
 * the task graph based on discovery conversations with the user.
 */

import type { ToolRegistry } from './index';
import type { AgentId } from '../types';

export function registerOrchestrationTools(registry: ToolRegistry): void {
  // --- create_workflow ---
  registry.register(
    {
      name: 'create_workflow',
      description:
        'Create a structured workflow with tasks assigned to specialist agents. ' +
        'Use after gathering enough requirements from the user. ' +
        'Define steps with dependencies to create a task graph. ' +
        'Each step should include explicit inputs for the assigned agent.',
      input_schema: {
        type: 'object',
        properties: {
          steps: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                agentId: {
                  type: 'string',
                  description: 'Agent ID to assign (e.g., "ui-developer", "backend-developer")',
                },
                task: {
                  type: 'string',
                  description: 'Clear task description for the agent',
                },
                taskInput: {
                  type: 'object',
                  description: 'Explicit inputs for the agent — requirements, specs, context from discovery. Only include what this specific agent needs.',
                },
                dependencies: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Agent IDs of steps that must complete first (e.g., ["ui-designer"]). Use agent IDs, not step IDs.',
                },
                alternativeAgents: {
                  type: 'array',
                  items: { type: 'string' },
                  description: 'Fallback agent IDs if the primary agent fails. Optional.',
                },
              },
              required: ['agentId', 'task'],
            },
            description: 'List of workflow steps forming a task graph',
          },
        },
        required: ['steps'],
      },
    },
    async (input, context) => {
      try {
        const { events } = await import('../events');
        const { nanoid } = await import('nanoid');

        const steps = input.steps as Array<{
          agentId: string;
          task: string;
          taskInput?: Record<string, unknown>;
          dependencies?: string[];
          alternativeAgents?: string[];
        }>;

        const workflowId = `wf_${nanoid()}`;
        const projectId = context.projectId || 'unknown';

        // Map agent ID dependencies to step IDs
        const stepMap = new Map<string, string>();
        const builtSteps = steps.map((s) => {
          const stepId = `step_${nanoid()}`;
          stepMap.set(s.agentId, stepId);
          return { ...s, id: stepId };
        });

        // Resolve dependencies from agent IDs to step IDs
        const resolvedSteps = builtSteps.map((s) => ({
          id: s.id,
          agentId: s.agentId,
          task: s.task,
          taskInput: s.taskInput,
          dependencies: (s.dependencies || [])
            .map((dep) => stepMap.get(dep))
            .filter((id): id is string => id !== undefined),
          alternativeAgentIds: s.alternativeAgents as AgentId[] | undefined,
        }));

        // Emit workflow creation event
        events.taskCreated(context.agentId, projectId, {
          id: workflowId,
          type: 'workflow',
          steps: resolvedSteps,
        } as any);

        const stepSummary = resolvedSteps
          .map((s) => `  - ${s.agentId}: ${s.task}${s.dependencies.length > 0 ? ` (after: ${steps.find((orig) => stepMap.get(orig.agentId) === s.dependencies[0])?.agentId || 'unknown'})` : ''}`)
          .join('\n');

        return {
          content: `Workflow ${workflowId} created with ${resolvedSteps.length} steps:\n\n${stepSummary}\n\nThe orchestrator will coordinate execution.`,
        };
      } catch (error) {
        return {
          content: `Failed to create workflow: ${error instanceof Error ? error.message : String(error)}`,
          isError: true,
        };
      }
    }
  );

  // --- get_workflow_status ---
  registry.register(
    {
      name: 'get_workflow_status',
      description:
        'Get the current status of all workflows for this project. ' +
        'Shows each step with its agent, status, and any errors.',
      input_schema: {
        type: 'object',
        properties: {},
      },
    },
    async (_input, context) => {
      try {
        const { getEventBus } = await import('../events');
        const bus = getEventBus();
        const projectId = context.projectId;

        if (!projectId) {
          return { content: 'No project ID in context.', isError: true };
        }

        // Get workflow-related events
        const workflowEvents = bus.getEvents({
          projectId,
          limit: 50,
        });

        const taskEvents = workflowEvents.filter((e) =>
          e.type.startsWith('task.') || e.type.startsWith('workflow.')
        );

        if (taskEvents.length === 0) {
          return { content: 'No workflow activity yet for this project.' };
        }

        const summary = taskEvents
          .map((e) => {
            const p = e.payload as Record<string, unknown>;
            return `[${e.type}] ${e.source}${e.target ? ` → ${e.target}` : ''}: ${p.taskId || p.error || JSON.stringify(p).substring(0, 80)}`;
          })
          .join('\n');

        return { content: `Workflow status for ${projectId}:\n\n${summary}` };
      } catch (error) {
        return {
          content: `Failed to get workflow status: ${error instanceof Error ? error.message : String(error)}`,
          isError: true,
        };
      }
    }
  );
}
