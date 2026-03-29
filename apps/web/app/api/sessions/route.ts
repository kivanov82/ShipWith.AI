import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreStore } from '@shipwithai/core/firestore-store';

export async function GET(request: NextRequest) {
  const store = getFirestoreStore();
  const { searchParams } = request.nextUrl;

  const sessions = await store.listSessions({
    projectId: searchParams.get('projectId') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    limit: searchParams.has('limit') ? Number(searchParams.get('limit')) : undefined,
  });

  return NextResponse.json({ success: true, sessions });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { id, name, description, projectId, status, involvedAgents, context } = body;

  if (!id || !name) {
    return NextResponse.json({ success: false, error: 'id and name required' }, { status: 400 });
  }

  const store = getFirestoreStore();
  const session = await store.saveSession({
    id,
    name,
    description,
    projectId,
    status: status ?? 'context-building',
    involvedAgents: involvedAgents ?? [],
    context: context ?? {},
  });

  return NextResponse.json({ success: true, session });
}
