'use client';

import { useState, useEffect } from 'react';
import { AgentCard } from '@/components/AgentCard';
import { EventFeed } from '@/components/EventFeed';
import { ProjectTrigger } from '@/components/ProjectTrigger';
import { PaymentLog } from '@/components/PaymentLog';

const AGENTS = [
  { id: 'pm', name: 'Project Manager', status: 'idle' as const, color: 'agent-pm' },
  { id: 'ux-analyst', name: 'UX Analyst', status: 'idle' as const, color: 'agent-ux' },
  { id: 'ui-designer', name: 'UI Designer', status: 'idle' as const, color: 'agent-design' },
  { id: 'ui-developer', name: 'FE Developer', status: 'idle' as const, color: 'agent-frontend' },
  { id: 'backend-developer', name: 'Backend Dev', status: 'idle' as const, color: 'agent-backend' },
  { id: 'solidity-developer', name: 'Solidity Dev', status: 'idle' as const, color: 'agent-solidity' },
  { id: 'qa-tester', name: 'QA Tester', status: 'idle' as const, color: 'agent-qa' },
  { id: 'infrastructure', name: 'Infrastructure', status: 'idle' as const, color: 'agent-infra' },
];

export default function Dashboard() {
  const [events, setEvents] = useState<Array<{
    id: string;
    type: string;
    source: string;
    target?: string;
    payload: Record<string, unknown>;
    timestamp: number;
  }>>([]);

  const [payments, setPayments] = useState<Array<{
    id: string;
    from: string;
    to: string;
    amount: string;
    status: string;
    timestamp: number;
  }>>([]);

  // SSE connection for live events (to be implemented)
  useEffect(() => {
    // Placeholder for SSE connection
    // const eventSource = new EventSource('/api/events');
    // eventSource.onmessage = (e) => {
    //   const event = JSON.parse(e.data);
    //   setEvents((prev) => [event, ...prev].slice(0, 100));
    // };
    // return () => eventSource.close();
  }, []);

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Hero Section */}
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-blue-400 bg-clip-text text-transparent">
          Welcome to Agentverse
        </h1>
        <p className="text-gray-400 max-w-2xl mx-auto">
          A connected network of AI agents working together as a Web3 software development company.
          Trigger individual agents or run full project pipelines.
        </p>
      </div>

      {/* Agent Grid */}
      <section className="mb-12">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          Active Agents
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {AGENTS.map((agent) => (
            <AgentCard
              key={agent.id}
              id={agent.id}
              name={agent.name}
              status={agent.status}
              colorClass={agent.color}
            />
          ))}
        </div>
      </section>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Project Trigger */}
        <div className="lg:col-span-2">
          <ProjectTrigger />
        </div>

        {/* Payment Log */}
        <div>
          <PaymentLog payments={payments} />
        </div>
      </div>

      {/* Event Feed */}
      <section className="mt-8">
        <EventFeed events={events} />
      </section>
    </div>
  );
}
