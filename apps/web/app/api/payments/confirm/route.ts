import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreStore } from '@shipwithai/core/firestore-store';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { txHash, deliveryId, sessionId } = body;

  if (!deliveryId || !sessionId) {
    return NextResponse.json(
      { success: false, error: 'deliveryId and sessionId required' },
      { status: 400 },
    );
  }

  const store = getFirestoreStore();

  // Update delivery request status
  await store.updateDeliveryRequestStatus(
    deliveryId,
    sessionId,
    txHash ? 'paid' : 'in-progress',
    txHash,
  );

  // If payment confirmed, trigger the agent work
  // The frontend will call the invoke endpoint separately after payment confirmation
  return NextResponse.json({
    success: true,
    deliveryId,
    status: txHash ? 'paid' : 'in-progress',
    txHash,
  });
}
