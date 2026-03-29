import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreStore } from '@agentverse/core/firestore-store';

export async function GET(
  _request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const store = getFirestoreStore();
  const session = await store.getSession(params.sessionId);

  if (!session) {
    return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
  }

  const messages = await store.getChatMessages(params.sessionId);
  const deliveryRequests = await store.getDeliveryRequests(params.sessionId);

  return NextResponse.json({
    success: true,
    session: { ...session, messages, deliveryRequests },
  });
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const body = await request.json();
  const store = getFirestoreStore();

  const existing = await store.getSession(params.sessionId);
  if (!existing) {
    return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
  }

  if (body.status) {
    await store.updateSessionStatus(params.sessionId, body.status);
  }
  if (body.involvedAgents) {
    await store.updateSessionAgents(params.sessionId, body.involvedAgents);
  }
  if (body.context) {
    await store.updateSessionContext(params.sessionId, body.context);
  }

  const updated = await store.getSession(params.sessionId);
  return NextResponse.json({ success: true, session: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const store = getFirestoreStore();
  // Mark as completed rather than actually deleting
  await store.updateSessionStatus(params.sessionId, 'completed');
  return NextResponse.json({ success: true });
}
