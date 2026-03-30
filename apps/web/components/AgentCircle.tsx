'use client';

import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useShipWithAIStore, Agent } from '@/lib/store';
import { USE_CASES } from '@/lib/use-cases';
import { AgentCard } from './AgentCard';
import { SpeechBubble, getBubblePosition } from './SpeechBubble';
import { AgentChatPanel } from './AgentChatPanel';
import { AgentDetailModal } from './AgentDetailModal';

// Agent groupings — full set
const allAgentGroups = {
  core: ['pm', 'ux-analyst', 'ui-designer'],
  development: ['ui-developer', 'backend-developer', 'mobile-developer', 'solidity-developer', 'solidity-auditor', 'infrastructure'],
  support: ['qa-tester', 'unit-tester', 'tech-writer', 'marketing'],
  specialists: ['seo-specialist', 'payment-integration', 'e-commerce-specialist'],
};

// Tighter ring radii to fit all agents
const ringRadii = {
  core: 0.14,
  development: 0.28,
  support: 0.40,
  specialists: 0.48,
};

interface AgentPosition {
  x: number;
  y: number;
  angle: number;
  ring: string;
}

function ConnectionLine({ from, to, type }: { from: AgentPosition; to: AgentPosition; type: string }) {
  const lineColor = type === 'payment' ? '#34d399' :
                    type === 'question' ? '#fbbf24' :
                    '#71717a';

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
        animate={{ pathLength: 1, opacity: 0.35 }}
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
  const { agents, activities, activeConnections, chatMessages, activeSession, createSession } = useShipWithAIStore();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [showSessionInput, setShowSessionInput] = useState(false);
  const [sessionName, setSessionName] = useState('');

  const handleStartSession = () => {
    if (sessionName.trim()) {
      createSession(sessionName.trim());
      setSessionName('');
      setShowSessionInput(false);
    }
  };

  // Auto-select the first involved agent when session loads and no chat has started
  useEffect(() => {
    if (activeSession && !selectedAgent && chatMessages.length === 0 && activeSession.involvedAgents.length > 0) {
      const firstAgentId = activeSession.involvedAgents[0];
      const agent = agents.find((a) => a.id === firstAgentId);
      if (agent) {
        setSelectedAgent(agent);
      }
    }
  }, [activeSession, selectedAgent, chatMessages.length, agents]);

  // Auto-select agent that's asking a question
  useEffect(() => {
    const latestAgentMessage = chatMessages
      .filter((m) => m.role === 'agent' && m.isQuestion)
      .slice(-1)[0];

    if (latestAgentMessage?.agentId) {
      const agent = agents.find((a) => a.id === latestAgentMessage.agentId);
      if (agent && agent.status === 'waiting') {
        setSelectedAgent(agent);
      }
    }
  }, [chatMessages, agents]);

  const activeUseCase = useShipWithAIStore((s) => s.activeUseCase);

  // When a use case is active, only show its agents (distributed across 2-3 rings)
  const agentGroups = useMemo(() => {
    if (activeUseCase && USE_CASES[activeUseCase]) {
      const ucAgents = USE_CASES[activeUseCase].agents;
      const coreCount = Math.min(3, Math.ceil(ucAgents.length / 2));
      return {
        core: ucAgents.slice(0, coreCount),
        development: ucAgents.slice(coreCount),
        support: [] as string[],
        specialists: [] as string[],
      };
    }
    return allAgentGroups;
  }, [activeUseCase]);

  const agentPositions = useMemo(() => {
    const positions: Record<string, AgentPosition> = {};
    const centerX = 50;
    const centerY = 50;

    Object.entries(agentGroups).forEach(([ring, agentIds]) => {
      if (agentIds.length === 0) return;
      const radiusKey = ring as keyof typeof ringRadii;
      const radius = (ringRadii[radiusKey] ?? ringRadii.support) * 100;
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
  }, [agentGroups]);

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
    <div className="relative w-full h-full min-h-[450px] flex items-center justify-center overflow-hidden agent-circle-container">
      {/* Background depth — radial glow from center */}
      <div className="absolute inset-0 glow-center pointer-events-none" />
      <div className="absolute inset-0 bg-dots pointer-events-none opacity-40" />

      {/* Ring guides with gradient glow */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" preserveAspectRatio="xMidYMid meet">
        <defs>
          <radialGradient id="ring-glow" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#34d399" stopOpacity="0.04" />
            <stop offset="50%" stopColor="#22d3ee" stopOpacity="0.02" />
            <stop offset="100%" stopColor="transparent" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Ambient center glow */}
        <circle cx="50%" cy="50%" r="12%" fill="url(#ring-glow)" />

        {Object.entries(ringRadii).map(([ring, radius], i) => (
          <circle
            key={ring}
            cx="50%"
            cy="50%"
            r={`${radius * 100}%`}
            fill="none"
            stroke={i === 0 ? '#22332a' : '#1a1a22'}
            strokeWidth="1"
            strokeDasharray="3 6"
            className="ring-pulse"
            style={{ animationDelay: `${i * 1.5}s` }}
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

      {/* Static chat panel — top left */}
      <AgentChatPanel activeAgent={selectedAgent} />

      {/* Center area — CTA or status */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
        {!activeSession ? (
          showSessionInput ? (
            <motion.div
              className="glass rounded-2xl p-4 shadow-2xl shadow-emerald-900/20 border-emerald-500/30"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <input
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="Project name..."
                className="w-36 px-3 py-1.5 bg-zinc-800/80 border border-zinc-700 rounded-lg text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 mb-2"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleStartSession();
                  if (e.key === 'Escape') setShowSessionInput(false);
                }}
              />
              <div className="flex gap-1.5">
                <button
                  onClick={() => setShowSessionInput(false)}
                  className="flex-1 text-[10px] text-zinc-500 hover:text-zinc-300 py-1.5 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartSession}
                  disabled={!sessionName.trim()}
                  className="flex-1 text-[10px] bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 text-white py-1.5 rounded-lg transition-colors font-medium"
                >
                  Start
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.button
              onClick={() => setShowSessionInput(true)}
              className="relative rounded-full flex flex-col items-center justify-center cursor-pointer"
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.95 }}
              style={{ width: 88, height: 88 }}
            >
              {/* Outer glow ring */}
              <motion.div
                className="absolute inset-0 rounded-full"
                style={{
                  background: 'conic-gradient(from 0deg, #34d399, #22d3ee, #818cf8, #34d399)',
                  padding: 2,
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
              >
                <div className="w-full h-full rounded-full bg-[#0a0e0c]" />
              </motion.div>

              {/* Inner content */}
              <div className="absolute inset-1 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-700 flex flex-col items-center justify-center shadow-lg shadow-emerald-900/40">
                <span className="text-[11px] font-bold text-white uppercase tracking-wider font-display">
                  Start
                </span>
                <span className="text-[9px] text-emerald-200/80 font-medium">
                  Session
                </span>
              </div>
            </motion.button>
          )
        ) : !selectedAgent ? (
          /* Active session, no agent selected — show guidance */
          <motion.div
            className="flex flex-col items-center text-center"
            style={{ width: 180 }}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
          >
            <motion.div
              className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mb-2"
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              <svg className="w-5 h-5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </motion.div>
            <p className="text-xs font-semibold text-zinc-200 mb-1 font-display">
              Pick a highlighted agent
            </p>
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              Chat with your team to refine the project, then request deliveries
            </p>
          </motion.div>
        ) : null}
      </div>

      {/* Agent cards and activity bubbles */}
      {agents.map((agent, i) => {
        const pos = agentPositions[agent.id];
        if (!pos) return null;

        const activity = getAgentActivity(agent.id);
        const bubblePosition = getBubblePosition(pos.angle);
        const bubbleOffset = getBubbleOffset(bubblePosition);
        const isThinking = agent.status === 'thinking';
        const isSelected = selectedAgent?.id === agent.id;
        const isInvolved = activeSession?.involvedAgents.includes(agent.id) ?? false;
        const shouldDim = activeSession && !isInvolved && !isSelected;

        return (
          <motion.div
            key={agent.id}
            className="absolute"
            style={{
              left: `${pos.x}%`,
              top: `${pos.y}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: isSelected ? 25 : isInvolved ? 15 : agent.status !== 'idle' ? 20 : 10,
              opacity: shouldDim ? 0.3 : 1,
              filter: shouldDim ? 'grayscale(0.8)' : 'none',
              transition: 'opacity 0.3s, filter 0.3s',
            }}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: shouldDim ? 0.3 : 1 }}
            transition={{
              delay: 0.1 + i * 0.04,
              duration: 0.4,
              ease: [0.22, 1, 0.36, 1],
            }}
          >
            {/* Speech bubble for activity */}
            <AnimatePresence>
              {activity && agent.status !== 'waiting' && (
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

            {/* Agent card — single click to select */}
            <AgentCard
              agent={agent}
              isSelected={isSelected}
              onClick={() => setSelectedAgent(isSelected ? null : agent)}
            />
          </motion.div>
        );
      })}

      {/* Agent detail modal — removed, click now selects for chat */}
    </div>
  );
}
