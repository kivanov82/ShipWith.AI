'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, MessageSquare } from 'lucide-react';
import { useShipWithAIStore, Agent } from '@/lib/store';
import { invokeAgent } from '@/lib/agent-client';

/** Render basic markdown: **bold**, *italic*, `code`, and newlines */
function renderMarkdown(text: string) {
  // Split by newlines first, then process inline formatting per line
  return text.split('\n').map((line, lineIdx, arr) => {
    // Process inline markdown: **bold**, *italic*, `code`
    const parts: React.ReactNode[] = [];
    // Regex matches: **bold**, *italic*, `code`, or plain text
    const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(line)) !== null) {
      // Push text before this match
      if (match.index > lastIndex) {
        parts.push(line.slice(lastIndex, match.index));
      }

      if (match[2]) {
        // **bold**
        parts.push(<strong key={`${lineIdx}-${match.index}`} className="font-semibold text-zinc-100">{match[2]}</strong>);
      } else if (match[3]) {
        // *italic*
        parts.push(<em key={`${lineIdx}-${match.index}`}>{match[3]}</em>);
      } else if (match[4]) {
        // `code`
        parts.push(<code key={`${lineIdx}-${match.index}`} className="px-1 py-0.5 rounded bg-zinc-700/60 text-emerald-300 text-[12px] font-mono">{match[4]}</code>);
      }

      lastIndex = match.index + match[0].length;
    }

    // Remaining text after last match
    if (lastIndex < line.length) {
      parts.push(line.slice(lastIndex));
    }

    // If the line is empty, just return a line break
    if (parts.length === 0 && line === '') {
      return lineIdx < arr.length - 1 ? <br key={lineIdx} /> : null;
    }

    return (
      <span key={lineIdx}>
        {parts}
        {lineIdx < arr.length - 1 && <br />}
      </span>
    );
  });
}

interface AgentChatPanelProps {
  activeAgent: Agent | null;
  autoStartAgent?: boolean;
  onSwitchAgent?: (agentId: string, autoStart?: boolean) => void;
}

// Map of agent display names to IDs for detecting handoff suggestions
const AGENT_NAME_TO_ID: Record<string, string> = {
  'ui designer': 'ui-designer',
  'ux analyst': 'ux-analyst',
  'fe developer': 'ui-developer',
  'frontend developer': 'ui-developer',
  'integration dev': 'backend-developer',
  'backend developer': 'backend-developer',
  'seo specialist': 'seo-specialist',
  'marketing': 'marketing',
  'payment integration': 'payment-integration',
  'e-commerce specialist': 'e-commerce-specialist',
  'mobile developer': 'mobile-developer',
  'infrastructure': 'infrastructure',
  'qa tester': 'qa-tester',
  'unit tester': 'unit-tester',
  'tech writer': 'tech-writer',
  'solidity dev': 'solidity-developer',
  'security auditor': 'solidity-auditor',
  'project manager': 'pm',
};

function detectSuggestedAgent(text: string, involvedAgents: string[]): string | null {
  const lower = text.toLowerCase();
  // Look for patterns like "talk to the UI Designer" or "move on to the E-commerce Specialist"
  const patterns = [
    /(?:talk to|move (?:on )?to|hand (?:you )?off to|suggest (?:chatting|speaking|talking) (?:with|to)|let'?s? (?:bring in|involve|move to)|next.*?(?:would be|should be|is)) (?:the |our )?(.+?)(?:\.|,|!|\?|$)/gi,
    /(?:recommend|suggest) (?:the |our )?(.+?) (?:next|as the next|for this)/gi,
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(lower)) !== null) {
      const name = match[1].trim();
      // Check against known agent names
      for (const [agentName, agentId] of Object.entries(AGENT_NAME_TO_ID)) {
        if (name.includes(agentName) && involvedAgents.includes(agentId)) {
          return agentId;
        }
      }
    }
  }
  return null;
}

export function AgentChatPanel({ activeAgent, autoStartAgent, onSwitchAgent }: AgentChatPanelProps) {
  const {
    chatMessages,
    addChatMessage,
    agents,
    startInvocation,
    updateInvocationOutput,
    completeInvocation,
    failInvocation,
    updateAgentStatus,
    activeSession,
    activeProjectId,
    addAgentToSession,
    updateSessionContext,
  } = useShipWithAIStore();

  const [input, setInput] = useState('');
  const [isInvoking, setIsInvoking] = useState(false);
  const [streamingOutput, setStreamingOutput] = useState('');
  // Track suggested next agent per source agent (survives agent deselect/reselect)
  const [suggestedHandoffs, setSuggestedHandoffs] = useState<Record<string, string>>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pendingAgentRef = useRef<string | null>(null);

  // Only show messages for the currently selected agent
  const allMessages = activeAgent
    ? chatMessages.filter((m) => m.agentId === activeAgent.id).slice(-30)
    : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [allMessages, streamingOutput]);

  // When user switches away from an agent, summarize that agent's conversation
  useEffect(() => {
    const pendingId = pendingAgentRef.current;
    if (pendingId && activeAgent?.id !== pendingId) {
      const agent = agents.find((a) => a.id === pendingId);
      if (agent) {
        summarizeContext(agent);
      }
      pendingAgentRef.current = null;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAgent?.id]);

  // Auto-start: PM on fresh session, or any agent after handoff
  const autoStartedRef = useRef<Set<string>>(new Set());

  // Auto-start agent after handoff
  useEffect(() => {
    if (autoStartAgent && activeAgent && activeSession) {
      const agentMessages = chatMessages.filter((m) => m.agentId === activeAgent.id);

      if (agentMessages.length === 0 && !autoStartedRef.current.has(`${activeSession.id}-${activeAgent.id}`)) {
        autoStartedRef.current.add(`${activeSession.id}-${activeAgent.id}`);
        addAgentToSession(activeSession.id, activeAgent.id);

        const prompt = `You've been brought in by the Project Manager to help with this project. Review the context from other specialists below and start by asking the USER 1-2 specific questions relevant to your expertise. Be direct and get to the point — the user has already discussed the general vision with the PM.`;
        addChatMessage({ role: 'user', content: `The PM has brought you in to help with this project.`, agentId: activeAgent.id });
        handleRealInvocation(activeAgent, prompt);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAgent?.id]);

  // PM auto-start on fresh session
  useEffect(() => {
    if (
      activeAgent?.id === 'pm' &&
      activeSession &&
      chatMessages.length === 0 &&
      !isInvoking &&
      !autoStartedRef.current.has(`${activeSession.id}-pm`)
    ) {
      autoStartedRef.current.add(`${activeSession.id}-pm`);
      const brief = activeSession.description || '';
      if (brief) {
        addChatMessage({ role: 'user', content: `Here's my project brief:\n\n${brief}`, agentId: 'pm' });
        addAgentToSession(activeSession.id, 'pm');
        handleRealInvocation(activeAgent, `The user just completed the project wizard. Here is their project brief:\n\n${brief}\n\nIntroduce yourself briefly, summarize what you understood from their brief, then ask the USER 1-2 specific clarifying questions about their project. Do NOT delegate to other agents yet — your job right now is to understand the user's vision by talking to THEM directly.`);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeAgent?.id, activeSession?.id, chatMessages.length]);

  const getAgent = (agentId?: string) => {
    if (!agentId) return null;
    return agents.find((a) => a.id === agentId) || null;
  };

  // Summarize conversation context after an agent reply
  const summarizeContext = (agent: Agent) => {
    if (!activeSession) return;
    fetch(`/api/sessions/${activeSession.id}/summarize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        agentId: agent.id,
        agentName: agent.name,
        agentRole: agent.role,
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.context) {
          // Update local session context with all agent summaries
          Object.entries(data.context).forEach(([aid, summary]) => {
            updateSessionContext(activeSession.id, aid, summary as string);
          });
        }
      })
      .catch(() => {}); // Fire-and-forget
  };

  const handleRealInvocation = async (agent: Agent, prompt: string, otherAgentContext?: Record<string, string>) => {
    setIsInvoking(true);
    setStreamingOutput('');
    updateAgentStatus(agent.id, 'thinking', 'Thinking...');
    const invocationStartTime = Date.now();

    const invocationId = startInvocation(agent.id, prompt, 'chat');

    // Build context object including other agents' summaries and available team
    const teamAgents = activeSession?.involvedAgents
      .filter((id) => id !== agent.id)
      .map((id) => {
        const a = agents.find((x) => x.id === id);
        return a ? `${a.name} (${a.role})` : id;
      }) ?? [];

    const context: Record<string, unknown> = {};
    if (otherAgentContext && Object.keys(otherAgentContext).length > 0) {
      context.otherAgents = otherAgentContext;
    }
    if (teamAgents.length > 0) {
      context.availableTeam = teamAgents;
    }
    // Include persistent project facts if available
    if (activeSession?.projectFacts) {
      context.projectFacts = activeSession.projectFacts;
    }

    // Build conversation history for this agent
    const history = chatMessages
      .filter((m) => m.agentId === agent.id)
      .map((m) => ({ role: m.role as 'user' | 'agent', content: m.content }));

    try {
      await invokeAgent({
        agentId: agent.id,
        prompt,
        projectId: activeProjectId || undefined,
        context,
        history,
        stream: true,
        onStream: (chunk) => {
          setStreamingOutput((prev) => prev + chunk);
          updateInvocationOutput(invocationId, chunk);
          const elapsed = Math.round((Date.now() - invocationStartTime) / 1000);
          updateAgentStatus(agent.id, 'working', `Generating... ${elapsed}s`);
        },
        onToolCall: (event) => {
          // Auto-trigger handoff when PM uses request_handoff tool
          if (event.toolName === 'request_handoff' && event.input?.targetAgent) {
            const targetId = event.input.targetAgent as string;
            setSuggestedHandoffs((prev) => ({ ...prev, [agent.id]: targetId }));
          }
          const elapsed = Math.round((Date.now() - invocationStartTime) / 1000);
          updateAgentStatus(agent.id, 'working', `${event.toolName} · ${elapsed}s`);
        },
        onIteration: (iteration, stopReason) => {
          const elapsed = Math.round((Date.now() - invocationStartTime) / 1000);
          if (stopReason === 'tool_use') {
            updateAgentStatus(agent.id, 'working', `Processing tools · ${elapsed}s`);
          } else if (stopReason === 'starting' && iteration > 1) {
            updateAgentStatus(agent.id, 'working', `Continuing · ${elapsed}s`);
          }
        },
        onComplete: (response) => {
          const output = response.output || (response.stopReason === 'max_tokens'
            ? 'I ran out of space generating the response. Let me try with a simpler approach — could you ask me to focus on one specific deliverable at a time?'
            : '');
          completeInvocation(invocationId, output);
          if (output) {
            addChatMessage({
              role: 'agent',
              agentId: agent.id,
              content: output,
            });
          }
          setStreamingOutput('');
          updateAgentStatus(agent.id, 'idle');

          // Mark that this agent has unsummarized messages
          pendingAgentRef.current = agent.id;

          // Fallback: detect handoff from text if tools didn't trigger it
          if (activeSession && !suggestedHandoffs[agent.id]) {
            const suggested = detectSuggestedAgent(response.output, activeSession.involvedAgents);
            if (suggested && suggested !== agent.id) {
              setSuggestedHandoffs((prev) => ({ ...prev, [agent.id]: suggested }));
            }
          }
        },
        onError: (error) => {
          failInvocation(invocationId, error.message);
          addChatMessage({
            role: 'agent',
            agentId: agent.id,
            content: `Error: ${error.message}`,
          });
          setStreamingOutput('');
          updateAgentStatus(agent.id, 'error');
        },
      });
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      failInvocation(invocationId, errorMsg);
      updateAgentStatus(agent.id, 'error');
    } finally {
      setIsInvoking(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isInvoking || !activeAgent) return;

    const prompt = input.trim();
    addChatMessage({ role: 'user', content: prompt, agentId: activeAgent.id });
    setInput('');

    if (activeSession) {
      addAgentToSession(activeSession.id, activeAgent.id);
    }

    // Build context from other agents to pass along
    const sessionContext = activeSession?.context ?? {};
    const otherContext = Object.entries(sessionContext)
      .filter(([id]) => id !== activeAgent.id)
      .reduce((acc, [id, summary]) => ({ ...acc, [id]: summary }), {} as Record<string, string>);

    await handleRealInvocation(activeAgent, prompt, otherContext);
  };

  const handleOptionClick = async (option: string) => {
    if (!activeAgent) return;
    addChatMessage({ role: 'user', content: option, agentId: activeAgent.id });

    const sessionContext = activeSession?.context ?? {};
    const otherContext = Object.entries(sessionContext)
      .filter(([id]) => id !== activeAgent.id)
      .reduce((acc, [id, summary]) => ({ ...acc, [id]: summary }), {} as Record<string, string>);

    await handleRealInvocation(activeAgent, option, otherContext);
  };

  // Latest unanswered question from active agent
  const latestQuestion = (() => {
    if (!activeAgent) return null;
    const agentMsgs = chatMessages.filter((m) => m.agentId === activeAgent.id);
    const lastQuestion = agentMsgs.filter((m) => m.isQuestion).slice(-1)[0];
    if (!lastQuestion) return null;
    // Check if user replied after this question
    const userRepliedAfter = agentMsgs.some(
      (m) => m.role === 'user' && m.timestamp > lastQuestion.timestamp
    );
    return userRepliedAfter ? null : lastQuestion;
  })();

  return (
    <div className="w-full flex flex-col">
      <div className="overflow-hidden flex flex-col max-h-full">
        {/* Header */}
        <div className="px-6 py-3 flex items-center gap-3 shrink-0">
          {activeAgent ? (
            <>
              <div
                className="w-7 h-7 rounded-md flex items-center justify-center text-sm font-bold"
                style={{ backgroundColor: activeAgent.color, color: '#fff' }}
              >
                {activeAgent.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-zinc-200">{activeAgent.name}</div>
                <div className="text-xs text-zinc-500 truncate">{activeAgent.role}</div>
              </div>
            </>
          ) : (
            <>
              <MessageSquare className="w-5 h-5 text-zinc-600" />
              <span className="text-sm font-medium text-zinc-400">Select an agent to chat</span>
            </>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5 min-h-[160px] max-h-[55vh]">
          {allMessages.length === 0 && !streamingOutput ? (
            <div className="text-center py-8">
              <MessageSquare className="w-7 h-7 mx-auto mb-3 text-zinc-700" />
              <p className="text-sm text-zinc-500">
                {activeAgent
                  ? `Start a conversation with ${activeAgent.name.split(' ')[0]}`
                  : 'Click on any agent to begin'}
              </p>
            </div>
          ) : (
            <>
              {allMessages.map((msg) => {
                const isUser = msg.role === 'user';
                const agent = getAgent(msg.agentId);

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-2.5`}
                  >
                    {!isUser && agent && (
                      <div
                        className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold shrink-0 mt-1"
                        style={{ backgroundColor: agent.color, color: '#fff' }}
                      >
                        {agent.avatar}
                      </div>
                    )}
                    <div
                      className={`max-w-[90%] rounded-lg px-4 py-3 ${
                        isUser
                          ? 'bg-zinc-700/60 text-zinc-100 border border-zinc-600/30'
                          : 'bg-zinc-800/40 text-zinc-300 border border-zinc-700/30'
                      }`}
                    >
                      {!isUser && agent && (
                        <p className="text-[11px] font-medium mb-1.5 opacity-70" style={{ color: agent.color }}>
                          {agent.name}
                        </p>
                      )}
                      <div className="text-[13px] leading-[1.7]">{renderMarkdown(msg.content)}</div>
                    </div>
                  </motion.div>
                );
              })}

              {/* Streaming output */}
              {streamingOutput && activeAgent && (
                <div className="flex justify-start gap-2.5">
                  <div
                    className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold shrink-0 mt-1"
                    style={{ backgroundColor: activeAgent.color, color: '#fff' }}
                  >
                    {activeAgent.avatar}
                  </div>
                  <div className="max-w-[90%] rounded-lg px-4 py-3 bg-zinc-800/40 text-zinc-300 border border-zinc-700/30">
                    <p className="text-[11px] font-medium mb-1.5 opacity-70" style={{ color: activeAgent.color }}>
                      {activeAgent.name}
                    </p>
                    <div className="text-[13px] leading-[1.7]">{renderMarkdown(streamingOutput)}</div>
                    <div className="flex items-center gap-1.5 mt-2 text-zinc-500">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span className="text-[11px]">Generating...</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Quick-reply options */}
          {latestQuestion?.options && !isInvoking && (
            <div className="space-y-1.5 pt-2">
              {latestQuestion.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleOptionClick(opt)}
                  disabled={isInvoking}
                  className="block w-full text-left text-[13px] px-4 py-2.5 rounded-lg bg-zinc-800/30 border border-zinc-700/30 hover:border-zinc-600/50 hover:bg-zinc-800/50 text-zinc-300 transition-colors disabled:opacity-50"
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          {/* Handoff button — shown when current agent suggests talking to another */}
          {activeAgent && suggestedHandoffs[activeAgent.id] && !isInvoking && onSwitchAgent && (() => {
            const nextAgentId = suggestedHandoffs[activeAgent.id];
            const nextAgent = agents.find((a) => a.id === nextAgentId);
            if (!nextAgent) return null;
            return (
              <motion.div
                className="pt-2"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <button
                  onClick={() => {
                    // Trigger summarization before switching
                    summarizeContext(activeAgent);
                    onSwitchAgent(nextAgentId, true);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg border border-emerald-500/20 bg-emerald-500/5 hover:bg-emerald-500/10 transition-all text-left"
                >
                  <div
                    className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold shrink-0"
                    style={{ backgroundColor: nextAgent.color, color: '#fff' }}
                  >
                    {nextAgent.avatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-emerald-400">
                      Continue with {nextAgent.name}
                    </p>
                    <p className="text-[11px] text-zinc-500">{nextAgent.role}</p>
                  </div>
                  <svg className="w-4 h-4 text-emerald-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </button>
              </motion.div>
            );
          })()}

          <div ref={messagesEndRef} />
        </div>

        {/* Input — Grok-style wide bar */}
        <form onSubmit={handleSubmit} className="px-4 pb-4 pt-2 shrink-0">
          <div className="relative flex items-end bg-zinc-800/50 border border-zinc-700/40 rounded-xl hover:border-zinc-600/50 focus-within:border-zinc-500/60 transition-colors">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit(e);
                }
              }}
              placeholder={
                !activeAgent
                  ? 'Select an agent first...'
                  : isInvoking
                  ? 'Waiting for response...'
                  : `Message ${activeAgent.name.split(' ')[0]}...`
              }
              disabled={isInvoking || !activeAgent}
              rows={1}
              className="flex-1 px-5 py-3.5 bg-transparent text-sm text-zinc-200 placeholder-zinc-600 focus:outline-none disabled:opacity-40 resize-none leading-relaxed"
            />
            <button
              type="submit"
              disabled={!input.trim() || isInvoking || !activeAgent}
              className="m-2 p-2 rounded-lg bg-zinc-100 hover:bg-white disabled:bg-zinc-700 disabled:text-zinc-500 text-zinc-900 transition-all shrink-0"
            >
              {isInvoking ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </button>
          </div>
          {activeAgent && activeSession && (
            <div className="mt-2 px-1 text-[11px] text-zinc-600">
              Building context for &ldquo;{activeSession.name}&rdquo;
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
