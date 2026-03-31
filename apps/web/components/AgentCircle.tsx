'use client';

import { useMemo, useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useShipWithAIStore, Agent } from '@/lib/store';
import { USE_CASES } from '@/lib/use-cases';
import { AgentCard } from './AgentCard';
import { AgentChatPanel } from './AgentChatPanel';

export function AgentCircle() {
  const { agents, chatMessages, activeSession, createSession } = useShipWithAIStore();
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [shouldAutoStart, setShouldAutoStart] = useState(false);
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

  // Filter agents to show based on use case
  const visibleAgents = useMemo(() => {
    if (activeUseCase && USE_CASES[activeUseCase]) {
      const ucAgentIds = USE_CASES[activeUseCase].agents;
      return agents.filter((a) => ucAgentIds.includes(a.id));
    }
    return agents;
  }, [activeUseCase, agents]);

  // Split into dock agents (not selected) and the active/risen agent
  const dockAgents = visibleAgents.filter((a) => a.id !== selectedAgent?.id);

  return (
    <div className="relative w-full h-full flex flex-col overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0 glow-center pointer-events-none" />
      <div className="absolute inset-0 bg-dots pointer-events-none opacity-40" />

      {/* Main area — chat panel + risen agent */}
      <div className="flex-1 relative z-10 flex items-center justify-center">
        {!activeSession ? (
          /* No session — show start CTA */
          <div className="z-20">
            {showSessionInput ? (
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
                <div className="absolute inset-1 rounded-full bg-gradient-to-br from-emerald-600 to-emerald-700 flex flex-col items-center justify-center shadow-lg shadow-emerald-900/40">
                  <span className="text-[11px] font-bold text-white uppercase tracking-wider font-display">
                    Start
                  </span>
                  <span className="text-[9px] text-emerald-200/80 font-medium">
                    Session
                  </span>
                </div>
              </motion.button>
            )}
          </div>
        ) : selectedAgent ? (
          /* Active chat — risen agent card + chat panel side by side */
          <div className="flex items-start gap-5 max-w-[860px] w-full px-6">
            {/* Risen agent card */}
            <motion.div
              key={`risen-${selectedAgent.id}`}
              className="shrink-0 pt-2"
              initial={{ y: 80, opacity: 0, scale: 0.9 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: 80, opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            >
              <AgentCard
                agent={selectedAgent}
                isSelected={true}
                onClick={() => setSelectedAgent(null)}
              />
            </motion.div>

            {/* Chat panel inline — wider, Grok-style */}
            <div className="flex-1 min-w-0 max-h-[calc(100vh-200px)]">
              <AgentChatPanel
                activeAgent={selectedAgent}
                autoStartAgent={shouldAutoStart}
                onSwitchAgent={(agentId, autoStart) => {
                  const agent = agents.find((a) => a.id === agentId);
                  if (agent) {
                    setShouldAutoStart(!!autoStart);
                    setSelectedAgent(agent);
                  }
                }}
              />
            </div>
          </div>
        ) : (
          /* Session active but no agent selected — guidance */
          <motion.div
            className="flex flex-col items-center text-center"
            style={{ width: 220 }}
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
              Pick an agent below
            </p>
            <p className="text-[10px] text-zinc-500 leading-relaxed">
              Click any agent to start chatting
            </p>
          </motion.div>
        )}
      </div>

      {/* Bottom dock — agent cards in rows */}
      <div className="relative z-20 shrink-0 border-t border-zinc-800/40 bg-[#08080b]/60 backdrop-blur-md">
        <div className="px-4 py-3">
          <div className="flex flex-wrap items-center justify-center gap-2">
            <AnimatePresence mode="popLayout">
              {dockAgents.map((agent, i) => {
                const isInvolved = activeSession?.involvedAgents.includes(agent.id) ?? false;
                const shouldDim = activeSession && !isInvolved;

                return (
                  <motion.div
                    key={agent.id}
                    layout
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{
                      scale: 1,
                      opacity: shouldDim ? 0.35 : 1,
                      filter: shouldDim ? 'grayscale(0.7)' : 'none',
                    }}
                    exit={{ scale: 0.8, opacity: 0, y: -30 }}
                    transition={{
                      layout: { type: 'spring', stiffness: 400, damping: 30 },
                      scale: { delay: i * 0.03 },
                      opacity: { duration: 0.3 },
                    }}
                  >
                    <AgentCard
                      agent={agent}
                      isSelected={false}
                      onClick={() => { setShouldAutoStart(false); setSelectedAgent(agent); }}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
