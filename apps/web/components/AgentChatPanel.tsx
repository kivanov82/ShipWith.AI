'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader2, MessageSquare } from 'lucide-react';
import { useShipWithAIStore, Agent } from '@/lib/store';
import { invokeAgent } from '@/lib/agent-client';

interface AgentChatPanelProps {
  activeAgent: Agent | null;
}

export function AgentChatPanel({ activeAgent }: AgentChatPanelProps) {
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
    addAgentToSession,
    updateSessionContext,
  } = useShipWithAIStore();

  const [input, setInput] = useState('');
  const [isInvoking, setIsInvoking] = useState(false);
  const [streamingOutput, setStreamingOutput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pendingAgentRef = useRef<string | null>(null);

  // All messages across agents, most recent last
  const allMessages = chatMessages.slice(-30);

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

  // Auto-start: when PM is selected and no messages exist, have PM introduce itself
  const autoStartedRef = useRef<string | null>(null);
  useEffect(() => {
    if (
      activeAgent?.id === 'pm' &&
      activeSession &&
      chatMessages.length === 0 &&
      !isInvoking &&
      autoStartedRef.current !== activeSession.id
    ) {
      autoStartedRef.current = activeSession.id;
      const brief = activeSession.description || '';
      if (brief) {
        // Send the project brief as an automatic first message from the user
        addChatMessage({ role: 'user', content: `Here's my project brief:\n\n${brief}`, agentId: 'pm' });
        addAgentToSession(activeSession.id, 'pm');
        handleRealInvocation(activeAgent, `The user just completed the project wizard. Here is their project brief:\n\n${brief}\n\nIntroduce yourself briefly, summarize what you understood from their brief, and ask 1-2 clarifying questions to get started.`);
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

    const invocationId = startInvocation(agent.id, prompt, 'chat');

    // Build context object including other agents' summaries
    const context = otherAgentContext && Object.keys(otherAgentContext).length > 0
      ? { otherAgents: otherAgentContext }
      : undefined;

    try {
      await invokeAgent({
        agentId: agent.id,
        prompt,
        context,
        stream: true,
        onStream: (chunk) => {
          setStreamingOutput((prev) => prev + chunk);
          updateInvocationOutput(invocationId, chunk);
          updateAgentStatus(agent.id, 'working', 'Generating response...');
        },
        onComplete: (response) => {
          completeInvocation(invocationId, response.output);
          addChatMessage({
            role: 'agent',
            agentId: agent.id,
            content: response.output,
          });
          setStreamingOutput('');
          updateAgentStatus(agent.id, 'idle');

          // Mark that this agent has unsummarized messages
          pendingAgentRef.current = agent.id;
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

  // Latest question from active agent
  const latestQuestion = activeAgent
    ? chatMessages
        .filter((m) => m.agentId === activeAgent.id && m.isQuestion)
        .slice(-1)[0]
    : null;

  return (
    <div className="absolute top-4 left-4 z-40 w-80 max-h-[60vh] flex flex-col">
      <div className="glass rounded-2xl shadow-2xl shadow-black/30 overflow-hidden flex flex-col max-h-full">
        {/* Header */}
        <div className="px-4 py-3 border-b border-zinc-800/60 flex items-center gap-2.5 shrink-0">
          {activeAgent ? (
            <>
              <div
                className="w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ring-1 ring-white/10"
                style={{ backgroundColor: activeAgent.color, color: '#fff' }}
              >
                {activeAgent.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-zinc-200">{activeAgent.name}</div>
                <div className="text-[10px] text-zinc-500 truncate">{activeAgent.role}</div>
              </div>
            </>
          ) : (
            <>
              <MessageSquare className="w-4 h-4 text-zinc-600" />
              <span className="text-xs font-medium text-zinc-400">Select an agent to chat</span>
            </>
          )}
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-3 space-y-2 min-h-[120px] max-h-[40vh]">
          {allMessages.length === 0 && !streamingOutput ? (
            <div className="text-center py-6">
              <MessageSquare className="w-6 h-6 mx-auto mb-2 text-zinc-700" />
              <p className="text-[11px] text-zinc-500">
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
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'} gap-2`}
                  >
                    {!isUser && agent && (
                      <div
                        className="w-5 h-5 rounded-md flex items-center justify-center text-[8px] font-bold shrink-0 mt-0.5"
                        style={{ backgroundColor: agent.color, color: '#fff' }}
                      >
                        {agent.avatar}
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-xl px-3 py-2 ${
                        isUser
                          ? 'bg-zinc-700/80 text-zinc-100'
                          : 'bg-zinc-800/60 text-zinc-300'
                      }`}
                    >
                      {!isUser && agent && (
                        <p className="text-[9px] font-semibold mb-0.5" style={{ color: agent.color }}>
                          {agent.name}
                        </p>
                      )}
                      <p className="text-[11px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </motion.div>
                );
              })}

              {/* Streaming output */}
              {streamingOutput && activeAgent && (
                <div className="flex justify-start gap-2">
                  <div
                    className="w-5 h-5 rounded-md flex items-center justify-center text-[8px] font-bold shrink-0 mt-0.5"
                    style={{ backgroundColor: activeAgent.color, color: '#fff' }}
                  >
                    {activeAgent.avatar}
                  </div>
                  <div className="max-w-[85%] rounded-xl px-3 py-2 bg-zinc-800/60 text-zinc-300 border border-amber-500/20">
                    <p className="text-[9px] font-semibold mb-0.5" style={{ color: activeAgent.color }}>
                      {activeAgent.name}
                    </p>
                    <p className="text-[11px] leading-relaxed whitespace-pre-wrap">{streamingOutput}</p>
                    <div className="flex items-center gap-1 mt-1 text-amber-400">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      <span className="text-[9px]">Generating...</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Quick-reply options */}
          {latestQuestion?.options && !isInvoking && (
            <div className="space-y-1 pt-1">
              {latestQuestion.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleOptionClick(opt)}
                  disabled={isInvoking}
                  className="block w-full text-left text-[10px] px-2.5 py-1.5 rounded-lg bg-zinc-800/40 border border-zinc-700/50 hover:border-zinc-600 hover:bg-zinc-800/60 text-zinc-300 transition-colors disabled:opacity-50"
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-2.5 border-t border-zinc-800/60 shrink-0">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={
                !activeAgent
                  ? 'Select an agent first...'
                  : isInvoking
                  ? 'Waiting for response...'
                  : `Message ${activeAgent.name.split(' ')[0]}...`
              }
              disabled={isInvoking || !activeAgent}
              className="flex-1 px-3 py-2 bg-zinc-800/60 border border-zinc-700/50 rounded-xl text-[11px] text-zinc-200 placeholder-zinc-600 focus:outline-none focus:border-zinc-600 disabled:opacity-40"
            />
            <button
              type="submit"
              disabled={!input.trim() || isInvoking || !activeAgent}
              className="px-3 py-2 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:from-zinc-700 disabled:to-zinc-700 disabled:text-zinc-500 text-white rounded-xl transition-all"
            >
              {isInvoking ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Send className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
          {activeAgent && (
            <div className="mt-1.5 text-[9px] text-zinc-600">
              {activeSession
                ? `Building context for "${activeSession.name}"`
                : 'Free chat — start a session to track context'}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
