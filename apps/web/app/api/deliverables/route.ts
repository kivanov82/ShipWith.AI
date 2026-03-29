import { NextRequest, NextResponse } from 'next/server';
import { getFirestoreStore } from '@agentverse/core/firestore-store';

export async function GET(request: NextRequest) {
  const store = getFirestoreStore();
  const { searchParams } = request.nextUrl;

  const deliverables = await store.getDeliverables({
    sessionId: searchParams.get('sessionId') ?? undefined,
    projectId: searchParams.get('projectId') ?? undefined,
    type: searchParams.get('type') ?? undefined,
  });

  return NextResponse.json({ success: true, deliverables });
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { type, title, description, producedBy, sessionId, projectId, url, preview, content, contentType, fileName } = body;

  if (!type || !title || !producedBy) {
    return NextResponse.json({ success: false, error: 'type, title, and producedBy required' }, { status: 400 });
  }

  const store = getFirestoreStore();

  const deliverable = await store.saveDeliverable({
    type,
    title,
    description,
    producedBy,
    sessionId,
    projectId,
    url,
    preview,
    downloadUrl: undefined, // Set after creation if content provided
  });

  // If content is provided, store it and set download URL
  if (content) {
    await store.saveDeliverableContent({
      deliverableId: deliverable.id,
      content,
      contentType: contentType ?? 'text/plain',
      fileName,
    });

    // Update deliverable with download URL
    deliverable.downloadUrl = `/api/deliverables/${deliverable.id}/download`;
    await store.saveDeliverable({ ...deliverable });
  }

  return NextResponse.json({ success: true, deliverable });
}
