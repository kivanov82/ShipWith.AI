'use client';

import { motion } from 'framer-motion';
import { MessageSquare, CheckCircle, Clock, Loader2, Briefcase } from 'lucide-react';
import { Agent, useShipWithAIStore } from '@/lib/store';

interface AgentCardProps {
  agent: Agent;
  isSelected: boolean;
  onClick: () => void;
  onChatClick?: () => void;
  onJobClick?: () => void;
  showButtons?: boolean;
}

export function AgentCard({ agent, isSelected, onClick, onChatClick, onJobClick, showButtons = true }: AgentCardProps) {
  const { deliverables } = useShipWithAIStore();
  const isActive = agent.status !== 'idle';

  // Check if agent has delivered work
  const hasDelivered = deliverables.some(d => d.producedBy === agent.id);

  const statusConfig = {
    idle: { color: 'bg-zinc-600', text: hasDelivered ? 'Done' : 'Idle', icon: hasDelivered ? CheckCircle : null },
    thinking: { color: 'bg-yellow-500', text: 'Thinking', icon: Loader2 },
    working: { color: 'bg-green-500', text: 'Working', icon: null },
    waiting: { color: 'bg-blue-500', text: 'Waiting', icon: Clock },
    error: { color: 'bg-red-500', text: 'Error', icon: null },
  }[agent.status];

  return (
    <motion.div
      className={`
        relative p-2 rounded-lg cursor-pointer
        bg-zinc-900/90 border border-zinc-800 hover:border-zinc-600
        ${isSelected ? 'ring-1 ring-white/30 border-zinc-600' : ''}
        ${isActive ? 'border-l-2' : ''}
      `}
      style={{
        borderLeftColor: isActive ? agent.color : undefined,
        width: 155,
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.02 }}
      onClick={onClick}
    >
      {/* Active glow */}
      {isActive && (
        <motion.div
          className="absolute inset-0 rounded-lg pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at center, ${agent.color}20 0%, transparent 70%)`,
          }}
          animate={{ opacity: [0.4, 0.7, 0.4] }}
          transition={{ duration: 2, repeat: Infinity }}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-2 mb-1">
        <div
          className="w-6 h-6 rounded flex items-center justify-center text-[9px] font-bold shrink-0"
          style={{ backgroundColor: agent.color, color: '#fff' }}
        >
          {agent.avatar}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[10px] font-semibold text-zinc-100 truncate leading-tight">
            {agent.name}
          </div>
          <div className="text-[8px] text-zinc-500 truncate">
            {agent.role}
          </div>
        </div>

        {/* Chat & Job buttons */}
        {showButtons && (
          <div className="flex gap-1">
            <button
              onClick={(e) => {
                e.stopPropagation();
                onChatClick?.();
              }}
              title="Chat (free)"
              className="p-1 bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 hover:border-zinc-600 rounded text-zinc-400 hover:text-zinc-200 transition-colors"
            >
              <MessageSquare className="w-2.5 h-2.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onJobClick?.();
              }}
              title="Request job (paid)"
              className="p-1 bg-zinc-800 hover:bg-emerald-900/50 border border-zinc-700 hover:border-emerald-600 rounded text-zinc-400 hover:text-emerald-400 transition-colors"
            >
              <Briefcase className="w-2.5 h-2.5" />
            </button>
          </div>
        )}
      </div>

      {/* Description */}
      <p className="text-[8px] text-zinc-500 leading-relaxed mb-1.5 line-clamp-1">
        {agent.description}
      </p>

      {/* Status bar */}
      <div className="flex items-center justify-between">
        {/* Status badge */}
        <div className={`
          flex items-center gap-1 px-1.5 py-0.5 rounded text-[8px] font-medium
          ${agent.status === 'idle' && hasDelivered ? 'bg-green-500/20 text-green-400' : ''}
          ${agent.status === 'waiting' ? 'bg-blue-500/20 text-blue-400' : ''}
          ${agent.status === 'thinking' ? 'bg-yellow-500/20 text-yellow-400' : ''}
          ${agent.status === 'working' ? 'bg-green-500/20 text-green-400' : ''}
          ${agent.status === 'idle' && !hasDelivered ? 'bg-zinc-800 text-zinc-500' : ''}
          ${agent.status === 'error' ? 'bg-red-500/20 text-red-400' : ''}
        `}>
          {statusConfig.icon && (
            <statusConfig.icon className={`w-2.5 h-2.5 ${agent.status === 'thinking' ? 'animate-spin' : ''}`} />
          )}
          {!statusConfig.icon && (
            <motion.div
              className={`w-1.5 h-1.5 rounded-full ${statusConfig.color}`}
              animate={isActive ? { scale: [1, 1.3, 1] } : {}}
              transition={{ duration: 1, repeat: Infinity }}
            />
          )}
          <span>{statusConfig.text}</span>
        </div>

        {/* Pricing */}
        <span className="text-[8px] font-medium text-zinc-600">
          {agent.pricing}
        </span>
      </div>
    </motion.div>
  );
}
