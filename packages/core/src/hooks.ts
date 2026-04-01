/**
 * Built-in Tool Execution Hooks
 *
 * Pre-tool hooks run BEFORE tool execution and can block it.
 * Post-tool hooks run AFTER tool execution and can modify the result.
 */

import type { PreToolUseHook, PostToolUseHook, ToolHooks } from './types';

// --- Pre-Tool Hooks ---

/**
 * Block writes to main/master branch.
 * Prevents agents from bypassing the branch workflow.
 */
export const blockMainBranchWrites: PreToolUseHook = async (toolName, input) => {
  if (toolName === 'github_write_files') {
    const branch = input.branch as string | undefined;
    if (!branch || branch === 'main' || branch === 'master') {
      return { allow: false, reason: 'Cannot write to main/master. Use a feature branch.' };
    }
  }
  return { allow: true };
};

/**
 * Block dangerous commands.
 * Extra safety layer beyond the whitelist in command-tools.
 */
export const blockDangerousCommands: PreToolUseHook = async (toolName, input) => {
  if (toolName === 'run_command') {
    const cmd = (input.command as string || '').toLowerCase();
    const dangerous = ['rm -rf', 'rm -r /', 'dd if=', 'mkfs', ':(){', 'chmod -R 777'];
    for (const pattern of dangerous) {
      if (cmd.includes(pattern)) {
        return { allow: false, reason: `Dangerous command blocked: contains "${pattern}"` };
      }
    }
  }
  return { allow: true };
};

// --- Post-Tool Hooks ---

/**
 * Log all tool executions for audit trail.
 */
export const logToolExecution: PostToolUseHook = async (toolName, input, result, context) => {
  console.log(`[tool-audit] ${context.agentId} called ${toolName}${result.isError ? ' (ERROR)' : ''}`);
  return result;
};

/**
 * Truncate large tool outputs to prevent context window bloat.
 */
export const truncateLargeOutputs: PostToolUseHook = async (_toolName, _input, result) => {
  const maxLen = 8000;
  if (result.content.length > maxLen) {
    return {
      ...result,
      content: result.content.substring(0, maxLen / 2) +
        `\n\n... (${result.content.length - maxLen} chars truncated) ...\n\n` +
        result.content.substring(result.content.length - maxLen / 2),
    };
  }
  return result;
};

// --- Hook Presets ---

/**
 * Default hooks applied to all agents.
 */
export function getDefaultHooks(): ToolHooks {
  return {
    preToolUse: [
      blockMainBranchWrites,
      blockDangerousCommands,
    ],
    postToolUse: [
      logToolExecution,
      truncateLargeOutputs,
    ],
  };
}
