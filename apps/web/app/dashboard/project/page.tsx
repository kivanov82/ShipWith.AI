'use client';

import { useShipWithAIStore } from '@/lib/store';
import { ProjectBrief } from '@/components/ProjectBrief';
import { DeliverablesTree } from '@/components/DeliverablesTree';
import { ProjectSummary } from '@/components/ProjectSummary';
import { Package, BarChart3, Users, Zap, Clock, DollarSign, CheckCircle, AlertCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import type { DeliveryRequest } from '@/lib/store';

export default function ProjectPage() {
  const {
    deliverables,
    activeUseCase,
    activeSession,
    agents,
    requestAllDeliveries,
    requestDelivery,
    updateSession,
  } = useShipWithAIStore();
  const isUseCaseMode = !!activeUseCase;

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
    const match = agent.pricing.match(/\$?([\d.]+)-?([\d.]+)?/);
    if (match) {
      const min = parseFloat(match[1]);
      const max = match[2] ? parseFloat(match[2]) : min;
      return sum + (min + max) / 2;
    }
    return sum;
  }, 0) || 0;

  const handleRequestDelivery = (agentId?: string) => {
    if (!activeSession) return;
    if (agentId) {
      const agent = agents.find(a => a.id === agentId);
      if (agent) requestDelivery(activeSession.id, agentId, 'Deliver based on session context', agent.pricing);
    } else {
      requestAllDeliveries(activeSession.id);
    }
  };

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto p-4 md:p-6 space-y-6">
        {/* Page header */}
        <div>
          <h1 className="text-lg font-bold text-zinc-100 font-display">Project</h1>
          <p className="text-xs text-zinc-500 mt-0.5">Overview, deliverables, and progress</p>
        </div>

        {/* Project Brief */}
        {isUseCaseMode && (
          <section>
            <ProjectBrief />
          </section>
        )}

        {/* Session / Team */}
        {activeSession && (
          <section className="bg-[#0c0c0f] border border-zinc-800/60 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-zinc-800/60 flex items-center gap-2">
              <Users className="w-4 h-4 text-zinc-600" />
              <span className="text-sm font-semibold text-zinc-200 font-display">Team</span>
              <span className="text-[10px] text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full ml-auto">
                {activeSession.status.replace('-', ' ')}
              </span>
            </div>
            <div className="p-4 space-y-4">
              {/* Involved Agents */}
              {activeSession.involvedAgents.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {activeSession.involvedAgents.map((agentId) => {
                    const agent = agents.find(a => a.id === agentId);
                    if (!agent) return null;
                    return (
                      <div
                        key={agentId}
                        className="flex items-center gap-1.5 text-[11px] px-2.5 py-1.5 rounded-lg border bg-zinc-900/50"
                        style={{
                          borderColor: `${agent.color}40`,
                          color: agent.color,
                        }}
                      >
                        <span className="text-[10px]">{agent.avatar}</span>
                        <span className="font-medium">{agent.name}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-zinc-600 italic">
                  Chat with agents on the Agents page to involve them
                </p>
              )}

              {/* Delivery Requests */}
              {activeSession.deliveryRequests.length > 0 && (
                <div>
                  <div className="flex items-center gap-1 text-[10px] text-zinc-500 mb-2 uppercase tracking-widest">
                    <Zap className="w-3 h-3" />
                    Deliveries
                  </div>
                  <div className="space-y-1">
                    {activeSession.deliveryRequests.map((delivery) => {
                      const agent = agents.find(a => a.id === delivery.agentId);
                      return (
                        <div
                          key={delivery.id}
                          className="flex items-center justify-between text-[11px] px-3 py-2 bg-zinc-800/50 rounded-lg"
                        >
                          <div className="flex items-center gap-2">
                            {getStatusIcon(delivery.status)}
                            <span className="text-zinc-300">{agent?.name || delivery.agentId}</span>
                          </div>
                          <span className="text-emerald-400 font-mono text-[10px]">{delivery.estimatedCost}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Cost + Request Delivery */}
              {activeSession.involvedAgents.length > 0 && activeSession.status === 'context-building' && (
                <div className="flex items-center justify-between pt-2 border-t border-zinc-800/60">
                  <div className="text-xs text-zinc-500">
                    Est. cost: <span className="text-emerald-400 font-mono font-medium">~${totalEstimatedCost.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={() => handleRequestDelivery()}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white text-[11px] font-semibold rounded-lg transition-all"
                  >
                    <Zap className="w-3 h-3" />
                    Request Deliveries
                  </button>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Summary */}
        <section className="bg-[#0c0c0f] border border-zinc-800/60 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800/60 flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-zinc-600" />
            <span className="text-sm font-semibold text-zinc-200 font-display">Summary</span>
          </div>
          <div className="p-4">
            <ProjectSummary />
          </div>
        </section>

        {/* Deliverables */}
        <section className="bg-[#0c0c0f] border border-zinc-800/60 rounded-2xl overflow-hidden">
          <div className="px-4 py-3 border-b border-zinc-800/60 flex items-center gap-2">
            <Package className="w-4 h-4 text-zinc-600" />
            <span className="text-sm font-semibold text-zinc-200 font-display">Deliverables</span>
            {deliverables.length > 0 && (
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full ml-auto font-medium">
                {deliverables.length}
              </span>
            )}
          </div>
          <div className="p-4">
            <DeliverablesTree />
          </div>
        </section>
      </div>
    </div>
  );
}
