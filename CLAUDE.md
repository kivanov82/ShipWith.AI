# Agentverse

A connected network of AI agents working together as a decentralized Web3 software development company.

## Project Structure

```
agentverse/
├── apps/web/              # Next.js 14 (App Router) dashboard
│   ├── app/
│   │   ├── api/           # REST API routes
│   │   │   ├── agents/    # Agent invocation
│   │   │   ├── costs/     # Token cost tracking
│   │   │   ├── deliverables/ # File delivery & download
│   │   │   ├── events/    # Event bus
│   │   │   ├── payments/  # USDC payment confirmation
│   │   │   ├── projects/  # Project management
│   │   │   ├── sessions/  # Session CRUD & messages
│   │   │   └── usage/     # Free-tier usage limits
│   │   └── dashboard/     # Main dashboard page
│   ├── components/        # React components
│   └── lib/               # Zustand store, hooks, config
├── packages/
│   ├── core/              # Shared types, events, SQLite persistence
│   ├── orchestrator/      # Workflow coordination
│   └── x402/              # Payment integration (Base/USDC)
├── agents/                # Individual agent configurations
│   ├── pm/                # Project Manager
│   ├── ux-analyst/
│   ├── ui-designer/
│   ├── ui-developer/      # Frontend Developer
│   ├── backend-developer/ # Integration Developer (API routes, serverless)
│   ├── solidity-developer/
│   ├── solidity-auditor/
│   ├── infrastructure/
│   ├── qa-tester/
│   ├── unit-tester/
│   ├── tech-writer/
│   └── marketing/
├── data/                  # Runtime SQLite database (gitignored)
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

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Claude API key for agent invocation |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | No | Enables wallet connection (RainbowKit) |

When `WALLETCONNECT_PROJECT_ID` is not set, wallet features are gracefully disabled.

## Web UI Features

The Next.js dashboard (`/dashboard`) provides an interactive visualization:

- **Concentric Circle Layout**: Agents arranged in rings (core → development → support)
- **Agent Cards**: Display name, role, description, pricing, and live status
- **Speech Bubbles**: Comic-book style bubbles showing agent thoughts/activity
- **Per-Agent Chat**: Click the chat icon on any agent to send prompts
- **Sessions**: Multi-agent context-building sessions with message history
- **Deliverables Tree**: Work products grouped by producing agent
- **Project Summary**: Time elapsed, budget spent, and interaction counts
- **Onboarding Tour**: 6-step guided overlay for new users
- **Usage Tiers**: Anonymous (10 free), connected wallet (25 free), funded (unlimited)
- **Demo Mode**: Click "Run Demo" to see a simulated multi-agent workflow

## Key Concepts

### Agents
Each agent is a specialized AI worker with:
- A system prompt (CLAUDE.md)
- Configuration (config.json)
- Skills and examples
- A wallet for x402 payments
- ERC-8004 on-chain identity

### Data Layer
- **SQLite** (`packages/core/src/project-store.ts`) for local persistence
- Stores sessions, messages, deliverables, delivery requests, usage, and costs
- State managed client-side via **Zustand** (`apps/web/lib/store.ts`) with API sync
- `data/agentverse.db` created at runtime (gitignored)

### Events
Agents communicate via an event bus:
- `task.created/assigned/completed`
- `payment.sent/received`
- `artifact.produced`
- `message.sent`

### Payments
- x402 protocol for agent-to-agent payments
- USDC on Base (testnet for dev, mainnet for prod)
- RainbowKit + wagmi v2 wallet integration
- 10x markup on Claude API costs for user-facing pricing
- Payment confirmation flow with on-chain transaction verification

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
5. Wallet providers are conditionally loaded — no build-time WalletConnect dependency
6. `useSearchParams()` requires `<Suspense>` boundary in Next.js 14

## Bootstrap Project

Agentverse is building itself! Check `projects/agentverse-bootstrap/` for the meta-project where our agents are improving their own code.
