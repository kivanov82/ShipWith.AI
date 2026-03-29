'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useShipWithAIStore, type Deliverable } from '@/lib/store';
import {
  FileText,
  Code,
  Globe,
  FileCheck,
  Palette,
  Download,
  ExternalLink,
  Github,
  Package,
} from 'lucide-react';

const deliverableConfig: Record<Deliverable['type'], { icon: typeof FileText; color: string }> = {
  document: { icon: FileText, color: 'text-blue-400' },
  code: { icon: Code, color: 'text-green-400' },
  deployment: { icon: Globe, color: 'text-purple-400' },
  report: { icon: FileCheck, color: 'text-orange-400' },
  design: { icon: Palette, color: 'text-pink-400' },
};

function formatDate(timestamp: number) {
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function DeliverablesPanel() {
  const { deliverables, agents } = useShipWithAIStore();

  const getAgentInfo = (id: string) => agents.find((a) => a.id === id);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between shrink-0">
        <h3 className="font-semibold flex items-center gap-2">
          <Package className="w-4 h-4" />
          Deliverables
        </h3>
        <span className="text-xs text-gray-500">{deliverables.length} items</span>
      </div>

      {/* Deliverables list */}
      <div className="flex-1 overflow-y-auto">
        {deliverables.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No deliverables yet</p>
            <p className="text-xs mt-1 text-gray-600">
              Completed work will appear here
            </p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {deliverables.map((deliverable) => {
              const config = deliverableConfig[deliverable.type];
              const Icon = config.icon;
              const agent = getAgentInfo(deliverable.producedBy);

              return (
                <motion.div
                  key={deliverable.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="p-4 border-b border-gray-800/50 last:border-0 hover:bg-gray-800/30 transition"
                >
                  <div className="flex items-start gap-3">
                    {/* Icon */}
                    <div className={`p-2 rounded-lg bg-gray-800 shrink-0`}>
                      <Icon className={`w-5 h-5 ${config.color}`} />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm text-white truncate">
                        {deliverable.title}
                      </h4>
                      <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">
                        {deliverable.description}
                      </p>

                      {/* Preview */}
                      {deliverable.preview && (
                        <div className="mt-2 p-2 bg-gray-800 rounded-lg">
                          <pre className="text-xs text-gray-300 overflow-x-auto">
                            {deliverable.preview}
                          </pre>
                        </div>
                      )}

                      {/* Meta */}
                      <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                        {agent && (
                          <span className="flex items-center gap-1">
                            <span
                              className="w-3 h-3 rounded flex items-center justify-center text-[8px] font-bold text-white"
                              style={{ backgroundColor: agent.color }}
                            >
                              {agent.avatar[0]}
                            </span>
                            {agent.name}
                          </span>
                        )}
                        <span>{formatDate(deliverable.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-3 flex gap-2">
                    {deliverable.downloadUrl && (
                      <a
                        href={deliverable.downloadUrl}
                        download
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition text-gray-300"
                      >
                        <Download className="w-3 h-3" />
                        Download
                      </a>
                    )}
                    {deliverable.url && (
                      <a
                        href={deliverable.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition text-gray-300"
                      >
                        {deliverable.type === 'code' ? (
                          <>
                            <Github className="w-3 h-3" />
                            View on GitHub
                          </>
                        ) : deliverable.type === 'deployment' ? (
                          <>
                            <Globe className="w-3 h-3" />
                            Open App
                          </>
                        ) : (
                          <>
                            <ExternalLink className="w-3 h-3" />
                            Open
                          </>
                        )}
                      </a>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
