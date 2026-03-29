import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreStore } from '@agentverse/core/firestore-store';

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const store = getFirestoreStore();

  const summary = await store.getCostSummary({
    sessionId: searchParams.get('sessionId') ?? undefined,
    agentId: searchParams.get('agentId') ?? undefined,
  });

  return NextResponse.json({ success: true, ...summary });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { sessionId, agentId, model, inputTokens, outputTokens, apiCost, userCharge, mode } = body;

  if (!agentId || !model || inputTokens == null || outputTokens == null) {
    return NextResponse.json(
      { success: false, error: 'agentId, model, inputTokens, outputTokens required' },
      { status: 400 }
    );
  }

  const store = getFirestoreStore();
  const cost = await store.saveInvocationCost({
    sessionId,
    agentId,
    model,
    inputTokens,
    outputTokens,
    apiCost: apiCost ?? 0,
    userCharge: userCharge ?? 0,
    mode: mode ?? 'chat',
  });

  return NextResponse.json({ success: true, cost });
}
