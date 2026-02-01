'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgentverseStore } from '@/lib/store';
import { Send, Bot } from 'lucide-react';

export function SimpleChatInterface() {
  const { chatMessages, addChatMessage, agents, isAgentTyping, currentAgentTyping } = useAgentverseStore();
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isAgentTyping]);

  const getAgent = (id?: string) => agents.find((a) => a.id === id);
  const typingAgent = currentAgentTyping ? getAgent(currentAgentTyping) : null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    addChatMessage({ role: 'user', content: input.trim() });
    setInput('');
  };

  const handleOptionClick = (option: string) => {
    addChatMessage({ role: 'user', content: option });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {chatMessages.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Bot className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Agents will ask questions here</p>
          </div>
        ) : (
          <AnimatePresence>
            {chatMessages.map((msg) => {
              const agent = getAgent(msg.agentId);
              const isUser = msg.role === 'user';

              return (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2 ${
                      isUser
                        ? 'bg-blue-600 text-white rounded-br-md'
                        : 'bg-gray-800 text-gray-100 rounded-bl-md'
                    }`}
                  >
                    {!isUser && agent && (
                      <p className="text-xs font-medium mb-1" style={{ color: agent.color }}>
                        {agent.name}
                      </p>
                    )}
                    <p className="text-sm">{msg.content}</p>

                    {/* Option buttons */}
                    {msg.isQuestion && msg.options && (
                      <div className="mt-2 space-y-1">
                        {msg.options.map((opt, i) => (
                          <button
                            key={i}
                            onClick={() => handleOptionClick(opt)}
                            className="block w-full text-left text-xs px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition"
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}

        {/* Typing indicator */}
        {isAgentTyping && typingAgent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex items-center gap-2 text-sm text-gray-400"
          >
            <span style={{ color: typingAgent.color }}>{typingAgent.name}</span>
            <span>is typing</span>
            <span className="flex gap-1">
              <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
              <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
              <span className="w-1 h-1 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
            </span>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-3 border-t border-gray-800">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type a message..."
            className="flex-1 bg-gray-800 border border-gray-700 rounded-full px-4 py-2 text-sm focus:outline-none focus:border-gray-600"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="p-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 rounded-full transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
