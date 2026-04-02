/**
 * PR Review Cycle — The complete review→fix→merge→notify flow.
 *
 * 1. Code-reviewer agent reviews the PR
 * 2. If APPROVED → auto-merge → emit task.completed event for PM
 * 3. If CHANGES_REQUESTED → re-invoke original agent with findings → new commit → re-review
 * 4. Max 3 review cycles to prevent infinite loops
 *
 * Called from:
 * - github_create_pr tool (auto-triggers after PR creation)
 * - GitHub webhook handler (for external PRs)
 */

import { getOctokit, mergePullRequest } from './github-repo';
import { runAgent } from './agent-runner';
import { getToolRegistry } from './tools';
import { events } from './events';
import type { AgentRunConfig, AgentId } from './types';
import * as fs from 'fs';
import * as path from 'path';

const MAX_REVIEW_CYCLES = 3;

export interface ReviewResult {
  approved: boolean;
  merged: boolean;
  cycles: number;
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
 * Run the full review cycle for a PR.
 *
 * @param repoFullName - e.g., "kivanov82/shipwithai-myproject"
 * @param prNumber - PR number
 * @param originalAgentId - agent that created the PR (for fix loop)
 * @param projectId - for event notifications
 */
export async function reviewPullRequest(
  repoFullName: string,
  prNumber: number,
  originalAgentId?: string,
  projectId?: string
): Promise<ReviewResult> {
  let cycle = 0;
  let lastReviewResult: ReviewResult = {
    approved: false,
    merged: false,
    cycles: 0,
    findings: [],
    summary: '',
  };

  while (cycle < MAX_REVIEW_CYCLES) {
    cycle++;
    console.log(`[pr-review] Cycle ${cycle}/${MAX_REVIEW_CYCLES} for PR #${prNumber} in ${repoFullName}`);

    // Step 1: Run code review
    const review = await runCodeReview(repoFullName, prNumber);
    lastReviewResult = { ...review, merged: false, cycles: cycle };

    if (review.approved) {
      // Step 2a: Approved → merge
      console.log(`[pr-review] PR #${prNumber} approved. Merging...`);
      try {
        const mergeResult = await mergePullRequest(repoFullName, prNumber, 'squash');
        lastReviewResult.merged = mergeResult.merged;
        console.log(`[pr-review] PR #${prNumber} merged: ${mergeResult.sha}`);

        // Step 3: Notify PM via event
        if (projectId) {
          events.taskCompleted(
            'code-reviewer' as AgentId,
            projectId,
            `pr-${prNumber}`,
            {
              type: 'pr-merged',
              prNumber,
              repo: repoFullName,
              mergedBy: 'code-reviewer',
              originalAgent: originalAgentId,
              summary: review.summary,
            } as any
          );
        }
      } catch (err) {
        console.error(`[pr-review] Failed to merge PR #${prNumber}:`, err);
        // Still approved, just couldn't merge (maybe conflicts)
        lastReviewResult.summary += '\n\nApproved but auto-merge failed — may need manual merge.';
      }
      break;
    }

    // Step 2b: Changes requested → try to fix
    if (!originalAgentId || cycle >= MAX_REVIEW_CYCLES) {
      console.log(`[pr-review] Changes requested on PR #${prNumber}, no fix loop (cycle ${cycle}/${MAX_REVIEW_CYCLES})`);
      break;
    }

    console.log(`[pr-review] Changes requested on PR #${prNumber}. Re-invoking ${originalAgentId} to fix...`);

    // Build fix prompt from review findings
    const fixPrompt = buildFixPrompt(review, prNumber);
    const fixed = await invokeAgentToFix(originalAgentId, fixPrompt, repoFullName, projectId);

    if (!fixed) {
      console.log(`[pr-review] ${originalAgentId} could not fix the issues. Stopping.`);
      break;
    }

    // Loop back to re-review
    console.log(`[pr-review] ${originalAgentId} pushed fixes. Re-reviewing...`);
  }

  return lastReviewResult;
}

/**
 * Run the code-reviewer agent on a PR.
 */
async function runCodeReview(
  repoFullName: string,
  prNumber: number
): Promise<Omit<ReviewResult, 'merged' | 'cycles'>> {
  const octokit = getOctokit();
  const [owner, repo] = repoFullName.split('/');

  // Fetch PR details and diff
  const pr = await octokit.pulls.get({ owner, repo, pull_number: prNumber });
  const files = await octokit.pulls.listFiles({ owner, repo, pull_number: prNumber, per_page: 100 });

  const diffSummary = files.data
    .map((f) => {
      const status = f.status === 'added' ? '(new)' : f.status === 'removed' ? '(deleted)' : '(modified)';
      return `### ${f.filename} ${status} (+${f.additions} -${f.deletions})\n\`\`\`diff\n${f.patch || '(binary or too large)'}\n\`\`\``;
    })
    .join('\n\n');

  // Try to read CLAUDE.md
  let conventions = '';
  try {
    const claudeMd = await octokit.repos.getContent({ owner, repo, path: 'CLAUDE.md', ref: pr.data.base.ref });
    if ('content' in claudeMd.data) {
      conventions = Buffer.from(claudeMd.data.content, 'base64').toString('utf-8');
    }
  } catch { /* no CLAUDE.md */ }

  // Load code-reviewer system prompt
  let systemPrompt: string;
  try {
    const agentDir = path.join(process.cwd(), '..', '..', 'agents', 'code-reviewer');
    systemPrompt = fs.readFileSync(path.join(agentDir, 'CLAUDE.md'), 'utf-8');
  } catch {
    systemPrompt = 'You are a code reviewer. Find bugs, security issues, and logic errors. Post your review using github_review_pr, then submit structured findings via submit_review.';
  }

  const prompt = `Review PR #${prNumber} in ${repoFullName}:

**Title**: ${pr.data.title}
**Description**: ${pr.data.body || '(none)'}
**Branch**: ${pr.data.head.ref} → ${pr.data.base.ref}
**Files changed**: ${files.data.length}

${conventions ? `## Project Conventions\n\n${conventions}\n\n` : ''}
## Diff

${diffSummary}

Review this PR. Use \`github_read_files\` if you need more context. Then use \`github_review_pr\` to post your findings on PR #${prNumber}. Finally call \`submit_review\` with your structured findings.`;

  const toolRegistry = getToolRegistry();
  const tools = toolRegistry.getDefinitions(['github_read_files', 'github_review_pr', 'submit_review']);

  const result = await runAgent({
    agentId: 'code-reviewer',
    model: 'claude-sonnet-4-20250514',
    systemPrompt,
    messages: [{ role: 'user', content: prompt }],
    tools,
    toolExecutor: toolRegistry.createExecutor(),
    maxTokens: 8000,
    maxIterations: 5,
    repoFullName,
  });

  // Extract from submit_review tool call
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

  return {
    approved: !result.output.toLowerCase().includes('changes'),
    findings: [],
    summary: result.output || 'Review completed',
  };
}

/**
 * Build a prompt for the original agent to fix review findings.
 */
function buildFixPrompt(review: Omit<ReviewResult, 'merged' | 'cycles'>, prNumber: number): string {
  const importantFindings = review.findings.filter((f) => f.severity === 'important');
  const nitFindings = review.findings.filter((f) => f.severity === 'nit');

  let prompt = `The code reviewer found issues in your PR #${prNumber} that need fixing:\n\n`;

  if (importantFindings.length > 0) {
    prompt += `## Must Fix (${importantFindings.length})\n\n`;
    for (const f of importantFindings) {
      prompt += `- **${f.file}${f.line ? `:${f.line}` : ''}** — ${f.title}: ${f.description}`;
      if (f.suggestion) prompt += `\n  Fix: ${f.suggestion}`;
      prompt += '\n\n';
    }
  }

  if (nitFindings.length > 0) {
    prompt += `## Nice to Fix (${nitFindings.length})\n\n`;
    for (const f of nitFindings) {
      prompt += `- **${f.file}${f.line ? `:${f.line}` : ''}** — ${f.title}: ${f.description}\n`;
    }
  }

  prompt += `\nPlease fix these issues and commit the changes to the same branch. Focus on the "Must Fix" items first.`;
  return prompt;
}

/**
 * Re-invoke the original agent to fix review findings.
 */
async function invokeAgentToFix(
  agentId: string,
  fixPrompt: string,
  repoFullName: string,
  projectId?: string
): Promise<boolean> {
  // Load the agent's system prompt
  let systemPrompt: string;
  try {
    const agentDir = path.join(process.cwd(), '..', '..', 'agents', agentId);
    systemPrompt = fs.readFileSync(path.join(agentDir, 'CLAUDE.md'), 'utf-8');
  } catch {
    systemPrompt = `You are the ${agentId} agent. Fix the code review findings.`;
  }

  // Load the agent's tools
  let agentTools: string[] = [];
  try {
    const agentDir = path.join(process.cwd(), '..', '..', 'agents', agentId);
    const config = JSON.parse(fs.readFileSync(path.join(agentDir, 'config.json'), 'utf-8'));
    agentTools = config.tools || [];
  } catch { /* use defaults */ }

  if (agentTools.length === 0) {
    agentTools = ['github_write_files', 'github_read_files'];
  }

  const toolRegistry = getToolRegistry();
  const tools = toolRegistry.getDefinitions(agentTools);

  const result = await runAgent({
    agentId: agentId as AgentId,
    model: 'claude-sonnet-4-20250514', // Use Sonnet for fixes (faster, cheaper)
    systemPrompt,
    messages: [{ role: 'user', content: fixPrompt }],
    tools,
    toolExecutor: toolRegistry.createExecutor(),
    maxTokens: 16000,
    maxIterations: 5,
    repoFullName,
    projectId,
  });

  // Check if the agent actually committed fixes
  const committed = result.toolCallsLog.some(
    (tc) => tc.toolName === 'github_write_files' && !tc.isError
  );

  return committed;
}
