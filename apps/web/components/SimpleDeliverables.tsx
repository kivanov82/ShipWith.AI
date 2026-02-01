'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useAgentverseStore } from '@/lib/store';
import { FileText, Code, Globe, FileCheck, Palette, Download, ExternalLink } from 'lucide-react';

const typeConfig = {
  document: { icon: FileText, color: 'text-blue-400' },
  code: { icon: Code, color: 'text-green-400' },
  deployment: { icon: Globe, color: 'text-purple-400' },
  report: { icon: FileCheck, color: 'text-orange-400' },
  design: { icon: Palette, color: 'text-pink-400' },
};

export function SimpleDeliverables() {
  const { deliverables, agents } = useAgentverseStore();

  const getAgent = (id: string) => agents.find((a) => a.id === id);

  if (deliverables.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-sm">No deliverables yet</p>
        <p className="text-xs mt-1">Completed work appears here</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <AnimatePresence>
        {deliverables.map((item) => {
          const config = typeConfig[item.type];
          const Icon = config.icon;
          const agent = getAgent(item.producedBy);

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="p-3 bg-gray-900 rounded-xl"
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 bg-gray-800 rounded-lg ${config.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">{item.title}</h4>
                  <p className="text-xs text-gray-400 line-clamp-1">{item.description}</p>
                  {agent && (
                    <p className="text-xs mt-1" style={{ color: agent.color }}>
                      by {agent.name}
                    </p>
                  )}
                </div>
              </div>

              {/* Preview */}
              {item.preview && (
                <pre className="mt-2 p-2 bg-gray-800 rounded text-xs text-gray-300 overflow-x-auto max-h-20">
                  {item.preview.slice(0, 200)}...
                </pre>
              )}

              {/* Actions */}
              <div className="mt-2 flex gap-2">
                {item.downloadUrl && (
                  <a
                    href={item.downloadUrl}
                    className="flex items-center gap-1 text-xs px-2 py-1 bg-gray-800 rounded-lg hover:bg-gray-700"
                  >
                    <Download className="w-3 h-3" /> Download
                  </a>
                )}
                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs px-2 py-1 bg-gray-800 rounded-lg hover:bg-gray-700"
                  >
                    <ExternalLink className="w-3 h-3" /> Open
                  </a>
                )}
              </div>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
