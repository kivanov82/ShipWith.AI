/**
 * Streaming Agent Runner — SSE-based agentic loop for ShipWith.AI
 *
 * Same loop logic as agent-runner.ts but uses streaming API responses.
 * Forwards text deltas in real-time via callbacks, handles tool calls
 * between streaming cycles.
 */

import type {
  AgentRunConfig,
  AgentRunResult,
  ContentBlock,
  TextBlock,
  ToolUseBlock,
  ToolResultBlock,
  ToolCallLog,
  ToolExecutionContext,
  AgentStreamCallbacks,
} from './types';

const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_MAX_ITERATIONS = 10;
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | Array<ContentBlock | ToolResultBlock>;
}

/**
 * Parse a single streaming response cycle.
 * Returns the accumulated content blocks and the stop_reason.
 */
async function parseStreamingResponse(
  response: Response,
  callbacks?: AgentStreamCallbacks
): Promise<{
  content: Array<TextBlock | ToolUseBlock>;
  stopReason: string;
  usage: { input_tokens: number; output_tokens: number };
}> {
  const content: Array<TextBlock | ToolUseBlock> = [];
  let currentBlockIndex = -1;
  let currentToolInput = '';
  let stopReason = 'end_turn';
  let usage = { input_tokens: 0, output_tokens: 0 };

  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue;
      const data = line.slice(6).trim();
      if (data === '[DONE]') continue;

      let event;
      try {
        event = JSON.parse(data);
      } catch {
        continue;
      }

      switch (event.type) {
        case 'content_block_start': {
          currentBlockIndex = event.index;
          if (event.content_block.type === 'text') {
            content[currentBlockIndex] = { type: 'text', text: '' };
          } else if (event.content_block.type === 'tool_use') {
            content[currentBlockIndex] = {
              type: 'tool_use',
              id: event.content_block.id,
              name: event.content_block.name,
              input: {},
            };
            currentToolInput = '';
            // onToolCall fires at content_block_stop with full input (not here)
          }
          break;
        }

        case 'content_block_delta': {
          const block = content[event.index];
          if (!block) break;

          if (event.delta.type === 'text_delta' && block.type === 'text') {
            block.text += event.delta.text;
            callbacks?.onText?.(event.delta.text);
          } else if (event.delta.type === 'input_json_delta' && block.type === 'tool_use') {
            currentToolInput += event.delta.partial_json;
          }
          break;
        }

        case 'content_block_stop': {
          const block = content[event.index];
          if (block?.type === 'tool_use') {
            if (currentToolInput) {
              try {
                block.input = JSON.parse(currentToolInput);
              } catch {
                block.input = { raw: currentToolInput };
              }
              currentToolInput = '';
            }
            // Fire onToolCall now with the complete parsed input
            callbacks?.onToolCall?.(block.name, block.input);
          }
          break;
        }

        case 'message_delta': {
          if (event.delta?.stop_reason) {
            stopReason = event.delta.stop_reason;
          }
          if (event.usage) {
            usage.output_tokens += event.usage.output_tokens || 0;
          }
          break;
        }

        case 'message_start': {
          if (event.message?.usage) {
            usage.input_tokens = event.message.usage.input_tokens || 0;
          }
          break;
        }
      }
    }
  }

  return { content, stopReason, usage };
}

/**
 * Run an agent with streaming agentic loop.
 * Text deltas are forwarded in real-time via callbacks.
 * Tool calls are executed between streaming cycles.
 */
export async function runAgentStreaming(
  config: AgentRunConfig,
  callbacks?: AgentStreamCallbacks
): Promise<AgentRunResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      output: '',
      contentBlocks: [],
      toolCallsLog: [],
      totalIterations: 0,
      stopReason: 'end_turn',
    };
  }

  const maxIterations = config.maxIterations ?? DEFAULT_MAX_ITERATIONS;
  const maxTokens = config.maxTokens ?? DEFAULT_MAX_TOKENS;
  const messages: AnthropicMessage[] = [...config.messages];
  const toolCallsLog: ToolCallLog[] = [];

  let iteration = 0;
  let lastContent: Array<TextBlock | ToolUseBlock> = [];
  let lastStopReason = 'end_turn';

  while (iteration < maxIterations) {
    iteration++;
    callbacks?.onIteration?.(iteration, 'starting');

    // Build request body
    const body: Record<string, unknown> = {
      model: config.model,
      max_tokens: maxTokens,
      system: config.systemPrompt,
      messages,
      stream: true,
    };

    if (config.tools && config.tools.length > 0) {
      body.tools = config.tools;
    }

    if (config.toolChoice) {
      body.tool_choice = config.toolChoice;
    }

    // Call Anthropic API with streaming
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return {
        success: false,
        output: `API error (${response.status}): ${errorText}`,
        contentBlocks: [],
        toolCallsLog,
        totalIterations: iteration,
        stopReason: 'end_turn',
      };
    }

    // Parse the streaming response, forwarding text deltas via callbacks
    const result = await parseStreamingResponse(response, callbacks);
    lastContent = result.content;
    lastStopReason = result.stopReason;

    callbacks?.onIteration?.(iteration, result.stopReason);

    // If not tool_use, we're done
    if (result.stopReason !== 'tool_use') {
      break;
    }

    // Handle tool_use
    if (!config.toolExecutor) {
      break;
    }

    // Append assistant message
    messages.push({
      role: 'assistant',
      content: result.content,
    });

    // Execute tool calls
    const toolResults: ToolResultBlock[] = [];
    const toolUseBlocks = result.content.filter(
      (block): block is ToolUseBlock => block.type === 'tool_use'
    );

    const executionContext: ToolExecutionContext = {
      agentId: config.agentId,
      projectId: config.projectId,
      sessionId: config.sessionId,
      repoFullName: config.repoFullName,
      activeBranch: config.activeBranch,
      onBranchCreated: config.onBranchCreated,
    };

    for (const toolUse of toolUseBlocks) {
      try {
        // Run pre-tool hooks
        if (config.hooks?.preToolUse) {
          let blocked = false;
          for (const hook of config.hooks.preToolUse) {
            const check = await hook(toolUse.name, toolUse.input, executionContext);
            if (!check.allow) {
              toolCallsLog.push({
                iteration,
                toolName: toolUse.name,
                input: toolUse.input,
                output: `Blocked by hook: ${check.reason}`,
                isError: true,
              });
              callbacks?.onToolResult?.(toolUse.name, `[BLOCKED] ${check.reason}`, true);
              toolResults.push({
                type: 'tool_result',
                tool_use_id: toolUse.id,
                content: `[BLOCKED] ${check.reason}`,
                is_error: true,
              });
              blocked = true;
              break;
            }
          }
          if (blocked) continue;
        }

        let execResult = await config.toolExecutor.execute(
          toolUse.name,
          toolUse.input,
          executionContext
        );

        // Run post-tool hooks
        if (config.hooks?.postToolUse) {
          for (const hook of config.hooks.postToolUse) {
            execResult = await hook(toolUse.name, toolUse.input, execResult, executionContext);
          }
        }

        toolCallsLog.push({
          iteration,
          toolName: toolUse.name,
          input: toolUse.input,
          output: execResult.content,
          isError: execResult.isError ?? false,
        });

        // Enrich error content with category info for the agent
        let resultContent = execResult.content;
        if (execResult.isError && execResult.errorCategory) {
          const guidance = execResult.isRetryable
            ? 'This error is retryable — try again or adjust your input.'
            : execResult.errorCategory === 'business'
            ? 'This is a policy/business constraint — use an alternative approach.'
            : execResult.errorCategory === 'permission'
            ? 'Access denied — escalate this to the PM or user.'
            : 'Fix the input and try again.';
          resultContent = `[${execResult.errorCategory.toUpperCase()}] ${execResult.content}\n\n${guidance}`;
        }

        callbacks?.onToolResult?.(toolUse.name, resultContent, execResult.isError ?? false);

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: resultContent,
          is_error: execResult.isError,
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        toolCallsLog.push({
          iteration,
          toolName: toolUse.name,
          input: toolUse.input,
          output: errorMessage,
          isError: true,
        });

        callbacks?.onToolResult?.(toolUse.name, errorMessage, true);

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: `Tool execution error: ${errorMessage}`,
          is_error: true,
        });
      }
    }

    // Append tool results as user message
    messages.push({
      role: 'user',
      content: toolResults,
    });
  }

  // Extract final output
  const contentBlocks = lastContent as ContentBlock[];
  const textOutput = lastContent
    .filter((block): block is TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n');

  const stopReason =
    iteration >= maxIterations && lastStopReason === 'tool_use'
      ? 'max_iterations'
      : (lastStopReason as AgentRunResult['stopReason']);

  return {
    success: true,
    output: textOutput,
    contentBlocks,
    toolCallsLog,
    totalIterations: iteration,
    stopReason,
  };
}
