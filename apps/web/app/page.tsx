'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgentverseStore } from '@/lib/store';
import { runDemoSimulation } from '@/lib/demo';
import {
  Play,
  Activity,
  MessageSquare,
  Package,
  ChevronRight,
  Send,
  Download,
  ExternalLink,
  Bot,
  ArrowRight,
} from 'lucide-react';

export default function Dashboard() {
  const [isRunningDemo, setIsRunningDemo] = useState(false);
  const {
    agents,
    activities,
    chatMessages,
    deliverables,
    addChatMessage,
    currentProject,
    isAgentTyping,
    currentAgentTyping,
  } = useAgentverseStore();
  const [chatInput, setChatInput] = useState('');

  const handleRunDemo = async () => {
    setIsRunningDemo(true);
    try {
      await runDemoSimulation();
    } finally {
      setIsRunningDemo(false);
    }
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    addChatMessage({ role: 'user', content: chatInput.trim() });
    setChatInput('');
  };

  const handleOptionClick = (option: string) => {
    addChatMessage({ role: 'user', content: option });
  };

  const getAgent = (id: string) => agents.find((a) => a.id === id);
  const typingAgent = currentAgentTyping ? getAgent(currentAgentTyping) : null;
  const activeAgents = agents.filter((a) => a.status !== 'idle');

  return (
    <div className="h-screen flex">
      {/* Left Sidebar - Agents */}
      <aside className="w-64 border-r border-neutral-200 flex flex-col bg-neutral-50/50 hidden md:flex">
        {/* Logo */}
        <div className="p-4 border-b border-neutral-200">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-white font-semibold text-sm">
              A
            </div>
            <span className="font-semibold text-neutral-900">Agentverse</span>
          </div>
        </div>

        {/* Project Status */}
        {currentProject && (
          <div className="p-4 border-b border-neutral-200">
            <div className="text-xs text-neutral-500 mb-1">Current Project</div>
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${
                currentProject.status === 'active' ? 'bg-green-500' :
                currentProject.status === 'planning' ? 'bg-yellow-500' :
                currentProject.status === 'review' ? 'bg-blue-500' : 'bg-neutral-400'
              }`} />
              <span className="text-sm font-medium text-neutral-900 truncate">
                {currentProject.name}
              </span>
            </div>
          </div>
        )}

        {/* Agents List */}
        <div className="flex-1 overflow-y-auto p-2">
          <div className="text-xs text-neutral-500 px-2 py-2 uppercase tracking-wide">
            Agents {activeAgents.length > 0 && `(${activeAgents.length} active)`}
          </div>
          <div className="space-y-1">
            {agents.map((agent) => (
              <div
                key={agent.id}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  agent.status !== 'idle'
                    ? 'bg-violet-50 border border-violet-100'
                    : 'hover:bg-neutral-100'
                }`}
              >
                <div
                  className="w-8 h-8 rounded-md flex items-center justify-center text-white text-xs font-medium shrink-0"
                  style={{ backgroundColor: agent.color }}
                >
                  {agent.avatar}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-neutral-900 truncate">
                    {agent.name}
                  </div>
                  <div className="text-xs text-neutral-500 truncate">
                    {agent.status === 'idle' ? agent.role :
                     agent.status === 'working' ? 'Working...' :
                     agent.status === 'thinking' ? 'Thinking...' :
                     agent.status === 'waiting' ? 'Waiting...' : agent.role}
                  </div>
                </div>
                {agent.status !== 'idle' && (
                  <div className={`w-2 h-2 rounded-full shrink-0 ${
                    agent.status === 'working' ? 'bg-green-500 animate-pulse' :
                    agent.status === 'thinking' ? 'bg-yellow-500 animate-pulse' :
                    'bg-blue-500'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Demo Button */}
        <div className="p-4 border-t border-neutral-200">
          <button
            onClick={handleRunDemo}
            disabled={isRunningDemo}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white rounded-lg text-sm font-medium transition-colors"
          >
            {isRunningDemo ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                Run Demo
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden border-b border-neutral-200 p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-violet-600 flex items-center justify-center text-white font-semibold text-sm">
              A
            </div>
            <span className="font-semibold">Agentverse</span>
          </div>
          <button
            onClick={handleRunDemo}
            disabled={isRunningDemo}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-400 text-white rounded-lg text-sm font-medium"
          >
            {isRunningDemo ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {isRunningDemo ? 'Running' : 'Demo'}
          </button>
        </header>

        {/* Content Grid */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 min-h-0">
          {/* Left Panel - Activity Feed */}
          <div className="border-r border-neutral-200 flex flex-col min-h-0">
            <div className="p-4 border-b border-neutral-200 flex items-center gap-2">
              <Activity className="w-4 h-4 text-neutral-500" />
              <span className="font-medium text-neutral-900">Activity</span>
              {activities.length > 0 && (
                <span className="text-xs text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                  {activities.length}
                </span>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {activities.length === 0 ? (
                <div className="text-center py-12 text-neutral-500">
                  <Activity className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">No activity yet</p>
                  <p className="text-xs mt-1">Run the demo to see agents work</p>
                </div>
              ) : (
                <AnimatePresence mode="popLayout">
                  {activities.slice(0, 30).map((activity) => {
                    const fromAgent = getAgent(activity.from);
                    const toAgent = activity.to ? getAgent(activity.to) : null;
                    return (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-3 p-3 rounded-lg bg-neutral-50 border border-neutral-100"
                      >
                        <div
                          className="w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-medium shrink-0"
                          style={{ backgroundColor: fromAgent?.color || '#737373' }}
                        >
                          {fromAgent?.avatar?.slice(0, 2) || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 text-sm">
                            <span className="font-medium text-neutral-900">
                              {fromAgent?.name || activity.from}
                            </span>
                            {toAgent && (
                              <>
                                <ArrowRight className="w-3 h-3 text-neutral-400" />
                                <span className="font-medium text-neutral-900">
                                  {toAgent.name}
                                </span>
                              </>
                            )}
                          </div>
                          <p className="text-sm text-neutral-600 mt-0.5">{activity.content}</p>
                          {activity.metadata && (
                            <div className="flex flex-wrap gap-1 mt-1">
                              {Object.entries(activity.metadata).map(([k, v]) => (
                                <span key={k} className="text-xs px-1.5 py-0.5 bg-neutral-200 text-neutral-600 rounded">
                                  {k}: {String(v)}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          </div>

          {/* Right Panel - Chat & Deliverables */}
          <div className="flex flex-col min-h-0">
            {/* Chat Section */}
            <div className="flex-1 flex flex-col min-h-0 border-b border-neutral-200">
              <div className="p-4 border-b border-neutral-200 flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-neutral-500" />
                <span className="font-medium text-neutral-900">Chat</span>
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {chatMessages.length === 0 ? (
                  <div className="text-center py-8 text-neutral-500">
                    <Bot className="w-8 h-8 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">Agents will ask questions here</p>
                  </div>
                ) : (
                  chatMessages.map((msg) => {
                    const agent = getAgent(msg.agentId || '');
                    const isUser = msg.role === 'user';
                    return (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                      >
                        <div className={`max-w-[80%] ${isUser ? '' : 'flex gap-2'}`}>
                          {!isUser && agent && (
                            <div
                              className="w-6 h-6 rounded flex items-center justify-center text-white text-[10px] font-medium shrink-0 mt-1"
                              style={{ backgroundColor: agent.color }}
                            >
                              {agent.avatar?.slice(0, 2)}
                            </div>
                          )}
                          <div>
                            {!isUser && agent && (
                              <p className="text-xs font-medium text-neutral-500 mb-1">{agent.name}</p>
                            )}
                            <div
                              className={`rounded-2xl px-4 py-2 ${
                                isUser
                                  ? 'bg-violet-600 text-white'
                                  : 'bg-neutral-100 text-neutral-900'
                              }`}
                            >
                              <p className="text-sm">{msg.content}</p>
                            </div>
                            {msg.isQuestion && msg.options && (
                              <div className="mt-2 space-y-1">
                                {msg.options.map((opt, i) => (
                                  <button
                                    key={i}
                                    onClick={() => handleOptionClick(opt)}
                                    className="block w-full text-left text-sm px-3 py-2 rounded-lg border border-neutral-200 hover:bg-neutral-50 transition-colors"
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
                  })
                )}
                {isAgentTyping && typingAgent && (
                  <div className="flex items-center gap-2 text-sm text-neutral-500">
                    <div
                      className="w-5 h-5 rounded flex items-center justify-center text-white text-[9px] font-medium"
                      style={{ backgroundColor: typingAgent.color }}
                    >
                      {typingAgent.avatar?.slice(0, 2)}
                    </div>
                    <span>{typingAgent.name} is typing...</span>
                  </div>
                )}
              </div>
              <form onSubmit={handleSendMessage} className="p-4 border-t border-neutral-200">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Send a message..."
                    className="flex-1 px-4 py-2 border border-neutral-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent"
                  />
                  <button
                    type="submit"
                    disabled={!chatInput.trim()}
                    className="px-4 py-2 bg-violet-600 hover:bg-violet-700 disabled:bg-neutral-200 disabled:text-neutral-400 text-white rounded-lg transition-colors"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>

            {/* Deliverables Section */}
            <div className="h-64 flex flex-col">
              <div className="p-4 border-b border-neutral-200 flex items-center gap-2">
                <Package className="w-4 h-4 text-neutral-500" />
                <span className="font-medium text-neutral-900">Deliverables</span>
                {deliverables.length > 0 && (
                  <span className="text-xs text-neutral-500 bg-neutral-100 px-2 py-0.5 rounded-full">
                    {deliverables.length}
                  </span>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-4 space-y-2">
                {deliverables.length === 0 ? (
                  <div className="text-center py-6 text-neutral-500">
                    <Package className="w-6 h-6 mx-auto mb-1 opacity-30" />
                    <p className="text-sm">Output will appear here</p>
                  </div>
                ) : (
                  deliverables.map((item) => {
                    const agent = getAgent(item.producedBy);
                    return (
                      <motion.div
                        key={item.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-3 rounded-lg border border-neutral-200 hover:border-neutral-300 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="text-sm font-medium text-neutral-900 truncate">{item.title}</h4>
                            <p className="text-xs text-neutral-500 truncate">{item.description}</p>
                            {agent && (
                              <p className="text-xs mt-1" style={{ color: agent.color }}>
                                by {agent.name}
                              </p>
                            )}
                          </div>
                          <div className="flex gap-1 shrink-0">
                            {item.downloadUrl && (
                              <a href={item.downloadUrl} className="p-1.5 hover:bg-neutral-100 rounded">
                                <Download className="w-4 h-4 text-neutral-500" />
                              </a>
                            )}
                            {item.url && (
                              <a href={item.url} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-neutral-100 rounded">
                                <ExternalLink className="w-4 h-4 text-neutral-500" />
                              </a>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
