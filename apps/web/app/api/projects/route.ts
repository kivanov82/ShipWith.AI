import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreStore } from '@shipwithai/core/firestore-store';

export async function GET(request: NextRequest) {
  const store = getFirestoreStore();
  const { searchParams } = request.nextUrl;

  const projects = await store.listProjects({
    status: searchParams.get('status') ?? undefined,
    limit: searchParams.has('limit') ? Number(searchParams.get('limit')) : undefined,
  });

  return NextResponse.json({ success: true, projects });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { id, name, description, status, budget, metadata } = body;

  if (!id || !name) {
    return NextResponse.json({ success: false, error: 'id and name required' }, { status: 400 });
  }

  const store = getFirestoreStore();
  const project = await store.saveProject({
    id,
    name,
    description,
    status: status ?? 'planning',
    budget,
    metadata,
  });

  return NextResponse.json({ success: true, project });
}
