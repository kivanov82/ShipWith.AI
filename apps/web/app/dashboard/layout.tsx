'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, usePathname } from 'next/navigation';
import { useShipWithAIStore } from '@/lib/store';
import { runDemoSimulation } from '@/lib/demo';
import { Logo } from '@/components/Logo';
import { WalletButton, MobileWalletButton } from '@/components/WalletButton';
import { OnboardingOverlay, OnboardingHelpButton } from '@/components/OnboardingOverlay';
import {
  Play,
  FolderOpen,
  Plus,
  CheckCircle2,
  Clock,
  CircleDot,
  CircuitBoard,
  FileText,
} from 'lucide-react';
import Link from 'next/link';

function DashboardShell({ children }: { children: React.ReactNode }) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const mode = searchParams.get('mode');

  const [isRunningDemo, setIsRunningDemo] = useState(false);
  const {
    projects,
    activeProjectId,
    activeUseCase,
    resumeProject,
    loadProjectsFromApi,
  } = useShipWithAIStore();

  const isUseCaseMode = !!activeUseCase;

  // Hydrate projects from Firestore on mount, and resume the latest one
  useEffect(() => {
    async function hydrate() {
      await loadProjectsFromApi();
      const state = useShipWithAIStore.getState();
      // If no active session (e.g. page refresh), resume the most recent project
      if (!state.activeSession && state.projects.length > 0) {
        await resumeProject(state.projects[0].id);
      }
    }
    hydrate();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-run demo if mode=demo
  useEffect(() => {
    if (mode === 'demo' && !isRunningDemo) {
      handleRunDemo();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

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
        return <CheckCircle2 className="w-3 h-3 text-emerald-500" />;
      case 'active':
        return <CircleDot className="w-3 h-3 text-white" />;
      case 'review':
        return <Clock className="w-3 h-3 text-cyan-400" />;
      default:
        return <Clock className="w-3 h-3 text-zinc-600" />;
    }
  };

  const isAgentsPage = pathname === '/dashboard';
  const isProjectPage = pathname === '/dashboard/project';

  return (
    <div className="h-screen flex bg-[#060608] relative">
      {/* Global background texture */}
      <div className="absolute inset-0 bg-noise pointer-events-none" />

      {/* Left Sidebar */}
      <aside className="w-52 border-r border-zinc-800/60 flex flex-col hidden md:flex relative z-10 bg-[#08080b]/80 backdrop-blur-sm">
        {/* Logo */}
        <div className="p-3 border-b border-zinc-800/60">
          <Link href="/" className="flex items-center gap-2 group">
            <Logo variant="full" size={24} />
          </Link>
        </div>

        {/* Wallet Connection */}
        <div className="p-3 border-b border-zinc-800/60 wallet-button">
          <WalletButton compact />
        </div>

        {/* Projects */}
        <div className="flex-1 overflow-y-auto">
          <div className="p-2">
            <div className="flex items-center justify-between px-2 py-1.5">
              <span className="text-[9px] text-zinc-600 uppercase tracking-widest font-medium">
                Projects
              </span>
              <button className="p-1 hover:bg-zinc-800/60 rounded-md transition-colors">
                <Plus className="w-3 h-3 text-zinc-600" />
              </button>
            </div>
            <div className="space-y-0.5">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => resumeProject(project.id)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-lg transition-colors text-left ${
                    activeProjectId === project.id
                      ? 'bg-zinc-800/80 text-zinc-100'
                      : 'hover:bg-zinc-800/40 text-zinc-400'
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

          {/* Workspace */}
          <div className="p-2 border-t border-zinc-800/60">
            <div className="px-2 py-1.5 mb-1">
              <span className="text-[9px] text-zinc-600 uppercase tracking-widest font-medium">
                Workspace
              </span>
            </div>
            <Link
              href="/dashboard"
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-left ${
                isAgentsPage
                  ? 'bg-zinc-800/80 text-zinc-100'
                  : 'hover:bg-zinc-800/40 text-zinc-500'
              }`}
            >
              <CircuitBoard className={`w-3.5 h-3.5 ${isAgentsPage ? 'text-emerald-400' : 'text-zinc-600'}`} />
              <span className="text-[11px] font-medium">Agents</span>
            </Link>
            <Link
              href="/dashboard/project"
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg transition-colors text-left ${
                isProjectPage
                  ? 'bg-zinc-800/80 text-zinc-100'
                  : 'hover:bg-zinc-800/40 text-zinc-500'
              }`}
            >
              <FileText className={`w-3.5 h-3.5 ${isProjectPage ? 'text-emerald-400' : 'text-zinc-600'}`} />
              <span className="text-[11px] font-medium">Project</span>
            </Link>
          </div>
        </div>

        {/* Bottom actions */}
        <div className="p-3 border-t border-zinc-800/60 space-y-2">
          {/* Help / Tour button */}
          <div className="flex justify-center pt-1">
            <OnboardingHelpButton />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 relative z-10">
        {/* Mobile Header */}
        <header className="md:hidden border-b border-zinc-800/60 p-3 flex items-center justify-between bg-[#08080b]/80 backdrop-blur-sm">
          <Link href="/">
            <Logo variant="full" size={20} />
          </Link>
          <div className="flex items-center gap-2">
            {/* Mobile nav tabs */}
            <Link
              href="/dashboard"
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                isAgentsPage ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500'
              }`}
            >
              Agents
            </Link>
            <Link
              href="/dashboard/project"
              className={`px-2.5 py-1 rounded-lg text-[11px] font-medium transition-colors ${
                isProjectPage ? 'bg-zinc-800 text-zinc-100' : 'text-zinc-500'
              }`}
            >
              Project
            </Link>
            <MobileWalletButton />
            <button
              onClick={handleRunDemo}
              disabled={isRunningDemo}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:from-zinc-700 disabled:to-zinc-700 text-white rounded-xl text-xs font-semibold shadow-lg shadow-emerald-900/20"
            >
              {isRunningDemo ? (
                <div className="w-3.5 h-3.5 border-2 border-zinc-400 border-t-white rounded-full animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5" />
              )}
              {isRunningDemo ? 'Running' : 'Demo'}
            </button>
          </div>
        </header>

        {/* Page content */}
        <div className="flex-1 min-h-0">
          {children}
        </div>
      </main>

      {/* Onboarding overlay */}
      <OnboardingOverlay />
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Suspense>
      <DashboardShell>{children}</DashboardShell>
    </Suspense>
  );
}
