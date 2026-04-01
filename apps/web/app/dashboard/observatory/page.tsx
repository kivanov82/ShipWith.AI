'use client';

import { useState, useEffect } from 'react';
import {
  Eye,
  Wrench,
  Brain,
  Shield,
  Zap,
  ChevronDown,
  ChevronRight,
  CircuitBoard,
  GitBranch,
  Search,
  Terminal,
  FileCode,
  AlertTriangle,
  CheckCircle2,
  ExternalLink,
  Cpu,
  Package,
} from 'lucide-react';

interface AgentMeta {
  hasSystemPrompt: boolean;
  systemPromptLines: number;
  examples: string[];
  toolCount: number;
  hasOutputTool: boolean;
}

interface AgentConfig {
  id: string;
  name: string;
  model?: string;
  description: string;
  capabilities: string[];
  tools?: string[];
  outputTool?: string;
  pricing: { baseRate: string; currency: string; perUnit: string };
  inputs: Array<{ name: string; type: string; description: string; required: boolean }>;
  outputs: Array<{ name: string; type: string; description: string; required: boolean }>;
  _meta: AgentMeta;
}

// Tool category colors
const TOOL_CATEGORIES: Record<string, { color: string; icon: string; label: string }> = {
  github: { color: 'text-purple-400 bg-purple-400/10 border-purple-400/20', icon: '{}', label: 'GitHub' },
  vercel: { color: 'text-cyan-400 bg-cyan-400/10 border-cyan-400/20', icon: '{}', label: 'Vercel' },
  project: { color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20', icon: '{}', label: 'Project' },
  document: { color: 'text-amber-400 bg-amber-400/10 border-amber-400/20', icon: '{}', label: 'Document' },
  command: { color: 'text-red-400 bg-red-400/10 border-red-400/20', icon: '{}', label: 'Command' },
  output: { color: 'text-blue-400 bg-blue-400/10 border-blue-400/20', icon: '{}', label: 'Output' },
  orchestration: { color: 'text-violet-400 bg-violet-400/10 border-violet-400/20', icon: '{}', label: 'Orchestration' },
  search: { color: 'text-orange-400 bg-orange-400/10 border-orange-400/20', icon: '{}', label: 'Search' },
};

function getToolCategory(toolName: string): string {
  if (toolName.startsWith('github_')) return 'github';
  if (toolName.startsWith('vercel_')) return 'vercel';
  if (toolName.startsWith('submit_')) return 'output';
  if (toolName.startsWith('create_workflow') || toolName.startsWith('get_workflow')) return 'orchestration';
  if (['create_task', 'get_project_status', 'request_handoff', 'list_deliverables', 'read_deliverables'].includes(toolName)) return 'project';
  if (['write_document'].includes(toolName)) return 'document';
  if (['web_search'].includes(toolName)) return 'search';
  if (['run_command'].includes(toolName)) return 'command';
  return 'project';
}

function ToolBadge({ name }: { name: string }) {
  const cat = TOOL_CATEGORIES[getToolCategory(name)];
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-mono border ${cat.color}`}>
      {name}
    </span>
  );
}

function ModelBadge({ model }: { model?: string }) {
  if (!model) return <span className="text-zinc-600 text-[10px]">default</span>;
  const isOpus = model.includes('opus');
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium border ${
      isOpus
        ? 'text-amber-300 bg-amber-400/10 border-amber-400/20'
        : 'text-zinc-400 bg-zinc-400/10 border-zinc-400/20'
    }`}>
      <Cpu className="w-2.5 h-2.5" />
      {isOpus ? 'Opus' : 'Sonnet'}
    </span>
  );
}

function AgentRow({ agent, expanded, onToggle }: { agent: AgentConfig; expanded: boolean; onToggle: () => void }) {
  const meta = agent._meta;

  return (
    <div className="border border-zinc-800/60 rounded-lg overflow-hidden">
      {/* Header row */}
      <button
        onClick={onToggle}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-zinc-800/30 transition-colors text-left"
      >
        <div className="flex-shrink-0">
          {expanded ? <ChevronDown className="w-3.5 h-3.5 text-zinc-500" /> : <ChevronRight className="w-3.5 h-3.5 text-zinc-500" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-zinc-200">{agent.name}</span>
            <span className="text-[10px] text-zinc-600 font-mono">{agent.id}</span>
          </div>
          <p className="text-[11px] text-zinc-500 truncate mt-0.5">{agent.description}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <ModelBadge model={agent.model} />
          <span className="text-[10px] text-zinc-600 tabular-nums">{meta.toolCount} tools</span>
          <span className="text-[10px] text-emerald-500/70">{agent.pricing.baseRate} {agent.pricing.currency}</span>
        </div>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-zinc-800/40 bg-zinc-900/30 px-4 py-4 space-y-4">
          {/* Tools */}
          <div>
            <h4 className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
              <Wrench className="w-3 h-3" /> Tools ({agent.tools?.length || 0})
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {agent.tools?.map((tool) => (
                <ToolBadge key={tool} name={tool} />
              )) || <span className="text-zinc-600 text-[11px]">No tools assigned</span>}
            </div>
          </div>

          {/* Output Tool */}
          {agent.outputTool && (
            <div>
              <h4 className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
                <Package className="w-3 h-3" /> Structured Output
              </h4>
              <div className="flex items-center gap-2">
                <ToolBadge name={agent.outputTool} />
                <span className="text-[10px] text-zinc-600">forced via tool_choice in job mode</span>
              </div>
            </div>
          )}

          {/* Capabilities */}
          <div>
            <h4 className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2 flex items-center gap-1.5">
              <Zap className="w-3 h-3" /> Capabilities
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {agent.capabilities.map((cap) => (
                <span key={cap} className="px-2 py-0.5 rounded-md text-[10px] text-zinc-400 bg-zinc-800/50 border border-zinc-700/30">
                  {cap}
                </span>
              ))}
            </div>
          </div>

          {/* I/O Specs */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <h4 className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Inputs</h4>
              <div className="space-y-1">
                {agent.inputs.map((inp) => (
                  <div key={inp.name} className="text-[11px]">
                    <span className="text-zinc-300 font-mono">{inp.name}</span>
                    <span className="text-zinc-600 ml-1">({inp.type})</span>
                    {inp.required && <span className="text-red-400/60 ml-1">*</span>}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <h4 className="text-[10px] uppercase tracking-wider text-zinc-500 mb-2">Outputs</h4>
              <div className="space-y-1">
                {agent.outputs.map((out) => (
                  <div key={out.name} className="text-[11px]">
                    <span className="text-zinc-300 font-mono">{out.name}</span>
                    <span className="text-zinc-600 ml-1">({out.type})</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Prompt & Examples Metadata */}
          <div className="flex items-center gap-4 pt-2 border-t border-zinc-800/40">
            <div className="flex items-center gap-1.5 text-[10px]">
              <FileCode className="w-3 h-3 text-zinc-600" />
              <span className="text-zinc-500">System prompt:</span>
              <span className="text-zinc-400">{meta.systemPromptLines} lines</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px]">
              <Brain className="w-3 h-3 text-zinc-600" />
              <span className="text-zinc-500">Examples:</span>
              <span className={meta.examples.length > 0 ? 'text-emerald-400' : 'text-zinc-600'}>
                {meta.examples.length > 0 ? meta.examples.join(', ') : 'none'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ArchitectureOverview({ agents }: { agents: AgentConfig[] }) {
  const totalTools = new Set(agents.flatMap((a) => a.tools || [])).size;
  const opusAgents = agents.filter((a) => a.model?.includes('opus')).length;
  const sonnetAgents = agents.length - opusAgents;
  const withExamples = agents.filter((a) => a._meta.examples.length > 0).length;

  const stats = [
    { label: 'Agents', value: agents.length, icon: CircuitBoard, color: 'text-emerald-400' },
    { label: 'Unique Tools', value: totalTools, icon: Wrench, color: 'text-purple-400' },
    { label: 'Opus Models', value: opusAgents, icon: Cpu, color: 'text-amber-400' },
    { label: 'Sonnet Models', value: sonnetAgents, icon: Cpu, color: 'text-zinc-400' },
    { label: 'With Examples', value: `${withExamples}/${agents.length}`, icon: Brain, color: 'text-cyan-400' },
  ];

  return (
    <div className="grid grid-cols-5 gap-3">
      {stats.map((stat) => (
        <div key={stat.label} className="border border-zinc-800/60 rounded-lg p-3 bg-zinc-900/20">
          <div className="flex items-center gap-1.5 mb-1">
            <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider">{stat.label}</span>
          </div>
          <span className="text-xl font-semibold text-zinc-200">{stat.value}</span>
        </div>
      ))}
    </div>
  );
}

function HooksOverview() {
  const hooks = [
    { name: 'blockMainBranchWrites', type: 'Pre', scope: 'github_write_files', desc: 'Prevents commits to main/master' },
    { name: 'blockDangerousCommands', type: 'Pre', scope: 'run_command', desc: 'Blocks rm -rf, chmod 777, etc.' },
    { name: 'logToolExecution', type: 'Post', scope: 'All tools', desc: 'Audit trail for all tool calls' },
    { name: 'truncateLargeOutputs', type: 'Post', scope: 'All tools', desc: 'Caps output at 8K chars to prevent context bloat' },
  ];

  return (
    <div className="border border-zinc-800/60 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800/40 flex items-center gap-2">
        <Shield className="w-4 h-4 text-amber-400" />
        <span className="text-sm font-medium text-zinc-200">Execution Hooks</span>
        <span className="text-[10px] text-zinc-600">Applied to all agents</span>
      </div>
      <div className="divide-y divide-zinc-800/30">
        {hooks.map((hook) => (
          <div key={hook.name} className="px-4 py-2.5 flex items-center gap-3">
            <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
              hook.type === 'Pre'
                ? 'bg-red-400/10 text-red-400 border border-red-400/20'
                : 'bg-blue-400/10 text-blue-400 border border-blue-400/20'
            }`}>
              {hook.type}
            </span>
            <span className="text-[11px] font-mono text-zinc-300">{hook.name}</span>
            <span className="text-[10px] text-zinc-600">{hook.scope}</span>
            <span className="text-[10px] text-zinc-500 ml-auto">{hook.desc}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ToolRegistry({ agents }: { agents: AgentConfig[] }) {
  // Build a map of tool → agents that use it
  const toolMap = new Map<string, string[]>();
  for (const agent of agents) {
    for (const tool of agent.tools || []) {
      if (!toolMap.has(tool)) toolMap.set(tool, []);
      toolMap.get(tool)!.push(agent.id);
    }
  }

  const sortedTools = Array.from(toolMap.entries()).sort((a, b) => b[1].length - a[1].length);

  return (
    <div className="border border-zinc-800/60 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800/40 flex items-center gap-2">
        <Wrench className="w-4 h-4 text-purple-400" />
        <span className="text-sm font-medium text-zinc-200">Tool Registry</span>
        <span className="text-[10px] text-zinc-600">{sortedTools.length} tools registered</span>
      </div>
      <div className="divide-y divide-zinc-800/30 max-h-[400px] overflow-y-auto">
        {sortedTools.map(([tool, agentIds]) => {
          const cat = getToolCategory(tool);
          const catInfo = TOOL_CATEGORIES[cat];
          return (
            <div key={tool} className="px-4 py-2 flex items-center gap-3">
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-medium border ${catInfo.color}`}>
                {catInfo.label}
              </span>
              <span className="text-[11px] font-mono text-zinc-300 w-44">{tool}</span>
              <div className="flex items-center gap-1 flex-1">
                {agentIds.map((id) => (
                  <span key={id} className="px-1.5 py-0.5 rounded text-[9px] bg-zinc-800/60 text-zinc-500">
                    {id}
                  </span>
                ))}
              </div>
              <span className="text-[10px] text-zinc-600 tabular-nums">{agentIds.length} agents</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function EscalationInfo() {
  const triggers = [
    { trigger: 'max_iterations', condition: 'Agent hits iteration limit without completing', action: 'Flag for human review' },
    { trigger: 'max_errors', condition: '>50% of tool calls failed', action: 'Flag for human review' },
    { trigger: 'permission_denied', condition: 'Tool blocked by hook or permission error', action: 'Immediate escalation' },
  ];

  return (
    <div className="border border-zinc-800/60 rounded-lg overflow-hidden">
      <div className="px-4 py-3 border-b border-zinc-800/40 flex items-center gap-2">
        <AlertTriangle className="w-4 h-4 text-orange-400" />
        <span className="text-sm font-medium text-zinc-200">Escalation Triggers</span>
      </div>
      <div className="divide-y divide-zinc-800/30">
        {triggers.map((t) => (
          <div key={t.trigger} className="px-4 py-2.5 flex items-center gap-3">
            <span className="text-[11px] font-mono text-orange-300 w-36">{t.trigger}</span>
            <span className="text-[10px] text-zinc-500 flex-1">{t.condition}</span>
            <span className="text-[10px] text-zinc-400">{t.action}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ObservatoryPage() {
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [filter, setFilter] = useState('');

  useEffect(() => {
    fetch('/api/agents/list')
      .then((r) => r.json())
      .then((data) => {
        setAgents(data.agents || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = filter
    ? agents.filter((a) =>
        a.name.toLowerCase().includes(filter.toLowerCase()) ||
        a.id.includes(filter.toLowerCase()) ||
        a.tools?.some((t) => t.includes(filter.toLowerCase())) ||
        a.capabilities.some((c) => c.includes(filter.toLowerCase()))
      )
    : agents;

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="flex items-center gap-2 text-zinc-500">
          <Eye className="w-5 h-5 animate-pulse" />
          <span className="text-sm">Loading agent observatory...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <Eye className="w-5 h-5 text-emerald-400" />
            <h1 className="text-lg font-semibold text-zinc-100" style={{ fontFamily: 'Syne, sans-serif' }}>
              Agent Observatory
            </h1>
          </div>
          <p className="text-[12px] text-zinc-500">
            Technical overview of all agents, tools, hooks, and architecture.
          </p>
        </div>

        {/* Stats Overview */}
        <ArchitectureOverview agents={agents} />

        {/* Architecture Sections */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <HooksOverview />
          <EscalationInfo />
        </div>

        {/* Tool Registry */}
        <ToolRegistry agents={agents} />

        {/* Agent List */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-medium text-zinc-300 flex items-center gap-2">
              <CircuitBoard className="w-4 h-4 text-emerald-400" />
              Agent Configurations
            </h2>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-zinc-600 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Filter agents, tools, capabilities..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="bg-zinc-900/50 border border-zinc-800/60 rounded-lg pl-8 pr-3 py-1.5 text-[11px] text-zinc-300 placeholder-zinc-600 focus:outline-none focus:border-zinc-700 w-64"
              />
            </div>
          </div>
          <div className="space-y-2">
            {filtered.map((agent) => (
              <AgentRow
                key={agent.id}
                agent={agent}
                expanded={expandedAgent === agent.id}
                onToggle={() => setExpandedAgent(expandedAgent === agent.id ? null : agent.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
