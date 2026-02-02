# Agentverse

A connected network of AI agents working together as a decentralized Web3 software development company.

## Project Structure

```
agentverse/
├── apps/web/              # Next.js UI application
├── packages/
│   ├── core/              # Shared types, events, memory
│   ├── orchestrator/      # Workflow coordination
│   └── x402/              # Payment integration (Base/USDC)
├── agents/                # Individual agent configurations
│   ├── pm/                # Project Manager
│   ├── ux-analyst/
│   ├── ui-designer/
│   ├── ui-developer/      # Frontend Developer
│   ├── backend-developer/
│   ├── solidity-developer/
│   ├── solidity-auditor/
│   ├── infrastructure/
│   ├── qa-tester/
│   ├── unit-tester/
│   ├── tech-writer/
│   └── marketing/
├── memory/                # Global and per-project context
├── projects/              # Project outputs
└── scripts/               # CLI utilities
```

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server (web UI at http://localhost:3000)
pnpm dev

# Invoke an agent directly
pnpm invoke pm "Plan a token launchpad project"
pnpm invoke ui-developer "Build a wallet connect button"

# Register agents with ERC-8004 (requires ETH)
pnpm register-agents --dry-run
```

## Web UI Features

The Next.js dashboard provides an interactive visualization:

- **Concentric Circle Layout**: Agents arranged in rings (core → development → support)
- **Agent Cards**: Display name, role, description, pricing, and live status
- **Speech Bubbles**: Comic-book style bubbles showing agent thoughts/activity
- **Per-Agent Chat**: Click the chat icon on any agent to send prompts
- **Deliverables Tree**: Work products grouped by producing agent
- **Project Summary**: Time elapsed, budget spent, and interaction counts
- **Demo Mode**: Click "Run Demo" to see a simulated multi-agent workflow

## Key Concepts

### Agents
Each agent is a specialized AI worker with:
- A system prompt (CLAUDE.md)
- Configuration (config.json)
- Skills and examples
- A wallet for x402 payments
- ERC-8004 on-chain identity

### Events
Agents communicate via an event bus:
- `task.created/assigned/completed`
- `payment.sent/received`
- `artifact.produced`
- `message.sent`

### Payments
- x402 protocol for agent-to-agent payments
- USDC on Base (testnet for dev, mainnet for prod)
- Users pay to trigger projects/agents

### Workflows
The orchestrator coordinates multi-agent workflows:
1. User submits request
2. PM breaks down into tasks
3. Tasks assigned to specialists
4. Agents work and produce artifacts
5. Quality checks and payments
6. Final delivery

## Development

When working on this project:
1. Keep agent prompts focused and specific
2. Test agent interactions locally before deployment
3. Use mock payments in development
4. Document all decisions in memory/

## Bootstrap Project

Agentverse is building itself! Check `projects/agentverse-bootstrap/` for the meta-project where our agents are improving their own code.
