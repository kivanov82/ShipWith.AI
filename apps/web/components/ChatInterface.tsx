'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgentverseStore } from '@/lib/store';
import { Send, Bot, User, Loader2, ChevronDown } from 'lucide-react';

export function ChatInterface() {
  const {
    chatMessages,
    addChatMessage,
    isAgentTyping,
    currentAgentTyping,
    agents,
    selectedAgent,
  } = useAgentverseStore();

  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, isAgentTyping]);

  // Auto-resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    addChatMessage({
      role: 'user',
      content: input.trim(),
    });

    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleOptionClick = (option: string) => {
    addChatMessage({
      role: 'user',
      content: option,
    });
  };

  const getAgentInfo = (agentId?: string) => {
    if (!agentId) return null;
    return agents.find((a) => a.id === agentId);
  };

  const typingAgent = currentAgentTyping ? getAgentInfo(currentAgentTyping) : null;

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between shrink-0">
        <h3 className="font-semibold flex items-center gap-2">
          <Bot className="w-4 h-4" />
          Agent Dialog
        </h3>
        {selectedAgent && (
          <span className="text-xs text-gray-500 bg-gray-800 px-2 py-1 rounded">
            Talking to: {getAgentInfo(selectedAgent)?.name}
          </span>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {chatMessages.length === 0 ? (
          <div className="text-center text-gray-500 py-8">
            <Bot className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">Start a conversation with our agents</p>
            <p className="text-xs mt-1 text-gray-600">
              They may ask clarifying questions as they work
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {chatMessages.map((message) => {
              const agent = getAgentInfo(message.agentId);
              const isUser = message.role === 'user';
              const isSystem = message.role === 'system';

              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`flex gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
                >
                  {/* Avatar */}
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isUser
                        ? 'bg-blue-600'
                        : isSystem
                        ? 'bg-gray-700'
                        : ''
                    }`}
                    style={agent ? { backgroundColor: agent.color } : undefined}
                  >
                    {isUser ? (
                      <User className="w-4 h-4 text-white" />
                    ) : isSystem ? (
                      <Bot className="w-4 h-4 text-gray-400" />
                    ) : (
                      <span className="text-xs font-bold text-white">{agent?.avatar}</span>
                    )}
                  </div>

                  {/* Message content */}
                  <div
                    className={`max-w-[75%] ${
                      isUser
                        ? 'bg-blue-600 text-white rounded-2xl rounded-tr-md'
                        : isSystem
                        ? 'bg-gray-800 text-gray-300 rounded-2xl rounded-tl-md'
                        : 'bg-gray-800 text-gray-100 rounded-2xl rounded-tl-md'
                    } px-4 py-2`}
                  >
                    {!isUser && agent && (
                      <p className="text-xs font-medium mb-1" style={{ color: agent.color }}>
                        {agent.name}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>

                    {/* Options for questions */}
                    {message.isQuestion && message.options && (
                      <div className="mt-3 space-y-2">
                        {message.options.map((option, i) => (
                          <button
                            key={i}
                            onClick={() => handleOptionClick(option)}
                            className="block w-full text-left text-sm px-3 py-2 rounded-lg bg-gray-700 hover:bg-gray-600 transition"
                          >
                            {option}
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
        <AnimatePresence>
          {isAgentTyping && typingAgent && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex gap-3"
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                style={{ backgroundColor: typingAgent.color }}
              >
                <span className="text-xs font-bold text-white">{typingAgent.avatar}</span>
              </div>
              <div className="bg-gray-800 rounded-2xl rounded-tl-md px-4 py-3">
                <div className="flex items-center gap-1">
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: 0 }}
                    className="w-2 h-2 rounded-full bg-gray-500"
                  />
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: 0.2 }}
                    className="w-2 h-2 rounded-full bg-gray-500"
                  />
                  <motion.div
                    animate={{ y: [0, -5, 0] }}
                    transition={{ repeat: Infinity, duration: 0.6, delay: 0.4 }}
                    className="w-2 h-2 rounded-full bg-gray-500"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-800 shrink-0">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            rows={1}
            className="flex-1 bg-gray-800 border border-gray-700 rounded-xl px-4 py-2.5 text-sm resize-none focus:outline-none focus:border-gray-600 placeholder-gray-500"
          />
          <button
            type="submit"
            disabled={!input.trim()}
            className="px-4 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-xl transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
}
