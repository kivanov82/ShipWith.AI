// Event bus implementation - SQLite-based for portability
import Database from 'better-sqlite3';
import { nanoid } from 'nanoid';
import type { AgentEvent, EventType, AgentId } from './types';

export class EventBus {
  private db: Database.Database;
  private subscribers: Map<string, (event: AgentEvent) => void> = new Map();
  private pollInterval: NodeJS.Timeout | null = null;
  private lastEventId: string | null = null;

  constructor(dbPath: string = './shipwithai-events.db') {
    this.db = new Database(dbPath);
    this.init();
  }

  private init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS events (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        source TEXT NOT NULL,
        target TEXT,
        project_id TEXT,
        payload TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      );

      CREATE INDEX IF NOT EXISTS idx_events_timestamp ON events(timestamp);
      CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);
      CREATE INDEX IF NOT EXISTS idx_events_source ON events(source);
      CREATE INDEX IF NOT EXISTS idx_events_target ON events(target);
      CREATE INDEX IF NOT EXISTS idx_events_project ON events(project_id);
    `);
  }

  emit(event: Omit<AgentEvent, 'id' | 'timestamp'>): AgentEvent {
    const fullEvent: AgentEvent = {
      ...event,
      id: nanoid(),
      timestamp: Date.now(),
    };

    const stmt = this.db.prepare(`
      INSERT INTO events (id, type, source, target, project_id, payload, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      fullEvent.id,
      fullEvent.type,
      fullEvent.source,
      fullEvent.target || null,
      fullEvent.projectId || null,
      JSON.stringify(fullEvent.payload),
      fullEvent.timestamp
    );

    // Notify local subscribers
    this.subscribers.forEach((callback) => callback(fullEvent));

    return fullEvent;
  }

  subscribe(callback: (event: AgentEvent) => void): string {
    const subscriptionId = nanoid();
    this.subscribers.set(subscriptionId, callback);
    return subscriptionId;
  }

  unsubscribe(subscriptionId: string): void {
    this.subscribers.delete(subscriptionId);
  }

  // Query events
  getEvents(options: {
    type?: EventType;
    source?: AgentId | 'system' | 'user';
    target?: AgentId;
    projectId?: string;
    since?: number;
    limit?: number;
  } = {}): AgentEvent[] {
    let query = 'SELECT * FROM events WHERE 1=1';
    const params: unknown[] = [];

    if (options.type) {
      query += ' AND type = ?';
      params.push(options.type);
    }
    if (options.source) {
      query += ' AND source = ?';
      params.push(options.source);
    }
    if (options.target) {
      query += ' AND target = ?';
      params.push(options.target);
    }
    if (options.projectId) {
      query += ' AND project_id = ?';
      params.push(options.projectId);
    }
    if (options.since) {
      query += ' AND timestamp > ?';
      params.push(options.since);
    }

    query += ' ORDER BY timestamp DESC';

    if (options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }

    const rows = this.db.prepare(query).all(...params) as Array<{
      id: string;
      type: EventType;
      source: string;
      target: string | null;
      project_id: string | null;
      payload: string;
      timestamp: number;
    }>;

    return rows.map((row) => ({
      id: row.id,
      type: row.type,
      source: row.source as AgentId | 'system' | 'user',
      target: row.target as AgentId | undefined,
      projectId: row.project_id || undefined,
      payload: JSON.parse(row.payload),
      timestamp: row.timestamp,
    }));
  }

  // For SSE streaming
  startPolling(callback: (events: AgentEvent[]) => void, intervalMs: number = 1000): void {
    this.pollInterval = setInterval(() => {
      const events = this.getEvents({
        since: this.lastEventId ? undefined : Date.now() - intervalMs,
        limit: 100,
      });

      if (events.length > 0) {
        this.lastEventId = events[0].id;
        callback(events.reverse()); // Return in chronological order
      }
    }, intervalMs);
  }

  stopPolling(): void {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  close(): void {
    this.stopPolling();
    this.db.close();
  }
}

// Singleton instance
let eventBusInstance: EventBus | null = null;

export function getEventBus(dbPath?: string): EventBus {
  if (!eventBusInstance) {
    eventBusInstance = new EventBus(dbPath);
  }
  return eventBusInstance;
}

// Helper to emit common event types
export const events = {
  taskCreated: (source: AgentId | 'user', projectId: string, task: { id: string; title: string; description: string }) =>
    getEventBus().emit({
      type: 'task.created',
      source,
      projectId,
      payload: task,
    }),

  taskAssigned: (source: AgentId, target: AgentId, projectId: string, taskId: string) =>
    getEventBus().emit({
      type: 'task.assigned',
      source,
      target,
      projectId,
      payload: { taskId },
    }),

  taskCompleted: (source: AgentId, projectId: string, taskId: string, artifacts?: string[] | Record<string, unknown>) =>
    getEventBus().emit({
      type: 'task.completed',
      source,
      projectId,
      payload: { taskId, ...(Array.isArray(artifacts) ? { artifacts } : artifacts || {}) },
    }),

  paymentSent: (from: AgentId | 'user', to: AgentId, amount: string, txHash?: string) =>
    getEventBus().emit({
      type: 'payment.sent',
      source: from,
      target: to,
      payload: { amount, txHash },
    }),

  messageSent: (from: AgentId, to: AgentId | 'user', message: string, projectId?: string) =>
    getEventBus().emit({
      type: 'message.sent',
      source: from,
      target: to as AgentId,
      projectId,
      payload: { message },
    }),

  artifactProduced: (source: AgentId, projectId: string, artifact: { path: string; type: string; description: string }) =>
    getEventBus().emit({
      type: 'artifact.produced',
      source,
      projectId,
      payload: artifact,
    }),

  taskFailed: (source: AgentId, projectId: string, taskId: string, error: string) =>
    getEventBus().emit({
      type: 'task.failed',
      source,
      projectId,
      payload: { taskId, error },
    }),

  taskRetrying: (source: AgentId, projectId: string, taskId: string, attempt: number, maxRetries: number) =>
    getEventBus().emit({
      type: 'task.retrying',
      source,
      projectId,
      payload: { taskId, attempt, maxRetries },
    }),

  taskEscalated: (source: AgentId, projectId: string, taskId: string, reason: string) =>
    getEventBus().emit({
      type: 'task.escalated',
      source,
      projectId,
      payload: { taskId, reason },
    }),
};
