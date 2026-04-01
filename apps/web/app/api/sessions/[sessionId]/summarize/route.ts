import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreStore } from '@shipwithai/core/firestore-store';

/**
 * Summarize recent conversation with an agent into structured context.
 * Called after each agent reply to build up project understanding.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ success: false, error: 'API key not configured' }, { status: 500 });
  }

  const { agentId, agentName, agentRole } = await request.json();
  if (!agentId) {
    return NextResponse.json({ success: false, error: 'agentId required' }, { status: 400 });
  }

  const store = getFirestoreStore();

  // Get all messages for this session
  const messages = await store.getChatMessages(params.sessionId);
  // Filter to this agent's conversation
  const agentMessages = messages.filter(
    (m) => m.agentId === agentId || (m.role === 'user' && messages.some(
      (a) => a.agentId === agentId && Math.abs(a.timestamp - m.timestamp) < 60000
    ))
  );

  if (agentMessages.length === 0) {
    return NextResponse.json({ success: true, summary: '' });
  }

  // Get existing context from other agents for reference
  const session = await store.getSession(params.sessionId);
  const existingContext = session?.context ?? {};

  // Build conversation transcript
  const transcript = agentMessages
    .map((m) => `${m.role === 'user' ? 'User' : agentName || agentId}: ${m.content}`)
    .join('\n\n');

  // Build context from other agents
  const otherAgentContext = Object.entries(existingContext)
    .filter(([id]) => id !== agentId)
    .map(([id, summary]) => `[${id}]: ${summary}`)
    .join('\n\n');

  const existingFacts = session?.projectFacts || '';

  const systemPrompt = `You are a context summarizer for a multi-agent project planning system.
Your job is to extract and preserve the key information from a conversation between a user and an AI agent specialist.

You must produce TWO sections, separated by "---PROJECT_FACTS---":

**SECTION 1: Agent Summary** (150-300 words)
Captures what this specific agent discussed:
- Decisions made, requirements gathered, open questions, next steps
- Write in bullet points. Be specific — preserve exact names, numbers, and details.

**SECTION 2: Project Facts Update** (after the separator)
Update the persistent project facts block. This block travels unchanged to EVERY agent.
Include ONLY concrete, stable facts — not opinions, suggestions, or open questions:
- Project name and type
- Target audience / customer
- Tech stack choices (framework, language, database, etc.)
- Key constraints (budget, timeline, platform)
- Decided features and scope
- Business rules and requirements
- Specific names, URLs, numbers, credentials references

If existing project facts are provided, merge new facts in — never drop existing facts unless explicitly contradicted.
If no new facts emerged, reproduce the existing facts unchanged.

Skip pleasantries and focus only on actionable information.`;

  const userPrompt = `Agent: ${agentName || agentId} (${agentRole || 'Specialist'})
${existingFacts ? `\nExisting project facts:\n${existingFacts}\n` : ''}
${otherAgentContext ? `\nContext from other agents:\n${otherAgentContext}\n` : ''}
Conversation transcript:
${transcript}

Produce the agent summary and updated project facts (separated by ---PROJECT_FACTS---):`;


  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        system: systemPrompt,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('Summarization API error:', error);
      return NextResponse.json({ success: false, error: 'Summarization failed' }, { status: 500 });
    }

    const data = await response.json();
    const fullOutput = data.content?.[0]?.text || '';

    // Split into agent summary and project facts
    const separator = '---PROJECT_FACTS---';
    let summary: string;
    let projectFacts: string;

    if (fullOutput.includes(separator)) {
      const parts = fullOutput.split(separator);
      summary = parts[0].trim();
      projectFacts = parts[1].trim();
    } else {
      summary = fullOutput.trim();
      projectFacts = existingFacts; // Keep existing if extraction failed
    }

    // Persist both the agent summary and project facts
    const updatedContext = { ...existingContext, [agentId]: summary };
    await store.updateSessionContext(params.sessionId, updatedContext);

    // Persist project facts separately
    if (projectFacts) {
      await store.updateSession(params.sessionId, { projectFacts });
    }

    return NextResponse.json({ success: true, summary, projectFacts, context: updatedContext });
  } catch (error) {
    console.error('Summarization error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
