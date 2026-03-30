'use client';

import { useShipWithAIStore } from '@/lib/store';
import { AgentCircle } from '@/components/AgentCircle';
import { SessionPanel } from '@/components/SessionPanel';

export default function AgentsPage() {
  const {
    agents,
    requestAllDeliveries,
    requestDelivery,
  } = useShipWithAIStore();

  const handleRequestDelivery = async (sessionId: string, agentId?: string) => {
    if (agentId) {
      const agent = agents.find(a => a.id === agentId);
      if (agent) {
        requestDelivery(sessionId, agentId, 'Deliver based on session context', agent.pricing);
      }
    } else {
      requestAllDeliveries(sessionId);
    }
  };

  return (
    <div className="h-full flex flex-col relative">
      <div className="flex-1 p-2 overflow-hidden">
        <AgentCircle />
      </div>
      <SessionPanel onRequestDelivery={handleRequestDelivery} />
    </div>
  );
}
