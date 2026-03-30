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

  const systemPrompt = `You are a context summarizer for a multi-agent project planning system.
Your job is to extract and preserve the key information from a conversation between a user and an AI agent specialist.

Produce a concise summary (150-300 words) that captures:
- **Decisions made**: What was agreed upon
- **Requirements gathered**: Specific needs, preferences, constraints
- **Key details**: Names, numbers, URLs, technical choices
- **Open questions**: Anything still unresolved
- **Next steps**: What this agent or others should do next

Write in bullet points. Be specific — preserve exact names, numbers, and details.
Skip pleasantries and focus only on actionable information.`;

  const userPrompt = `Agent: ${agentName || agentId} (${agentRole || 'Specialist'})
${otherAgentContext ? `\nContext from other agents:\n${otherAgentContext}\n` : ''}
Conversation transcript:
${transcript}

Summarize the key context from this conversation:`;

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
    const summary = data.content?.[0]?.text || '';

    // Persist the summary to the session context
    const updatedContext = { ...existingContext, [agentId]: summary };
    await store.updateSessionContext(params.sessionId, updatedContext);

    return NextResponse.json({ success: true, summary, context: updatedContext });
  } catch (error) {
    console.error('Summarization error:', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
