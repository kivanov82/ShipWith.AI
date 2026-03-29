'use client';

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useShipWithAIStore, Deliverable } from '@/lib/store';
import {
  ChevronDown,
  ChevronRight,
  FileText,
  Code,
  Palette,
  FileCheck,
  Globe,
  ExternalLink,
  Download,
  Package,
} from 'lucide-react';

const typeIcons: Record<Deliverable['type'], typeof FileText> = {
  document: FileText,
  code: Code,
  design: Palette,
  report: FileCheck,
  deployment: Globe,
};

interface AgentGroup {
  agentId: string;
  agentName: string;
  agentColor: string;
  deliverables: Deliverable[];
}

export function DeliverablesTree() {
  const { deliverables, agents } = useShipWithAIStore();
  const [expandedAgents, setExpandedAgents] = useState<Set<string>>(new Set());
  const [expandedDeliverables, setExpandedDeliverables] = useState<Set<string>>(new Set());

  const groupedDeliverables = useMemo(() => {
    const groups: Record<string, AgentGroup> = {};

    deliverables.forEach((d) => {
      if (!groups[d.producedBy]) {
        const agent = agents.find((a) => a.id === d.producedBy);
        groups[d.producedBy] = {
          agentId: d.producedBy,
          agentName: agent?.name || d.producedBy,
          agentColor: agent?.color || '#71717a',
          deliverables: [],
        };
      }
      groups[d.producedBy].deliverables.push(d);
    });

    return Object.values(groups);
  }, [deliverables, agents]);

  const toggleAgent = (agentId: string) => {
    setExpandedAgents((prev) => {
      const next = new Set(prev);
      if (next.has(agentId)) next.delete(agentId);
      else next.add(agentId);
      return next;
    });
  };

  const toggleDeliverable = (id: string) => {
    setExpandedDeliverables((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (deliverables.length === 0) {
    return (
      <div className="text-center py-6 text-zinc-600">
        <Package className="w-6 h-6 mx-auto mb-2 opacity-40" />
        <p className="text-xs">No deliverables yet</p>
        <p className="text-[10px] text-zinc-700 mt-0.5">Run the demo to see outputs</p>
      </div>
    );
  }

  return (
    <div className="space-y-0.5">
      {groupedDeliverables.map((group) => {
        const isExpanded = expandedAgents.has(group.agentId);

        return (
          <div key={group.agentId}>
            <button
              onClick={() => toggleAgent(group.agentId)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-zinc-800/50 transition-colors"
            >
              {isExpanded ? (
                <ChevronDown className="w-3 h-3 text-zinc-600" />
              ) : (
                <ChevronRight className="w-3 h-3 text-zinc-600" />
              )}
              <div
                className="w-4 h-4 rounded flex items-center justify-center text-[8px] font-semibold"
                style={{ backgroundColor: group.agentColor, color: '#fff' }}
              >
                {group.agentName.charAt(0)}
              </div>
              <span className="flex-1 text-[11px] font-medium text-zinc-300 text-left truncate">
                {group.agentName}
              </span>
              <span className="text-[9px] text-zinc-600 bg-zinc-800 px-1.5 py-0.5 rounded-full">
                {group.deliverables.length}
              </span>
            </button>

            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="ml-4 pl-3 border-l border-zinc-800 space-y-0.5">
                    {group.deliverables.map((d) => {
                      const Icon = typeIcons[d.type];
                      const isDeliverableExpanded = expandedDeliverables.has(d.id);

                      return (
                        <div key={d.id}>
                          <button
                            onClick={() => toggleDeliverable(d.id)}
                            className="w-full flex items-center gap-2 px-2 py-1 rounded hover:bg-zinc-800/30 transition-colors"
                          >
                            <Icon className="w-3 h-3 text-zinc-600" />
                            <span className="flex-1 text-[10px] text-zinc-400 text-left truncate">
                              {d.title}
                            </span>
                            {(d.url || d.downloadUrl || d.preview) && (
                              <ChevronDown
                                className={`w-2.5 h-2.5 text-zinc-600 transition-transform ${
                                  isDeliverableExpanded ? 'rotate-180' : ''
                                }`}
                              />
                            )}
                          </button>

                          <AnimatePresence>
                            {isDeliverableExpanded && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                              >
                                <div className="ml-5 p-2 bg-zinc-800/30 rounded text-[9px] space-y-1.5 border border-zinc-800/50">
                                  <p className="text-zinc-500">{d.description}</p>

                                  {d.preview && (
                                    <pre className="p-2 bg-zinc-900 rounded text-[8px] text-zinc-500 overflow-x-auto max-h-20 font-mono border border-zinc-800">
                                      {d.preview.slice(0, 200)}
                                      {d.preview.length > 200 && '...'}
                                    </pre>
                                  )}

                                  <div className="flex gap-2">
                                    {d.url && (
                                      <a
                                        href={d.url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200"
                                      >
                                        <ExternalLink className="w-2.5 h-2.5" />
                                        View
                                      </a>
                                    )}
                                    {d.downloadUrl && (
                                      <a
                                        href={d.downloadUrl}
                                        className="flex items-center gap-1 text-zinc-400 hover:text-zinc-200"
                                      >
                                        <Download className="w-2.5 h-2.5" />
                                        Download
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </div>
  );
}
