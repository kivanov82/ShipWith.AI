'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Logo } from '@/components/Logo';
import {
  Search,
  Globe,
  Smartphone,
  ShoppingCart,
  Play,
  ArrowRight,
  FolderOpen,
  Clock,
} from 'lucide-react';
import { USE_CASE_LIST, DEMO_USE_CASE } from '@/lib/use-cases';
import { useShipWithAIStore } from '@/lib/store';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Search,
  Globe,
  Smartphone,
  ShoppingCart,
  Play,
};

const CARD_COLORS: Record<string, {
  bg: string; text: string; border: string; hoverBg: string; shadow: string;
}> = {
  seo: {
    bg: 'bg-emerald-500/10', text: 'text-emerald-400',
    border: 'border-emerald-500/20', hoverBg: 'group-hover:bg-emerald-500/15',
    shadow: 'group-hover:shadow-emerald-500/10',
  },
  'landing-page': {
    bg: 'bg-cyan-500/10', text: 'text-cyan-400',
    border: 'border-cyan-500/20', hoverBg: 'group-hover:bg-cyan-500/15',
    shadow: 'group-hover:shadow-cyan-500/10',
  },
  'app-prototype': {
    bg: 'bg-violet-500/10', text: 'text-violet-400',
    border: 'border-violet-500/20', hoverBg: 'group-hover:bg-violet-500/15',
    shadow: 'group-hover:shadow-violet-500/10',
  },
  ecommerce: {
    bg: 'bg-amber-500/10', text: 'text-amber-400',
    border: 'border-amber-500/20', hoverBg: 'group-hover:bg-amber-500/15',
    shadow: 'group-hover:shadow-amber-500/10',
  },
};

interface RecentProject {
  id: string;
  name: string;
  description?: string;
  status: string;
  metadata?: { useCaseId?: string; agents?: string[] };
  createdAt: number;
  updatedAt: number;
}

export default function WelcomePage() {
  const router = useRouter();
  const { resumeProject } = useShipWithAIStore();
  const [recentProjects, setRecentProjects] = useState<RecentProject[]>([]);

  useEffect(() => {
    fetch('/api/projects?limit=5')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.projects?.length) {
          setRecentProjects(data.projects);
        }
      })
      .catch(() => {});
  }, []);

  const handleResumeProject = async (project: RecentProject) => {
    await resumeProject(project.id);
    router.push('/dashboard');
  };

  const formatTimeAgo = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="h-screen bg-mesh bg-noise flex flex-col relative overflow-hidden">
      {/* Floating ambient orbs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <motion.header
        className="flex items-center justify-center px-6 py-4 relative z-10 shrink-0"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      >
        <Logo variant="full" size={36} />
      </motion.header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-2 relative z-10 overflow-y-auto">
        <div className="max-w-2xl mx-auto text-center mb-6 shrink-0">
          <motion.h1
            className="text-3xl md:text-5xl font-bold text-white mb-3 tracking-tight font-display leading-[1.1]"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.15, ease: [0.22, 1, 0.36, 1] }}
          >
            What do you want{' '}
            <span className="text-gradient">to build?</span>
          </motion.h1>
          <motion.p
            className="text-base md:text-lg text-zinc-400 max-w-md mx-auto leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            Describe your vision. A team of AI specialists designs, builds, and ships it.
          </motion.p>
        </div>

        {/* Use Case Cards — 2x2 grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 md:gap-3 max-w-2xl w-full px-4 shrink-0">
          {USE_CASE_LIST.map((uc, index) => {
            const Icon = ICONS[uc.icon] || Search;
            const colors = CARD_COLORS[uc.id] || CARD_COLORS.seo;
            return (
              <motion.button
                key={uc.id}
                onClick={() => router.push(`/onboard?uc=${uc.id}`)}
                className={`group relative flex flex-col p-4 md:p-5 rounded-2xl border ${colors.border} bg-zinc-900/40 backdrop-blur-sm hover:bg-zinc-900/70 transition-all text-left shadow-lg shadow-transparent ${colors.shadow} hover:shadow-2xl hover:-translate-y-0.5`}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: 0.4 + index * 0.1,
                  ease: [0.22, 1, 0.36, 1],
                }}
              >
                {/* Hover gradient overlay */}
                <div className={`absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none ${colors.hoverBg}`} />

                <div className="relative z-10">
                  <div className={`w-10 h-10 rounded-xl ${colors.bg} flex items-center justify-center mb-3 ring-1 ring-white/5`}>
                    <Icon className={`w-5 h-5 ${colors.text}`} />
                  </div>
                  <h2 className="text-base md:text-lg font-semibold text-white mb-1.5 font-display">
                    {uc.label}
                  </h2>
                  <p className="text-sm text-zinc-500 mb-3 flex-1 leading-relaxed">
                    {uc.tagline}
                  </p>
                  <div className={`inline-flex items-center gap-1.5 text-sm font-medium ${colors.text} group-hover:brightness-125 transition-colors`}>
                    <span>Get started</span>
                    <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-300" />
                  </div>
                </div>
              </motion.button>
            );
          })}
        </div>

        {/* Demo Card */}
        <motion.div
          className="max-w-2xl w-full px-4 mt-2.5 md:mt-3 shrink-0"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.85, ease: [0.22, 1, 0.36, 1] }}
        >
          <button
            onClick={() => router.push('/dashboard?mode=demo')}
            className="group w-full flex items-center gap-4 p-4 md:p-5 rounded-2xl border border-zinc-800/60 bg-zinc-900/30 backdrop-blur-sm hover:bg-zinc-900/50 hover:border-zinc-700/60 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-xl bg-zinc-800/80 flex items-center justify-center shrink-0 ring-1 ring-white/5">
              <Play className="w-5 h-5 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm md:text-base font-medium text-zinc-300 group-hover:text-white transition-colors font-display">
                {DEMO_USE_CASE.label}
              </h2>
              <p className="text-xs md:text-sm text-zinc-600">
                {DEMO_USE_CASE.tagline}
              </p>
            </div>
            <ArrowRight className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all shrink-0" />
          </button>
        </motion.div>

        {/* Recent Projects */}
        <AnimatePresence>
          {recentProjects.length > 0 && (
            <motion.div
              className="max-w-2xl w-full px-4 mt-5 shrink-0"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.95, ease: [0.22, 1, 0.36, 1] }}
            >
              <div className="flex items-center gap-2 mb-3">
                <Clock className="w-3.5 h-3.5 text-zinc-600" />
                <span className="text-xs text-zinc-600 uppercase tracking-widest font-medium">
                  Recent projects
                </span>
              </div>
              <div className="space-y-1.5">
                {recentProjects.map((project) => (
                  <button
                    key={project.id}
                    onClick={() => handleResumeProject(project)}
                    className="group w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-zinc-800/40 bg-zinc-900/20 hover:bg-zinc-900/50 hover:border-zinc-700/60 transition-all text-left"
                  >
                    <FolderOpen className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-zinc-300 group-hover:text-white transition-colors font-medium truncate block">
                        {project.name}
                      </span>
                      {project.description && (
                        <span className="text-xs text-zinc-600 truncate block">
                          {project.description.slice(0, 80)}
                          {project.description.length > 80 ? '...' : ''}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-zinc-700 shrink-0">
                      {formatTimeAgo(project.updatedAt)}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-zinc-700 group-hover:text-zinc-400 group-hover:translate-x-0.5 transition-all shrink-0" />
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Footer */}
        <motion.div
          className="mt-6 mb-2 text-center shrink-0"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 0.6 }}
        >
          <p className="text-xs text-zinc-600 tracking-wide">
            Powered by AI agents &middot; Your project, your code, your repo
          </p>
        </motion.div>
      </main>
    </div>
  );
}
