/**
 * PR Reviewer — Invokes the code-reviewer agent to review pull requests.
 *
 * Fetches PR diff from GitHub, loads the code-reviewer agent's system prompt,
 * runs it with tools (github_read_files, github_review_pr), and lets the agent
 * post its findings directly on the PR.
 *
 * Called from:
 * - github_create_pr tool (auto-triggers review after PR creation)
 * - GitHub webhook handler (for external PRs)
 */

import { getOctokit } from './github-repo';
import { runAgent } from './agent-runner';
import { getToolRegistry } from './tools';
import type { AgentRunConfig } from './types';
import * as fs from 'fs';
import * as path from 'path';

export interface ReviewResult {
  approved: boolean;
  findings: Array<{
    severity: 'important' | 'nit' | 'pre_existing';
    file: string;
    line?: number;
    title: string;
    description: string;
    suggestion?: string;
  }>;
  summary: string;
}

/**
 * Review a PR using the code-reviewer agent.
 */
export async function reviewPullRequest(
  repoFullName: string,
  prNumber: number
): Promise<ReviewResult> {
  const octokit = getOctokit();
  const [owner, repo] = repoFullName.split('/');

  // 1. Fetch PR details and diff
  const pr = await octokit.pulls.get({ owner, repo, pull_number: prNumber });
  const files = await octokit.pulls.listFiles({ owner, repo, pull_number: prNumber, per_page: 100 });

  // Build diff summary
  const diffSummary = files.data
    .map((f) => {
      const status = f.status === 'added' ? '(new)' : f.status === 'removed' ? '(deleted)' : '(modified)';
      return `### ${f.filename} ${status} (+${f.additions} -${f.deletions})\n\`\`\`diff\n${f.patch || '(binary or too large)'}\n\`\`\``;
    })
    .join('\n\n');

  // 2. Try to read project CLAUDE.md for conventions
  let projectConventions = '';
  try {
    const claudeMd = await octokit.repos.getContent({
      owner,
      repo,
      path: 'CLAUDE.md',
      ref: pr.data.base.ref,
    });
    if ('content' in claudeMd.data) {
      projectConventions = Buffer.from(claudeMd.data.content, 'base64').toString('utf-8');
    }
  } catch {
    // No CLAUDE.md — that's fine
  }

  // 3. Load code-reviewer agent system prompt
  let systemPrompt: string;
  try {
    const agentDir = path.join(process.cwd(), '..', '..', 'agents', 'code-reviewer');
    systemPrompt = fs.readFileSync(path.join(agentDir, 'CLAUDE.md'), 'utf-8');
  } catch {
    // Fallback if agent dir not found (e.g., in production container)
    systemPrompt = 'You are a code reviewer. Find bugs, security issues, and logic errors. Post your review using the github_review_pr tool.';
  }

  // 4. Build the review prompt
  const prompt = `Review PR #${prNumber} in ${repoFullName}:

**Title**: ${pr.data.title}
**Description**: ${pr.data.body || '(none)'}
**Branch**: ${pr.data.head.ref} → ${pr.data.base.ref}
**Files changed**: ${files.data.length}

${projectConventions ? `## Project Conventions (from CLAUDE.md)\n\n${projectConventions}\n\n` : ''}
## Diff

${diffSummary}

Review this PR. Use \`github_read_files\` if you need to see more context from the repo. Then use \`github_review_pr\` to post your findings as inline comments on PR #${prNumber}. Finally, submit your structured review via \`submit_review\`.`;

  // 5. Load tools for the code-reviewer agent
  const toolRegistry = getToolRegistry();
  const toolNames = ['github_read_files', 'github_review_pr', 'submit_review'];
  const tools = toolRegistry.getDefinitions(toolNames);
  const toolExecutor = toolRegistry.createExecutor();

  // 6. Run the code-reviewer agent
  const runConfig: AgentRunConfig = {
    agentId: 'code-reviewer',
    model: 'claude-sonnet-4-20250514',
    systemPrompt,
    messages: [{ role: 'user', content: prompt }],
    tools,
    toolExecutor,
    maxTokens: 8000,
    maxIterations: 5,
    repoFullName,
  };

  const result = await runAgent(runConfig);

  // 7. Extract review result from submit_review tool call
  const reviewCall = result.toolCallsLog.find((tc) => tc.toolName === 'submit_review' && !tc.isError);
  if (reviewCall) {
    try {
      const parsed = JSON.parse(reviewCall.output);
      return {
        approved: parsed.status === 'approved',
        findings: parsed.findings || [],
        summary: parsed.summary || '',
      };
    } catch { /* fall through */ }
  }

  // Fallback: extract from text output
  return {
    approved: !result.output.toLowerCase().includes('changes requested'),
    findings: [],
    summary: result.output || 'Review completed',
  };
}
