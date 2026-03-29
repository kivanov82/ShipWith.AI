import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreStore } from '@agentverse/core/firestore-store';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const store = getFirestoreStore();
  const content = await store.getDeliverableContent(params.id);

  if (!content) {
    return NextResponse.json({ success: false, error: 'Deliverable content not found' }, { status: 404 });
  }

  const fileName = content.fileName ?? `deliverable-${params.id}.txt`;

  return new NextResponse(content.content, {
    headers: {
      'Content-Type': content.contentType,
      'Content-Disposition': `attachment; filename="${fileName}"`,
    },
  });
}
