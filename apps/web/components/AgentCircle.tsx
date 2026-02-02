'use client';

import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgentverseStore, Agent } from '@/lib/store';
import { AgentCard } from './AgentCard';
import { SpeechBubble, getBubblePosition } from './SpeechBubble';
import { AgentChatBubble } from './AgentChatBubble';
import { AgentDetailModal } from './AgentDetailModal';

// Agent groupings
const agentGroups = {
  core: ['pm', 'ux-analyst', 'ui-designer'],
  development: ['ui-developer', 'backend-developer', 'solidity-developer', 'solidity-auditor', 'infrastructure'],
  support: ['qa-tester', 'unit-tester', 'tech-writer', 'marketing'],
};

// Tighter ring radii to fit all agents
const ringRadii = {
  core: 0.14,
  development: 0.28,
  support: 0.42,
};

interface AgentPosition {
  x: number;
  y: number;
  angle: number;
  ring: string;
}

function ConnectionLine({ from, to, type }: { from: AgentPosition; to: AgentPosition; type: string }) {
  const lineColor = type === 'payment' ? '#22c55e' :
                    type === 'question' ? '#eab308' :
                    '#a1a1aa';

  return (
    <g>
      <motion.line
        x1={`${from.x}%`}
        y1={`${from.y}%`}
        x2={`${to.x}%`}
        y2={`${to.y}%`}
        stroke={lineColor}
        strokeWidth="1"
        strokeLinecap="round"
        strokeDasharray="4 4"
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 0.4 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.5 }}
      />
      <motion.circle
        r="3"
        fill={lineColor}
        initial={{ opacity: 0 }}
        animate={{
          cx: [`${from.x}%`, `${to.x}%`],
          cy: [`${from.y}%`, `${to.y}%`],
          opacity: [0, 0.8, 0],
        }}
        transition={{ duration: 2, repeat: Infinity }}
      />
    </g>
  );
}

export function AgentCircle() {
  const { agents, activities, activeConnections, chatMessages } = useAgentverseStore();
  const [detailAgent, setDetailAgent] = useState<Agent | null>(null);
  const [chatAgent, setChatAgent] = useState<string | null>(null);

  // Auto-open chat for agent that's asking questions
  useEffect(() => {
    const latestAgentMessage = chatMessages
      .filter((m) => m.role === 'agent' && m.isQuestion)
      .slice(-1)[0];

    if (latestAgentMessage?.agentId) {
      const agent = agents.find((a) => a.id === latestAgentMessage.agentId);
      if (agent && agent.status === 'waiting') {
        setChatAgent(latestAgentMessage.agentId);
      }
    }
  }, [chatMessages, agents]);

  // Auto-close chat when agent stops waiting
  useEffect(() => {
    if (chatAgent) {
      const agent = agents.find((a) => a.id === chatAgent);
      if (agent && agent.status !== 'waiting' && agent.status !== 'idle') {
        const timeout = setTimeout(() => {
          setChatAgent(null);
        }, 2000);
        return () => clearTimeout(timeout);
      }
    }
  }, [agents, chatAgent]);

  const agentPositions = useMemo(() => {
    const positions: Record<string, AgentPosition> = {};
    const centerX = 50;
    const centerY = 50;

    Object.entries(agentGroups).forEach(([ring, agentIds]) => {
      const radius = ringRadii[ring as keyof typeof ringRadii] * 100;
      const angleStep = (2 * Math.PI) / agentIds.length;
      const startAngle = -Math.PI / 2;

      agentIds.forEach((id, index) => {
        const angle = startAngle + index * angleStep;
        positions[id] = {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
          angle,
          ring,
        };
      });
    });

    return positions;
  }, []);

  const getAgentActivity = (agentId: string): string | null => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent || agent.status === 'idle') return null;
    if (agent.currentTask) return agent.currentTask;
    const recentActivity = activities.find(a => a.from === agentId);
    if (recentActivity) return recentActivity.content;
    return null;
  };

  const getBubbleOffset = (position: 'top' | 'bottom' | 'left' | 'right') => {
    const offsets = {
      top: { x: 0, y: -65 },
      bottom: { x: 0, y: 55 },
      left: { x: -90, y: -5 },
      right: { x: 90, y: -5 },
    };
    return offsets[position];
  };

  return (
    <div className="relative w-full h-full min-h-[450px] flex items-center justify-center overflow-hidden">
      {/* Ring guides */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="xMidYMid meet">
        {Object.values(ringRadii).map((radius, i) => (
          <circle
            key={i}
            cx="50%"
            cy="50%"
            r={`${radius * 100}%`}
            fill="none"
            stroke="#1f1f23"
            strokeWidth="1"
            strokeDasharray="4 4"
          />
        ))}

        <AnimatePresence>
          {activeConnections.map((conn, i) => {
            const fromPos = agentPositions[conn.from];
            const toPos = agentPositions[conn.to];
            if (!fromPos || !toPos) return null;

            return (
              <ConnectionLine
                key={`${conn.from}-${conn.to}-${i}`}
                from={fromPos}
                to={toPos}
                type={conn.type}
              />
            );
          })}
        </AnimatePresence>
      </svg>

      {/* Center label */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-0 pointer-events-none">
        <div className="w-16 h-16 rounded-full bg-zinc-900/50 border border-zinc-800 flex items-center justify-center">
          <span className="text-[9px] font-medium text-zinc-600 uppercase tracking-wider">
            {activeConnections.length > 0 ? 'Active' : 'Ready'}
          </span>
        </div>
      </div>

      {/* Agent cards and bubbles */}
      {agents.map((agent) => {
        const pos = agentPositions[agent.id];
        if (!pos) return null;

        const activity = getAgentActivity(agent.id);
        const bubblePosition = getBubblePosition(pos.angle);
        const bubbleOffset = getBubbleOffset(bubblePosition);
        const isChatOpen = chatAgent === agent.id;
        const isThinking = agent.status === 'thinking';

        return (
          <div
            key={agent.id}
            className="absolute"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: isChatOpen ? 30 : agent.status !== 'idle' ? 20 : 10,
            }}
          >
            {/* Speech bubble for activity (when not chatting) */}
            <AnimatePresence>
              {activity && !isChatOpen && agent.status !== 'waiting' && (
                <div
                  className="absolute z-30"
                  style={{
                    left: bubbleOffset.x,
                    top: bubbleOffset.y,
                  }}
                >
                  <SpeechBubble
                    content={activity}
                    agentColor={agent.color}
                    position={bubblePosition}
                    isThinking={isThinking}
                  />
                </div>
              )}
            </AnimatePresence>

            {/* Chat bubble (positioned to the left) */}
            <AnimatePresence>
              {isChatOpen && (
                <AgentChatBubble
                  agent={agent}
                  onClose={() => setChatAgent(null)}
                />
              )}
            </AnimatePresence>

            {/* Agent card */}
            <AgentCard
              agent={agent}
              isSelected={chatAgent === agent.id}
              onClick={() => setDetailAgent(agent)}
              onPromptClick={() => setChatAgent(agent.id)}
              showPromptButton={agent.status === 'idle' || agent.status === 'waiting'}
            />
          </div>
        );
      })}

      {/* Agent detail modal */}
      {detailAgent && (
        <AgentDetailModal
          agent={detailAgent}
          onClose={() => setDetailAgent(null)}
        />
      )}
    </div>
  );
}
