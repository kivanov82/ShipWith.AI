/**
 * Output Tools — Structured output schemas that agents are forced to call via tool_choice.
 *
 * These tools define the output format for different agent types.
 * When invoked in "job" mode, agents must call their designated output tool,
 * ensuring consistent structured output.
 *
 * Tools: submit_deliverable, submit_plan, submit_audit_report, submit_test_report
 */

import type { ToolRegistry } from './index';

export function registerOutputTools(registry: ToolRegistry): void {
  // --- submit_deliverable ---
  registry.register(
    {
      name: 'submit_deliverable',
      description:
        'Submit your completed work as a structured deliverable. You MUST call this tool when your work is done. ' +
        'Include all artifacts produced, any blockers encountered, and suggested next steps.',
      input_schema: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['completed', 'in_progress', 'blocked', 'failed'],
            description: 'Current status of the deliverable',
          },
          summary: {
            type: 'string',
            description: 'Brief summary of what was done (1-3 sentences)',
          },
          artifacts: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'File path relative to project root' },
                type: { type: 'string', enum: ['code', 'document', 'design', 'config', 'test'] },
                description: { type: 'string', description: 'What this artifact is' },
              },
              required: ['path', 'type', 'description'],
            },
            description: 'List of artifacts produced',
          },
          blockers: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of things blocking progress. Empty if none.',
          },
          nextSteps: {
            type: 'array',
            items: { type: 'string' },
            description: 'Suggested next actions for the project',
          },
          notes: {
            type: 'string',
            description: 'Technical decisions, caveats, or other notes. Optional.',
          },
        },
        required: ['status', 'summary'],
      },
    },
    async (input, _context) => {
      // Output tools don't "execute" — the agent runner captures the structured input
      // as the final result. This handler is a passthrough.
      return {
        content: JSON.stringify(input),
      };
    }
  );

  // --- submit_plan ---
  registry.register(
    {
      name: 'submit_plan',
      description:
        'Submit a structured project plan. Used by the PM agent after discovery to define the work breakdown. ' +
        'Include phases, tasks with assignments, and estimates.',
      input_schema: {
        type: 'object',
        properties: {
          projectName: { type: 'string', description: 'Project name' },
          summary: { type: 'string', description: 'Brief project summary (1-3 sentences)' },
          phases: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string', description: 'Phase name (e.g., "Discovery", "Design", "Development")' },
                description: { type: 'string' },
                tasks: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      title: { type: 'string' },
                      assignee: { type: 'string', description: 'Agent ID (e.g., "ui-developer")' },
                      description: { type: 'string' },
                      dependencies: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Task titles this depends on',
                      },
                    },
                    required: ['title', 'assignee', 'description'],
                  },
                },
              },
              required: ['name', 'tasks'],
            },
          },
          estimatedBudget: { type: 'string', description: 'Estimated total cost in USDC' },
          estimatedTimeline: { type: 'string', description: 'Estimated timeline (e.g., "2-3 hours")' },
          risks: {
            type: 'array',
            items: { type: 'string' },
            description: 'Key risks or assumptions',
          },
        },
        required: ['projectName', 'summary', 'phases'],
      },
    },
    async (input, _context) => {
      return { content: JSON.stringify(input) };
    }
  );

  // --- submit_audit_report ---
  registry.register(
    {
      name: 'submit_audit_report',
      description:
        'Submit a structured security audit report. Used by the solidity-auditor agent. ' +
        'Include findings with severity levels and a Go/No-Go recommendation.',
      input_schema: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['completed', 'in_progress', 'blocked'],
          },
          summary: { type: 'string', description: 'Audit summary' },
          recommendation: {
            type: 'string',
            enum: ['go', 'no-go', 'conditional'],
            description: 'Overall recommendation',
          },
          findings: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Finding ID (e.g., "FIND-001")' },
                severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low', 'informational'] },
                title: { type: 'string' },
                description: { type: 'string' },
                location: { type: 'string', description: 'File and line reference' },
                recommendation: { type: 'string', description: 'How to fix' },
              },
              required: ['id', 'severity', 'title', 'description'],
            },
          },
          contractsReviewed: {
            type: 'array',
            items: { type: 'string' },
            description: 'List of contract files reviewed',
          },
        },
        required: ['status', 'summary', 'recommendation', 'findings'],
      },
    },
    async (input, _context) => {
      return { content: JSON.stringify(input) };
    }
  );

  // --- submit_test_report ---
  registry.register(
    {
      name: 'submit_test_report',
      description:
        'Submit a structured test report. Used by qa-tester and unit-tester agents. ' +
        'Include test results, pass/fail counts, and any bugs found.',
      input_schema: {
        type: 'object',
        properties: {
          status: {
            type: 'string',
            enum: ['completed', 'in_progress', 'blocked'],
          },
          summary: { type: 'string', description: 'Test summary' },
          testResults: {
            type: 'object',
            properties: {
              total: { type: 'number' },
              passed: { type: 'number' },
              failed: { type: 'number' },
              skipped: { type: 'number' },
            },
            required: ['total', 'passed', 'failed'],
          },
          bugs: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string', description: 'Bug ID (e.g., "BUG-001")' },
                severity: { type: 'string', enum: ['critical', 'high', 'medium', 'low'] },
                title: { type: 'string' },
                steps: { type: 'string', description: 'Steps to reproduce' },
                expected: { type: 'string' },
                actual: { type: 'string' },
              },
              required: ['id', 'severity', 'title'],
            },
          },
          coverage: {
            type: 'string',
            description: 'Test coverage percentage or summary',
          },
          testFiles: {
            type: 'array',
            items: { type: 'string' },
            description: 'Test file paths',
          },
        },
        required: ['status', 'summary', 'testResults'],
      },
    },
    async (input, _context) => {
      return { content: JSON.stringify(input) };
    }
  );
}
