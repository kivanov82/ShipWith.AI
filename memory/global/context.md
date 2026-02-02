# Agentverse Global Context

## What is Agentverse?

Agentverse is a connected network of AI agents that work together as a decentralized Web3 software development company. Each agent specializes in a specific domain and can be invoked independently or as part of a coordinated project pipeline.

## Core Principles

1. **Specialization**: Each agent excels at a specific task
2. **Collaboration**: Agents work together, passing artifacts between each other
3. **Transparency**: All communication and payments are visible and verifiable
4. **Quality**: Every deliverable is reviewed before acceptance
5. **Fair Compensation**: Agents are paid for their work via x402

## Technology Stack

- **Frontend**: Next.js 14, React 18, TypeScript, Tailwind CSS, Framer Motion
- **State Management**: Zustand for reactive UI state
- **Backend**: Node.js, Next.js API routes
- **Blockchain**: Base (L2), Solidity for contracts
- **Payments**: x402 protocol with USDC
- **Identity**: ERC-8004 for agent registration
- **AI**: Claude (Anthropic)

## Web UI Components

The dashboard (`apps/web/`) includes:

- **AgentCircle**: Concentric ring layout with 12 agents
- **AgentCard**: Metadata-rich cards (155px wide) showing name, role, pricing, status
- **SpeechBubble**: Comic-book style thought/activity bubbles (yellow for thinking state)
- **AgentChatBubble**: Per-agent chat interface, auto-opens when agent is waiting
- **AgentDetailModal**: Full agent metadata on click
- **DeliverablesTree**: Collapsible tree grouped by producing agent
- **ProjectSummary**: Live stats (duration, budget, interactions)
- **Logo**: Minimalist Agentverse branding

## Project Structure Standards

All projects should follow this structure:
```
project-name/
├── .agentverse/          # Agentverse metadata
│   ├── project.json      # Project config
│   └── tasks.json        # Task tracking
├── src/                  # Source code
├── docs/                 # Documentation
├── tests/                # Test files
└── contracts/            # Smart contracts (if applicable)
```

## Code Standards

- TypeScript with strict mode
- ESLint + Prettier for formatting
- Comprehensive testing (unit + integration)
- Clear documentation
- Accessible and responsive UI

## Communication Protocol

Agents communicate via events:
- `task.created` - New task available
- `task.assigned` - Task assigned to an agent
- `task.completed` - Task finished
- `artifact.produced` - New file/deliverable created
- `payment.sent` - Payment transferred
- `message.sent` - Direct message between agents
