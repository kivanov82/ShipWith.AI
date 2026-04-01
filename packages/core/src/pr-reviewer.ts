/**
 * PR Reviewer — Fetches PR diff from GitHub, runs a review agent, posts comments.
 *
 * Called by the GitHub webhook handler when a pull_request event is received.
 * Uses OUR Anthropic API key — never exposes secrets to customer repos.
 */

import { getOctokit } from './github-repo';
import { runAgent } from './agent-runner';
import type { AgentRunConfig } from './types';

const REVIEW_SYSTEM_PROMPT = `You are a senior code reviewer for ShipWith.AI projects.

Review the provided pull request diff for:
1. **Bugs and logic errors** — incorrect conditions, off-by-ones, null handling
2. **Security issues** — injection, XSS, exposed secrets, insecure defaults
3. **Code quality** — readability, naming, unnecessary complexity
4. **Project conventions** — check CLAUDE.md if provided for project-specific rules
5. **Performance** — obvious inefficiencies, N+1 queries, large bundle impact

Be specific and actionable. Reference file paths and line numbers.
Only flag issues you are confident about — avoid false positives.
If the code looks good, say so briefly.`;

export interface ReviewResult {
  approved: boolean;
  comments: Array<{
    path: string;
    line: number;
    body: string;
    side?: 'LEFT' | 'RIGHT';
  }>;
  summary: string;
}

/**
 * Review a PR and post comments.
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

  // 3. Run review agent
  const prompt = `Review this pull request:

**Title**: ${pr.data.title}
**Description**: ${pr.data.body || '(none)'}
**Branch**: ${pr.data.head.ref} → ${pr.data.base.ref}
**Files changed**: ${files.data.length}

${projectConventions ? `## Project Conventions (from CLAUDE.md)\n\n${projectConventions}\n\n` : ''}
## Diff

${diffSummary}

Provide your review as a JSON object with this structure:
{
  "approved": true/false,
  "summary": "Brief overall assessment",
  "comments": [
    { "path": "file.ts", "line": 42, "body": "Issue description and suggestion" }
  ]
}`;

  const runConfig: AgentRunConfig = {
    agentId: 'qa-tester',
    model: 'claude-sonnet-4-20250514',
    systemPrompt: REVIEW_SYSTEM_PROMPT,
    messages: [{ role: 'user', content: prompt }],
    maxTokens: 4096,
    maxIterations: 1,
  };

  const result = await runAgent(runConfig);

  // 4. Parse review result
  let review: ReviewResult;
  try {
    // Try to extract JSON from the output
    const jsonMatch = result.output.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      review = JSON.parse(jsonMatch[0]) as ReviewResult;
    } else {
      review = { approved: true, comments: [], summary: result.output };
    }
  } catch {
    review = { approved: true, comments: [], summary: result.output };
  }

  // 5. Post review on PR
  try {
    await octokit.pulls.createReview({
      owner,
      repo,
      pull_number: prNumber,
      event: review.approved ? 'APPROVE' : 'REQUEST_CHANGES',
      body: `## ShipWith.AI Code Review\n\n${review.summary}\n\n---\n_Automated review by ShipWith.AI_`,
      comments: review.comments.map((c) => ({
        path: c.path,
        line: c.line,
        body: c.body,
        side: c.side || 'RIGHT',
      })),
    });
  } catch (error) {
    // If posting inline comments fails (e.g., line not in diff), post as regular comment
    console.error('Failed to post inline review, falling back to comment:', error);
    await octokit.issues.createComment({
      owner,
      repo,
      issue_number: prNumber,
      body: `## ShipWith.AI Code Review\n\n${review.summary}\n\n${review.comments.map((c) => `- **${c.path}:${c.line}**: ${c.body}`).join('\n')}\n\n---\n_Automated review by ShipWith.AI_`,
    });
  }

  return review;
}
