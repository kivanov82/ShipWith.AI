'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { useShipWithAIStore } from '@/lib/store';
import { ArrowRight } from 'lucide-react';

const typeEmoji: Record<string, string> = {
  message: '💬',
  task: '📋',
  payment: '💰',
  artifact: '📦',
  question: '❓',
  answer: '✅',
};

export function SimpleActivityFeed() {
  const { activities, agents } = useShipWithAIStore();

  const getAgentName = (id: string) => {
    const agent = agents.find((a) => a.id === id);
    return agent?.name || id;
  };

  const getAgentColor = (id: string) => {
    const agent = agents.find((a) => a.id === id);
    return agent?.color || '#6b7280';
  };

  if (activities.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <p className="text-sm">No activity yet</p>
        <p className="text-xs mt-1">Run the demo to see agents in action</p>
      </div>
    );
  }

  return (
    <div className="space-y-2 max-h-[300px] overflow-y-auto">
      <AnimatePresence mode="popLayout">
        {activities.slice(0, 20).map((activity) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex items-start gap-2 p-2 rounded-lg bg-gray-900/50 text-sm"
          >
            <span className="text-base shrink-0">{typeEmoji[activity.type] || '📌'}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1 flex-wrap">
                <span
                  className="font-medium text-xs"
                  style={{ color: getAgentColor(activity.from) }}
                >
                  {getAgentName(activity.from)}
                </span>
                {activity.to && (
                  <>
                    <ArrowRight className="w-3 h-3 text-gray-500" />
                    <span
                      className="font-medium text-xs"
                      style={{ color: getAgentColor(activity.to) }}
                    >
                      {getAgentName(activity.to)}
                    </span>
                  </>
                )}
              </div>
              <p className="text-xs text-gray-400 truncate">{activity.content}</p>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
