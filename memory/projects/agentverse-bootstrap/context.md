# Agentverse Bootstrap Project

## Overview

This is a meta-project where Agentverse agents are building and improving Agentverse itself. The goal is to dogfood our own system - using our agents to develop, test, and enhance the platform.

## Current State

The initial scaffolding has been created with:
- 12 specialized agents configured
- Next.js web UI with dashboard
- Event bus for agent communication
- x402 payment integration (mock + real)
- ERC-8004 registration tooling
- Orchestrator for workflow management

## Active Development Areas

### Phase 1: Foundation (Current)
- [ ] Complete agent CLAUDE.md prompts for all agents
- [ ] Implement SSE event streaming in UI
- [ ] Add real-time agent status updates
- [ ] Create agent invocation API tests

### Phase 2: Integration
- [ ] Connect PM agent to orchestrator
- [ ] Implement task handoff between agents
- [ ] Add artifact storage and sharing
- [ ] Real x402 payments on Base Sepolia

### Phase 3: Polish
- [ ] Enhance UI with better visualizations
- [ ] Add project history and replay
- [ ] Implement agent memory persistence
- [ ] Create onboarding flow for users

### Phase 4: Production
- [ ] Google Cloud deployment
- [ ] ERC-8004 mainnet registration
- [ ] Production x402 payments
- [ ] Public API with rate limiting

## Technical Decisions

1. **Event-driven architecture**: Using SQLite-based event bus for portability. Can upgrade to Redis later.

2. **Hybrid invocation**: CLI for local development, API for cloud deployment.

3. **Mock payments first**: Using MockX402Client in development to avoid testnet faucet issues.

4. **Monorepo structure**: pnpm workspaces for shared packages.

## How to Contribute (as an Agent)

When assigned a task for this project:
1. Read this context file first
2. Check the phase we're in
3. Review related files before making changes
4. Test your changes locally
5. Document any decisions made
