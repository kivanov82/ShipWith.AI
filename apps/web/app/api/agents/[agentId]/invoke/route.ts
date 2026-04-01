import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';
import { runAgent } from '@shipwithai/core/src/agent-runner';
import { runAgentStreaming } from '@shipwithai/core/src/agent-runner-streaming';
import type { AgentRunConfig, AgentStreamCallbacks } from '@shipwithai/core/src/types';
import { getToolRegistry } from '@shipwithai/core/src/tools';

// Agent invocation via Claude CLI or API
export async function POST(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const { agentId } = params;
    const body = await request.json();
    const { prompt, projectId, context, history } = body;

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

      // Build agent run config
      const runConfig: AgentRunConfig = {
        agentId: agentId as AgentRunConfig['agentId'],
        model: getModel(config),
        systemPrompt,
        messages,
        maxTokens: 4096,
        maxIterations: 10,
        projectId,
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

function formatContext(context?: Record<string, unknown>): string {
  if (!context) return '';
  let block = '';

  const team = context.availableTeam as string[] | undefined;
  if (team && team.length > 0) {
    block += `\n\n## Your team for this project\nOnly recommend these specialists (no others):\n${team.map((t) => `- ${t}`).join('\n')}\n`;
  }

  const otherAgents = context.otherAgents as Record<string, string> | undefined;
  if (otherAgents && Object.keys(otherAgents).length > 0) {
    const summaries = Object.entries(otherAgents)
      .map(([agentId, summary]) => `### ${agentId}\n${summary}`)
      .join('\n\n');
    block += `\n\n## Context from other specialists\n\n${summaries}\n`;
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
