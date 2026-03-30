'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Users,
  Zap,
  ChevronDown,
  ChevronUp,
  Package,
  Clock,
  CheckCircle,
  AlertCircle,
  DollarSign
} from 'lucide-react';
import { useShipWithAIStore, Session, DeliveryRequest } from '@/lib/store';

interface SessionPanelProps {
  onRequestDelivery: (sessionId: string, agentId?: string) => void;
}

export function SessionPanel({ onRequestDelivery }: SessionPanelProps) {
  const {
    sessions,
    activeSession,
    agents,
    createSession,
    setActiveSession,
    updateSession,
  } = useShipWithAIStore();

  const [isExpanded, setIsExpanded] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');

  const handleCreateSession = () => {
    if (newSessionName.trim()) {
      createSession(newSessionName.trim());
      setNewSessionName('');
      setShowCreateModal(false);
    }
  };

  const getAgentName = (agentId: string) => {
    const agent = agents.find(a => a.id === agentId);
    return agent?.name || agentId;
  };

  const getStatusIcon = (status: DeliveryRequest['status']) => {
    switch (status) {
      case 'pending': return <Clock className="w-3 h-3 text-zinc-400" />;
      case 'paid': return <DollarSign className="w-3 h-3 text-emerald-400" />;
      case 'in-progress': return <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }}><Zap className="w-3 h-3 text-yellow-400" /></motion.div>;
      case 'completed': return <CheckCircle className="w-3 h-3 text-green-400" />;
      case 'failed': return <AlertCircle className="w-3 h-3 text-red-400" />;
    }
  };

  const totalEstimatedCost = activeSession?.involvedAgents.reduce((sum, agentId) => {
    const agent = agents.find(a => a.id === agentId);
    if (!agent) return sum;
    // Parse pricing like "$0.05-0.15" -> take average
    const match = agent.pricing.match(/\$?([\d.]+)-?([\d.]+)?/);
    if (match) {
      const min = parseFloat(match[1]);
      const max = match[2] ? parseFloat(match[2]) : min;
      return sum + (min + max) / 2;
    }
    return sum;
  }, 0) || 0;

  return (
    <div className="absolute top-4 right-4 z-50 w-72 session-panel">
      {/* Main Panel */}
      <motion.div
        className="glass rounded-2xl shadow-2xl shadow-black/30 overflow-hidden"
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        {/* Header */}
        <div
          className="px-4 py-3 border-b border-zinc-800/60 flex items-center justify-between cursor-pointer hover:bg-zinc-800/30"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-semibold text-zinc-200 font-display">
              {activeSession ? activeSession.name : 'No Active Session'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {activeSession && (
              <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
                {activeSession.status.replace('-', ' ')}
              </span>
            )}
            {isExpanded ? <ChevronDown className="w-4 h-4 text-zinc-500" /> : <ChevronUp className="w-4 h-4 text-zinc-500" />}
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0 }}
              animate={{ height: 'auto' }}
              exit={{ height: 0 }}
              className="overflow-hidden"
            >
              {!activeSession ? (
                /* No session state */
                <div className="p-4 text-center">
                  <p className="text-xs text-zinc-500 mb-3">
                    Start a session to chat with agents and build project context
                  </p>
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="flex items-center gap-2 mx-auto px-4 py-2 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-sm rounded-xl transition-all font-semibold shadow-lg shadow-emerald-900/20"
                  >
                    <Plus className="w-4 h-4" />
                    New Session
                  </button>
                </div>
              ) : (
                /* Active session */
                <div className="p-3 space-y-3">
                  {/* Involved Agents */}
                  <div>
                    <div className="flex items-center gap-1 text-[10px] text-zinc-500 mb-2">
                      <Users className="w-3 h-3" />
                      INVOLVED AGENTS ({activeSession.involvedAgents.length})
                    </div>
                    {activeSession.involvedAgents.length === 0 ? (
                      <p className="text-[11px] text-zinc-600 italic">
                        Chat with agents to involve them in this session
                      </p>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {activeSession.involvedAgents.map((agentId) => {
                          const agent = agents.find(a => a.id === agentId);
                          return (
                            <span
                              key={agentId}
                              className="text-[10px] px-2 py-1 rounded-full border"
                              style={{
                                borderColor: agent?.color || '#666',
                                backgroundColor: `${agent?.color}20` || 'transparent',
                                color: agent?.color || '#888'
                              }}
                            >
                              {agent?.avatar || agentId}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Delivery Requests */}
                  {activeSession.deliveryRequests.length > 0 && (
                    <div>
                      <div className="flex items-center gap-1 text-[10px] text-zinc-500 mb-2">
                        <Zap className="w-3 h-3" />
                        DELIVERIES
                      </div>
                      <div className="space-y-1">
                        {activeSession.deliveryRequests.map((delivery) => (
                          <div
                            key={delivery.id}
                            className="flex items-center justify-between text-[11px] px-2 py-1.5 bg-zinc-800/50 rounded"
                          >
                            <div className="flex items-center gap-2">
                              {getStatusIcon(delivery.status)}
                              <span className="text-zinc-300">{getAgentName(delivery.agentId)}</span>
                            </div>
                            <span className="text-emerald-400 font-mono">{delivery.estimatedCost}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Cost Estimate */}
                  {activeSession.involvedAgents.length > 0 && activeSession.status === 'context-building' && (
                    <div className="pt-2 border-t border-zinc-800">
                      <div className="flex items-center justify-between text-xs mb-3">
                        <span className="text-zinc-500">Est. total cost:</span>
                        <span className="text-emerald-400 font-mono font-medium">
                          ~${totalEstimatedCost.toFixed(2)} USDC
                        </span>
                      </div>

                      {/* Request Delivery Buttons */}
                      <div className="space-y-2">
                        <button
                          onClick={() => onRequestDelivery(activeSession.id)}
                          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-emerald-900/20"
                        >
                          <Zap className="w-3.5 h-3.5" />
                          Request All Deliveries
                        </button>
                        <p className="text-[9px] text-zinc-600 text-center">
                          Or click Job on individual agents for single delivery
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Mark Ready */}
                  {activeSession.status === 'context-building' && activeSession.involvedAgents.length > 0 && (
                    <button
                      onClick={() => updateSession(activeSession.id, { status: 'ready-for-delivery' })}
                      className="w-full text-[10px] text-zinc-500 hover:text-zinc-300 py-1"
                    >
                      Mark as ready for delivery
                    </button>
                  )}
                </div>
              )}

              {/* Session Switcher */}
              {sessions.length > 1 && (
                <div className="px-3 pb-3">
                  <div className="text-[10px] text-zinc-600 mb-1">Switch session:</div>
                  <select
                    value={activeSession?.id || ''}
                    onChange={(e) => {
                      const session = sessions.find(s => s.id === e.target.value);
                      setActiveSession(session || null);
                    }}
                    className="w-full text-xs bg-zinc-800 border border-zinc-700 rounded px-2 py-1 text-zinc-300"
                  >
                    {sessions.map((session) => (
                      <option key={session.id} value={session.id}>
                        {session.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Create Session Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              className="bg-[#0e0e12] border border-zinc-700/60 rounded-2xl p-6 w-96 shadow-2xl shadow-black/40"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-bold text-zinc-100 mb-4 font-display">New Session</h3>
              <input
                type="text"
                value={newSessionName}
                onChange={(e) => setNewSessionName(e.target.value)}
                placeholder="Session name (e.g., NFT Marketplace)"
                className="w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-zinc-600 mb-4"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreateSession()}
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-sm text-zinc-400 hover:text-zinc-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateSession}
                  disabled={!newSessionName.trim()}
                  className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:from-zinc-700 disabled:to-zinc-700 disabled:text-zinc-500 text-white text-sm rounded-xl transition-all font-semibold"
                >
                  Create
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
