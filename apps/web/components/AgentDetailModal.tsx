'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, Globe, Star, Zap, MessageSquare } from 'lucide-react';
import { Agent, useShipWithAIStore } from '@/lib/store';

interface AgentDetailModalProps {
  agent: Agent | null;
  onClose: () => void;
}

// Skills for each agent type
const agentSkills: Record<string, string[]> = {
  'pm': ['Task breakdown', 'Resource allocation', 'Timeline management', 'Risk assessment', 'Stakeholder communication'],
  'ux-analyst': ['User research', 'Journey mapping', 'Wireframing', 'Usability testing', 'Information architecture'],
  'ui-designer': ['Visual design', 'Design systems', 'Prototyping', 'Responsive layouts', 'Brand identity'],
  'ui-developer': ['React/Next.js', 'TypeScript', 'Tailwind CSS', 'State management', 'API integration'],
  'backend-developer': ['Node.js', 'REST APIs', 'GraphQL', 'Database design', 'Authentication'],
  'solidity-developer': ['ERC standards', 'DeFi protocols', 'Gas optimization', 'Upgradeable contracts', 'Testing'],
  'solidity-auditor': ['Security analysis', 'Vulnerability detection', 'Best practices', 'Formal verification', 'Report writing'],
  'infrastructure': ['CI/CD', 'Docker/K8s', 'AWS/GCP', 'Monitoring', 'Security'],
  'qa-tester': ['E2E testing', 'Playwright', 'Test automation', 'Bug tracking', 'Regression testing'],
  'unit-tester': ['Jest/Vitest', 'Mocking', 'Coverage analysis', 'TDD', 'Integration tests'],
  'tech-writer': ['Documentation', 'API docs', 'Tutorials', 'README files', 'Style guides'],
  'marketing': ['Content strategy', 'Social media', 'Copywriting', 'Launch campaigns', 'Community building'],
};

export function AgentDetailModal({ agent, onClose }: AgentDetailModalProps) {
  const { activities, deliverables } = useShipWithAIStore();

  if (!agent) return null;

  const agentActivities = activities.filter(a => a.from === agent.id).slice(0, 5);
  const agentDeliverables = deliverables.filter(d => d.producedBy === agent.id);
  const skills = agentSkills[agent.id] || [];

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <motion.div
          className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-xl shadow-2xl overflow-hidden"
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="relative p-4 border-b border-zinc-800">
            <div
              className="absolute inset-0 opacity-10"
              style={{
                background: `linear-gradient(135deg, ${agent.color} 0%, transparent 60%)`,
              }}
            />
            <div className="relative flex items-start gap-3">
              <div
                className="w-12 h-12 rounded-lg flex items-center justify-center text-white text-lg font-bold"
                style={{ backgroundColor: agent.color }}
              >
                {agent.avatar}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-semibold text-zinc-100">{agent.name}</h2>
                <p className="text-sm text-zinc-400">{agent.role}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{agent.description}</p>
              </div>
              <button
                onClick={onClose}
                className="p-1.5 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-2 bg-zinc-800/50 rounded-lg text-center">
                <div className="text-sm font-semibold text-zinc-200">{agent.pricing}</div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Pricing</div>
              </div>
              <div className="p-2 bg-zinc-800/50 rounded-lg text-center">
                <div className="text-sm font-semibold text-zinc-200">
                  {agent.onchainRanking || '4.8'}
                </div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Rating</div>
              </div>
              <div className="p-2 bg-zinc-800/50 rounded-lg text-center">
                <div className="text-sm font-semibold text-zinc-200">
                  {agentDeliverables.length}
                </div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wide">Delivered</div>
              </div>
            </div>

            {/* Metadata */}
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wide">Details</h3>
              <div className="space-y-1.5">
                <div className="flex items-center gap-2 text-xs">
                  <Wallet className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-zinc-400">Wallet:</span>
                  <code className="text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded font-mono text-[10px]">
                    {agent.walletAddress || '0x1a2b...3c4d'}
                  </code>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Globe className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-zinc-400">API:</span>
                  <code className="text-zinc-300 bg-zinc-800 px-1.5 py-0.5 rounded font-mono text-[10px]">
                    {agent.apiEndpoint || `api.shipwith.ai/${agent.id}`}
                  </code>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <Star className="w-3.5 h-3.5 text-zinc-500" />
                  <span className="text-zinc-400">Balance:</span>
                  <span className="text-zinc-300">${agent.balance.toFixed(2)} USDC</span>
                </div>
              </div>
            </div>

            {/* Skills */}
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wide flex items-center gap-1.5">
                <Zap className="w-3 h-3" />
                Skills
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {skills.map((skill) => (
                  <span
                    key={skill}
                    className="px-2 py-0.5 bg-zinc-800 text-zinc-300 text-[10px] rounded-full border border-zinc-700"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            {/* Recent Activity */}
            {agentActivities.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-medium text-zinc-400 uppercase tracking-wide flex items-center gap-1.5">
                  <MessageSquare className="w-3 h-3" />
                  Recent Activity
                </h3>
                <div className="space-y-1">
                  {agentActivities.map((activity) => (
                    <div
                      key={activity.id}
                      className="p-2 bg-zinc-800/30 rounded text-[11px] text-zinc-400"
                    >
                      {activity.content}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
            <button
              className="w-full py-2 px-4 bg-white text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-200 transition-colors"
              onClick={onClose}
            >
              Close
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
