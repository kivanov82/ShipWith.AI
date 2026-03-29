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
  const { agents, activities, activeConnections, chatMessages, activeSession, createSession } = useAgentverseStore();
  const [detailAgent, setDetailAgent] = useState<Agent | null>(null);
  const [chatAgent, setChatAgent] = useState<string | null>(null);
  const [chatMode, setChatMode] = useState<'chat' | 'job'>('chat');
  const [showSessionInput, setShowSessionInput] = useState(false);
  const [sessionName, setSessionName] = useState('');

  const handleStartSession = () => {
    if (sessionName.trim()) {
      createSession(sessionName.trim());
      setSessionName('');
      setShowSessionInput(false);
    }
  };

  const openChat = (agentId: string, mode: 'chat' | 'job') => {
    setChatAgent(agentId);
    setChatMode(mode);
  };

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
    <div className="relative w-full h-full min-h-[450px] flex items-center justify-center overflow-hidden agent-circle-container">
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

      {/* Center button/label */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-20">
        {!activeSession ? (
          /* No session - show Start button */
          showSessionInput ? (
            <motion.div
              className="bg-zinc-900 border border-emerald-600 rounded-xl p-3 shadow-xl"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            >
              <input
                type="text"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="Project name..."
                className="w-32 px-2 py-1 bg-zinc-800 border border-zinc-700 rounded text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-600 mb-2"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleStartSession();
                  if (e.key === 'Escape') setShowSessionInput(false);
                }}
              />
              <div className="flex gap-1">
                <button
                  onClick={() => setShowSessionInput(false)}
                  className="flex-1 text-[10px] text-zinc-500 hover:text-zinc-300 py-1"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStartSession}
                  disabled={!sessionName.trim()}
                  className="flex-1 text-[10px] bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-700 text-white py-1 rounded transition-colors"
                >
                  Start
                </button>
              </div>
            </motion.div>
          ) : (
            <motion.button
              onClick={() => setShowSessionInput(true)}
              className="w-20 h-20 rounded-full bg-emerald-600 hover:bg-emerald-500 border-2 border-emerald-400 flex flex-col items-center justify-center cursor-pointer transition-colors shadow-lg shadow-emerald-900/50"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <span className="text-[10px] font-bold text-white uppercase tracking-wider">
                Start
              </span>
              <span className="text-[8px] text-emerald-200">
                Session
              </span>
            </motion.button>
          )
        ) : (
          /* Active session - show status */
          <motion.div
            className={`w-20 h-20 rounded-full flex flex-col items-center justify-center border-2 ${
              activeSession.status === 'context-building'
                ? 'bg-emerald-900/50 border-emerald-600'
                : activeSession.status === 'delivering'
                ? 'bg-yellow-900/50 border-yellow-600'
                : 'bg-green-900/50 border-green-600'
            }`}
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
          >
            <span className="text-[8px] font-medium text-zinc-400 uppercase">
              {activeSession.status === 'context-building' ? 'Building' : activeSession.status.replace('-', ' ')}
            </span>
            <span className="text-[10px] font-bold text-white truncate max-w-[70px] px-1">
              {activeSession.name}
            </span>
            <span className="text-[8px] text-emerald-400">
              {activeSession.involvedAgents.length} agents
            </span>
          </motion.div>
        )}
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
                  mode={chatMode}
                  onClose={() => setChatAgent(null)}
                />
              )}
            </AnimatePresence>

            {/* Agent card */}
            <AgentCard
              agent={agent}
              isSelected={chatAgent === agent.id}
              onClick={() => setDetailAgent(agent)}
              onChatClick={() => openChat(agent.id, 'chat')}
              onJobClick={() => openChat(agent.id, 'job')}
              showButtons={agent.status === 'idle' || agent.status === 'waiting'}
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
