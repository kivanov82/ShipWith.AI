import { NextRequest, NextResponse } from 'next/server';
import { getProjectStore } from '@agentverse/core/project-store';

export async function GET(
  _request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const store = getProjectStore();
  const session = store.getSession(params.sessionId);

  if (!session) {
    return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
  }

  const messages = store.getChatMessages(params.sessionId);
  const deliveryRequests = store.getDeliveryRequests(params.sessionId);

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
  const store = getProjectStore();

  const existing = store.getSession(params.sessionId);
  if (!existing) {
    return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
  }

  if (body.status) {
    store.updateSessionStatus(params.sessionId, body.status);
  }
  if (body.involvedAgents) {
    store.updateSessionAgents(params.sessionId, body.involvedAgents);
  }
  if (body.context) {
    store.updateSessionContext(params.sessionId, body.context);
  }

  const updated = store.getSession(params.sessionId);
  return NextResponse.json({ success: true, session: updated });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const store = getProjectStore();
  // Mark as completed rather than actually deleting
  store.updateSessionStatus(params.sessionId, 'completed');
  return NextResponse.json({ success: true });
}
