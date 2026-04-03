'use client';

import { motion } from 'framer-motion';
import { CheckCircle, Clock, Loader2, MessageCircle, ArrowRight } from 'lucide-react';
import { Agent, useShipWithAIStore } from '@/lib/store';

interface AgentCardProps {
  agent: Agent;
  isSelected: boolean;
  onClick: () => void;
}

export function AgentCard({ agent, isSelected, onClick }: AgentCardProps) {
  const { deliverables, activeSession, chatMessages } = useShipWithAIStore();
  const isActive = agent.status !== 'idle';
  const hasDelivered = deliverables.some(d => d.producedBy === agent.id);
  const wasChatted = activeSession?.involvedAgents.includes(agent.id) ?? false;
  const hasMessages = chatMessages.some(m => m.agentId === agent.id);

  // Determine the idle status text and style
  let idleText = 'Idle';
  let idleStyle = 'bg-zinc-800/60 text-zinc-500';
  let IdleIcon: typeof CheckCircle | null = null;

  if (hasDelivered) {
    idleText = 'Delivered';
    idleStyle = 'bg-emerald-500/15 text-emerald-400';
    IdleIcon = CheckCircle;
  } else if (wasChatted && hasMessages) {
    idleText = 'Consulted';
    idleStyle = 'bg-violet-500/15 text-violet-400';
    IdleIcon = MessageCircle;
  }

  const statusConfig = {
    idle: { color: 'bg-zinc-600', text: idleText, icon: IdleIcon, style: idleStyle },
    thinking: { color: 'bg-amber-500', text: 'Thinking...', icon: Loader2, style: 'bg-amber-500/15 text-amber-400' },
    working: { color: 'bg-emerald-500', text: 'Working...', icon: Loader2, style: 'bg-emerald-500/15 text-emerald-400' },
    waiting: { color: 'bg-cyan-500', text: 'Ready for input', icon: ArrowRight, style: 'bg-cyan-500/15 text-cyan-400' },
    error: { color: 'bg-red-500', text: 'Error', icon: null, style: 'bg-red-500/15 text-red-400' },
  }[agent.status];

  return (
    <motion.div
      className={`
        relative rounded-xl cursor-pointer
        bg-[#0e0e12]/90 backdrop-blur-sm
        border
        ${isSelected
          ? 'border-transparent'
          : 'border-zinc-800/80 hover:border-zinc-600/60 overflow-hidden'}
      `}
      style={{
        width: 180,
        ...(isSelected ? { borderColor: `${agent.color}60` } : {}),
      }}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      whileHover={{ scale: 1.03, y: -2 }}
      transition={{ type: 'spring', stiffness: 400, damping: 25 }}
      onClick={onClick}
    >
      {/* Chat-active pulsing glow */}
      {isSelected && (
        <motion.div
          className="absolute -inset-[2px] rounded-xl pointer-events-none z-0"
          style={{
            boxShadow: `0 0 16px 4px ${agent.color}50, 0 0 4px 1px ${agent.color}30`,
          }}
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      {/* Working glow — visible even when not selected */}
      {isActive && !isSelected && (
        <motion.div
          className="absolute -inset-[2px] rounded-xl pointer-events-none z-0"
          style={{
            boxShadow: agent.status === 'thinking'
              ? `0 0 20px 6px rgba(245, 158, 11, 0.4)`
              : agent.status === 'error'
              ? `0 0 20px 6px rgba(239, 68, 68, 0.4)`
              : `0 0 20px 6px rgba(16, 185, 129, 0.4)`,
          }}
          animate={{ opacity: [0.3, 0.8, 0.3] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}
      {/* Waiting glow — soft cyan pulse */}
      {agent.status === 'waiting' && !isSelected && (
        <motion.div
          className="absolute -inset-[2px] rounded-xl pointer-events-none z-0"
          style={{ boxShadow: `0 0 16px 4px rgba(34, 211, 238, 0.3)` }}
          animate={{ opacity: [0.2, 0.6, 0.2] }}
          transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
        />
      )}

      {/* Top color accent bar */}
      <div
        className="h-1 w-full rounded-t-xl"
        style={{ background: isSelected
          ? agent.color
          : `linear-gradient(90deg, ${agent.color}, ${agent.color}88)`
        }}
      />

      {/* Active glow (non-selected) — stronger pulse for thinking */}
      {isActive && !isSelected && (
        <motion.div
          className="absolute -inset-[1px] rounded-xl pointer-events-none"
          style={{
            boxShadow: agent.status === 'thinking'
              ? `0 0 12px 3px ${agent.color}40, 0 0 3px 1px ${agent.color}25`
              : `0 0 8px 2px ${agent.color}25`,
            background: `radial-gradient(ellipse at center, ${agent.color}12 0%, transparent 70%)`,
          }}
          animate={{ opacity: agent.status === 'thinking' ? [0.3, 1, 0.3] : [0.4, 0.7, 0.4] }}
          transition={{
            duration: agent.status === 'thinking' ? 1.2 : 2.5,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      )}

      <div className="p-3 relative z-10">
        {/* Header */}
        <div className="flex items-center gap-2.5 mb-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ring-1 ring-white/10"
            style={{ backgroundColor: agent.color, color: '#fff' }}
          >
            {agent.avatar}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-semibold text-zinc-100 truncate leading-tight">
              {agent.name}
            </div>
            <div className="text-[11px] text-zinc-500 truncate">
              {agent.role}
            </div>
          </div>
        </div>

        {/* Status bar */}
        <div className="flex items-center justify-between">
          <div className={`
            flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium
            ${statusConfig.style}
          `}>
            {statusConfig.icon && (
              <statusConfig.icon className={`w-3 h-3 ${(agent.status === 'thinking' || agent.status === 'working') ? 'animate-spin' : ''}`} />
            )}
            {!statusConfig.icon && (
              <motion.div
                className={`w-2 h-2 rounded-full ${statusConfig.color}`}
                animate={isActive ? { scale: [1, 1.4, 1] } : {}}
                transition={{ duration: 1.2, repeat: Infinity }}
              />
            )}
            <span>{agent.currentTask || statusConfig.text}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
