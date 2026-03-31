'use client';

import { AgentCircle } from '@/components/AgentCircle';

export default function AgentsPage() {
  return (
    <div className="h-full flex flex-col relative">
      <div className="flex-1 overflow-hidden">
        <AgentCircle />
      </div>
    </div>
  );
}
