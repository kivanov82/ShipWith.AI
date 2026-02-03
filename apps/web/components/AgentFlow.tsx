'use client';

import { useCallback, useEffect, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  type Node,
  type Edge,
  MarkerType,
  ConnectionLineType,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';
import { useAgentverseStore, type Agent } from '@/lib/store';
import { AgentNode } from './AgentNode';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodeTypes: any = { agent: AgentNode };

// Layout agents in a grid pattern
const createNodes = (agents: Agent[]): Node[] => {
  const cols = 4;
  const xGap = 220;
  const yGap = 180;
  const startX = 50;
  const startY = 50;

  return agents.map((agent, index) => ({
    id: agent.id,
    type: 'agent',
    position: {
      x: startX + (index % cols) * xGap,
      y: startY + Math.floor(index / cols) * yGap,
    },
    data: agent,
  }));
};

// Create edges from active connections
const createEdges = (connections: Array<{ from: string; to: string; type: string }>): Edge[] => {
  return connections.map((conn, index) => ({
    id: `${conn.from}-${conn.to}-${index}`,
    source: conn.from,
    target: conn.to,
    type: 'smoothstep',
    animated: true,
    style: {
      stroke: conn.type === 'payment' ? '#10b981' : conn.type === 'task' ? '#8b5cf6' : '#3b82f6',
      strokeWidth: 2,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: conn.type === 'payment' ? '#10b981' : conn.type === 'task' ? '#8b5cf6' : '#3b82f6',
    },
    label: conn.type,
    labelStyle: { fill: '#9ca3af', fontSize: 10 },
    labelBgStyle: { fill: '#1f2937', fillOpacity: 0.8 },
  }));
};

export function AgentFlow() {
  const { agents, activeConnections } = useAgentverseStore();

  const initialNodes = useMemo(() => createNodes(agents), []);
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);

  // Update nodes when agents change
  useEffect(() => {
    setNodes((nds) =>
      nds.map((node) => {
        const agent = agents.find((a) => a.id === node.id);
        if (agent) {
          return { ...node, data: agent };
        }
        return node;
      })
    );
  }, [agents, setNodes]);

  // Update edges when connections change
  useEffect(() => {
    setEdges(createEdges(activeConnections));
  }, [activeConnections, setEdges]);

  return (
    <div className="w-full h-full bg-gray-950 rounded-xl overflow-hidden border border-gray-800">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        connectionLineType={ConnectionLineType.SmoothStep}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.5}
        maxZoom={1.5}
        className="bg-gray-950"
        proOptions={{ hideAttribution: true }}
      >
        <Background color="#374151" gap={20} size={1} />
        <Controls className="!bg-gray-800 !border-gray-700 !rounded-lg [&>button]:!bg-gray-800 [&>button]:!border-gray-700 [&>button]:!text-gray-300 [&>button:hover]:!bg-gray-700" />
        <MiniMap
          nodeColor={(node) => {
            const agent = agents.find((a) => a.id === node.id);
            return agent?.color || '#6b7280';
          }}
          maskColor="rgba(0, 0, 0, 0.8)"
          className="!bg-gray-900 !border-gray-700 !rounded-lg"
        />
      </ReactFlow>
    </div>
  );
}
