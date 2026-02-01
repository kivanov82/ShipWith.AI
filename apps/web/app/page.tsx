'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SimpleAgentGrid } from '@/components/SimpleAgentGrid';
import { SimpleActivityFeed } from '@/components/SimpleActivityFeed';
import { SimpleChatInterface } from '@/components/SimpleChatInterface';
import { SimpleDeliverables } from '@/components/SimpleDeliverables';
import { useAgentverseStore } from '@/lib/store';
import { runDemoSimulation } from '@/lib/demo';
import { Play, Activity, MessageSquare, Package, ChevronDown } from 'lucide-react';

type Tab = 'activity' | 'chat' | 'deliverables';

export default function Dashboard() {
  const [isRunningDemo, setIsRunningDemo] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('activity');
  const [showAgents, setShowAgents] = useState(true);
  const { currentProject, activities, chatMessages, deliverables } = useAgentverseStore();

  const handleRunDemo = async () => {
    setIsRunningDemo(true);
    setActiveTab('activity');
    try {
      await runDemoSimulation();
    } finally {
      setIsRunningDemo(false);
    }
  };

  const tabs: { id: Tab; label: string; icon: typeof Activity; count?: number }[] = [
    { id: 'activity', label: 'Activity', icon: Activity, count: activities.length },
    { id: 'chat', label: 'Chat', icon: MessageSquare, count: chatMessages.length },
    { id: 'deliverables', label: 'Output', icon: Package, count: deliverables.length },
  ];

  return (
    <div className="min-h-[calc(100vh-100px)] flex flex-col">
      {/* Hero / Header */}
      <div className="px-4 py-6 text-center border-b border-gray-800">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">
          <span className="bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
            Agentverse
          </span>
        </h1>
        <p className="text-sm text-gray-400 max-w-md mx-auto">
          AI agents working together to build Web3 software
        </p>

        {/* Project status */}
        {currentProject && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-full text-sm"
          >
            <span className={`w-2 h-2 rounded-full ${
              currentProject.status === 'active' ? 'bg-green-500 animate-pulse' :
              currentProject.status === 'planning' ? 'bg-yellow-500' :
              currentProject.status === 'review' ? 'bg-blue-500' : 'bg-gray-500'
            }`} />
            <span className="font-medium">{currentProject.name}</span>
            <span className="text-gray-500">•</span>
            <span className="text-gray-400 capitalize">{currentProject.status}</span>
          </motion.div>
        )}

        {/* Demo button */}
        <div className="mt-4">
          <button
            onClick={handleRunDemo}
            disabled={isRunningDemo}
            className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 rounded-full font-medium transition shadow-lg shadow-purple-500/20"
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
      </div>

      {/* Agents Section (Collapsible on mobile) */}
      <div className="border-b border-gray-800">
        <button
          onClick={() => setShowAgents(!showAgents)}
          className="w-full px-4 py-3 flex items-center justify-between text-sm font-medium hover:bg-gray-900/50"
        >
          <span>Agents ({useAgentverseStore.getState().agents.filter(a => a.status !== 'idle').length} active)</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showAgents ? 'rotate-180' : ''}`} />
        </button>
        <AnimatePresence>
          {showAgents && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="px-4 pb-4">
                <SimpleAgentGrid />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-800 px-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition border-b-2 ${
                isActive
                  ? 'border-purple-500 text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.count ? (
                <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                  isActive ? 'bg-purple-500/20 text-purple-300' : 'bg-gray-800 text-gray-500'
                }`}>
                  {tab.count}
                </span>
              ) : null}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'activity' && (
            <motion.div
              key="activity"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full p-4 overflow-y-auto"
            >
              <SimpleActivityFeed />
            </motion.div>
          )}
          {activeTab === 'chat' && (
            <motion.div
              key="chat"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full"
            >
              <SimpleChatInterface />
            </motion.div>
          )}
          {activeTab === 'deliverables' && (
            <motion.div
              key="deliverables"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="h-full p-4 overflow-y-auto"
            >
              <SimpleDeliverables />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
