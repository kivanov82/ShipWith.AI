// Project persistence layer - Firestore-based storage
// Drop-in replacement for project-store.ts (SQLite)
import { initializeApp, cert, getApps, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { nanoid } from 'nanoid';

// Re-export the same public types so API routes don't change
export type {
  StoredProject,
  StoredSession,
  StoredChatMessage,
  StoredDeliverable,
  StoredDeliverableContent,
  StoredDeliveryRequest,
  StoredUsage,
  StoredInvocationCost,
} from './project-store';

import type {
  StoredProject,
  StoredSession,
  StoredChatMessage,
  StoredDeliverable,
  StoredDeliverableContent,
  StoredDeliveryRequest,
  StoredUsage,
  StoredInvocationCost,
} from './project-store';

// ---- Firebase init ----

function getApp(): App {
  if (getApps().length > 0) return getApps()[0];

  const projectId = process.env.FIREBASE_PROJECT_ID || process.env.GCLOUD_PROJECT;

  // If running on GCP (Cloud Run), use default credentials
  if (process.env.K_SERVICE || process.env.GOOGLE_CLOUD_PROJECT) {
    return initializeApp({ projectId });
  }

  // Local dev: use service account key if provided
  const keyPath = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (keyPath) {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const serviceAccount = require(keyPath);
    return initializeApp({ credential: cert(serviceAccount), projectId });
  }

  // Fallback: FIREBASE_CONFIG or default credentials
  return initializeApp({ projectId });
}

// ---- FirestoreStore class ----

export class FirestoreStore {
  private db: Firestore;

  constructor() {
    const app = getApp();
    this.db = getFirestore(app);
  }

  // ---- Projects ----

  async saveProject(project: Omit<StoredProject, 'createdAt' | 'updatedAt'> & { createdAt?: number; updatedAt?: number }): Promise<StoredProject> {
    const now = Date.now();
    const full: StoredProject = {
      ...project,
      createdAt: project.createdAt ?? now,
      updatedAt: project.updatedAt ?? now,
    };
    await this.db.collection('projects').doc(full.id).set(full);
    return full;
  }

  async getProject(id: string): Promise<StoredProject | null> {
    const doc = await this.db.collection('projects').doc(id).get();
    return doc.exists ? (doc.data() as StoredProject) : null;
  }

  async listProjects(options: { status?: string; limit?: number } = {}): Promise<StoredProject[]> {
    let q = this.db.collection('projects').orderBy('updatedAt', 'desc') as FirebaseFirestore.Query;
    if (options.status) q = q.where('status', '==', options.status);
    if (options.limit) q = q.limit(options.limit);
    const snap = await q.get();
    return snap.docs.map((d) => d.data() as StoredProject);
  }

  // ---- Sessions ----

  async saveSession(session: Omit<StoredSession, 'createdAt' | 'updatedAt'> & { createdAt?: number; updatedAt?: number }): Promise<StoredSession> {
    const now = Date.now();
    const full: StoredSession = {
      ...session,
      createdAt: session.createdAt ?? now,
      updatedAt: session.updatedAt ?? now,
    };
    await this.db.collection('sessions').doc(full.id).set(full);
    return full;
  }

  async getSession(id: string): Promise<StoredSession | null> {
    const doc = await this.db.collection('sessions').doc(id).get();
    return doc.exists ? (doc.data() as StoredSession) : null;
  }

  async listSessions(options: { projectId?: string; status?: string; limit?: number } = {}): Promise<StoredSession[]> {
    let q = this.db.collection('sessions').orderBy('updatedAt', 'desc') as FirebaseFirestore.Query;
    if (options.projectId) q = q.where('projectId', '==', options.projectId);
    if (options.status) q = q.where('status', '==', options.status);
    if (options.limit) q = q.limit(options.limit);
    const snap = await q.get();
    return snap.docs.map((d) => d.data() as StoredSession);
  }

  async updateSessionStatus(id: string, status: string): Promise<void> {
    await this.db.collection('sessions').doc(id).update({ status, updatedAt: Date.now() });
  }

  async updateSessionAgents(id: string, involvedAgents: string[]): Promise<void> {
    await this.db.collection('sessions').doc(id).update({ involvedAgents, updatedAt: Date.now() });
  }

  async updateSessionContext(id: string, context: Record<string, string>): Promise<void> {
    await this.db.collection('sessions').doc(id).update({ context, updatedAt: Date.now() });
  }

  // ---- Chat Messages ----

  async saveChatMessage(message: Omit<StoredChatMessage, 'id' | 'timestamp'> & { id?: string; timestamp?: number }): Promise<StoredChatMessage> {
    const full: StoredChatMessage = {
      ...message,
      id: message.id ?? nanoid(),
      timestamp: message.timestamp ?? Date.now(),
    };
    await this.db.collection('sessions').doc(full.sessionId).collection('messages').doc(full.id).set(full);
    return full;
  }

  async getChatMessages(sessionId: string, options: { limit?: number; since?: number } = {}): Promise<StoredChatMessage[]> {
    let q = this.db.collection('sessions').doc(sessionId).collection('messages').orderBy('timestamp', 'asc') as FirebaseFirestore.Query;
    if (options.since) q = q.where('timestamp', '>', options.since);
    if (options.limit) q = q.limit(options.limit);
    const snap = await q.get();
    return snap.docs.map((d) => d.data() as StoredChatMessage);
  }

  // ---- Deliverables ----

  async saveDeliverable(deliverable: Omit<StoredDeliverable, 'id' | 'createdAt'> & { id?: string; createdAt?: number }): Promise<StoredDeliverable> {
    const full: StoredDeliverable = {
      ...deliverable,
      id: deliverable.id ?? nanoid(),
      createdAt: deliverable.createdAt ?? Date.now(),
    };
    await this.db.collection('deliverables').doc(full.id).set(full);
    return full;
  }

  async getDeliverables(options: { sessionId?: string; projectId?: string; type?: string } = {}): Promise<StoredDeliverable[]> {
    let q = this.db.collection('deliverables').orderBy('createdAt', 'desc') as FirebaseFirestore.Query;
    if (options.sessionId) q = q.where('sessionId', '==', options.sessionId);
    if (options.projectId) q = q.where('projectId', '==', options.projectId);
    if (options.type) q = q.where('type', '==', options.type);
    const snap = await q.get();
    return snap.docs.map((d) => d.data() as StoredDeliverable);
  }

  // ---- Deliverable Content ----

  async saveDeliverableContent(content: StoredDeliverableContent): Promise<void> {
    await this.db.collection('deliverables').doc(content.deliverableId).collection('content').doc('main').set(content);
  }

  async getDeliverableContent(deliverableId: string): Promise<StoredDeliverableContent | null> {
    const doc = await this.db.collection('deliverables').doc(deliverableId).collection('content').doc('main').get();
    return doc.exists ? (doc.data() as StoredDeliverableContent) : null;
  }

  // ---- Delivery Requests ----

  async saveDeliveryRequest(request: Omit<StoredDeliveryRequest, 'createdAt'> & { createdAt?: number }): Promise<StoredDeliveryRequest> {
    const full: StoredDeliveryRequest = {
      ...request,
      createdAt: request.createdAt ?? Date.now(),
    };
    await this.db.collection('sessions').doc(full.sessionId).collection('deliveryRequests').doc(full.id).set(full);
    return full;
  }

  async getDeliveryRequests(sessionId: string): Promise<StoredDeliveryRequest[]> {
    const snap = await this.db.collection('sessions').doc(sessionId).collection('deliveryRequests').orderBy('createdAt', 'asc').get();
    return snap.docs.map((d) => d.data() as StoredDeliveryRequest);
  }

  async updateDeliveryRequestStatus(id: string, sessionId: string, status: string, txHash?: string, output?: string): Promise<void> {
    const updates: Record<string, unknown> = { status };
    if (txHash !== undefined) updates.txHash = txHash;
    if (output !== undefined) updates.output = output;
    await this.db.collection('sessions').doc(sessionId).collection('deliveryRequests').doc(id).update(updates);
  }

  // ---- Usage Tracking ----

  async getOrCreateUsage(sessionToken: string, walletAddress?: string): Promise<StoredUsage> {
    // Try by wallet first
    if (walletAddress) {
      const snap = await this.db.collection('usage').where('walletAddress', '==', walletAddress).limit(1).get();
      if (!snap.empty) return snap.docs[0].data() as StoredUsage;
    }

    // Try by session token
    const snap = await this.db.collection('usage').where('sessionToken', '==', sessionToken).limit(1).get();
    if (!snap.empty) {
      const usage = snap.docs[0].data() as StoredUsage;
      // Link wallet if newly connected
      if (walletAddress && !usage.walletAddress) {
        await this.db.collection('usage').doc(usage.id).update({ walletAddress });
        usage.walletAddress = walletAddress;
      }
      return usage;
    }

    // Create new
    const id = nanoid();
    const record: StoredUsage = { id, walletAddress, sessionToken, chatCount: 0, createdAt: Date.now() };
    await this.db.collection('usage').doc(id).set(record);
    return record;
  }

  async incrementChatCount(usageId: string): Promise<number> {
    const ref = this.db.collection('usage').doc(usageId);
    const { FieldValue } = await import('firebase-admin/firestore');
    await ref.update({ chatCount: FieldValue.increment(1), lastChatAt: Date.now() });
    const doc = await ref.get();
    return (doc.data() as StoredUsage).chatCount;
  }

  // ---- Invocation Costs ----

  async saveInvocationCost(cost: Omit<StoredInvocationCost, 'id' | 'createdAt'> & { id?: string; createdAt?: number }): Promise<StoredInvocationCost> {
    const full: StoredInvocationCost = {
      ...cost,
      id: cost.id ?? nanoid(),
      createdAt: cost.createdAt ?? Date.now(),
    };
    await this.db.collection('invocationCosts').doc(full.id).set(full);
    return full;
  }

  async getCostSummary(options: { sessionId?: string; agentId?: string } = {}): Promise<{ totalApiCost: number; totalUserCharge: number; count: number }> {
    let q = this.db.collection('invocationCosts') as FirebaseFirestore.Query;
    if (options.sessionId) q = q.where('sessionId', '==', options.sessionId);
    if (options.agentId) q = q.where('agentId', '==', options.agentId);
    const snap = await q.get();

    let totalApiCost = 0;
    let totalUserCharge = 0;
    snap.docs.forEach((d) => {
      const data = d.data() as StoredInvocationCost;
      totalApiCost += data.apiCost;
      totalUserCharge += data.userCharge;
    });
    return { totalApiCost, totalUserCharge, count: snap.size };
  }
}

// Singleton
let instance: FirestoreStore | null = null;

export function getFirestoreStore(): FirestoreStore {
  if (!instance) instance = new FirestoreStore();
  return instance;
}
