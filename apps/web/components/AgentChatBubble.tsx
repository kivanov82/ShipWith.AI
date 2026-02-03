'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, X, Loader2, Zap } from 'lucide-react';
import { useAgentverseStore, Agent } from '@/lib/store';
import { invokeAgent } from '@/lib/agent-client';

interface AgentChatBubbleProps {
  agent: Agent;
  onClose: () => void;
}

export function AgentChatBubble({ agent, onClose }: AgentChatBubbleProps) {
  const {
    chatMessages,
    addChatMessage,
    isRealMode,
    startInvocation,
    updateInvocationOutput,
    completeInvocation,
    failInvocation,
    getAgentInvocation,
    updateAgentStatus,
  } = useAgentverseStore();
  const [input, setInput] = useState('');
  const [isInvoking, setIsInvoking] = useState(false);
  const [streamingOutput, setStreamingOutput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get messages for this agent
  const agentMessages = chatMessages.filter(
    (m) => m.agentId === agent.id || (m.role === 'user' && chatMessages.some(
      (prev, idx) =>
        chatMessages.indexOf(m) > 0 &&
        chatMessages[chatMessages.indexOf(m) - 1]?.agentId === agent.id
    ))
  ).slice(-5);

  // Get the latest question from this agent
  const latestQuestion = chatMessages
    .filter((m) => m.agentId === agent.id && m.isQuestion)
    .slice(-1)[0];

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [agentMessages, streamingOutput]);

  const handleRealInvocation = async (prompt: string) => {
    setIsInvoking(true);
    setStreamingOutput('');
    updateAgentStatus(agent.id, 'thinking', 'Processing request...');

    const invocationId = startInvocation(agent.id, prompt);

    try {
      await invokeAgent({
        agentId: agent.id,
        prompt,
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
    if (!input.trim() || isInvoking) return;

    const prompt = input.trim();
    addChatMessage({ role: 'user', content: prompt });
    setInput('');

    if (isRealMode) {
      await handleRealInvocation(prompt);
    }
  };

  const handleOptionClick = async (option: string) => {
    addChatMessage({ role: 'user', content: option });

    if (isRealMode) {
      await handleRealInvocation(option);
    }
  };

  return (
    <motion.div
      className="absolute z-40 w-64"
      style={{
        right: '100%',
        top: '50%',
        transform: 'translateY(-50%)',
        marginRight: 16,
      }}
      initial={{ opacity: 0, x: 20, scale: 0.95 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      exit={{ opacity: 0, x: 20, scale: 0.95 }}
      transition={{ duration: 0.2 }}
    >
      <div className="bg-zinc-900 border border-zinc-700 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-3 py-2 border-b border-zinc-800 flex items-center gap-2">
          <div
            className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold"
            style={{ backgroundColor: agent.color, color: '#fff' }}
          >
            {agent.avatar}
          </div>
          <span className="flex-1 text-xs font-medium text-zinc-200">{agent.name}</span>
          <button
            onClick={onClose}
            className="p-1 hover:bg-zinc-800 rounded text-zinc-500 hover:text-zinc-300"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Pointer arrow */}
        <div
          className="absolute right-[-8px] top-1/2 -translate-y-1/2 w-0 h-0
            border-t-8 border-b-8 border-l-8
            border-t-transparent border-b-transparent border-l-zinc-700"
        />

        {/* Messages */}
        <div className="p-3 space-y-2 max-h-48 overflow-y-auto">
          {agentMessages.length === 0 && !streamingOutput ? (
            <div className="text-center py-3 text-zinc-600 text-[11px]">
              {isRealMode ? (
                <div className="flex items-center justify-center gap-1.5">
                  <Zap className="w-3 h-3 text-yellow-500" />
                  <span>Real mode - Send a prompt to {agent.name.split(' ')[0]}</span>
                </div>
              ) : (
                `Send a prompt to ${agent.name.split(' ')[0]}`
              )}
            </div>
          ) : (
            <>
              {agentMessages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[90%] rounded-lg px-2.5 py-1.5 ${
                        isUser
                          ? 'bg-white text-zinc-900'
                          : 'bg-zinc-800 text-zinc-200'
                      }`}
                    >
                      <p className="text-[11px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                );
              })}

              {/* Streaming output */}
              {streamingOutput && (
                <div className="flex justify-start">
                  <div className="max-w-[90%] rounded-lg px-2.5 py-1.5 bg-zinc-800 text-zinc-200 border border-yellow-500/30">
                    <p className="text-[11px] leading-relaxed whitespace-pre-wrap">{streamingOutput}</p>
                    <div className="flex items-center gap-1 mt-1 text-yellow-500">
                      <Loader2 className="w-2.5 h-2.5 animate-spin" />
                      <span className="text-[9px]">Generating...</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Options for questions */}
          {latestQuestion?.options && !isInvoking && (
            <div className="space-y-1 pt-1">
              {latestQuestion.options.map((opt, i) => (
                <button
                  key={i}
                  onClick={() => handleOptionClick(opt)}
                  disabled={isInvoking}
                  className="block w-full text-left text-[10px] px-2 py-1.5 rounded bg-zinc-800/50 border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800 text-zinc-300 transition-colors disabled:opacity-50"
                >
                  {opt}
                </button>
              ))}
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-2 border-t border-zinc-800">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isInvoking ? 'Waiting for response...' : 'Type a message...'}
              disabled={isInvoking}
              className="flex-1 px-2.5 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-[11px] text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isInvoking}
              className="px-2.5 py-1.5 bg-white text-zinc-900 rounded-lg hover:bg-zinc-200 disabled:bg-zinc-700 disabled:text-zinc-500 transition-colors"
            >
              {isInvoking ? (
                <Loader2 className="w-3 h-3 animate-spin" />
              ) : (
                <Send className="w-3 h-3" />
              )}
            </button>
          </div>
          {isRealMode && (
            <div className="mt-1.5 text-[9px] text-zinc-600 flex items-center gap-1">
              <Zap className="w-2.5 h-2.5 text-yellow-500" />
              Real mode: ~{agent.pricing}
            </div>
          )}
        </form>
      </div>
    </motion.div>
  );
}
