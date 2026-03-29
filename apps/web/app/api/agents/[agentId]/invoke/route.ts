import { NextRequest, NextResponse } from 'next/server';
import { spawn } from 'child_process';
import * as path from 'path';
import * as fs from 'fs';

// Agent invocation via Claude CLI or API
export async function POST(
  request: NextRequest,
  { params }: { params: { agentId: string } }
) {
  try {
    const { agentId } = params;
    const body = await request.json();
    const { prompt, projectId, context } = body;

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
      if (stream) {
        // Streaming API mode
        return invokeViaAPIStreaming(config, systemPrompt, prompt, context);
      }
      // Use Anthropic API directly
      const response = await invokeViaAPI(config, systemPrompt, prompt, context);
      return NextResponse.json(response);
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

async function invokeViaAPI(
  config: Record<string, unknown>,
  systemPrompt: string,
  prompt: string,
  context?: Record<string, unknown>
): Promise<{ success: boolean; output: string }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY not configured');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 8192,
      system: systemPrompt,
      messages: [
        {
          role: 'user',
          content: context
            ? `Context: ${JSON.stringify(context)}\n\nTask: ${prompt}`
            : prompt,
        },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`API error: ${error}`);
  }

  const data = await response.json();
  const output = data.content?.[0]?.text || '';

  return { success: true, output };
}

// Streaming version using SSE
function invokeViaAPIStreaming(
  config: Record<string, unknown>,
  systemPrompt: string,
  prompt: string,
  context?: Record<string, unknown>
): Response {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ANTHROPIC_API_KEY not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: 'claude-sonnet-4-20250514',
            max_tokens: 8192,
            stream: true,
            system: systemPrompt,
            messages: [
              {
                role: 'user',
                content: context
                  ? `Context: ${JSON.stringify(context)}\n\nTask: ${prompt}`
                  : prompt,
              },
            ],
          }),
        });

        if (!response.ok) {
          const error = await response.text();
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error })}\n\n`));
          controller.close();
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: 'No response body' })}\n\n`));
          controller.close();
          return;
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;

              try {
                const parsed = JSON.parse(data);
                // Extract text from content_block_delta events
                if (parsed.type === 'content_block_delta' && parsed.delta?.text) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ text: parsed.delta.text })}\n\n`)
                  );
                }
              } catch {
                // Ignore parse errors
              }
            }
          }
        }

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
