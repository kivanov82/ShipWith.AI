/**
 * Agent Runner — Core agentic loop for ShipWith.AI
 *
 * Calls the Anthropic Messages API in a loop:
 *   1. Send messages (with optional tools) to Claude
 *   2. Check stop_reason on response
 *   3. If tool_use: execute tools via ToolExecutor, append results, continue loop
 *   4. If end_turn: return final output
 *   5. Enforce maxIterations to prevent infinite loops
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
} from './types';

const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_MAX_ITERATIONS = 10;
const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | Array<ContentBlock | ToolResultBlock>;
}

interface AnthropicResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  content: Array<TextBlock | ToolUseBlock>;
  stop_reason: 'end_turn' | 'max_tokens' | 'tool_use' | 'stop_sequence';
  usage: { input_tokens: number; output_tokens: number };
}

/**
 * Run an agent with the agentic loop (non-streaming).
 * Returns the final result after all tool calls are resolved.
 */
export async function runAgent(config: AgentRunConfig): Promise<AgentRunResult> {
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
  let lastResponse: AnthropicResponse | null = null;

  while (iteration < maxIterations) {
    iteration++;

    // Build request body
    const body: Record<string, unknown> = {
      model: config.model,
      max_tokens: maxTokens,
      system: config.systemPrompt,
      messages,
    };

    if (config.tools && config.tools.length > 0) {
      body.tools = config.tools;
    }

    if (config.toolChoice) {
      body.tool_choice = config.toolChoice;
    }

    // Call Anthropic API
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

    lastResponse = (await response.json()) as AnthropicResponse;

    // Check stop reason
    if (lastResponse.stop_reason !== 'tool_use') {
      // end_turn or max_tokens — we're done
      break;
    }

    // Handle tool_use: extract tool calls, execute them, append results
    if (!config.toolExecutor) {
      // No executor provided — treat as end_turn
      break;
    }

    // Append assistant message with all content blocks (text + tool_use)
    messages.push({
      role: 'assistant',
      content: lastResponse.content,
    });

    // Execute each tool call and build tool_result blocks
    const toolResults: ToolResultBlock[] = [];
    const toolUseBlocks = lastResponse.content.filter(
      (block): block is ToolUseBlock => block.type === 'tool_use'
    );

    const executionContext: ToolExecutionContext = {
      agentId: config.agentId,
      projectId: config.projectId,
      sessionId: config.sessionId,
    };

    for (const toolUse of toolUseBlocks) {
      try {
        const result = await config.toolExecutor.execute(
          toolUse.name,
          toolUse.input,
          executionContext
        );

        toolCallsLog.push({
          iteration,
          toolName: toolUse.name,
          input: toolUse.input,
          output: result.content,
          isError: result.isError ?? false,
        });

        toolResults.push({
          type: 'tool_result',
          tool_use_id: toolUse.id,
          content: result.content,
          is_error: result.isError,
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
  if (!lastResponse) {
    return {
      success: false,
      output: 'No response from API',
      contentBlocks: [],
      toolCallsLog,
      totalIterations: iteration,
      stopReason: 'end_turn',
    };
  }

  const contentBlocks = lastResponse.content as ContentBlock[];
  const textOutput = lastResponse.content
    .filter((block): block is TextBlock => block.type === 'text')
    .map((block) => block.text)
    .join('\n');

  const stopReason =
    iteration >= maxIterations && lastResponse.stop_reason === 'tool_use'
      ? 'max_iterations'
      : (lastResponse.stop_reason as AgentRunResult['stopReason']);

  return {
    success: true,
    output: textOutput,
    contentBlocks,
    toolCallsLog,
    totalIterations: iteration,
    stopReason,
  };
}
