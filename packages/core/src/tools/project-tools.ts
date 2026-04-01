/**
 * Project Management Tools — Task creation, status, handoffs, deliverables.
 *
 * Tools: create_task, get_project_status, request_handoff, list_deliverables, read_deliverables
 */

import type { ToolRegistry } from './index';

export function registerProjectTools(registry: ToolRegistry): void {
  // --- create_task ---
  registry.register(
    {
      name: 'create_task',
      description:
        'Create a new task and optionally assign it to a specialist agent. ' +
        'Use to break down work into actionable items. Only PM and review agents (QA, auditor) should create tasks.',
      input_schema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Short task title' },
          description: { type: 'string', description: 'Detailed task description with requirements' },
          assignee: {
            type: 'string',
            description: 'Agent ID to assign (e.g., "ui-developer", "backend-developer"). Leave empty if unassigned.',
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
            description: 'Task priority. Defaults to "medium".',
          },
          dependencies: {
            type: 'array',
            items: { type: 'string' },
            description: 'Task IDs that must complete before this task can start.',
          },
        },
        required: ['title', 'description'],
      },
    },
    async (input, context) => {
      const { nanoid } = await import('nanoid');
      const { events } = await import('../events');

      const taskId = nanoid();
      const task = {
        id: taskId,
        projectId: context.projectId || 'unknown',
        title: input.title as string,
        description: input.description as string,
        assignee: input.assignee as string | undefined,
        priority: (input.priority as string) || 'medium',
        dependencies: (input.dependencies as string[]) || [],
      };

      // Emit task.created event
      events.taskCreated(context.agentId, task.projectId, task);

      // If assigned, also emit task.assigned
      if (task.assignee) {
        events.taskAssigned(
          context.agentId,
          task.assignee as any,
          task.projectId,
          taskId
        );
      }

      return {
        content: `Task created: ${taskId}\nTitle: ${task.title}\nAssigned to: ${task.assignee || 'unassigned'}\nPriority: ${task.priority}`,
      };
    }
  );

  // --- get_project_status ---
  registry.register(
    {
      name: 'get_project_status',
      description:
        'Get the current status of the project including tasks, deliverables, and agent activity. ' +
        'Use to understand project progress before making coordination decisions.',
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
          return { content: 'No project ID in context. Cannot retrieve status.', isError: true };
        }

        // Get recent events for this project
        const recentEvents = bus.getEvents({
          projectId,
          limit: 20,
        });

        if (recentEvents.length === 0) {
          return { content: `Project ${projectId}: No events recorded yet.` };
        }

        const summary = recentEvents
          .map((e) => `[${e.type}] ${e.source}${e.target ? ` → ${e.target}` : ''}: ${JSON.stringify(e.payload)}`)
          .join('\n');

        return { content: `Project ${projectId} — Recent activity:\n\n${summary}` };
      } catch (error) {
        return {
          content: `Failed to get status: ${error instanceof Error ? error.message : String(error)}`,
          isError: true,
        };
      }
    }
  );

  // --- request_handoff ---
  registry.register(
    {
      name: 'request_handoff',
      description:
        'Request a handoff to another specialist agent. Includes a context summary of what has been discussed ' +
        'and what the next agent needs to know. Only the PM agent should use this tool.',
      input_schema: {
        type: 'object',
        properties: {
          targetAgent: {
            type: 'string',
            description: 'Agent ID to hand off to (e.g., "ui-developer")',
          },
          contextSummary: {
            type: 'string',
            description: 'Summary of relevant context, decisions, and requirements for the target agent',
          },
          taskDescription: {
            type: 'string',
            description: 'What the target agent should do',
          },
        },
        required: ['targetAgent', 'contextSummary', 'taskDescription'],
      },
    },
    async (input, context) => {
      const { events } = await import('../events');

      const targetAgent = input.targetAgent as string;
      const contextSummary = input.contextSummary as string;
      const taskDescription = input.taskDescription as string;

      events.messageSent(
        context.agentId,
        targetAgent as any,
        JSON.stringify({ type: 'handoff', contextSummary, taskDescription }),
        context.projectId
      );

      return {
        content: `Handoff requested to ${targetAgent}.\nContext: ${contextSummary.substring(0, 100)}...\nTask: ${taskDescription.substring(0, 100)}...`,
      };
    }
  );

  // --- list_deliverables ---
  registry.register(
    {
      name: 'list_deliverables',
      description:
        'List all deliverables produced so far in the project. ' +
        'Shows type, title, producing agent, and creation date.',
      input_schema: {
        type: 'object',
        properties: {
          producedBy: {
            type: 'string',
            description: 'Filter by producing agent ID. Leave empty for all agents.',
          },
        },
      },
    },
    async (input, context) => {
      try {
        const { getEventBus } = await import('../events');
        const bus = getEventBus();

        // Get artifact.produced events for this project
        const artifactEvents = bus.getEvents({
          type: 'artifact.produced',
          projectId: context.projectId,
          limit: 50,
        });

        if (artifactEvents.length === 0) {
          return { content: 'No deliverables produced yet.' };
        }

        const producedBy = input.producedBy as string | undefined;
        const filtered = producedBy
          ? artifactEvents.filter((e) => e.source === producedBy)
          : artifactEvents;

        const listing = filtered
          .map((e) => {
            const p = e.payload as Record<string, unknown>;
            return `- [${p.type || 'unknown'}] ${p.path || p.description || 'untitled'} (by ${e.source})`;
          })
          .join('\n');

        return { content: `Deliverables (${filtered.length}):\n\n${listing}` };
      } catch (error) {
        return {
          content: `Failed to list deliverables: ${error instanceof Error ? error.message : String(error)}`,
          isError: true,
        };
      }
    }
  );

  // --- read_deliverables ---
  registry.register(
    {
      name: 'read_deliverables',
      description:
        'Read the content of specific deliverables (documents, designs, reports). ' +
        'Use to review work produced by other agents before building on it.',
      input_schema: {
        type: 'object',
        properties: {
          deliverableId: {
            type: 'string',
            description: 'The deliverable ID to read. Get IDs from list_deliverables.',
          },
        },
        required: ['deliverableId'],
      },
    },
    async (input, _context) => {
      // For now, deliverables stored in events don't have full content.
      // This will be enhanced when deliverable persistence is integrated.
      const deliverableId = input.deliverableId as string;
      return {
        content: `Deliverable ${deliverableId}: Content retrieval not yet implemented. Use github_read_files to read committed artifacts.`,
        isError: false,
      };
    }
  );
}
