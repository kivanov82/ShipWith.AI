/**
 * GitHub Webhook Handler — Receives events from customer repos.
 *
 * Currently handles:
 * - pull_request (opened, synchronize) → triggers code review
 *
 * The GitHub App sends webhooks here when events occur in repos it has access to.
 * Reviews are performed using OUR Anthropic API key — no secrets in customer repos.
 */

import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();

    // Verify webhook signature if secret is configured
    const webhookSecret = process.env.GITHUB_WEBHOOK_SECRET;
    if (webhookSecret) {
      const signature = request.headers.get('x-hub-signature-256');
      if (!signature) {
        return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
      }

      const expected = `sha256=${crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex')}`;

      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    const event = request.headers.get('x-github-event');
    const payload = JSON.parse(body);

    if (event === 'pull_request') {
      return handlePullRequest(payload);
    }

    // Acknowledge other events
    return NextResponse.json({ status: 'ignored', event });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: 'Webhook processing failed', details: String(error) },
      { status: 500 }
    );
  }
}

async function handlePullRequest(payload: {
  action: string;
  pull_request: {
    number: number;
    title: string;
    head: { ref: string };
    base: { ref: string };
  };
  repository: {
    full_name: string;
  };
}) {
  const { action, pull_request, repository } = payload;

  // Only review on open or push to existing PR
  if (action !== 'opened' && action !== 'synchronize') {
    return NextResponse.json({ status: 'ignored', action });
  }

  // Don't review PRs to non-main branches
  if (pull_request.base.ref !== 'main' && pull_request.base.ref !== 'master') {
    return NextResponse.json({ status: 'ignored', reason: 'non-main target' });
  }

  console.log(`[webhook] Reviewing PR #${pull_request.number} in ${repository.full_name}: "${pull_request.title}"`);

  // Run review asynchronously — respond immediately to webhook
  // (GitHub expects a response within 10 seconds)
  reviewInBackground(repository.full_name, pull_request.number);

  return NextResponse.json({
    status: 'review_queued',
    pr: pull_request.number,
    repo: repository.full_name,
  });
}

/**
 * Run review in background without blocking the webhook response.
 */
function reviewInBackground(repoFullName: string, prNumber: number): void {
  // Dynamic import to avoid loading review dependencies on every webhook call
  import('@shipwithai/core/src/pr-reviewer')
    .then(({ reviewPullRequest }) => reviewPullRequest(repoFullName, prNumber))
    .then((result) => {
      console.log(`[webhook] Review complete for ${repoFullName}#${prNumber}: ${result.approved ? 'APPROVED' : 'CHANGES REQUESTED'}`);
    })
    .catch((error) => {
      console.error(`[webhook] Review failed for ${repoFullName}#${prNumber}:`, error);
    });
}
