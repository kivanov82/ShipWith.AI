'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import { motion } from 'framer-motion';
import { useAgentverseStore, type Agent } from '@/lib/store';
import { MessageSquare, Loader2, CheckCircle, AlertCircle, Clock } from 'lucide-react';

const statusConfig = {
  idle: { icon: null, pulse: false, ring: 'ring-gray-500/30' },
  thinking: { icon: Loader2, pulse: true, ring: 'ring-yellow-500/50' },
  working: { icon: null, pulse: true, ring: 'ring-green-500/50' },
  waiting: { icon: Clock, pulse: false, ring: 'ring-blue-500/50' },
  error: { icon: AlertCircle, pulse: false, ring: 'ring-red-500/50' },
};

interface AgentNodeData extends Agent {
  isSelected?: boolean;
}

function AgentNodeComponent({ data, selected }: NodeProps<AgentNodeData>) {
  const { setSelectedAgent, selectedAgent } = useAgentverseStore();
  const config = statusConfig[data.status];
  const StatusIcon = config.icon;
  const isSelected = selectedAgent === data.id;

  return (
    <>
      {/* Input handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!w-3 !h-3 !bg-gray-600 !border-2 !border-gray-800"
      />

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.98 }}
        onClick={() => setSelectedAgent(isSelected ? null : data.id)}
        className={`
          relative cursor-pointer select-none
          w-44 bg-gray-900 border-2 rounded-xl overflow-hidden
          transition-all duration-200
          ${isSelected ? 'border-white shadow-lg shadow-white/10' : 'border-gray-700 hover:border-gray-500'}
          ${config.pulse ? 'animate-pulse-slow' : ''}
        `}
      >
        {/* Status ring */}
        <div className={`absolute inset-0 ring-2 ${config.ring} rounded-xl pointer-events-none`} />

        {/* Header with avatar */}
        <div
          className="h-2"
          style={{ backgroundColor: data.color }}
        />

        <div className="p-3">
          {/* Avatar and status */}
          <div className="flex items-start justify-between mb-2">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: data.color }}
            >
              {data.avatar}
            </div>
            <div className="flex items-center gap-1">
              {StatusIcon && (
                <StatusIcon
                  className={`w-4 h-4 ${data.status === 'thinking' ? 'animate-spin text-yellow-400' : 'text-gray-400'}`}
                />
              )}
              <div
                className={`w-2 h-2 rounded-full ${
                  data.status === 'idle' ? 'bg-gray-500' :
                  data.status === 'working' ? 'bg-green-500' :
                  data.status === 'thinking' ? 'bg-yellow-500' :
                  data.status === 'waiting' ? 'bg-blue-500' :
                  'bg-red-500'
                }`}
              />
            </div>
          </div>

          {/* Name and role */}
          <h3 className="font-semibold text-sm text-white truncate">{data.name}</h3>
          <p className="text-xs text-gray-400 truncate">{data.role}</p>

          {/* Current task */}
          {data.currentTask && (
            <motion.div
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-2 text-xs text-gray-300 bg-gray-800 rounded px-2 py-1 truncate"
            >
              {data.currentTask}
            </motion.div>
          )}

          {/* Balance */}
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-gray-500">Balance</span>
            <span className="text-xs font-mono text-green-400">${data.balance.toFixed(2)}</span>
          </div>
        </div>
      </motion.div>

      {/* Output handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!w-3 !h-3 !bg-gray-600 !border-2 !border-gray-800"
      />
    </>
  );
}

export const AgentNode = memo(AgentNodeComponent);
