import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreStore } from '@shipwithai/core/firestore-store';

// Free tier limits
const LIMITS = {
  anonymous: 10,      // No wallet connected
  connected: 25,      // Wallet connected, no balance
  funded: Infinity,   // Wallet has USDC balance
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
