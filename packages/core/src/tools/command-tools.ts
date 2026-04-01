/**
 * Command Tools — Sandboxed shell command execution via E2B.
 *
 * Tools: run_command
 *
 * Used by: solidity-developer (compile/test), qa-tester (run tests), unit-tester (run tests)
 *
 * Commands run in E2B sandboxes — isolated cloud environments.
 * Requires E2B_API_KEY env var. Sign up at e2b.dev.
 */

import type { ToolRegistry } from './index';

// Whitelist of allowed command prefixes
const ALLOWED_COMMANDS = [
  'npm test',
  'npm run',
  'npm install',
  'npx',
  'pnpm test',
  'pnpm run',
  'pnpm install',
  'forge build',
  'forge test',
  'hardhat compile',
  'hardhat test',
  'vitest',
  'playwright test',
  'eslint',
  'tsc',
  'node',
  'cat',
  'ls',
  'pwd',
];

export function registerCommandTools(registry: ToolRegistry): void {
  registry.register(
    {
      name: 'run_command',
      description:
        'Run a shell command in a sandboxed environment. Restricted to build, test, and lint commands. ' +
        'Allowed: npm/pnpm test/run/install, npx, forge, hardhat, vitest, playwright, eslint, tsc, node. ' +
        'Do NOT use for: file manipulation (use github tools), deployment (use vercel tools), or arbitrary commands. ' +
        'The sandbox has Node.js 20 pre-installed.',
      input_schema: {
        type: 'object',
        properties: {
          command: {
            type: 'string',
            description: 'Shell command to execute (must start with an allowed prefix)',
          },
          workingDir: {
            type: 'string',
            description: 'Working directory inside the sandbox. Defaults to /home/user.',
          },
          timeoutMs: {
            type: 'number',
            description: 'Timeout in milliseconds. Defaults to 30000 (30s).',
          },
        },
        required: ['command'],
      },
    },
    async (input, context) => {
      const command = input.command as string;
      const workingDir = (input.workingDir as string) || '/home/user';
      const timeoutMs = (input.timeoutMs as number) || 30000;

      // Validate against whitelist
      const isAllowed = ALLOWED_COMMANDS.some((prefix) => command.startsWith(prefix));
      if (!isAllowed) {
        return {
          content: `Command not allowed: "${command}". Allowed prefixes: ${ALLOWED_COMMANDS.join(', ')}`,
          isError: true,
          errorCategory: 'permission',
          isRetryable: false,
        };
      }

      const apiKey = process.env.E2B_API_KEY;
      if (!apiKey) {
        return {
          content: `Sandbox execution not configured. Set E2B_API_KEY to enable. Sign up at e2b.dev.`,
          isError: true,
        };
      }

      try {
        // Dynamic import to avoid requiring e2b when not configured
        const { Sandbox } = await import('e2b');

        // Create a sandbox (or reuse — future enhancement)
        const sandbox = await Sandbox.create({
          apiKey,
          timeoutMs: Math.max(timeoutMs + 10000, 60000), // sandbox lifetime > command timeout
        });

        try {
          // Run the command
          const result = await sandbox.commands.run(command, {
            cwd: workingDir,
            timeoutMs,
          });

          const stdout = result.stdout || '';
          const stderr = result.stderr || '';
          const exitCode = result.exitCode;

          // Truncate output if too long (keep first/last 2000 chars)
          const maxLen = 4000;
          const truncate = (s: string) => {
            if (s.length <= maxLen) return s;
            return s.substring(0, maxLen / 2) + `\n\n... (${s.length - maxLen} chars truncated) ...\n\n` + s.substring(s.length - maxLen / 2);
          };

          const output = [
            `Exit code: ${exitCode}`,
            stdout ? `\n--- stdout ---\n${truncate(stdout)}` : '',
            stderr ? `\n--- stderr ---\n${truncate(stderr)}` : '',
          ].join('');

          return {
            content: output,
            isError: exitCode !== 0,
          };
        } finally {
          // Always kill the sandbox
          await sandbox.kill().catch(() => {});
        }
      } catch (error) {
        return {
          content: `Sandbox execution error: ${error instanceof Error ? error.message : String(error)}`,
          isError: true,
        };
      }
    }
  );
}
