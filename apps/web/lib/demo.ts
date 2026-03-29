// Demo simulation: "Bean & Bloom Coffee" website build
import { useAgentverseStore } from './store';

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function runDemoSimulation() {
  const store = useAgentverseStore.getState();

  // Reset state
  store.clearActivities();
  store.clearChat();
  store.clearConnections();
  store.resetProjectStats();
  store.startProjectTimer();

  // ── Phase 1: PM kicks off ──────────────────────────────────────

  store.setCurrentProject({
    id: 'demo_coffee',
    name: 'Bean & Bloom Coffee',
    status: 'planning',
  });

  store.updateAgentStatus('pm', 'thinking', 'Analyzing project brief...');
  store.addActivity({
    type: 'task',
    from: 'pm',
    content: 'Starting project: Bean & Bloom Coffee — a neighborhood coffee shop website',
  });

  await delay(2500);

  store.addChatMessage({
    role: 'agent',
    agentId: 'pm',
    content: "I'm setting up the Bean & Bloom Coffee project. This will include a homepage, menu, online ordering, table reservations, and local SEO. Let me assign the team.",
  });

  await delay(2000);

  // PM asks about the vibe
  store.addChatMessage({
    role: 'agent',
    agentId: 'pm',
    content: 'Quick question — what vibe are you going for with the website?',
    isQuestion: true,
    options: [
      'Cozy & warm (earth tones, handwritten fonts)',
      'Modern & minimal (clean lines, lots of white space)',
      'Playful & colorful (bold colors, fun illustrations)',
    ],
  });

  store.updateAgentStatus('pm', 'waiting', 'Waiting for user input...');
  await delay(4000);

  store.addChatMessage({
    role: 'user',
    content: 'Cozy & warm (earth tones, handwritten fonts)',
  });

  await delay(1500);

  // ── Phase 2: Task assignment ───────────────────────────────────

  store.updateAgentStatus('pm', 'working', 'Breaking down tasks...');
  store.addActivity({
    type: 'message',
    from: 'pm',
    content: 'Cozy & warm direction confirmed. Assigning tasks to the team.',
  });

  await delay(2000);

  // Assign UX Analyst
  store.addConnection('pm', 'ux-analyst', 'task');
  store.incrementInteractionCount();
  store.addActivity({
    type: 'task',
    from: 'pm',
    to: 'ux-analyst',
    content: 'Map user journeys: browse menu, place order, reserve table',
  });
  store.updateAgentStatus('ux-analyst', 'thinking', 'Reviewing project brief...');

  await delay(1500);

  // Assign SEO Specialist
  store.addConnection('pm', 'seo-specialist', 'task');
  store.incrementInteractionCount();
  store.addActivity({
    type: 'task',
    from: 'pm',
    to: 'seo-specialist',
    content: 'Local SEO strategy: Google Business, location keywords, schema markup',
  });
  store.updateAgentStatus('seo-specialist', 'thinking', 'Researching local coffee shop SEO...');

  await delay(1500);

  // Assign UI Designer
  store.addConnection('pm', 'ui-designer', 'task');
  store.incrementInteractionCount();
  store.addActivity({
    type: 'task',
    from: 'pm',
    to: 'ui-designer',
    content: 'Design homepage, menu page, and reservation form — cozy warm aesthetic',
  });
  store.updateAgentStatus('ui-designer', 'thinking', 'Exploring warm coffee shop aesthetics...');

  store.setCurrentProject({ id: 'demo_coffee', name: 'Bean & Bloom Coffee', status: 'active' });
  store.updateAgentStatus('pm', 'idle');

  await delay(2000);

  // ── Phase 3: UX & SEO work in parallel ─────────────────────────

  store.updateAgentStatus('ux-analyst', 'working', 'Mapping customer journeys...');
  store.addActivity({
    type: 'message',
    from: 'ux-analyst',
    content: 'Designing 3 key flows: menu browsing, online ordering, table reservation',
  });

  store.updateAgentStatus('seo-specialist', 'working', 'Analyzing local search landscape...');
  store.addActivity({
    type: 'message',
    from: 'seo-specialist',
    content: 'Researching "coffee shop near me" keywords and local competitor rankings',
  });

  await delay(4000);

  // UX completes
  store.updateAgentStatus('ux-analyst', 'idle');
  store.removeConnection('pm', 'ux-analyst');
  store.addDeliverable({
    type: 'design',
    title: 'Customer Journey Maps',
    description: 'Three user flows: menu browse → order, find us → reserve table, landing → Instagram follow',
    producedBy: 'ux-analyst',
    projectId: 'demo_coffee',
  });
  store.addActivity({
    type: 'artifact',
    from: 'ux-analyst',
    content: 'User journey maps completed — 3 flows documented',
  });
  store.addToTotalSpent(0.04);

  await delay(2000);

  // SEO completes
  store.updateAgentStatus('seo-specialist', 'idle');
  store.removeConnection('pm', 'seo-specialist');
  store.addDeliverable({
    type: 'report',
    title: 'Local SEO Strategy',
    description: 'Keyword plan, Google Business Profile setup guide, schema markup for LocalBusiness + Restaurant',
    producedBy: 'seo-specialist',
    projectId: 'demo_coffee',
    preview: `Local SEO Plan — Bean & Bloom Coffee

Target keywords:
• "coffee shop [neighborhood]" — 1,200 mo/searches
• "best coffee near me" — 8,100 mo/searches
• "brunch [city]" — 2,400 mo/searches

Schema markup: LocalBusiness + Restaurant + Menu
Google Business: Optimized profile with photos, hours, menu link
Citations: Yelp, TripAdvisor, Foursquare, Apple Maps`,
  });
  store.addActivity({
    type: 'artifact',
    from: 'seo-specialist',
    content: 'Local SEO strategy delivered: keywords, schema, Google Business guide',
  });
  store.addToTotalSpent(0.03);

  await delay(2000);

  // ── Phase 4: UI Designer works ─────────────────────────────────

  store.updateAgentStatus('ui-designer', 'working', 'Designing homepage mockup...');
  store.addActivity({
    type: 'message',
    from: 'ui-designer',
    content: 'Creating warm color palette: cream, terracotta, dark roast brown. Using handwritten accent font.',
  });

  await delay(4000);

  // Designer asks about logo
  store.addChatMessage({
    role: 'agent',
    agentId: 'ui-designer',
    content: 'I\'m using warm earth tones — cream background, terracotta accents, dark roast headers. For the logo, do you have one or should I create a wordmark?',
    isQuestion: true,
    options: [
      'I have a logo (will upload later)',
      'Create a simple wordmark for now',
    ],
  });
  store.updateAgentStatus('ui-designer', 'waiting', 'Waiting for logo direction...');

  await delay(4000);

  store.addChatMessage({
    role: 'user',
    content: 'Create a simple wordmark for now',
  });

  await delay(1500);
  store.updateAgentStatus('ui-designer', 'working', 'Finalizing designs with wordmark...');

  await delay(4000);

  // Designer completes
  store.updateAgentStatus('ui-designer', 'idle');
  store.removeConnection('pm', 'ui-designer');
  store.addDeliverable({
    type: 'design',
    title: 'Website Design Kit',
    description: 'Homepage, menu page, reservation form, and mobile layouts with design tokens',
    producedBy: 'ui-designer',
    projectId: 'demo_coffee',
  });
  store.addActivity({
    type: 'artifact',
    from: 'ui-designer',
    content: 'Full design kit completed: 4 pages + responsive variants + design tokens',
  });
  store.addToTotalSpent(0.06);

  await delay(2000);

  // ── Phase 5: FE Developer & Integration Dev ────────────────────

  store.addConnection('pm', 'ui-developer', 'task');
  store.incrementInteractionCount();
  store.addActivity({
    type: 'task',
    from: 'pm',
    to: 'ui-developer',
    content: 'Build responsive pages from design kit: homepage, menu, reservation',
  });
  store.updateAgentStatus('ui-developer', 'working', 'Building React components...');

  await delay(1500);

  store.addConnection('pm', 'backend-developer', 'task');
  store.incrementInteractionCount();
  store.addActivity({
    type: 'task',
    from: 'pm',
    to: 'backend-developer',
    content: 'Set up integrations: Google Maps embed, Instagram feed, reservation API, ordering system',
  });
  store.updateAgentStatus('backend-developer', 'working', 'Setting up Google Maps integration...');

  await delay(4000);

  store.addActivity({
    type: 'message',
    from: 'ui-developer',
    content: 'Homepage hero section done — large hero image with overlaid wordmark and CTA buttons',
  });

  store.addActivity({
    type: 'message',
    from: 'backend-developer',
    content: 'Google Maps embed configured. Working on Instagram feed API integration...',
  });

  await delay(4000);

  // Integration dev completes
  store.updateAgentStatus('backend-developer', 'idle');
  store.removeConnection('pm', 'backend-developer');
  store.addDeliverable({
    type: 'code',
    title: 'Integrations',
    description: 'Google Maps, Instagram feed widget, OpenTable reservation, simple ordering form with email notification',
    producedBy: 'backend-developer',
    projectId: 'demo_coffee',
    preview: `// Google Maps embed component
<GoogleMap
  center={{ lat: 40.7128, lng: -74.0060 }}
  zoom={15}
  marker={{ title: "Bean & Bloom Coffee" }}
/>

// Instagram feed (latest 6 posts)
<InstagramFeed handle="@beanandbloom" count={6} />

// Reservation widget
<ReservationForm
  provider="opentable"
  restaurantId="bean-bloom"
/>`,
  });
  store.addActivity({
    type: 'artifact',
    from: 'backend-developer',
    content: 'All integrations ready: Maps, Instagram, reservations, ordering',
  });
  store.addToTotalSpent(0.05);

  await delay(3000);

  // FE dev completes
  store.updateAgentStatus('ui-developer', 'idle');
  store.removeConnection('pm', 'ui-developer');
  store.addDeliverable({
    type: 'deployment',
    title: 'Bean & Bloom Website',
    description: 'Responsive Next.js site: homepage, interactive menu with categories, reservation form, contact with map',
    producedBy: 'ui-developer',
    projectId: 'demo_coffee',
    url: 'https://bean-and-bloom.vercel.app',
  });
  store.addActivity({
    type: 'artifact',
    from: 'ui-developer',
    content: 'Website built and deployed — all pages responsive down to 320px',
  });
  store.addToTotalSpent(0.05);

  await delay(2000);

  // ── Phase 6: Marketing wraps it up ─────────────────────────────

  store.addConnection('pm', 'marketing', 'task');
  store.incrementInteractionCount();
  store.addActivity({
    type: 'task',
    from: 'pm',
    to: 'marketing',
    content: 'Create social content for the website launch + Google Business description',
  });
  store.updateAgentStatus('marketing', 'thinking', 'Reading project context...');

  await delay(2000);

  store.updateAgentStatus('marketing', 'working', 'Writing Instagram captions and Google description...');
  store.addActivity({
    type: 'message',
    from: 'marketing',
    content: 'Crafting launch posts for Instagram and Google Business listing description',
  });

  await delay(4000);

  store.updateAgentStatus('marketing', 'idle');
  store.removeConnection('pm', 'marketing');
  store.addDeliverable({
    type: 'document',
    title: 'Launch Content Pack',
    description: '5 Instagram posts, Google Business description, opening announcement, review request template',
    producedBy: 'marketing',
    projectId: 'demo_coffee',
    preview: `INSTAGRAM LAUNCH POST:

"Your new favorite corner just got cozier ☕

Bean & Bloom is now online! Browse our menu,
reserve your table, and order ahead — all from
your phone.

Fresh roasts. Warm vibes. Your neighborhood spot.

Link in bio 👆
#beanandbloom #coffeeshop #localcoffee"

---

GOOGLE BUSINESS DESCRIPTION:

"Bean & Bloom Coffee is a cozy neighborhood café
serving specialty coffee, fresh pastries, and light
brunch. Order ahead online or reserve a table for
your next visit."`,
  });
  store.addActivity({
    type: 'artifact',
    from: 'marketing',
    content: 'Launch content pack ready: Instagram posts + Google Business + announcement',
  });
  store.addToTotalSpent(0.02);

  await delay(2000);

  // ── Phase 7: Project complete ──────────────────────────────────

  store.setCurrentProject({
    id: 'demo_coffee',
    name: 'Bean & Bloom Coffee',
    status: 'review',
  });

  store.addChatMessage({
    role: 'agent',
    agentId: 'pm',
    content: `Your coffee shop website is ready! Here's what the team built:

• Customer journey maps (3 key flows)
• Local SEO strategy with keyword plan
• Full design kit (cozy warm aesthetic)
• Responsive website with menu, ordering & reservations
• Google Maps, Instagram feed & review integrations
• Social media launch content pack

Total cost: ~$0.25 USDC
Deployed to: bean-and-bloom.vercel.app

Ready to go live whenever you are!`,
  });

  store.updateAgentStatus('pm', 'idle');

  // Clear all connections
  store.clearConnections();
}
