'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot } from 'lucide-react';
import { useShipWithAIStore } from '@/lib/store';

export function UserChatPanel() {
  const {
    chatMessages,
    addChatMessage,
    isAgentTyping,
    currentAgentTyping,
    agents,
  } = useShipWithAIStore();

  const [input, setInput] = useState('');

  const typingAgent = currentAgentTyping ? agents.find(a => a.id === currentAgentTyping) : null;
  const recentMessages = chatMessages.slice(-4);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    addChatMessage({ role: 'user', content: input.trim() });
    setInput('');
  };

  const handleOptionClick = (option: string) => {
    addChatMessage({ role: 'user', content: option });
  };

  const getAgent = (id: string) => agents.find(a => a.id === id);

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl overflow-hidden shadow-xl">
        {/* Header */}
        <div className="px-3 py-2 border-b border-zinc-800 flex items-center gap-2">
          <Bot className="w-4 h-4 text-zinc-500" />
          <span className="text-xs font-medium text-zinc-400">Agent Chat</span>
          {recentMessages.length > 0 && (
            <span className="text-[10px] text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded-full ml-auto">
              {chatMessages.length}
            </span>
          )}
        </div>

        {/* Messages */}
        <div className="p-2 space-y-2 max-h-48 overflow-y-auto">
          {recentMessages.length === 0 ? (
            <div className="text-center py-4 text-zinc-600 text-xs">
              Agents will ask questions here
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {recentMessages.map((msg) => {
                const agent = getAgent(msg.agentId || '');
                const isUser = msg.role === 'user';

                return (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, y: 5 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div className={`max-w-[85%] ${isUser ? '' : 'flex gap-1.5'}`}>
                      {!isUser && agent && (
                        <div
                          className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-semibold shrink-0"
                          style={{ backgroundColor: agent.color, color: '#fff' }}
                        >
                          {agent.avatar}
                        </div>
                      )}
                      <div>
                        {!isUser && agent && (
                          <span className="text-[9px] text-zinc-500 ml-0.5">{agent.name.split(' ')[0]}</span>
                        )}
                        <div
                          className={`rounded-lg px-2.5 py-1.5 ${
                            isUser
                              ? 'bg-white text-zinc-900'
                              : 'bg-zinc-800 text-zinc-200'
                          }`}
                        >
                          <p className="text-[11px] leading-relaxed">{msg.content}</p>
                        </div>
                        {msg.isQuestion && msg.options && (
                          <div className="mt-1.5 space-y-1">
                            {msg.options.map((opt, i) => (
                              <button
                                key={i}
                                onClick={() => handleOptionClick(opt)}
                                className="block w-full text-left text-[10px] px-2 py-1.5 rounded bg-zinc-800/50 border border-zinc-700 hover:border-zinc-600 hover:bg-zinc-800 text-zinc-300 transition-colors"
                              >
                                {opt}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          )}

          {isAgentTyping && typingAgent && (
            <div className="flex items-center gap-1.5">
              <div
                className="w-5 h-5 rounded flex items-center justify-center text-[9px] font-semibold"
                style={{ backgroundColor: typingAgent.color, color: '#fff' }}
              >
                {typingAgent.avatar}
              </div>
              <div className="flex gap-1">
                <motion.div
                  className="w-1.5 h-1.5 bg-zinc-500 rounded-full"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0 }}
                />
                <motion.div
                  className="w-1.5 h-1.5 bg-zinc-500 rounded-full"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.2 }}
                />
                <motion.div
                  className="w-1.5 h-1.5 bg-zinc-500 rounded-full"
                  animate={{ opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1, repeat: Infinity, delay: 0.4 }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="p-2 border-t border-zinc-800">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your response..."
              className="flex-1 px-3 py-1.5 bg-zinc-800 border border-zinc-700 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600"
            />
            <button
              type="submit"
              disabled={!input.trim()}
              className="px-3 py-1.5 bg-white text-zinc-900 rounded-lg hover:bg-zinc-200 disabled:bg-zinc-700 disabled:text-zinc-500 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
