'use client';

import { type FC } from 'react';

interface AgentCardProps {
  id: string;
  name: string;
  status: 'idle' | 'working' | 'waiting' | 'error';
  colorClass: string;
  currentTask?: string;
}

const statusConfig = {
  idle: { label: 'Idle', dotClass: 'bg-gray-500' },
  working: { label: 'Working', dotClass: 'bg-green-500 animate-pulse' },
  waiting: { label: 'Waiting', dotClass: 'bg-yellow-500' },
  error: { label: 'Error', dotClass: 'bg-red-500' },
};

export const AgentCard: FC<AgentCardProps> = ({
  id,
  name,
  status,
  colorClass,
  currentTask,
}) => {
  const { label, dotClass } = statusConfig[status];

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg p-4 hover:border-gray-700 transition cursor-pointer group">
      <div className="flex items-start justify-between mb-3">
        <div
          className={`w-10 h-10 rounded-lg bg-${colorClass} flex items-center justify-center text-white font-bold text-sm`}
          style={{
            backgroundColor: `var(--color-${colorClass}, #6366f1)`,
          }}
        >
          {name.charAt(0)}
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${dotClass}`}></span>
          <span className="text-xs text-gray-500">{label}</span>
        </div>
      </div>

      <h3 className="font-medium text-sm mb-1 group-hover:text-white transition">
        {name}
      </h3>
      <p className="text-xs text-gray-500 truncate">
        {currentTask || `Agent ID: ${id}`}
      </p>

      <button className="mt-3 w-full text-xs py-1.5 rounded bg-gray-800 hover:bg-gray-700 transition text-gray-300">
        Invoke Agent
      </button>
    </div>
  );
};
