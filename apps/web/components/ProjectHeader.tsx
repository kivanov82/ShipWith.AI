'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAgentverseStore } from '@/lib/store';
import {
  Play,
  Pause,
  RotateCcw,
  Settings,
  Wallet,
  Zap,
} from 'lucide-react';

export function ProjectHeader() {
  const { currentProject, agents, setCurrentProject } = useAgentverseStore();
  const [showNewProject, setShowNewProject] = useState(false);
  const [projectPrompt, setProjectPrompt] = useState('');

  const totalBalance = agents.reduce((sum, a) => sum + a.balance, 0);
  const activeAgents = agents.filter((a) => a.status !== 'idle').length;

  const handleStartProject = () => {
    if (!projectPrompt.trim()) return;

    setCurrentProject({
      id: `proj_${Date.now()}`,
      name: projectPrompt.slice(0, 50),
      status: 'planning',
    });

    setProjectPrompt('');
    setShowNewProject(false);
  };

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Project info or new project */}
        <div className="flex-1">
          {currentProject ? (
            <div className="flex items-center gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      currentProject.status === 'active'
                        ? 'bg-green-500 animate-pulse'
                        : currentProject.status === 'planning'
                        ? 'bg-yellow-500'
                        : currentProject.status === 'review'
                        ? 'bg-blue-500'
                        : currentProject.status === 'completed'
                        ? 'bg-gray-500'
                        : 'bg-gray-600'
                    }`}
                  />
                  <h2 className="font-semibold">{currentProject.name}</h2>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Status: {currentProject.status} | {activeAgents} agent{activeAgents !== 1 ? 's' : ''} active
                </p>
              </div>

              <div className="flex gap-2">
                <button className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition">
                  <Pause className="w-4 h-4" />
                </button>
                <button className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition">
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : showNewProject ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={projectPrompt}
                onChange={(e) => setProjectPrompt(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleStartProject()}
                placeholder="Describe your project..."
                className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2 text-sm focus:outline-none focus:border-purple-500"
                autoFocus
              />
              <button
                onClick={handleStartProject}
                disabled={!projectPrompt.trim()}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 disabled:text-gray-500 rounded-lg text-sm font-medium transition"
              >
                Start
              </button>
              <button
                onClick={() => setShowNewProject(false)}
                className="px-4 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowNewProject(true)}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 rounded-lg text-sm font-medium transition"
            >
              <Zap className="w-4 h-4" />
              New Project
            </button>
          )}
        </div>

        {/* Right: Stats */}
        <div className="flex items-center gap-6">
          {/* Active agents */}
          <div className="text-right">
            <p className="text-xs text-gray-500">Active Agents</p>
            <p className="font-semibold">
              {activeAgents} / {agents.length}
            </p>
          </div>

          {/* Total balance */}
          <div className="text-right">
            <p className="text-xs text-gray-500">Total Balance</p>
            <p className="font-semibold font-mono text-green-400">
              ${totalBalance.toFixed(2)}
            </p>
          </div>

          {/* Wallet button */}
          <button className="flex items-center gap-2 px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition">
            <Wallet className="w-4 h-4" />
            <span className="hidden sm:inline">Connect</span>
          </button>

          {/* Settings */}
          <button className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition">
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
