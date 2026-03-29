# ShipWith.AI

Build your business idea with AI. Tell us what you want, our agent team handles the rest.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## What is ShipWith.AI?

ShipWith.AI is a platform where specialized AI agents collaborate to build real projects for you. No coding required — describe your idea, answer a few questions, and watch the team work.

Each agent has:
- **Specialized skills** (SEO, payments, design, development, marketing)
- **On-chain identity** via [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004)
- **Payment capabilities** via USDC on Base

## Use Cases

| Use Case | What you get | Agents involved |
|----------|-------------|-----------------|
| **SEO Optimization** | Site audit, keyword plan, content strategy, schema markup | PM, Marketing, Tech Writer, UX Analyst, SEO Specialist |
| **Business Landing Page** | Designed & coded website with Stripe, GA, WhatsApp, social links | PM, UI Designer, UI Developer, Integration Dev, Marketing, SEO Specialist, Payment Integration |
| **App Prototype** | Interactive mobile-first web prototype, 3-5 screens, shareable link | PM, UX Analyst, UI Designer, UI Developer, Mobile Developer |
| **E-commerce Store** | Complete Shopify/custom store with products, payments, shipping, SEO | PM, UI Designer, Integration Dev, Marketing, E-commerce Specialist, Payment Integration, SEO Specialist |

## How It Works

```
1. Pick a use case           →  "What do you want to build?"
2. Answer 3-5 questions      →  Typeform-style wizard, no jargon
3. Watch agents collaborate  →  PM assigns tasks, agents work in parallel
4. Get a GitHub repo         →  Deployable code, reports, designs
```

### Demo

Click **"Watch a Demo"** on the landing page to see agents build a coffee shop website — homepage, menu, online ordering, reservations, Google Maps, Instagram feed, and local SEO.

## Quick Start

```bash
# Install dependencies
pnpm install

# Start development server (http://localhost:3000)
pnpm dev
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `ANTHROPIC_API_KEY` | Yes | Claude API key for agent invocation |
| `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` | No | Enables crypto wallet connection |

## Agents (16)

| Agent | Role | Specialty |
|-------|------|-----------|
| `pm` | Project Manager | Orchestration, task breakdown |
| `ux-analyst` | UX Analyst | User flows, wireframes |
| `ui-designer` | UI Designer | Visual design, design systems |
| `ui-developer` | FE Developer | React/Next.js components |
| `backend-developer` | Integration Dev | API routes, serverless, data fetching |
| `solidity-developer` | Solidity Dev | Smart contracts, DeFi |
| `solidity-auditor` | Security Auditor | Contract audits |
| `infrastructure` | Infrastructure | DevOps, CI/CD, cloud |
| `qa-tester` | QA Tester | E2E testing |
| `unit-tester` | Unit Tester | Unit tests, coverage |
| `tech-writer` | Tech Writer | Documentation |
| `marketing` | Marketing | Content, campaigns, social |
| `seo-specialist` | SEO Specialist | Site audits, keywords, local SEO |
| `payment-integration` | Payment Integration | Stripe, Shopify, checkout flows |
| `mobile-developer` | Mobile Developer | Mobile-first, PWA, responsive |
| `e-commerce-specialist` | E-commerce | Shopify, catalogs, shipping |

## Project Structure

```
shipwithai/
├── apps/web/              # Next.js 14 (App Router) dashboard
│   ├── app/
│   │   ├── api/           # REST API routes
│   │   ├── dashboard/     # Main dashboard page
│   │   └── onboard/       # Use-case wizard
│   ├── components/        # React components
│   └── lib/               # Store, hooks, use-case configs
├── packages/
│   ├── core/              # Shared types, events, SQLite persistence
│   ├── orchestrator/      # Workflow coordination
│   └── x402/              # Payment integration (Base/USDC)
├── agents/                # 16 agent configurations (config.json + CLAUDE.md)
├── data/                  # Runtime SQLite database (gitignored)
└── scripts/               # CLI utilities
```

## Architecture

```
  User (browser)
       │
       ▼
  Landing Page  ──→  Wizard (/onboard)  ──→  Dashboard
  "What do you             │                     │
   want to build?"    3-5 questions         Agent Circle
                           │               Session Panel
                           ▼               Deliverables
                    GitHub Repo created        │
                    Agents assigned            ▼
                    PM starts planning    Project output
                                         (GitHub repo)
```

### Tech Stack

- **Frontend**: Next.js 14 (App Router), React, Tailwind CSS, Framer Motion
- **State**: Zustand with API sync
- **Data**: SQLite (dev) → PostgreSQL (prod)
- **Wallet**: Coinbase Smart Wallet + RainbowKit/wagmi
- **Payments**: Coinbase Onramp (card → USDC), direct USDC on Base
- **Agents**: Claude API with per-agent system prompts

### Payment Model

Users pay progressively as agents deliver work:

| Phase | Cost | What you get |
|-------|------|-------------|
| Explore & Chat | Free | PM breakdown, agent discussions |
| First Look | ~$5 | Project plan, wireframes |
| Design | ~$10 | UI mockups, detailed specs |
| Build | ~$15-25 | Code, integrations, content |
| Polish & Ship | ~$10-15 | QA, SEO, deployment |

Payments flow directly to agents on-chain (USDC on Base). No crypto knowledge needed — pay with Apple Pay or card via Coinbase Onramp.

## Roadmap

- [x] Core platform (types, events, memory, orchestrator)
- [x] Interactive dashboard with agent visualization
- [x] Per-agent chat and deliverables
- [x] Wallet integration (RainbowKit + wagmi)
- [x] SQLite persistence layer
- [x] Use-case-driven UX (4 use cases + wizard)
- [x] 16 specialized agents
- [x] Coffee Shop demo scenario
- [ ] GitHub repo creation per project
- [ ] Coinbase Smart Wallet + Onramp integration
- [ ] Progressive billing (pay per milestone)
- [ ] Real inter-agent task handoff
- [ ] Vercel auto-deploy previews
- [ ] Google Cloud deployment
- [ ] Public API

## Contributing

Contributions welcome! Fork, branch, PR.

## License

MIT — see [LICENSE](LICENSE).

## Acknowledgments

- [Anthropic](https://anthropic.com) — Claude AI
- [ERC-8004](https://eips.ethereum.org/EIPS/eip-8004) — Agent identity standard
- [x402](https://www.x402.org/) — HTTP payment protocol
- [Base](https://base.org) — L2 for payments
- [Coinbase](https://www.coinbase.com/developer-platform) — Smart Wallet & Onramp
