'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Logo } from '@/components/Logo';
import { WalletButton } from '@/components/WalletButton';
import {
  MessageSquare,
  Zap,
  Play,
  ArrowRight,
  Bot,
  Code2,
  Palette,
  Shield,
  FileText,
  Megaphone,
  Cpu,
  TestTube,
  Users,
  Workflow,
  ChevronRight,
} from 'lucide-react';

const AGENT_PREVIEWS = [
  { id: 'pm', name: 'PM', color: '#8b5cf6', icon: Workflow },
  { id: 'ux-analyst', name: 'UX', color: '#ec4899', icon: Users },
  { id: 'ui-designer', name: 'Design', color: '#f59e0b', icon: Palette },
  { id: 'ui-developer', name: 'Frontend', color: '#10b981', icon: Code2 },
  { id: 'backend-developer', name: 'Integration', color: '#3b82f6', icon: Cpu },
  { id: 'solidity-developer', name: 'Solidity', color: '#6366f1', icon: Code2 },
  { id: 'solidity-auditor', name: 'Auditor', color: '#ef4444', icon: Shield },
  { id: 'infrastructure', name: 'Infra', color: '#64748b', icon: Cpu },
  { id: 'qa-tester', name: 'QA', color: '#f97316', icon: TestTube },
  { id: 'unit-tester', name: 'Tests', color: '#14b8a6', icon: TestTube },
  { id: 'tech-writer', name: 'Docs', color: '#a855f7', icon: FileText },
  { id: 'marketing', name: 'Marketing', color: '#06b6d4', icon: Megaphone },
];

export default function WelcomePage() {
  const router = useRouter();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
  const [showAgentPicker, setShowAgentPicker] = useState(false);

  const handleChatMode = () => {
    setShowAgentPicker(true);
  };

  const handleSelectAgent = (agentId: string) => {
    router.push(`/dashboard?mode=chat&agent=${agentId}`);
  };

  const handleBuildMode = () => {
    router.push('/dashboard?mode=build');
  };

  const handleDemoMode = () => {
    router.push('/dashboard?mode=demo');
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b border-zinc-800/50">
        <Logo variant="full" size={28} />
        <WalletButton />
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="max-w-3xl mx-auto text-center mb-12">
          <div className="flex items-center justify-center gap-2 mb-4">
            <div className="flex -space-x-2">
              {AGENT_PREVIEWS.slice(0, 5).map((agent) => (
                <div
                  key={agent.id}
                  className="w-8 h-8 rounded-full border-2 border-[#0a0a0a] flex items-center justify-center text-[10px] font-bold text-white"
                  style={{ backgroundColor: agent.color }}
                >
                  {agent.name[0]}
                </div>
              ))}
              <div className="w-8 h-8 rounded-full border-2 border-[#0a0a0a] bg-zinc-800 flex items-center justify-center text-[10px] text-zinc-400">
                +7
              </div>
            </div>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-3 tracking-tight">
            Build Web3 apps with AI agents
          </h1>
          <p className="text-lg text-zinc-400 max-w-xl mx-auto">
            12 specialized agents — from UX research to smart contract auditing — working together to ship your frontend.
          </p>
        </div>

        {/* Mode Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl w-full px-4">
          {/* Chat with an Agent */}
          <button
            onClick={handleChatMode}
            onMouseEnter={() => setHoveredCard('chat')}
            onMouseLeave={() => setHoveredCard(null)}
            className="group relative flex flex-col p-6 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-700 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center mb-4">
              <MessageSquare className="w-5 h-5 text-blue-400" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-1">Chat with an Agent</h2>
            <p className="text-sm text-zinc-500 mb-4 flex-1">
              Pick a specialist and get advice, explore ideas, or ask technical questions.
            </p>
            <div className="flex items-center gap-1 text-xs text-blue-400 group-hover:text-blue-300 transition-colors">
              <span>Choose an agent</span>
              <ChevronRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-green-500/10 text-green-400 text-[10px] font-medium">
              Free
            </div>
          </button>

          {/* Build a Web3 App */}
          <button
            onClick={handleBuildMode}
            onMouseEnter={() => setHoveredCard('build')}
            onMouseLeave={() => setHoveredCard(null)}
            className="group relative flex flex-col p-6 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-emerald-800/50 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4">
              <Zap className="w-5 h-5 text-emerald-400" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-1">Build a Web3 App</h2>
            <p className="text-sm text-zinc-500 mb-4 flex-1">
              Full multi-agent workflow — from UX research to deployed frontend with smart contracts.
            </p>
            <div className="flex items-center gap-1 text-xs text-emerald-400 group-hover:text-emerald-300 transition-colors">
              <span>Start building</span>
              <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
            <div className="absolute top-3 right-3 px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 text-[10px] font-medium">
              Paid
            </div>
          </button>

          {/* Watch a Demo */}
          <button
            onClick={handleDemoMode}
            onMouseEnter={() => setHoveredCard('demo')}
            onMouseLeave={() => setHoveredCard(null)}
            className="group relative flex flex-col p-6 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-900 hover:border-zinc-700 transition-all text-left"
          >
            <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center mb-4">
              <Play className="w-5 h-5 text-purple-400" />
            </div>
            <h2 className="text-lg font-semibold text-white mb-1">Watch a Demo</h2>
            <p className="text-sm text-zinc-500 mb-4 flex-1">
              See 12 agents collaborate on a Token Launchpad — planning, coding, auditing, and shipping.
            </p>
            <div className="flex items-center gap-1 text-xs text-purple-400 group-hover:text-purple-300 transition-colors">
              <span>Run simulation</span>
              <Play className="w-3 h-3 group-hover:translate-x-0.5 transition-transform" />
            </div>
          </button>
        </div>

        {/* Agent Picker Modal */}
        {showAgentPicker && (
          <div
            className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
            onClick={() => setShowAgentPicker(false)}
          >
            <div
              className="bg-zinc-900 border border-zinc-800 rounded-xl max-w-2xl w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-white mb-1">Choose an Agent</h3>
              <p className="text-sm text-zinc-500 mb-5">Select a specialist to chat with</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {AGENT_PREVIEWS.map((agent) => {
                  const Icon = agent.icon;
                  return (
                    <button
                      key={agent.id}
                      onClick={() => handleSelectAgent(agent.id)}
                      onMouseEnter={() => setSelectedAgent(agent.id)}
                      onMouseLeave={() => setSelectedAgent(null)}
                      className="flex items-center gap-3 p-3 rounded-lg border border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/50 transition-all text-left group"
                    >
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                        style={{ backgroundColor: `${agent.color}20` }}
                      >
                        <Icon className="w-4 h-4" style={{ color: agent.color }} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-zinc-200 truncate">{agent.name}</div>
                        <div className="text-[10px] text-zinc-500 truncate">{agent.id}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
              <button
                onClick={() => setShowAgentPicker(false)}
                className="mt-4 w-full py-2 text-sm text-zinc-500 hover:text-zinc-400 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-12 text-center">
          <p className="text-xs text-zinc-600">
            Powered by Claude AI &middot; Payments via x402 on Base (USDC) &middot; Agents registered as ERC-8004 NFTs
          </p>
        </div>
      </main>
    </div>
  );
}
