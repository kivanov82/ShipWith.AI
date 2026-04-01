// Core types for ShipWith.AI

export type AgentId =
  | 'pm'
  | 'ux-analyst'
  | 'ui-designer'
  | 'ui-developer'
  | 'backend-developer'
  | 'solidity-developer'
  | 'solidity-auditor'
  | 'infrastructure'
  | 'qa-tester'
  | 'unit-tester'
  | 'tech-writer'
  | 'marketing';

export interface AgentConfig {
  id: AgentId;
  name: string;                    // e.g., "ShipWith.AI: FE Developer"
  model?: string;                  // Claude model override
  description: string;
  capabilities: string[];
  tools?: string[];                // Tool names available to this agent (4-5 max)
  outputTool?: string;             // Tool name for structured output (e.g., "submit_deliverable")
  pricing: AgentPricing;
  inputs: AgentIOSpec[];
  outputs: AgentIOSpec[];
  walletAddress?: string;          // ERC-8004 registered wallet
  erc8004TokenId?: string;         // NFT token ID after registration
}

export interface AgentPricing {
  baseRate: string;                // Base rate in USDC (e.g., "0.01")
  currency: 'USDC' | 'ETH';
  perUnit: 'task' | 'hour' | 'token';
}

export interface AgentIOSpec {
  name: string;
  type: 'text' | 'file' | 'artifact' | 'code';
  description: string;
  required: boolean;
}

export interface AgentState {
  id: AgentId;
  status: 'idle' | 'working' | 'waiting' | 'error';
  currentTask?: string;
  lastActivity: number;
}

// Event types
export type EventType =
  | 'task.created'
  | 'task.assigned'
  | 'task.started'
  | 'task.completed'
  | 'task.failed'
  | 'task.retrying'
  | 'task.escalated'
  | 'workflow.completed'
  | 'workflow.partial'
  | 'payment.requested'
  | 'payment.sent'
  | 'payment.received'
  | 'artifact.produced'
  | 'message.sent'
  | 'agent.status';

export interface AgentEvent {
  id: string;
  type: EventType;
  source: AgentId | 'system' | 'user';
  target?: AgentId;
  projectId?: string;
  payload: Record<string, unknown>;
  timestamp: number;
}

// Task types
export interface Task {
  id: string;
  projectId: string;
  title: string;
  description: string;
  assignee?: AgentId;
  requester: AgentId | 'user';
  status: 'pending' | 'in_progress' | 'review' | 'completed' | 'failed';
  priority: 'low' | 'medium' | 'high' | 'critical';
  dependencies: string[];          // Task IDs this depends on
  artifacts: Artifact[];
  payment?: Payment;
  createdAt: number;
  updatedAt: number;
}

export interface Artifact {
  id: string;
  taskId: string;
  type: 'code' | 'document' | 'design' | 'config' | 'test' | 'other';
  path: string;                    // Relative to project root
  description: string;
  producedBy: AgentId;
  createdAt: number;
}

export interface Payment {
  id: string;
  from: AgentId | 'user';
  to: AgentId;
  amount: string;
  currency: 'USDC' | 'ETH';
  status: 'pending' | 'completed' | 'failed';
  txHash?: string;
  taskId: string;
  createdAt: number;
}

// Project types
export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'planning' | 'active' | 'review' | 'completed' | 'archived';
  tasks: string[];                 // Task IDs
  budget?: string;
  createdAt: number;
  updatedAt: number;
}

// Memory types
export interface MemoryEntry {
  id: string;
  scope: 'global' | 'project';
  projectId?: string;
  category: 'decision' | 'learning' | 'context' | 'artifact';
  content: string;
  metadata: Record<string, unknown>;
  createdBy: AgentId | 'user';
  createdAt: number;
}

// Invocation types
export interface InvokeAgentRequest {
  agentId: AgentId;
  projectId?: string;
  taskId?: string;
  prompt: string;
  context?: Record<string, unknown>;
  mode: 'cli' | 'api';
}

export interface InvokeAgentResponse {
  success: boolean;
  agentId: AgentId;
  output?: string;
  artifacts?: Artifact[];
  events?: AgentEvent[];
  error?: string;
}

// --- Agentic Loop Types ---

// Content blocks matching Anthropic Messages API
export interface TextBlock {
  type: 'text';
  text: string;
}

export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string | Array<{ type: 'text'; text: string }>;
  is_error?: boolean;
}

export type ContentBlock = TextBlock | ToolUseBlock;

// Tool definition matching Anthropic API tools parameter
export interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, unknown>;
    required?: string[];
  };
}

// Tool execution interface
export interface ToolExecutor {
  execute(
    toolName: string,
    input: Record<string, unknown>,
    context: ToolExecutionContext
  ): Promise<ToolExecutionResult>;
}

export interface ToolExecutionContext {
  agentId: AgentId;
  projectId?: string;
  sessionId?: string;
  repoFullName?: string;
}

export interface ToolExecutionResult {
  content: string;
  isError?: boolean;
  artifacts?: Artifact[];
}

// Agent runner configuration
export type ToolChoiceParam =
  | { type: 'auto' }
  | { type: 'any' }
  | { type: 'tool'; name: string };

export interface AgentRunConfig {
  agentId: AgentId;
  model: string;
  systemPrompt: string;
  messages: Array<{
    role: 'user' | 'assistant';
    content: string | Array<ContentBlock | ToolResultBlock>;
  }>;
  tools?: ToolDefinition[];
  toolChoice?: ToolChoiceParam;
  toolExecutor?: ToolExecutor;
  maxTokens?: number;
  maxIterations?: number;
  projectId?: string;
  sessionId?: string;
}

export interface AgentRunResult {
  success: boolean;
  output: string;                  // Concatenated text from final response
  contentBlocks: ContentBlock[];   // All content blocks from final response
  toolCallsLog: ToolCallLog[];
  totalIterations: number;
  stopReason: 'end_turn' | 'max_tokens' | 'tool_use' | 'max_iterations';
}

export interface ToolCallLog {
  iteration: number;
  toolName: string;
  input: Record<string, unknown>;
  output: string;
  isError: boolean;
}

// Streaming callback types
export interface AgentStreamCallbacks {
  onText?: (text: string) => void;
  onToolCall?: (toolName: string, input: Record<string, unknown>) => void;
  onToolResult?: (toolName: string, result: string, isError: boolean) => void;
  onIteration?: (iteration: number, stopReason: string) => void;
}
