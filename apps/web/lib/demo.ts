// Demo simulation for showcasing the UI
import { useAgentverseStore } from './store';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runDemoSimulation() {
  const store = useAgentverseStore.getState();

  // Reset state
  store.clearActivities();
  store.clearChat();
  store.clearConnections();

  // Start project
  store.setCurrentProject({
    id: 'demo_project',
    name: 'Token Launchpad MVP',
    status: 'planning',
  });

  // PM starts planning
  store.updateAgentStatus('pm', 'thinking', 'Analyzing requirements...');
  store.addActivity({
    type: 'task',
    from: 'pm',
    content: 'Starting project analysis for Token Launchpad MVP',
  });

  await delay(1500);

  // PM asks a question
  store.addChatMessage({
    role: 'agent',
    agentId: 'pm',
    content: 'I need to understand your requirements better. What type of token launch mechanism do you prefer?',
    isQuestion: true,
    options: [
      'Fair Launch (no presale, equal access)',
      'Bonding Curve (dynamic pricing)',
      'Dutch Auction (price discovery)',
      'Fixed Price Sale',
    ],
  });

  store.updateAgentStatus('pm', 'waiting', 'Waiting for user input...');

  await delay(2000);

  // Simulate user response
  store.addChatMessage({
    role: 'user',
    content: 'Fair Launch (no presale, equal access)',
  });

  await delay(1000);

  // PM continues
  store.updateAgentStatus('pm', 'working', 'Creating project plan...');
  store.addActivity({
    type: 'message',
    from: 'pm',
    content: 'User selected Fair Launch mechanism. Proceeding with project breakdown.',
  });

  await delay(1500);

  store.addChatMessage({
    role: 'agent',
    agentId: 'pm',
    content: 'Great choice! I\'m breaking down the project into tasks and assigning to our specialist agents.',
  });

  // PM assigns tasks
  store.addConnection('pm', 'ux-analyst', 'task');
  store.addActivity({
    type: 'task',
    from: 'pm',
    to: 'ux-analyst',
    content: 'Design user flows for fair launch experience',
    metadata: { priority: 'high', estimate: '0.04 USDC' },
  });

  store.updateAgentStatus('ux-analyst', 'thinking', 'Reviewing requirements...');

  await delay(1000);

  store.addConnection('pm', 'solidity-developer', 'task');
  store.addActivity({
    type: 'task',
    from: 'pm',
    to: 'solidity-developer',
    content: 'Implement fair launch token contract',
    metadata: { priority: 'high', estimate: '0.10 USDC' },
  });

  store.updateAgentStatus('solidity-developer', 'thinking', 'Analyzing contract requirements...');

  await delay(1500);

  // Update project status
  store.setCurrentProject({
    id: 'demo_project',
    name: 'Token Launchpad MVP',
    status: 'active',
  });

  store.updateAgentStatus('pm', 'idle');

  // UX Analyst works
  store.updateAgentStatus('ux-analyst', 'working', 'Creating user flows...');
  store.addActivity({
    type: 'message',
    from: 'ux-analyst',
    content: 'Starting user flow design for the fair launch experience',
  });

  await delay(2000);

  // Solidity dev works
  store.updateAgentStatus('solidity-developer', 'working', 'Writing smart contract...');
  store.addActivity({
    type: 'message',
    from: 'solidity-developer',
    content: 'Implementing FairLaunch.sol with anti-bot mechanisms',
  });

  await delay(2500);

  // UX completes and gets paid
  store.updateAgentStatus('ux-analyst', 'idle');
  store.removeConnection('pm', 'ux-analyst');

  store.addActivity({
    type: 'artifact',
    from: 'ux-analyst',
    content: 'User flow diagrams completed',
    metadata: { files: 3 },
  });

  store.addDeliverable({
    type: 'design',
    title: 'Fair Launch User Flows',
    description: 'Complete user journey from wallet connection to token claim',
    producedBy: 'ux-analyst',
    projectId: 'demo_project',
    url: 'https://figma.com/demo',
  });

  await delay(500);

  store.addConnection('ux-analyst', 'pm', 'payment');
  store.addActivity({
    type: 'payment',
    from: 'pm',
    to: 'ux-analyst',
    content: 'Payment for user flow design',
    metadata: { amount: '0.04 USDC', txHash: '0xabc...' },
  });

  store.updateAgentBalance('ux-analyst', 0.04);
  store.updateAgentBalance('pm', -0.04);

  await delay(1000);
  store.removeConnection('ux-analyst', 'pm');

  // UI Designer gets assigned
  store.addConnection('pm', 'ui-designer', 'task');
  store.addActivity({
    type: 'task',
    from: 'pm',
    to: 'ui-designer',
    content: 'Create visual designs based on UX flows',
  });

  store.updateAgentStatus('ui-designer', 'working', 'Designing UI...');

  await delay(2000);

  // Solidity completes
  store.updateAgentStatus('solidity-developer', 'idle');
  store.removeConnection('pm', 'solidity-developer');

  store.addActivity({
    type: 'artifact',
    from: 'solidity-developer',
    content: 'FairLaunch.sol contract completed with tests',
  });

  store.addDeliverable({
    type: 'code',
    title: 'FairLaunch.sol',
    description: 'ERC-20 fair launch contract with anti-bot protection and claim mechanism',
    producedBy: 'solidity-developer',
    projectId: 'demo_project',
    url: 'https://github.com/demo/contracts',
    preview: `contract FairLaunch is ERC20 {
    uint256 public launchTime;
    mapping(address => bool) public hasClaimed;

    function claim() external {
        require(block.timestamp >= launchTime);
        require(!hasClaimed[msg.sender]);
        // ...
    }
}`,
  });

  // Assign to auditor
  await delay(1000);
  store.addConnection('pm', 'solidity-auditor', 'task');
  store.addActivity({
    type: 'task',
    from: 'pm',
    to: 'solidity-auditor',
    content: 'Audit FairLaunch.sol contract',
    metadata: { priority: 'critical' },
  });

  store.updateAgentStatus('solidity-auditor', 'working', 'Auditing contract...');

  await delay(2000);

  // Payment for solidity
  store.addConnection('solidity-developer', 'pm', 'payment');
  store.addActivity({
    type: 'payment',
    from: 'pm',
    to: 'solidity-developer',
    content: 'Payment for smart contract development',
    metadata: { amount: '0.10 USDC' },
  });

  store.updateAgentBalance('solidity-developer', 0.10);
  store.updateAgentBalance('pm', -0.10);

  await delay(1000);
  store.removeConnection('solidity-developer', 'pm');

  // Auditor asks question
  store.addChatMessage({
    role: 'agent',
    agentId: 'solidity-auditor',
    content: 'I found a potential reentrancy concern in the claim function. Should I provide a detailed fix, or just flag it in the report?',
    isQuestion: true,
    options: [
      'Provide detailed fix with code',
      'Flag in report only',
      'Both - fix and document in report',
    ],
  });

  store.updateAgentStatus('solidity-auditor', 'waiting', 'Waiting for guidance...');

  await delay(2000);

  // User responds
  store.addChatMessage({
    role: 'user',
    content: 'Both - fix and document in report',
  });

  await delay(1000);

  store.updateAgentStatus('solidity-auditor', 'working', 'Preparing audit report...');

  // UI Designer completes
  store.updateAgentStatus('ui-designer', 'idle');
  store.removeConnection('pm', 'ui-designer');

  store.addActivity({
    type: 'artifact',
    from: 'ui-designer',
    content: 'UI mockups completed with design tokens',
  });

  store.addDeliverable({
    type: 'design',
    title: 'Launchpad UI Design',
    description: 'Complete UI kit with dark theme, responsive layouts, and component library',
    producedBy: 'ui-designer',
    projectId: 'demo_project',
    url: 'https://figma.com/demo-ui',
  });

  await delay(1500);

  // Assign FE developer
  store.addConnection('pm', 'ui-developer', 'task');
  store.addActivity({
    type: 'task',
    from: 'pm',
    to: 'ui-developer',
    content: 'Build frontend components from UI designs',
  });

  store.updateAgentStatus('ui-developer', 'working', 'Building React components...');

  await delay(2000);

  // Auditor completes
  store.updateAgentStatus('solidity-auditor', 'idle');
  store.removeConnection('pm', 'solidity-auditor');

  store.addDeliverable({
    type: 'report',
    title: 'Security Audit Report',
    description: 'Comprehensive audit with 1 High, 2 Medium findings - all remediated',
    producedBy: 'solidity-auditor',
    projectId: 'demo_project',
    downloadUrl: '/demo/audit-report.pdf',
  });

  store.addActivity({
    type: 'artifact',
    from: 'solidity-auditor',
    content: 'Audit complete: Go recommendation after fixes applied',
    metadata: { findings: '1H/2M/3L', status: 'Conditional Go' },
  });

  // FE Developer completes
  await delay(2000);
  store.updateAgentStatus('ui-developer', 'idle');
  store.removeConnection('pm', 'ui-developer');

  store.addActivity({
    type: 'artifact',
    from: 'ui-developer',
    content: 'Frontend components completed and deployed to Vercel',
  });

  store.addDeliverable({
    type: 'deployment',
    title: 'Fair Launch UI',
    description: 'Production-ready Next.js app deployed to Vercel',
    producedBy: 'ui-developer',
    projectId: 'demo_project',
    url: 'https://fairlaunch.vercel.app',
  });

  // Marketing agent kicks in
  await delay(1000);
  store.addConnection('pm', 'marketing', 'task');
  store.addActivity({
    type: 'task',
    from: 'pm',
    to: 'marketing',
    content: 'Create launch tweets and marketing content',
    metadata: { priority: 'high' },
  });

  store.updateAgentStatus('marketing', 'thinking', 'Reading project context...');

  await delay(1500);

  store.addActivity({
    type: 'message',
    from: 'marketing',
    content: 'Analyzing project memory: UX flows, contract design, audit results...',
  });

  store.updateAgentStatus('marketing', 'working', 'Generating launch content...');

  await delay(2000);

  // Marketing asks for tone preference
  store.addChatMessage({
    role: 'agent',
    agentId: 'marketing',
    content: 'I\'ve analyzed the full project context. The fair launch mechanism is the hero feature. What tone should I use for the launch tweets?',
    isQuestion: true,
    options: [
      'Professional & technical',
      'Casual & meme-friendly',
      'Bold & contrarian',
      'Mix of all styles',
    ],
  });

  store.updateAgentStatus('marketing', 'waiting', 'Awaiting tone preference...');

  await delay(2500);

  // Simulate user response
  store.addChatMessage({
    role: 'user',
    content: 'Bold & contrarian',
  });

  await delay(1000);

  store.updateAgentStatus('marketing', 'working', 'Writing launch tweets...');
  store.addActivity({
    type: 'message',
    from: 'marketing',
    content: 'Writing contrarian-style launch thread based on anti-bot positioning',
  });

  await delay(2500);

  // Marketing completes with tweets
  store.updateAgentStatus('marketing', 'idle');
  store.removeConnection('pm', 'marketing');

  store.addDeliverable({
    type: 'document',
    title: 'Launch Tweet Thread',
    description: '6-tweet thread + 10 standalone tweets for launch campaign',
    producedBy: 'marketing',
    projectId: 'demo_project',
    preview: `🧵 THREAD:

1/ Most token launches are rigged.

Insiders get allocations. Bots snipe the first block. Regular users? They get the scraps.

We built the opposite. Here's how 👇

2/ The problem isn't crypto. It's access.

When bots can execute in milliseconds and VCs get presale deals, "fair" is just marketing.

3/ Our solution: Actual fairness.

→ No presale allocations
→ 60-second anti-bot cooldown
→ Per-wallet claim limits
→ Audited by [Auditor]

Simple. Boring. Fair.

4/ [View full thread...]`,
  });

  store.addActivity({
    type: 'artifact',
    from: 'marketing',
    content: 'Launch content package ready: 1 thread + 10 standalone tweets',
    metadata: { tweets: 16, platforms: ['Twitter', 'Farcaster', 'Moltbook'] },
  });

  // Payment to marketing
  await delay(500);
  store.addConnection('marketing', 'pm', 'payment');
  store.addActivity({
    type: 'payment',
    from: 'pm',
    to: 'marketing',
    content: 'Payment for marketing content',
    metadata: { amount: '0.02 USDC' },
  });

  store.updateAgentBalance('marketing', 0.02);
  store.updateAgentBalance('pm', -0.02);

  await delay(1000);
  store.removeConnection('marketing', 'pm');

  // Final summary
  store.setCurrentProject({
    id: 'demo_project',
    name: 'Token Launchpad MVP',
    status: 'review',
  });

  store.addChatMessage({
    role: 'agent',
    agentId: 'pm',
    content: `Project complete! Here's the summary:

✅ UX flows designed
✅ Smart contract built & audited (Go recommendation)
✅ UI designed & developed
✅ Deployed to Vercel
✅ Launch tweets ready

Total cost: 0.35 USDC
Deliverables: 5 artifacts

Ready to launch when you are! 🚀`,
  });

  store.updateAgentStatus('pm', 'idle');
}
