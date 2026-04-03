import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { runAgent } from '@shipwithai/core/agent-runner';
import { runAgentStreaming } from '@shipwithai/core/agent-runner-streaming';
import type { AgentRunConfig, AgentStreamCallbacks } from '@shipwithai/core/types';
import { getToolRegistry } from '@shipwithai/core/tools';
import { getDefaultHooks } from '@shipwithai/core/hooks';

// Agent invocation via Claude CLI or API
export async function POST(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const { agentId } = params;
    const body = await request.json();
    const { prompt, projectId, context } = body;
    // Only keep last 4 messages (2 exchanges) for conversational continuity.
    // Everything else is in the context system (project facts + agent summaries).
    const rawHistory = body.history as Array<{ role: string; content: string }> | undefined;
    const history = rawHistory?.slice(-4);

    console.log(`[invoke] Agent: ${agentId}, ProjectId: ${projectId || 'NONE'}, History: ${history?.length || 0}/${rawHistory?.length || 0} msgs`);

    // Check if streaming is requested
    const url = new URL(request.url);
    const stream = url.searchParams.get('stream') === 'true';

    // Validate agent exists
    const agentDir = path.join(process.cwd(), '..', '..', 'agents', agentId);
    const configPath = path.join(agentDir, 'config.json');
    const claudeMdPath = path.join(agentDir, 'CLAUDE.md');

    if (!fs.existsSync(configPath)) {
      return NextResponse.json(
        { error: `Agent ${agentId} not found` },
        { status: 404 }
      );
    }

    const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
    const systemPrompt = fs.existsSync(claudeMdPath)
      ? fs.readFileSync(claudeMdPath, 'utf-8')
      : '';

    // Determine invocation mode
    const mode = process.env.SHIPWITHAI_MODE || 'cli';

    if (mode === 'api') {
      const messages = buildMessages(prompt, context, history);

      // Derive repo name from project ID (convention: kivanov82/shipwithai-{projectId})
      const repoOwner = process.env.GITHUB_REPO_OWNER || 'kivanov82';
      const repoFullName = projectId ? `${repoOwner}/shipwithai-${projectId.toLowerCase()}` : undefined;

      // Load active branch from session metadata (if agent previously committed)
      const sessionId = body.sessionId as string | undefined;
      let activeBranch: string | undefined;
      if (sessionId) {
        try {
          const { getFirestoreStore } = await import('@shipwithai/core/firestore-store');
          const store = getFirestoreStore();
          const session = await store.getSession(sessionId);
          const branches = (session as any)?.activeBranches as Record<string, string> | undefined;
          activeBranch = branches?.[agentId];
        } catch { /* non-fatal */ }
      }

      // Build agent run config
      const runConfig: AgentRunConfig = {
        agentId: agentId as AgentRunConfig['agentId'],
        model: getModel(config),
        systemPrompt,
        messages,
        maxTokens: (config.maxTokens as number) || 16000,
        maxIterations: 10,
        projectId,
        repoFullName,
        activeBranch,
        onBranchCreated: sessionId ? async (branch: string) => {
          try {
            const { getFirestoreStore } = await import('@shipwithai/core/firestore-store');
            const store = getFirestoreStore();
            const session = await store.getSession(sessionId);
            const branches = (session as any)?.activeBranches || {};
            branches[agentId] = branch;
            await store.updateSession(sessionId, { activeBranches: branches } as any);
          } catch { /* non-fatal */ }
        } : undefined,
      };

      // Load tools from agent config
      const toolNames = config.tools as string[] | undefined;
      const outputTool = config.outputTool as string | undefined;
      if (toolNames && toolNames.length > 0) {
        const toolRegistry = getToolRegistry();
        // Include the output tool in the tools list if not already there
        const allToolNames = outputTool && !toolNames.includes(outputTool)
          ? [...toolNames, outputTool]
          : toolNames;
        runConfig.tools = toolRegistry.getDefinitions(allToolNames);
        runConfig.toolExecutor = toolRegistry.createExecutor();
      }

      // In "job" mode (orchestrator-driven), force structured output via output tool
      const invocationMode = body.mode as string | undefined;
      if (invocationMode === 'job' && outputTool) {
        runConfig.toolChoice = { type: 'tool', name: outputTool };
      }

      // Apply default execution hooks (branch protection, command safety, output truncation)
      runConfig.hooks = getDefaultHooks();

      if (stream) {
        // Streaming API mode with agentic loop
        return invokeViaAgentRunnerStreaming(runConfig);
      }

      // Non-streaming with agentic loop
      const result = await runAgent(runConfig);
      return NextResponse.json({
        success: result.success,
        output: result.output,
        toolCalls: result.toolCallsLog,
        iterations: result.totalIterations,
        stopReason: result.stopReason,
      });
    } else {
      // Use Claude CLI (no streaming support yet)
      const response = await invokeViaCLI(agentId, prompt, projectId);
      return NextResponse.json(response);
    }
  } catch (error) {
    console.error('Agent invocation error:', error);
    return NextResponse.json(
      { error: 'Failed to invoke agent', details: String(error) },
      { status: 500 }
    );
  }
}

async function invokeViaCLI(
  agentId: string,
  prompt: string,
  projectId?: string
): Promise<{ success: boolean; output: string }> {
  return new Promise((resolve, reject) => {
    const agentDir = path.join(process.cwd(), '..', '..', 'agents', agentId);
    const projectDir = projectId
      ? path.join(process.cwd(), '..', '..', 'projects', projectId)
      : agentDir;

    // Ensure project directory exists
    if (projectId && !fs.existsSync(projectDir)) {
      fs.mkdirSync(projectDir, { recursive: true });
    }

    // Spawn claude process
    const proc = spawn('claude', ['--print', prompt], {
      cwd: projectDir,
      env: {
        ...process.env,
        CLAUDE_PROJECT: agentDir,
      },
    });

    let output = '';
    let error = '';

    proc.stdout.on('data', (data) => {
      output += data.toString();
    });

    proc.stderr.on('data', (data) => {
      error += data.toString();
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve({ success: true, output });
      } else {
        resolve({ success: false, output: error || output });
      }
    });

    proc.on('error', (err) => {
      reject(err);
    });
  });
}

const DEFAULT_MODEL = 'claude-sonnet-4-20250514';

function getModel(config: Record<string, unknown>): string {
  return (config.model as string) || DEFAULT_MODEL;
}

interface HistoryMessage {
  role: 'user' | 'agent';
  content: string;
}

// Rough token estimate: ~4 chars per token
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

// Max tokens for context block (leave room for system prompt + conversation)
const MAX_CONTEXT_TOKENS = 4000;

function formatContext(context?: Record<string, unknown>): string {
  if (!context) return '';
  let block = '';

  // 1. Project facts FIRST (highest priority, placed at top to avoid lost-in-the-middle)
  const projectFacts = context.projectFacts as string | undefined;
  if (projectFacts) {
    block += `\n\n## Project Facts\nThese are the confirmed facts about this project. Do not contradict them.\n\n${projectFacts}\n`;
  }

  // 2. Team roster
  const team = context.availableTeam as string[] | undefined;
  if (team && team.length > 0) {
    block += `\n\n## Your team for this project\nOnly recommend these specialists (no others):\n${team.map((t) => `- ${t}`).join('\n')}\n`;
  }

  // 3. Agent summaries (token-budgeted — truncate oldest if over budget)
  const staleAgents = context.staleAgents as string[] | undefined;
  const otherAgents = context.otherAgents as Record<string, string> | undefined;
  if (otherAgents && Object.keys(otherAgents).length > 0) {
    const currentTokens = estimateTokens(block);
    const budgetForSummaries = MAX_CONTEXT_TOKENS - currentTokens;

    let summariesBlock = '';
    const entries = Object.entries(otherAgents);

    // Add summaries newest-first until budget exhausted
    for (const [id, summary] of entries.reverse()) {
      const staleWarning = staleAgents?.includes(id) ? ' _(context may be outdated)_' : '';
      const entry = `### ${id}${staleWarning}\n${summary}\n\n`;
      if (estimateTokens(summariesBlock + entry) > budgetForSummaries) {
        summariesBlock += `\n_(...earlier agent context truncated for brevity)_\n`;
        break;
      }
      summariesBlock = entry + summariesBlock; // prepend to maintain order
    }

    if (summariesBlock) {
      block += `\n\n## Context from other specialists\n\n${summariesBlock}`;
    }
  }

  return block ? `${block}\n---\n\n` : '';
}

function buildMessages(prompt: string, context?: Record<string, unknown>, history?: HistoryMessage[]): Array<{ role: 'user' | 'assistant'; content: string }> {
  const contextBlock = formatContext(context);
  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

  // Add conversation history as multi-turn messages
  if (history && history.length > 0) {
    // First message gets the context block prepended
    let firstUserDone = false;
    for (const msg of history) {
      const role = msg.role === 'agent' ? 'assistant' as const : 'user' as const;
      if (role === 'user' && !firstUserDone) {
        messages.push({ role, content: `${contextBlock}${msg.content}` });
        firstUserDone = true;
      } else {
        messages.push({ role, content: msg.content });
      }
    }
    // Add the new prompt
    messages.push({ role: 'user', content: prompt });
  } else {
    // No history — single message with context
    messages.push({ role: 'user', content: `${contextBlock}${prompt}` });
  }

  return messages;
}


// Streaming version using agent runner with SSE bridge
function invokeViaAgentRunnerStreaming(runConfig: AgentRunConfig): Response {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const callbacks: AgentStreamCallbacks = {
          onText: (text) => {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ text })}\n\n`)
            );
          },
          onToolCall: (toolName, input) => {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'tool_call', toolName, input })}\n\n`)
            );
          },
          onToolResult: (toolName, result, isError) => {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'tool_result', toolName, result, isError })}\n\n`)
            );
          },
          onIteration: (iteration, stopReason) => {
            controller.enqueue(
              encoder.encode(`data: ${JSON.stringify({ type: 'iteration', iteration, stopReason })}\n\n`)
            );
          },
        };

        const result = await runAgentStreaming(runConfig, callbacks);

        // If agent returned an error message (e.g., API error), send it as text
        if (!result.success && result.output) {
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ text: result.output })}\n\n`)
          );
        }

        // Send final result summary
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({
            type: 'done',
            success: result.success,
            iterations: result.totalIterations,
            stopReason: result.stopReason,
            toolCalls: result.toolCallsLog,
          })}\n\n`)
        );

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: String(error) })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// GET: Get agent info
export async function GET(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  const { agentId } = params;
  const agentDir = path.join(process.cwd(), '..', '..', 'agents', agentId);
  const configPath = path.join(agentDir, 'config.json');

  if (!fs.existsSync(configPath)) {
    return NextResponse.json(
      { error: `Agent ${agentId} not found` },
      { status: 404 }
    );
  }

  const config = JSON.parse(fs.readFileSync(configPath, 'utf-8'));
  return NextResponse.json(config);
}
