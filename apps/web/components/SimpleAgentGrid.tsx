'use client';

import { motion } from 'framer-motion';
import { useShipWithAIStore } from '@/lib/store';

const statusColors = {
  idle: 'bg-gray-600',
  thinking: 'bg-yellow-500 animate-pulse',
  working: 'bg-green-500 animate-pulse',
  waiting: 'bg-blue-500',
  error: 'bg-red-500',
};

export function SimpleAgentGrid() {
  const { agents, selectedAgent, setSelectedAgent } = useShipWithAIStore();

  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
      {agents.map((agent) => {
        const isActive = agent.status !== 'idle';
        const isSelected = selectedAgent === agent.id;

        return (
          <motion.button
            key={agent.id}
            onClick={() => setSelectedAgent(isSelected ? null : agent.id)}
            whileTap={{ scale: 0.95 }}
            className={`
              relative p-3 rounded-xl text-center transition-all
              ${isSelected
                ? 'bg-gray-800 ring-2 ring-white'
                : 'bg-gray-900 hover:bg-gray-800'}
            `}
          >
            {/* Avatar */}
            <div
              className="w-10 h-10 mx-auto rounded-lg flex items-center justify-center text-white font-bold text-sm mb-2"
              style={{ backgroundColor: agent.color }}
            >
              {agent.avatar}
            </div>

            {/* Name */}
            <p className="text-xs font-medium truncate">{agent.name}</p>

            {/* Status dot */}
            <div
              className={`absolute top-2 right-2 w-2 h-2 rounded-full ${statusColors[agent.status]}`}
            />

            {/* Current task indicator */}
            {isActive && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="mt-1 text-[10px] text-gray-400 truncate"
              >
                {agent.status === 'working' ? '⚡ Working' :
                 agent.status === 'thinking' ? '💭 Thinking' :
                 agent.status === 'waiting' ? '⏳ Waiting' : ''}
              </motion.div>
            )}
          </motion.button>
        );
      })}
    </div>
  );
}
