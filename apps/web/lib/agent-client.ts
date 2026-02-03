// Client for invoking agents from the UI

export interface InvokeOptions {
  agentId: string;
  prompt: string;
  projectId?: string;
  context?: Record<string, unknown>;
  stream?: boolean;
  onStream?: (chunk: string) => void;
  onComplete?: (response: AgentResponse) => void;
  onError?: (error: Error) => void;
}

export interface AgentResponse {
  success: boolean;
  output: string;
  error?: string;
}

export interface AgentConfig {
  id: string;
  name: string;
  description: string;
  capabilities: string[];
  pricing: {
    baseRate: string;
    currency: string;
    perUnit: string;
  };
}

/**
 * Invoke an agent with a prompt
 * Supports both streaming and non-streaming modes
 */
export async function invokeAgent(options: InvokeOptions): Promise<AgentResponse> {
  const { agentId, prompt, projectId, context, stream, onStream, onComplete, onError } = options;

  const url = `/api/agents/${agentId}/invoke${stream ? '?stream=true' : ''}`;

  try {
    if (stream && onStream) {
      // Streaming mode
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, projectId, context }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to invoke agent');
      }

      if (!response.body) {
        throw new Error('No response body for streaming');
      }

      // Read the stream
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let fullOutput = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });

        // Parse SSE events
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              break;
            }
            try {
              const parsed = JSON.parse(data);
              if (parsed.text) {
                fullOutput += parsed.text;
                onStream(parsed.text);
              }
            } catch {
              // Non-JSON data, treat as plain text
              fullOutput += data;
              onStream(data);
            }
          }
        }
      }

      const result: AgentResponse = { success: true, output: fullOutput };
      onComplete?.(result);
      return result;
    } else {
      // Non-streaming mode
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, projectId, context }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to invoke agent');
      }

      const result: AgentResponse = {
        success: data.success,
        output: data.output,
        error: data.error,
      };

      onComplete?.(result);
      return result;
    }
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    onError?.(err);
    return { success: false, output: '', error: err.message };
  }
}

/**
 * Get agent configuration
 */
export async function getAgentConfig(agentId: string): Promise<AgentConfig | null> {
  try {
    const response = await fetch(`/api/agents/${agentId}/invoke`);
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

/**
 * Get cost estimate for invoking an agent
 */
export function getCostEstimate(config: AgentConfig): string {
  const { baseRate, currency, perUnit } = config.pricing;
  return `~${baseRate} ${currency}/${perUnit}`;
}

/**
 * List all available agents with their configs
 */
export const AGENT_IDS = [
  'pm',
  'ux-analyst',
  'ui-designer',
  'ui-developer',
  'backend-developer',
  'solidity-developer',
  'solidity-auditor',
  'infrastructure',
  'qa-tester',
  'unit-tester',
  'tech-writer',
  'marketing',
] as const;

export type AgentId = typeof AGENT_IDS[number];
