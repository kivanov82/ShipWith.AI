/**
 * GitHub Tools — Wraps github-repo.ts for agent tool use.
 *
 * Tools: github_read_files, github_write_files, github_create_branch, github_create_pr
 */

import type { ToolRegistry, ToolHandler } from './index';
import type { ToolExecutionContext } from '../types';
import {
  listFiles,
  getFileContent,
  commitFiles,
  listCommits,
} from '../github-repo';

// Helper to get repo name from context
function getRepoName(context: ToolExecutionContext): string {
  if (context.repoFullName) return context.repoFullName;
  throw new Error('No repository configured for this project. Set repoFullName in tool execution context.');
}

export function registerGitHubTools(registry: ToolRegistry): void {
  // --- github_read_files ---
  registry.register(
    {
      name: 'github_read_files',
      description:
        'Read files from the project GitHub repository. Use to list directory contents or read file content. ' +
        'When path is a directory, returns a list of files. When path is a file, returns its content.',
      input_schema: {
        type: 'object',
        properties: {
          path: {
            type: 'string',
            description: 'File or directory path relative to repo root. Use "" or "/" for root.',
          },
          branch: {
            type: 'string',
            description: 'Branch name. Defaults to "main".',
          },
        },
        required: ['path'],
      },
    },
    async (input, context) => {
      const repo = getRepoName(context);
      const filePath = (input.path as string) || '';
      const branch = (input.branch as string) || 'main';

      try {
        // Try as file first
        if (filePath && !filePath.endsWith('/')) {
          try {
            const content = await getFileContent(repo, filePath, branch);
            return { content: `File: ${filePath}\n\n${content}` };
          } catch {
            // Not a file, try as directory
          }
        }

        // List directory
        const files = await listFiles(repo, filePath || undefined, branch);
        const listing = files
          .map((f) => `${f.type === 'dir' ? '📁' : '📄'} ${f.path} ${f.size ? `(${f.size}b)` : ''}`)
          .join('\n');
        return { content: `Directory: ${filePath || '/'}\n\n${listing}` };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        const isNotFound = msg.includes('Not Found') || msg.includes('404');
        return {
          content: `Failed to read ${filePath}: ${msg}`,
          isError: true,
          errorCategory: isNotFound ? 'validation' as const : 'transient' as const,
          isRetryable: !isNotFound,
        };
      }
    }
  );

  // --- github_write_files ---
  registry.register(
    {
      name: 'github_write_files',
      description:
        'Write one or more files to the project GitHub repository as a single atomic commit. ' +
        'Always commit to a feature branch, never directly to main. ' +
        'Creates the branch if it does not exist.',
      input_schema: {
        type: 'object',
        properties: {
          files: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                path: { type: 'string', description: 'File path relative to repo root' },
                content: { type: 'string', description: 'File content' },
              },
              required: ['path', 'content'],
            },
            description: 'Files to write',
          },
          message: { type: 'string', description: 'Commit message' },
          branch: {
            type: 'string',
            description: 'Branch name. Must be a feature branch (e.g., "feature/ui-developer/landing-page"). Never use "main".',
          },
        },
        required: ['files', 'message', 'branch'],
      },
    },
    async (input, context) => {
      const repo = getRepoName(context);
      const files = input.files as Array<{ path: string; content: string }>;
      const message = input.message as string;
      const branch = input.branch as string;

      if (branch === 'main' || branch === 'master') {
        return {
          content: 'Cannot commit directly to main/master. Use a feature branch (e.g., "feature/your-agent-id/description").',
          isError: true,
          errorCategory: 'business',
          isRetryable: false,
        };
      }

      try {
        const result = await commitFiles(
          repo,
          files,
          message,
          `ShipWith.AI ${context.agentId}`,
          branch
        );
        return {
          content: `Committed ${files.length} file(s) to ${branch}\nSHA: ${result.sha}\nFiles: ${files.map((f) => f.path).join(', ')}`,
        };
      } catch (error) {
        return {
          content: `Failed to commit: ${error instanceof Error ? error.message : String(error)}`,
          isError: true,
        };
      }
    }
  );

  // --- github_create_pr ---
  registry.register(
    {
      name: 'github_create_pr',
      description:
        'Create a pull request in the project GitHub repository. ' +
        'Use after committing changes to a feature branch. The PR will be automatically reviewed.',
      input_schema: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'PR title (concise, under 70 chars)' },
          body: { type: 'string', description: 'PR description with summary of changes' },
          head: { type: 'string', description: 'Source branch name (your feature branch)' },
          base: { type: 'string', description: 'Target branch. Defaults to "main".' },
        },
        required: ['title', 'body', 'head'],
      },
    },
    async (input, context) => {
      const repo = getRepoName(context);
      const [owner, name] = repo.split('/');
      const title = input.title as string;
      const body = input.body as string;
      const head = input.head as string;
      const base = (input.base as string) || 'main';

      try {
        // Import dynamically to avoid circular deps at module level
        const { getOctokit } = require('../github-repo');
        const octokit = getOctokit();
        const pr = await octokit.pulls.create({
          owner,
          repo: name,
          title,
          body: `${body}\n\n---\n_Created by ShipWith.AI ${context.agentId} agent_`,
          head,
          base,
        });
        return {
          content: `PR #${pr.data.number} created: ${pr.data.html_url}\nTitle: ${title}\nBranch: ${head} → ${base}`,
        };
      } catch (error) {
        return {
          content: `Failed to create PR: ${error instanceof Error ? error.message : String(error)}`,
          isError: true,
        };
      }
    }
  );

  // --- github_create_branch ---
  registry.register(
    {
      name: 'github_create_branch',
      description:
        'Create a new branch in the project GitHub repository. ' +
        'Use before committing files to ensure the branch exists.',
      input_schema: {
        type: 'object',
        properties: {
          branch: { type: 'string', description: 'New branch name (e.g., "feature/ui-developer/landing-page")' },
          from: { type: 'string', description: 'Base branch to create from. Defaults to "main".' },
        },
        required: ['branch'],
      },
    },
    async (input, context) => {
      const repo = getRepoName(context);
      const [owner, name] = repo.split('/');
      const branch = input.branch as string;
      const from = (input.from as string) || 'main';

      try {
        const { getOctokit } = require('../github-repo');
        const octokit = getOctokit();

        // Get the SHA of the base branch
        const ref = await octokit.git.getRef({
          owner,
          repo: name,
          ref: `heads/${from}`,
        });

        // Create the new branch
        await octokit.git.createRef({
          owner,
          repo: name,
          ref: `refs/heads/${branch}`,
          sha: ref.data.object.sha,
        });

        return { content: `Branch "${branch}" created from "${from}"` };
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        // Branch might already exist
        if (msg.includes('Reference already exists')) {
          return { content: `Branch "${branch}" already exists` };
        }
        return { content: `Failed to create branch: ${msg}`, isError: true };
      }
    }
  );
}
