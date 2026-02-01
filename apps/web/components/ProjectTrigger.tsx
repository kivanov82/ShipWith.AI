'use client';

import { type FC, useState } from 'react';

export const ProjectTrigger: FC = () => {
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'full' | 'agent'>('full');
  const [selectedAgent, setSelectedAgent] = useState('pm');

  const agents = [
    { id: 'pm', name: 'Project Manager' },
    { id: 'ux-analyst', name: 'UX Analyst' },
    { id: 'ui-designer', name: 'UI Designer' },
    { id: 'ui-developer', name: 'FE Developer' },
    { id: 'backend-developer', name: 'Backend Developer' },
    { id: 'solidity-developer', name: 'Solidity Developer' },
    { id: 'solidity-auditor', name: 'Solidity Auditor' },
    { id: 'infrastructure', name: 'Infrastructure' },
    { id: 'qa-tester', name: 'QA Tester' },
    { id: 'unit-tester', name: 'Unit Tester' },
    { id: 'tech-writer', name: 'Tech Writer' },
    { id: 'marketing', name: 'Marketing' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prompt.trim()) return;

    setIsLoading(true);
    try {
      const endpoint = mode === 'full'
        ? '/api/projects'
        : `/api/agents/${selectedAgent}/invoke`;

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt }),
      });

      if (!response.ok) throw new Error('Failed to trigger');

      // Handle response
      const data = await response.json();
      console.log('Triggered:', data);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-800">
        <h3 className="font-medium">Start a Project</h3>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4">
        {/* Mode Toggle */}
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMode('full')}
            className={`flex-1 py-2 text-sm rounded-lg transition ${
              mode === 'full'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Full Pipeline
          </button>
          <button
            type="button"
            onClick={() => setMode('agent')}
            className={`flex-1 py-2 text-sm rounded-lg transition ${
              mode === 'agent'
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Single Agent
          </button>
        </div>

        {/* Agent Selector (for single agent mode) */}
        {mode === 'agent' && (
          <select
            value={selectedAgent}
            onChange={(e) => setSelectedAgent(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-purple-500"
          >
            {agents.map((agent) => (
              <option key={agent.id} value={agent.id}>
                {agent.name}
              </option>
            ))}
          </select>
        )}

        {/* Prompt Input */}
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder={
            mode === 'full'
              ? 'Describe your project... (e.g., "Build a token launchpad with fair launch mechanics")'
              : 'Describe the task for this agent...'
          }
          rows={4}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 text-sm focus:outline-none focus:border-purple-500 resize-none"
        />

        {/* Cost Estimate (mock) */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">Estimated cost:</span>
          <span className="font-medium text-green-400">
            {mode === 'full' ? '~0.50 USDC' : '~0.05 USDC'}
          </span>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !prompt.trim()}
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium transition"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
              Processing...
            </span>
          ) : mode === 'full' ? (
            'Start Project'
          ) : (
            `Invoke ${agents.find((a) => a.id === selectedAgent)?.name}`
          )}
        </button>
      </form>
    </div>
  );
};
