'use client';

import { useShipWithAIStore } from '@/lib/store';
import { ProjectBrief } from '@/components/ProjectBrief';
import { DeliverablesTree } from '@/components/DeliverablesTree';
import { ProjectSummary } from '@/components/ProjectSummary';
import { Package, BarChart3, FileText } from 'lucide-react';

export default function ProjectPage() {
  const { deliverables, activeUseCase } = useShipWithAIStore();
  const isUseCaseMode = !!activeUseCase;

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-lg font-bold text-zinc-100 font-display">Project</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Overview, deliverables, and progress</p>
        </div>

        {/* Project Brief */}
        {isUseCaseMode && (
          <section>
            <ProjectBrief />
          </section>
        )}

        {/* Summary */}
        <section className="bg-[#0c0c0f] border border-zinc-800/60 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800/60 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-zinc-600" />
            <span className="text-sm font-semibold text-zinc-200 font-display">Summary</span>
          </div>
          <div className="p-4">
            <ProjectSummary />
          </div>
        </section>

        {/* Deliverables */}
        <section className="bg-[#0c0c0f] border border-zinc-800/60 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800/60 flex items-center gap-2">
            <Package className="w-4 h-4 text-zinc-600" />
            <span className="text-sm font-semibold text-zinc-200 font-display">Deliverables</span>
            {deliverables.length > 0 && (
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full ml-auto font-medium">
                {deliverables.length}
              </span>
            )}
          </div>
          <div className="p-4">
            <DeliverablesTree />
          </div>
        </section>
      </div>
    </div>
  );
}
