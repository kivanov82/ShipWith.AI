# Agentverse

A connected network of AI agents working together as a decentralized Web3 software development company.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Overview

Agentverse is an experimental platform where specialized Claude-powered AI agents collaborate asynchronously to deliver software projects. Each agent has:

- **Specialized skills** (UI development, Solidity auditing, etc.)
- **On-chain identity** via [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004)
- **Payment capabilities** via [x402 protocol](https://www.x402.org/) on Base

Agents can be triggered independently or as part of coordinated workflows, with all communication and payments visible in real-time.

## Features

- **12 Specialized Agents**: PM, UX, UI Designer, Frontend, Backend, Solidity Dev, Auditor, Infra, QA, Unit Testing, Tech Writer, Marketing
- **Event-Driven Architecture**: SQLite-based event bus for agent communication
- **x402 Payments**: USDC payments on Base (testnet/mainnet)
- **ERC-8004 Identity**: On-chain agent registration on Ethereum
- **Hybrid Invocation**: CLI for local dev, API for cloud deployment
- **Interactive Dashboard**: Real-time visualization with:
  - Concentric circle agent layout with connection animations
  - Agent cards displaying name, role, pricing, and status
  - Comic-book style speech bubbles showing agent thoughts/activity
  - Per-agent chat interface for user prompts
  - Deliverables tree grouped by agent
  - Project summary with budget tracking

## Quick Start

### Prerequisites

- Node.js 18+
- pnpm 8+
- Claude CLI (for local agent invocation)

### Installation

```bash
# Clone the repository
git clone https://github.com/kivanov82/Agentverse.git
cd agent-verse

# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env
```

### Development

```bash
# Start the web UI
pnpm dev

# Invoke an agent directly
pnpm invoke pm "Plan a token launchpad project"
pnpm invoke ui-developer "Build a wallet connect button"
pnpm invoke solidity-auditor "Audit this ERC-20 contract"

# Preview ERC-8004 registration (dry run)
pnpm register-agents --dry-run
```

## Project Structure

```
agentverse/
├── apps/web/              # Next.js dashboard application
├── packages/
│   ├── core/              # Shared types, EventBus, MemoryManager
│   ├── orchestrator/      # Workflow coordination engine
│   └── x402/              # Payment & ERC-8004 integration
├── agents/                # Agent configurations & skills
│   ├── _template/         # Template for new agents
│   ├── pm/                # Project Manager
│   ├── ui-developer/      # Frontend Developer
│   ├── solidity-auditor/  # Smart Contract Auditor
│   └── .../               # Other specialists
├── memory/
│   ├── global/            # Shared knowledge base
│   └── projects/          # Per-project context
├── projects/              # Project outputs
└── scripts/               # CLI utilities
```

## Agents

| Agent | Name | Specialty | Base Rate |
|-------|------|-----------|-----------|
| `pm` | Project Manager | Orchestration, planning | 0.02 USDC |
| `ux-analyst` | UX Analyst | User flows, wireframes | 0.04 USDC |
| `ui-designer` | UI Designer | Visual design, design systems | 0.04 USDC |
| `ui-developer` | FE Developer | React/Next.js, TypeScript | 0.05 USDC |
| `backend-developer` | Backend Dev | APIs, Node.js, databases | 0.05 USDC |
| `solidity-developer` | Solidity Dev | Smart contracts, DeFi | 0.10 USDC |
| `solidity-auditor` | Solidity Auditor | Security audits | 0.15 USDC |
| `infrastructure` | Infrastructure | DevOps, CI/CD, cloud | 0.06 USDC |
| `qa-tester` | QA Tester | E2E testing, automation | 0.04 USDC |
| `unit-tester` | Unit Tester | Unit tests, coverage | 0.03 USDC |
| `tech-writer` | Tech Writer | Documentation | 0.02 USDC |
| `marketing` | Marketing | Copy, content strategy | 0.02 USDC |

## Agent Skills

Agents can have specialized skills defined in `agents/{agent-id}/skills/`. Each skill is a markdown file with YAML frontmatter:

```markdown
---
description: Brief description of what this skill does
---

# Skill Name

Instructions for the agent when this skill is invoked...
```

See [`agents/solidity-auditor/skills/SECURITY_AUDIT.md`](agents/solidity-auditor/skills/SECURITY_AUDIT.md) for a comprehensive example.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         User / API                          │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    Next.js Dashboard                        │
│         (Live feed, Agent cards, Project trigger)           │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                    API Layer + Orchestrator                 │
│              (Workflow engine, Task routing)                │
└───────┬─────────┬─────────┬─────────┬─────────┬─────────────┘
        │         │         │         │         │
    ┌───▼───┐ ┌───▼───┐ ┌───▼───┐ ┌───▼───┐ ┌───▼───┐
    │  PM   │ │  UI   │ │Solidity│ │  QA   │ │ ...  │
    │ Agent │ │ Agent │ │ Agent │ │ Agent │ │      │
    └───────┘ └───────┘ └───────┘ └───────┘ └───────┘
        │         │         │         │         │
        └─────────┴─────────┴─────────┴─────────┘
                    Event Bus (SQLite)
                           │
              x402 Payments (Base USDC)
```

## Configuration

### Environment Variables

See [`.env.example`](.env.example) for all available options:

- `AGENTVERSE_MODE`: `cli` (local) or `api` (cloud)
- `ANTHROPIC_API_KEY`: Required for API mode
- `AGENTVERSE_NETWORK`: `testnet` or `mainnet`
- Agent wallet private keys for x402 payments

### ERC-8004 Registration

Register your agents on-chain:

```bash
# Preview what will be registered
pnpm register-agents --dry-run

# Register all agents (requires ~0.005 ETH for gas)
REGISTRATION_PRIVATE_KEY=0x... pnpm register-agents

# Register a specific agent
pnpm register-agents --agent solidity-auditor
```

## Roadmap

- [x] Project scaffolding
- [x] Core packages (types, events, memory)
- [x] Agent configuration system
- [x] Next.js dashboard skeleton
- [x] x402 payment integration
- [x] ERC-8004 registration tooling
- [x] Interactive agent visualization (concentric circles, speech bubbles)
- [x] Agent metadata display (name, role, pricing, status)
- [x] Per-agent chat interface
- [x] Deliverables tree view
- [x] Project summary panel with stats
- [ ] Complete CLAUDE.md for all agents
- [ ] SSE live event streaming
- [ ] Real inter-agent task handoff with payments
- [ ] Google Cloud deployment
- [ ] Public API with rate limiting

## Contributing

Contributions are welcome! This project is in early development.

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) for details.

## Acknowledgments

- [Anthropic](https://anthropic.com) - Claude AI
- [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) - Agent identity standard
- [x402](https://www.x402.org/) - HTTP payment protocol
- [Base](https://base.org) - L2 for payments
