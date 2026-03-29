'use client';

import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';
import {
  Search,
  Globe,
  Smartphone,
  ShoppingCart,
  Play,
  ArrowRight,
} from 'lucide-react';
import { USE_CASE_LIST, DEMO_USE_CASE } from '@/lib/use-cases';

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Search,
  Globe,
  Smartphone,
  ShoppingCart,
  Play,
};

const CARD_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  seo: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'hover:border-emerald-800/50' },
  'landing-page': { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'hover:border-blue-800/50' },
  'app-prototype': { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'hover:border-purple-800/50' },
  ecommerce: { bg: 'bg-orange-500/10', text: 'text-orange-400', border: 'hover:border-orange-800/50' },
};

export default function WelcomePage() {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-center px-6 py-6">
        <Logo variant="full" size={32} />
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-8 md:py-12">
        <div className="max-w-2xl mx-auto text-center mb-10">
          <h1 className="text-3xl md:text-5xl font-bold text-white mb-3 tracking-tight">
            What do you want to build?
          </h1>
          <p className="text-base md:text-lg text-zinc-400 max-w-lg mx-auto">
            Tell us your idea. Our AI team handles the rest.
          </p>
        </div>

        {/* Use Case Cards — 2x2 grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4 max-w-2xl w-full px-4">
          {USE_CASE_LIST.map((uc) => {
            const Icon = ICONS[uc.icon] || Search;
            const colors = CARD_COLORS[uc.id] || CARD_COLORS.seo;
            return (
              <button
                key={uc.id}
                onClick={() => router.push(`/onboard?uc=${uc.id}`)}
                className={`group relative flex flex-col p-5 md:p-6 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 ${colors.border} transition-all text-left`}
              >
                <div className={`w-10 h-10 rounded-lg ${colors.bg} flex items-center justify-center mb-3`}>
                  <Icon className={`w-5 h-5 ${colors.text}`} />
                </div>
                <h2 className="text-base md:text-lg font-semibold text-white mb-1">
                  {uc.label}
                </h2>
                <p className="text-sm text-zinc-500 mb-3 flex-1">
                  {uc.tagline}
                </p>
                <div className={`flex items-center gap-1 text-xs ${colors.text} group-hover:brightness-125 transition-colors`}>
                  <span>Get started</span>
                  <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
                </div>
              </button>
            );
          })}
        </div>

        {/* Demo Card — separate, below */}
        <div className="max-w-2xl w-full px-4 mt-3 md:mt-4">
          <button
            onClick={() => router.push('/dashboard?mode=demo')}
            className="group w-full flex items-center gap-4 p-4 md:p-5 rounded-xl border border-zinc-800/50 bg-zinc-900/30 hover:bg-zinc-900/50 hover:border-zinc-700 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-zinc-800 flex items-center justify-center shrink-0">
              <Play className="w-5 h-5 text-zinc-400 group-hover:text-white transition-colors" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-sm md:text-base font-medium text-zinc-300 group-hover:text-white transition-colors">
                {DEMO_USE_CASE.label}
              </h2>
              <p className="text-xs md:text-sm text-zinc-600">
                {DEMO_USE_CASE.tagline}
              </p>
            </div>
            <Play className="w-4 h-4 text-zinc-600 group-hover:text-zinc-400 transition-colors shrink-0" />
          </button>
        </div>

        {/* Footer */}
        <div className="mt-10 md:mt-12 text-center">
          <p className="text-xs text-zinc-600">
            Powered by AI &middot; Your project, your code, your repo
          </p>
        </div>
      </main>
    </div>
  );
}
