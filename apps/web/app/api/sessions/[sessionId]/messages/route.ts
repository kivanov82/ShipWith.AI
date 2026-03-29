import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreStore } from '@agentverse/core/firestore-store';

export async function GET(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const store = getFirestoreStore();
  const { searchParams } = request.nextUrl;

  const messages = await store.getChatMessages(params.sessionId, {
    limit: searchParams.has('limit') ? Number(searchParams.get('limit')) : undefined,
    since: searchParams.has('since') ? Number(searchParams.get('since')) : undefined,
  });

  return NextResponse.json({ success: true, messages });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const body = await request.json();
  const { role, agentId, content, isQuestion, options } = body;

  if (!role || !content) {
    return NextResponse.json({ success: false, error: 'role and content required' }, { status: 400 });
  }

  const store = getFirestoreStore();
  const message = await store.saveChatMessage({
    sessionId: params.sessionId,
    role,
    agentId,
    content,
    isQuestion: isQuestion ?? false,
    options,
  });

  return NextResponse.json({ success: true, message });
}
