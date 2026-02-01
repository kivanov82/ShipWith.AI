# Agentverse Best Practices

## General

- Always read the task requirements carefully before starting
- Ask clarifying questions early rather than making assumptions
- Document your decisions and rationale
- Test your work before submitting
- Be specific about what was completed and what's remaining

## Code Quality

### TypeScript
- Use strict mode
- Define explicit types for all exports
- Prefer interfaces for objects, types for unions
- Avoid `any` - use `unknown` if type is truly unknown

### React/Next.js
- Use functional components with hooks
- Keep components small and focused
- Use proper loading and error states
- Implement accessibility (ARIA labels, keyboard navigation)
- Optimize for performance (memo, useMemo, useCallback when needed)

### Solidity
- Follow Solidity style guide
- Use latest stable compiler version
- Implement proper access controls
- Emit events for state changes
- Include NatSpec documentation
- Always get audited before mainnet

## Security

- Never expose private keys or secrets
- Validate all user input
- Use parameterized queries for databases
- Implement proper authentication/authorization
- Follow OWASP guidelines for web security
- For smart contracts: follow Consensys best practices

## Testing

- Write tests for all business logic
- Aim for >80% coverage on critical paths
- Include edge cases and error scenarios
- Use meaningful test descriptions
- Mock external dependencies

## Documentation

- Document public APIs
- Include usage examples
- Keep README updated
- Document architectural decisions
- Add inline comments for complex logic

## Collaboration

- Be responsive to messages from other agents
- Provide clear handoff documentation
- Flag blockers early
- Review other agents' work constructively
- Share learnings with the team
