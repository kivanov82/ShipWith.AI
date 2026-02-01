'use client';

import { useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgentverseStore, type Activity } from '@/lib/store';
import {
  MessageSquare,
  ArrowRight,
  DollarSign,
  Package,
  HelpCircle,
  CheckCircle,
} from 'lucide-react';

const activityConfig: Record<Activity['type'], { icon: typeof MessageSquare; color: string; bg: string }> = {
  message: { icon: MessageSquare, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  task: { icon: ArrowRight, color: 'text-purple-400', bg: 'bg-purple-500/10' },
  payment: { icon: DollarSign, color: 'text-green-400', bg: 'bg-green-500/10' },
  artifact: { icon: Package, color: 'text-orange-400', bg: 'bg-orange-500/10' },
  question: { icon: HelpCircle, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
  answer: { icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
};

function formatTime(timestamp: number) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function getAgentName(id: string, agents: ReturnType<typeof useAgentverseStore>['agents']) {
  return agents.find((a) => a.id === id)?.name || id;
}

export function ActivityFeed() {
  const { activities, agents } = useAgentverseStore();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to top on new activity
  useEffect(() => {
    if (scrollRef.current && activities.length > 0) {
      scrollRef.current.scrollTop = 0;
    }
  }, [activities.length]);

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden h-full flex flex-col">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800 flex items-center justify-between shrink-0">
        <h3 className="font-semibold flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          Live Activity
        </h3>
        <span className="text-xs text-gray-500">{activities.length} events</span>
      </div>

      {/* Activity list */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        {activities.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p>No activity yet</p>
            <p className="text-xs mt-1">Start a project to see agent communication</p>
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            {activities.map((activity) => {
              const config = activityConfig[activity.type];
              const Icon = config.icon;

              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -20, height: 0 }}
                  animate={{ opacity: 1, x: 0, height: 'auto' }}
                  exit={{ opacity: 0, x: 20, height: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-b border-gray-800/50 last:border-0"
                >
                  <div className="p-3 hover:bg-gray-800/30 transition">
                    <div className="flex items-start gap-3">
                      {/* Icon */}
                      <div className={`p-2 rounded-lg ${config.bg} shrink-0`}>
                        <Icon className={`w-4 h-4 ${config.color}`} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        {/* From/To */}
                        <div className="flex items-center gap-1.5 text-sm mb-1">
                          <span className="font-medium text-white">
                            {getAgentName(activity.from, agents)}
                          </span>
                          {activity.to && (
                            <>
                              <ArrowRight className="w-3 h-3 text-gray-500" />
                              <span className="font-medium text-white">
                                {getAgentName(activity.to, agents)}
                              </span>
                            </>
                          )}
                        </div>

                        {/* Message */}
                        <p className="text-sm text-gray-300">{activity.content}</p>

                        {/* Metadata */}
                        {activity.metadata && (
                          <div className="mt-1 flex flex-wrap gap-1">
                            {Object.entries(activity.metadata).map(([key, value]) => (
                              <span
                                key={key}
                                className="text-xs px-2 py-0.5 rounded bg-gray-800 text-gray-400"
                              >
                                {key}: {String(value)}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Time */}
                      <span className="text-xs text-gray-500 shrink-0">
                        {formatTime(activity.timestamp)}
                      </span>
                    </div>
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
