/**
 * Tool Registry — Manages tool definitions and execution for ShipWith.AI agents.
 *
 * Each tool has a ToolDefinition (JSON schema for Anthropic API) and a handler function.
 * Agents declare which tools they need in config.json. The registry resolves
 * definitions and provides a ToolExecutor that dispatches to the correct handler.
 */

import type {
  ToolDefinition,
  ToolExecutor,
  ToolExecutionContext,
  ToolExecutionResult,
} from '../types';

export type ToolHandler = (
  input: Record<string, unknown>,
  context: ToolExecutionContext
) => Promise<ToolExecutionResult>;

interface RegisteredTool {
  definition: ToolDefinition;
  handler: ToolHandler;
}

class ToolRegistry {
  private tools = new Map<string, RegisteredTool>();

  /**
   * Register a tool with its definition and handler.
   */
  register(definition: ToolDefinition, handler: ToolHandler): void {
    this.tools.set(definition.name, { definition, handler });
  }

  /**
   * Get tool definitions for a list of tool names.
   * Returns only the definitions (for passing to Anthropic API).
   */
  getDefinitions(toolNames: string[]): ToolDefinition[] {
    return toolNames
      .map((name) => this.tools.get(name)?.definition)
      .filter((d): d is ToolDefinition => d !== undefined);
  }

  /**
   * Check if a tool is registered.
   */
  has(toolName: string): boolean {
    return this.tools.has(toolName);
  }

  /**
   * Get all registered tool names.
   */
  listTools(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Create a ToolExecutor that dispatches to the correct handler by tool name.
   */
  createExecutor(): ToolExecutor {
    const tools = this.tools;
    return {
      async execute(
        toolName: string,
        input: Record<string, unknown>,
        context: ToolExecutionContext
      ): Promise<ToolExecutionResult> {
        const tool = tools.get(toolName);
        if (!tool) {
          return {
            content: `Unknown tool: ${toolName}. Available tools: ${Array.from(tools.keys()).join(', ')}`,
            isError: true,
          };
        }
        return tool.handler(input, context);
      },
    };
  }
}

// Singleton registry
let registry: ToolRegistry | null = null;

export function getToolRegistry(): ToolRegistry {
  if (!registry) {
    registry = new ToolRegistry();
    // Register all built-in tools
    registerBuiltinTools(registry);
  }
  return registry;
}

/**
 * Register all built-in tools. Called once on first access.
 */
function registerBuiltinTools(reg: ToolRegistry): void {
  // GitHub tools
  const { registerGitHubTools } = require('./github-tools');
  registerGitHubTools(reg);

  // Project management tools
  const { registerProjectTools } = require('./project-tools');
  registerProjectTools(reg);

  // Document tools
  const { registerDocumentTools } = require('./document-tools');
  registerDocumentTools(reg);

  // Deployment tools (stubs)
  const { registerDeploymentTools } = require('./deployment-tools');
  registerDeploymentTools(reg);

  // Command execution tools (stubs)
  const { registerCommandTools } = require('./command-tools');
  registerCommandTools(reg);

  // Output schema tools (submit_deliverable, submit_plan, etc.)
  const { registerOutputTools } = require('./output-tools');
  registerOutputTools(reg);

  // Orchestration tools (create_workflow, get_workflow_status)
  const { registerOrchestrationTools } = require('./orchestration-tools');
  registerOrchestrationTools(reg);
}

export { ToolRegistry };
