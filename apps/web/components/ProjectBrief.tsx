'use client';

import { useAgentverseStore } from '@/lib/store';
import { USE_CASES } from '@/lib/use-cases';
import { FileText, Github, ChevronDown, ChevronUp } from 'lucide-react';
import { useState } from 'react';

export function ProjectBrief() {
  const activeUseCase = useAgentverseStore((s) => s.activeUseCase);
  const useCaseAnswers = useAgentverseStore((s) => s.useCaseAnswers);
  const githubMode = useAgentverseStore((s) => s.githubMode);
  const [expanded, setExpanded] = useState(true);

  if (!activeUseCase) return null;

  const config = USE_CASES[activeUseCase];
  if (!config) return null;

  // Build a readable brief from answers
  const briefItems = config.questions
    .map((q) => {
      const val = useCaseAnswers[q.id];
      if (!val) return null;
      const display = Array.isArray(val) ? val.join(', ') : val;
      return { label: q.question.replace(/\?$/, '').replace(/\(optional\)/i, '').trim(), value: display };
    })
    .filter(Boolean) as { label: string; value: string }[];

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-zinc-500" />
          <span className="text-sm font-medium text-zinc-300">
            {config.label}
          </span>
        </div>
        {expanded ? (
          <ChevronUp className="w-4 h-4 text-zinc-600" />
        ) : (
          <ChevronDown className="w-4 h-4 text-zinc-600" />
        )}
      </button>

      {expanded && (
        <div className="px-4 pb-3 space-y-2.5">
          {briefItems.map((item, i) => (
            <div key={i}>
              <p className="text-[10px] text-zinc-600 uppercase tracking-wider mb-0.5">
                {item.label}
              </p>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {item.value}
              </p>
            </div>
          ))}

          {/* GitHub info */}
          <div className="flex items-center gap-1.5 pt-1">
            <Github className="w-3 h-3 text-zinc-600" />
            <span className="text-[10px] text-zinc-600">
              {githubMode === 'own'
                ? 'Repo on your GitHub'
                : 'Repo hosted by Agentverse'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
