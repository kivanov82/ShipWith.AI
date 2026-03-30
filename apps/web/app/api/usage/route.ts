import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreStore } from '@shipwithai/core/firestore-store';

const isFreeMode = process.env.SHIPWITHAI_FREE_MODE === 'true';

// Free tier limits
const LIMITS = {
  anonymous: isFreeMode ? Infinity : 10,
  connected: isFreeMode ? Infinity : 25,
  funded: Infinity,
};

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const sessionToken = searchParams.get('sessionToken');
  const walletAddress = searchParams.get('walletAddress');
  const hasFunds = searchParams.get('hasFunds') === 'true';

  if (!sessionToken) {
    return NextResponse.json({ success: false, error: 'sessionToken required' }, { status: 400 });
  }

  const store = getFirestoreStore();
  const usage = await store.getOrCreateUsage(sessionToken, walletAddress ?? undefined);

  const tier = hasFunds ? 'funded' : walletAddress ? 'connected' : 'anonymous';
  const limit = LIMITS[tier];
  const remaining = Math.max(0, limit - usage.chatCount);

  return NextResponse.json({
    success: true,
    usage: {
      ...usage,
      tier,
      limit,
      remaining,
      isLimitReached: remaining === 0,
    },
  });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { sessionToken, walletAddress, hasFunds } = body;

  if (!sessionToken) {
    return NextResponse.json({ success: false, error: 'sessionToken required' }, { status: 400 });
  }

  const store = getFirestoreStore();
  const usage = await store.getOrCreateUsage(sessionToken, walletAddress);
  const newCount = await store.incrementChatCount(usage.id);

  const tier = hasFunds ? 'funded' : walletAddress ? 'connected' : 'anonymous';
  const limit = LIMITS[tier];
  const remaining = Math.max(0, limit - newCount);

  return NextResponse.json({
    success: true,
    usage: {
      ...usage,
      chatCount: newCount,
      tier,
      limit,
      remaining,
      isLimitReached: remaining === 0,
    },
  });
}
