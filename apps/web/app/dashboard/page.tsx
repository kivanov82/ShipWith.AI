'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAgentverseStore } from '@/lib/store';
import { runDemoSimulation } from '@/lib/demo';
import { Logo } from '@/components/Logo';
import { AgentCircle } from '@/components/AgentCircle';
import { DeliverablesTree } from '@/components/DeliverablesTree';
import { ProjectSummary } from '@/components/ProjectSummary';
import { SessionPanel } from '@/components/SessionPanel';
import { WalletButton, MobileWalletButton } from '@/components/WalletButton';
import { OnboardingOverlay, OnboardingHelpButton } from '@/components/OnboardingOverlay';
import {
  Play,
  FolderOpen,
  Plus,
  CheckCircle2,
  Clock,
  CircleDot,
  Package,
  BarChart3,
  Zap,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  return (
    <Suspense>
      <Dashboard />
    </Suspense>
  );
}

function Dashboard() {
  const searchParams = useSearchParams();
  const mode = searchParams.get('mode'); // 'chat' | 'build' | 'demo'
  const agentParam = searchParams.get('agent');

  const [isRunningDemo, setIsRunningDemo] = useState(false);
  const {
    projects,
    activeProjectId,
    setActiveProject,
    deliverables,
    isRealMode,
    setRealMode,
    activeSession,
    requestAllDeliveries,
    requestDelivery,
    agents,
  } = useAgentverseStore();

  // Auto-run demo if mode=demo
  useEffect(() => {
    if (mode === 'demo' && !isRunningDemo) {
      handleRunDemo();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // Handle delivery requests (will integrate with x402 payment)
  const handleRequestDelivery = async (sessionId: string, agentId?: string) => {
    if (agentId) {
      const agent = agents.find(a => a.id === agentId);
      if (agent) {
        requestDelivery(sessionId, agentId, 'Deliver based on session context', agent.pricing);
        console.log(`[x402] Would request payment for ${agent.name}: ${agent.pricing}`);
      }
    } else {
      const deliveryIds = requestAllDeliveries(sessionId);
      console.log(`[x402] Would request payments for ${deliveryIds.length} agents`);
    }
  };

  const handleRunDemo = async () => {
    setIsRunningDemo(true);
    try {
      await runDemoSimulation();
    } finally {
      setIsRunningDemo(false);
    }
  };

  const activeProject = projects.find((p) => p.id === activeProjectId);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle2 className="w-3 h-3 text-green-500" />;
      case 'active':
        return <CircleDot className="w-3 h-3 text-white" />;
      case 'review':
        return <Clock className="w-3 h-3 text-blue-400" />;
      default:
        return <Clock className="w-3 h-3 text-zinc-600" />;
    }
  };

  return (
    <div className="h-screen flex bg-[#0a0a0a]">
      {/* Left Sidebar */}
      <aside className="w-52 border-r border-zinc-800 flex flex-col hidden md:flex">
        {/* Logo */}
        <div className="p-3 border-b border-zinc-800">
          <Link href="/" className="flex items-center gap-2 group">
            <Logo variant="full" size={24} />
          </Link>
        </div>

        {/* Wallet Connection */}
        <div className="p-3 border-b border-zinc-800 wallet-button">
          <WalletButton compact />
        </div>

        {/* Active Project */}
        {activeProject && (
          <div className="p-3 border-b border-zinc-800 bg-zinc-900/50">
            <div className="text-[9px] text-zinc-500 uppercase tracking-wide mb-0.5">Active</div>
            <div className="text-xs font-medium text-zinc-200 truncate">
              {activeProject.name}
            </div>
          </div>
        )}

        {/* Projects */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-[9px] text-zinc-600 uppercase tracking-wide font-medium">
                Projects
              </span>
              <button className="p-1 hover:bg-zinc-800 rounded transition-colors">
                <Plus className="w-3 h-3 text-zinc-600" />
              </button>
            </div>
            <div className="space-y-0.5">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => setActiveProject(project.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-left ${
                    activeProjectId === project.id
                      ? 'bg-zinc-800 text-zinc-100'
                      : 'hover:bg-zinc-800/50 text-zinc-400'
                  }`}
                >
                  <FolderOpen className={`w-3 h-3 shrink-0 ${
                    activeProjectId === project.id ? 'text-zinc-300' : 'text-zinc-600'
                  }`} />
                  <span className="flex-1 text-[11px] font-medium truncate">
                    {project.name}
                  </span>
                  {getStatusIcon(project.status)}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mode Toggle & Demo Button */}
        <div className="p-3 border-t border-zinc-800 space-y-2">
          {/* Real Mode Toggle */}
          <button
            onClick={() => setRealMode(!isRealMode)}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors border ${
              isRealMode
                ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-500'
                : 'bg-zinc-800/50 border-zinc-700 text-zinc-500 hover:text-zinc-400'
            }`}
          >
            <span className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5" />
              Real Mode
            </span>
            <div className={`w-8 h-4 rounded-full transition-colors ${isRealMode ? 'bg-yellow-500' : 'bg-zinc-700'}`}>
              <div className={`w-3 h-3 rounded-full bg-white mt-0.5 transition-transform ${isRealMode ? 'translate-x-4.5 ml-0.5' : 'ml-0.5'}`} />
            </div>
          </button>

          {/* Demo Button */}
          <button
            onClick={handleRunDemo}
            disabled={isRunningDemo || isRealMode}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white hover:bg-zinc-200 disabled:bg-zinc-700 disabled:text-zinc-400 text-zinc-900 rounded-lg text-xs font-medium transition-colors"
          >
            {isRunningDemo ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-zinc-400 border-t-zinc-900 rounded-full animate-spin" />
                Running...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                Run Demo
              </>
            )}
          </button>

          {isRealMode && (
            <p className="text-[9px] text-zinc-600 text-center">
              Click any agent to send real prompts
            </p>
          )}

          {/* Help / Tour button */}
          <div className="flex justify-center pt-1">
            <OnboardingHelpButton />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <header className="md:hidden border-b border-zinc-800 p-3 flex items-center justify-between">
          <Link href="/">
            <Logo variant="full" size={20} />
          </Link>
          <div className="flex items-center gap-2">
            <MobileWalletButton />
            <button
              onClick={handleRunDemo}
              disabled={isRunningDemo}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-zinc-200 disabled:bg-zinc-700 text-zinc-900 rounded-lg text-xs font-medium"
            >
              {isRunningDemo ? (
                <div className="w-3.5 h-3.5 border-2 border-zinc-400 border-t-zinc-900 rounded-full animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              {isRunningDemo ? 'Running' : 'Demo'}
            </button>
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 flex flex-col lg:flex-row min-h-0">
          {/* Center - Agent Circle */}
          <div className="flex-1 flex flex-col min-h-0 border-b lg:border-b-0 lg:border-r border-zinc-800 relative">
            <div className="flex-1 p-2 overflow-hidden">
              <AgentCircle />
            </div>
            {/* Session Panel - top right of agent area */}
            <SessionPanel onRequestDelivery={handleRequestDelivery} />
          </div>

          {/* Right Panel */}
          <div className="w-full lg:w-72 flex flex-col min-h-0 bg-zinc-900/30">
            {/* Deliverables */}
            <div className="flex-1 flex flex-col min-h-0 border-b border-zinc-800">
              <div className="p-2.5 border-b border-zinc-800 flex items-center gap-2">
                <Package className="w-3.5 h-3.5 text-zinc-600" />
                <span className="text-xs font-medium text-zinc-300">Deliverables</span>
                {deliverables.length > 0 && (
                  <span className="text-[9px] text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded-full ml-auto">
                    {deliverables.length}
                  </span>
                )}
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                <DeliverablesTree />
              </div>
            </div>

            {/* Summary */}
            <div className="h-auto lg:h-64 flex flex-col">
              <div className="p-2.5 border-b border-zinc-800 flex items-center gap-2">
                <BarChart3 className="w-3.5 h-3.5 text-zinc-600" />
                <span className="text-xs font-medium text-zinc-300">Summary</span>
              </div>
              <div className="flex-1 overflow-y-auto p-2">
                <ProjectSummary />
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Onboarding overlay */}
      <OnboardingOverlay />
    </div>
  );
}
