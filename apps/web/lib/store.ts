import { create } from 'zustand';
import { nanoid } from 'nanoid';

// Agent types
export interface Agent {
  id: string;
  name: string;
  role: string;
  description: string;
  pricing: string;
  status: 'idle' | 'thinking' | 'working' | 'waiting' | 'error';
  avatar: string;
  color: string;
  currentTask?: string;
  balance: number;
  // Future-ready fields
  apiEndpoint?: string;
  walletAddress?: string;
  onchainRanking?: number;
  metadata?: Record<string, unknown>;
}

// Project stats for tracking
export interface ProjectStats {
  startTime: number | null;
  totalSpent: number;
  interactionCount: number;
}

// Event/Activity types
export interface Activity {
  id: string;
  type: 'message' | 'task' | 'payment' | 'artifact' | 'question' | 'answer';
  from: string;
  to?: string;
  content: string;
  metadata?: Record<string, unknown>;
  timestamp: number;
}

// Chat message types
export interface ChatMessage {
  id: string;
  role: 'user' | 'agent' | 'system';
  agentId?: string;
  content: string;
  timestamp: number;
  isQuestion?: boolean;
  options?: string[];
}

// Deliverable types
export interface Deliverable {
  id: string;
  type: 'document' | 'code' | 'deployment' | 'report' | 'design';
  title: string;
  description: string;
  url?: string;
  downloadUrl?: string;
  preview?: string;
  producedBy: string;
  projectId: string;
  createdAt: number;
}

// Project types
export interface Project {
  id: string;
  name: string;
  description?: string;
  status: 'planning' | 'active' | 'review' | 'completed';
  createdAt: number;
}

// Store state
interface AgentverseState {
  // Agents
  agents: Agent[];
  selectedAgent: string | null;
  setSelectedAgent: (id: string | null) => void;
  updateAgentStatus: (id: string, status: Agent['status'], task?: string) => void;
  updateAgentBalance: (id: string, amount: number) => void;

  // Activities
  activities: Activity[];
  addActivity: (activity: Omit<Activity, 'id' | 'timestamp'>) => void;
  clearActivities: () => void;

  // Chat
  chatMessages: ChatMessage[];
  isAgentTyping: boolean;
  currentAgentTyping: string | null;
  addChatMessage: (message: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  setAgentTyping: (agentId: string | null) => void;
  clearChat: () => void;

  // Deliverables
  deliverables: Deliverable[];
  addDeliverable: (deliverable: Omit<Deliverable, 'id' | 'createdAt'>) => void;

  // Project
  currentProject: {
    id: string;
    name: string;
    status: 'idle' | 'planning' | 'active' | 'review' | 'completed';
  } | null;
  setCurrentProject: (project: AgentverseState['currentProject']) => void;

  // Project History
  projects: Project[];
  addProject: (project: Omit<Project, 'id' | 'createdAt'>) => void;
  activeProjectId: string | null;
  setActiveProject: (id: string | null) => void;

  // Connection simulation
  activeConnections: Array<{ from: string; to: string; type: string }>;
  addConnection: (from: string, to: string, type: string) => void;
  removeConnection: (from: string, to: string) => void;
  clearConnections: () => void;

  // Project stats
  projectStats: ProjectStats;
  startProjectTimer: () => void;
  addToTotalSpent: (amount: number) => void;
  incrementInteractionCount: () => void;
  resetProjectStats: () => void;
}

// Initial agents
const initialAgents: Agent[] = [
  { id: 'pm', name: 'Project Manager', role: 'Orchestrator', description: 'Coordinates workflows & tasks', pricing: '$0.05-0.15', status: 'idle', avatar: 'PM', color: '#8b5cf6', balance: 100 },
  { id: 'ux-analyst', name: 'UX Analyst', role: 'Research & Flows', description: 'User research & journeys', pricing: '$0.03-0.08', status: 'idle', avatar: 'UX', color: '#ec4899', balance: 100 },
  { id: 'ui-designer', name: 'UI Designer', role: 'Visual Design', description: 'Interfaces & design systems', pricing: '$0.04-0.10', status: 'idle', avatar: 'UI', color: '#f59e0b', balance: 100 },
  { id: 'ui-developer', name: 'FE Developer', role: 'React/Next.js', description: 'Frontend components & apps', pricing: '$0.05-0.12', status: 'idle', avatar: 'FE', color: '#10b981', balance: 100 },
  { id: 'backend-developer', name: 'Backend Dev', role: 'APIs & Services', description: 'APIs, databases & services', pricing: '$0.05-0.12', status: 'idle', avatar: 'BE', color: '#3b82f6', balance: 100 },
  { id: 'solidity-developer', name: 'Solidity Dev', role: 'Smart Contracts', description: 'EVM contracts & protocols', pricing: '$0.08-0.20', status: 'idle', avatar: 'SC', color: '#6366f1', balance: 100 },
  { id: 'solidity-auditor', name: 'Security Auditor', role: 'Contract Audits', description: 'Security reviews & audits', pricing: '$0.10-0.25', status: 'idle', avatar: 'SA', color: '#ef4444', balance: 100 },
  { id: 'infrastructure', name: 'Infrastructure', role: 'DevOps & Cloud', description: 'CI/CD & cloud deployment', pricing: '$0.04-0.10', status: 'idle', avatar: 'IN', color: '#64748b', balance: 100 },
  { id: 'qa-tester', name: 'QA Tester', role: 'E2E Testing', description: 'End-to-end test coverage', pricing: '$0.03-0.08', status: 'idle', avatar: 'QA', color: '#f97316', balance: 100 },
  { id: 'unit-tester', name: 'Unit Tester', role: 'Test Coverage', description: 'Unit tests & mocking', pricing: '$0.02-0.06', status: 'idle', avatar: 'UT', color: '#14b8a6', balance: 100 },
  { id: 'tech-writer', name: 'Tech Writer', role: 'Documentation', description: 'Docs, guides & READMEs', pricing: '$0.02-0.05', status: 'idle', avatar: 'TW', color: '#a855f7', balance: 100 },
  { id: 'marketing', name: 'Marketing', role: 'Content & Copy', description: 'Launch content & campaigns', pricing: '$0.02-0.06', status: 'idle', avatar: 'MK', color: '#06b6d4', balance: 100 },
];

export const useAgentverseStore = create<AgentverseState>((set, get) => ({
  // Agents
  agents: initialAgents,
  selectedAgent: null,
  setSelectedAgent: (id) => set({ selectedAgent: id }),
  updateAgentStatus: (id, status, task) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === id ? { ...a, status, currentTask: task } : a
      ),
    })),
  updateAgentBalance: (id, amount) =>
    set((state) => ({
      agents: state.agents.map((a) =>
        a.id === id ? { ...a, balance: a.balance + amount } : a
      ),
    })),

  // Activities
  activities: [],
  addActivity: (activity) =>
    set((state) => ({
      activities: [
        { ...activity, id: nanoid(), timestamp: Date.now() },
        ...state.activities,
      ].slice(0, 100),
    })),
  clearActivities: () => set({ activities: [] }),

  // Chat
  chatMessages: [],
  isAgentTyping: false,
  currentAgentTyping: null,
  addChatMessage: (message) =>
    set((state) => ({
      chatMessages: [
        ...state.chatMessages,
        { ...message, id: nanoid(), timestamp: Date.now() },
      ],
    })),
  setAgentTyping: (agentId) =>
    set({ isAgentTyping: !!agentId, currentAgentTyping: agentId }),
  clearChat: () => set({ chatMessages: [] }),

  // Deliverables
  deliverables: [],
  addDeliverable: (deliverable) =>
    set((state) => ({
      deliverables: [
        { ...deliverable, id: nanoid(), createdAt: Date.now() },
        ...state.deliverables,
      ],
    })),

  // Project
  currentProject: null,
  setCurrentProject: (project) => set({ currentProject: project }),

  // Project History
  projects: [
    { id: 'demo-1', name: 'Token Launchpad', description: 'ERC-20 token launch platform', status: 'completed', createdAt: Date.now() - 86400000 * 7 },
    { id: 'demo-2', name: 'NFT Marketplace', description: 'Multi-chain NFT trading platform', status: 'active', createdAt: Date.now() - 86400000 * 3 },
    { id: 'demo-3', name: 'DeFi Dashboard', description: 'Portfolio tracking and analytics', status: 'planning', createdAt: Date.now() - 86400000 },
  ],
  activeProjectId: 'demo-2',
  addProject: (project) =>
    set((state) => ({
      projects: [
        { ...project, id: nanoid(), createdAt: Date.now() },
        ...state.projects,
      ],
    })),
  setActiveProject: (id) => set({ activeProjectId: id }),

  // Connections
  activeConnections: [],
  addConnection: (from, to, type) =>
    set((state) => ({
      activeConnections: [...state.activeConnections, { from, to, type }],
    })),
  removeConnection: (from, to) =>
    set((state) => ({
      activeConnections: state.activeConnections.filter(
        (c) => !(c.from === from && c.to === to)
      ),
    })),
  clearConnections: () => set({ activeConnections: [] }),

  // Project stats
  projectStats: {
    startTime: null,
    totalSpent: 0,
    interactionCount: 0,
  },
  startProjectTimer: () =>
    set((state) => ({
      projectStats: { ...state.projectStats, startTime: Date.now() },
    })),
  addToTotalSpent: (amount) =>
    set((state) => ({
      projectStats: { ...state.projectStats, totalSpent: state.projectStats.totalSpent + amount },
    })),
  incrementInteractionCount: () =>
    set((state) => ({
      projectStats: { ...state.projectStats, interactionCount: state.projectStats.interactionCount + 1 },
    })),
  resetProjectStats: () =>
    set({
      projectStats: { startTime: null, totalSpent: 0, interactionCount: 0 },
    }),
}));
