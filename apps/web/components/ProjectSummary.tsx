'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAgentverseStore } from '@/lib/store';
import { Clock, DollarSign, ArrowLeftRight, Package, Users } from 'lucide-react';

function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;

  if (minutes > 0) {
    return `${minutes}m ${remainingSeconds}s`;
  }
  return `${remainingSeconds}s`;
}

export function ProjectSummary() {
  const { projectStats, deliverables, agents, currentProject } = useAgentverseStore();
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!projectStats.startTime) {
      setElapsed(0);
      return;
    }

    const interval = setInterval(() => {
      setElapsed(Date.now() - projectStats.startTime!);
    }, 1000);

    return () => clearInterval(interval);
  }, [projectStats.startTime]);

  const agentUsage = useMemo(() => {
    const usedAgents = new Set<string>();
    deliverables.forEach((d) => usedAgents.add(d.producedBy));
    return {
      used: usedAgents.size,
      total: agents.length,
    };
  }, [deliverables, agents]);

  const budgetBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    const agentPayments: Record<string, number> = {
      'ux-analyst': 0.04,
      'ui-designer': 0.06,
      'solidity-developer': 0.10,
      'solidity-auditor': 0.08,
      'ui-developer': 0.05,
      'marketing': 0.02,
    };

    deliverables.forEach((d) => {
      if (agentPayments[d.producedBy]) {
        breakdown[d.producedBy] = (breakdown[d.producedBy] || 0) + agentPayments[d.producedBy];
      }
    });

    return Object.entries(breakdown)
      .map(([agentId, amount]) => {
        const agent = agents.find((a) => a.id === agentId);
        return {
          agentId,
          agentName: agent?.name || agentId,
          agentColor: agent?.color || '#71717a',
          amount,
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [deliverables, agents]);

  const maxBudget = Math.max(...budgetBreakdown.map((b) => b.amount), 0.10);

  if (!projectStats.startTime && deliverables.length === 0) {
    return (
      <div className="text-center py-6 text-zinc-600">
        <Clock className="w-5 h-5 mx-auto mb-2 opacity-40" />
        <p className="text-xs">Project stats</p>
        <p className="text-[10px] text-zinc-700 mt-0.5">Run demo to see summary</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {currentProject && (
        <div className="px-2.5 py-2 bg-zinc-800/50 rounded-lg border border-zinc-800">
          <div className="text-[9px] text-zinc-500 uppercase tracking-wide">
            {currentProject.status}
          </div>
          <div className="text-xs font-medium text-zinc-200 truncate">
            {currentProject.name}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-1.5">
        <div className="p-2 bg-zinc-800/30 rounded-lg border border-zinc-800/50">
          <div className="flex items-center gap-1 mb-0.5">
            <Clock className="w-3 h-3 text-zinc-600" />
            <span className="text-[9px] text-zinc-600 uppercase">Duration</span>
          </div>
          <div className="text-xs font-semibold text-zinc-200">
            {formatDuration(elapsed)}
          </div>
        </div>

        <div className="p-2 bg-zinc-800/30 rounded-lg border border-zinc-800/50">
          <div className="flex items-center gap-1 mb-0.5">
            <DollarSign className="w-3 h-3 text-zinc-600" />
            <span className="text-[9px] text-zinc-600 uppercase">Spent</span>
          </div>
          <div className="text-xs font-semibold text-zinc-200">
            ${projectStats.totalSpent.toFixed(2)}
          </div>
        </div>

        <div className="p-2 bg-zinc-800/30 rounded-lg border border-zinc-800/50">
          <div className="flex items-center gap-1 mb-0.5">
            <ArrowLeftRight className="w-3 h-3 text-zinc-600" />
            <span className="text-[9px] text-zinc-600 uppercase">Tasks</span>
          </div>
          <div className="text-xs font-semibold text-zinc-200">
            {projectStats.interactionCount}
          </div>
        </div>

        <div className="p-2 bg-zinc-800/30 rounded-lg border border-zinc-800/50">
          <div className="flex items-center gap-1 mb-0.5">
            <Users className="w-3 h-3 text-zinc-600" />
            <span className="text-[9px] text-zinc-600 uppercase">Agents</span>
          </div>
          <div className="text-xs font-semibold text-zinc-200">
            {agentUsage.used}/{agentUsage.total}
          </div>
        </div>
      </div>

      {budgetBreakdown.length > 0 && (
        <div>
          <div className="flex items-center gap-1 mb-2">
            <Package className="w-3 h-3 text-zinc-600" />
            <span className="text-[9px] text-zinc-500 uppercase tracking-wide font-medium">
              Budget
            </span>
          </div>
          <div className="space-y-1.5">
            {budgetBreakdown.map((item) => (
              <div key={item.agentId} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded flex items-center justify-center text-[7px] font-semibold shrink-0"
                  style={{ backgroundColor: item.agentColor, color: '#fff' }}
                >
                  {item.agentName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-[9px] text-zinc-500 truncate">
                      {item.agentName.split(' ')[0]}
                    </span>
                    <span className="text-[9px] font-medium text-zinc-400">
                      ${item.amount.toFixed(2)}
                    </span>
                  </div>
                  <div className="h-1 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(item.amount / maxBudget) * 100}%`,
                        backgroundColor: item.agentColor,
                      }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="pt-2 border-t border-zinc-800">
        <div className="flex items-center justify-between text-[10px]">
          <span className="text-zinc-600">Deliverables</span>
          <span className="font-medium text-zinc-300">{deliverables.length}</span>
        </div>
      </div>
    </div>
  );
}
