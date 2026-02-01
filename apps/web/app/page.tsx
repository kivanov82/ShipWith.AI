'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { ProjectHeader } from '@/components/ProjectHeader';
import { ActivityFeed } from '@/components/ActivityFeed';
import { ChatInterface } from '@/components/ChatInterface';
import { DeliverablesPanel } from '@/components/DeliverablesPanel';
import { runDemoSimulation } from '@/lib/demo';
import { Play, LayoutGrid, MessageSquare, Package } from 'lucide-react';

// Dynamic import for React Flow (needs client-side only)
const AgentFlow = dynamic(
  () => import('@/components/AgentFlow').then((mod) => mod.AgentFlow),
  { ssr: false, loading: () => <AgentFlowSkeleton /> }
);

function AgentFlowSkeleton() {
  return (
    <div className="w-full h-full bg-gray-950 rounded-xl border border-gray-800 flex items-center justify-center">
      <div className="text-gray-500 flex items-center gap-2">
        <div className="w-5 h-5 border-2 border-gray-600 border-t-gray-400 rounded-full animate-spin" />
        Loading agent network...
      </div>
    </div>
  );
}

type RightPanelTab = 'chat' | 'deliverables';

export default function Dashboard() {
  const [isRunningDemo, setIsRunningDemo] = useState(false);
  const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('chat');

  const handleRunDemo = async () => {
    setIsRunningDemo(true);
    try {
      await runDemoSimulation();
    } finally {
      setIsRunningDemo(false);
    }
  };

  return (
    <div className="h-[calc(100vh-130px)] flex flex-col gap-4 p-4 max-w-[1800px] mx-auto">
      {/* Header */}
      <ProjectHeader />

      {/* Main content area */}
      <div className="flex-1 grid grid-cols-12 gap-4 min-h-0">
        {/* Left: Agent Flow Visualization */}
        <div className="col-span-12 lg:col-span-7 xl:col-span-8 flex flex-col gap-4 min-h-0">
          {/* Agent network */}
          <div className="flex-1 min-h-[400px]">
            <AgentFlow />
          </div>

          {/* Demo button */}
          <div className="flex justify-center">
            <button
              onClick={handleRunDemo}
              disabled={isRunningDemo}
              className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 rounded-xl font-medium transition shadow-lg shadow-purple-500/20"
            >
              {isRunningDemo ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Running Demo...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  Run Demo Simulation
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right: Activity & Panels */}
        <div className="col-span-12 lg:col-span-5 xl:col-span-4 flex flex-col gap-4 min-h-0">
          {/* Activity Feed */}
          <div className="h-[280px] shrink-0">
            <ActivityFeed />
          </div>

          {/* Tabbed panel: Chat / Deliverables */}
          <div className="flex-1 min-h-[300px] flex flex-col">
            {/* Tabs */}
            <div className="flex gap-1 mb-2">
              <button
                onClick={() => setRightPanelTab('chat')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  rightPanelTab === 'chat'
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <MessageSquare className="w-4 h-4" />
                Chat
              </button>
              <button
                onClick={() => setRightPanelTab('deliverables')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition ${
                  rightPanelTab === 'deliverables'
                    ? 'bg-gray-800 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                }`}
              >
                <Package className="w-4 h-4" />
                Deliverables
              </button>
            </div>

            {/* Panel content */}
            <div className="flex-1 min-h-0">
              {rightPanelTab === 'chat' ? <ChatInterface /> : <DeliverablesPanel />}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
