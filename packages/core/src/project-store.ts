// Project persistence layer - SQLite-based storage for sessions, messages, deliverables
import Database from 'better-sqlite3';
import { nanoid } from 'nanoid';

// ---- Row types (what comes back from SQLite) ----

interface ProjectRow {
  id: string;
  name: string;
  description: string | null;
  status: string;
  budget: string | null;
  metadata: string | null;
  created_at: number;
  updated_at: number;
}

interface SessionRow {
  id: string;
  project_id: string | null;
  name: string;
  description: string | null;
  status: string;
  involved_agents: string;
  context: string;
  created_at: number;
  updated_at: number;
}

interface ChatMessageRow {
  id: string;
  session_id: string;
  role: string;
  agent_id: string | null;
  content: string;
  is_question: number;
  options: string | null;
  timestamp: number;
}

interface DeliverableRow {
  id: string;
  session_id: string | null;
  project_id: string | null;
  type: string;
  title: string;
  description: string | null;
  url: string | null;
  download_url: string | null;
  preview: string | null;
  produced_by: string;
  created_at: number;
}

interface DeliverableContentRow {
  deliverable_id: string;
  content: string;
  content_type: string;
  file_name: string | null;
}

interface DeliveryRequestRow {
  id: string;
  session_id: string;
  agent_id: string;
  description: string | null;
  estimated_cost: string | null;
  status: string;
  tx_hash: string | null;
  output: string | null;
  created_at: number;
}

interface UsageRow {
  id: string;
  wallet_address: string | null;
  session_token: string;
  chat_count: number;
  last_chat_at: number | null;
  created_at: number;
}

interface InvocationCostRow {
  id: string;
  session_id: string | null;
  agent_id: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  api_cost: number;
  user_charge: number;
  mode: string;
  created_at: number;
}

// ---- Public types ----

export interface StoredProject {
  id: string;
  name: string;
  description?: string;
  status: string;
  budget?: string;
  metadata?: Record<string, unknown>;
  createdAt: number;
  updatedAt: number;
}

export interface StoredSession {
  id: string;
  projectId?: string;
  name: string;
  description?: string;
  status: string;
  involvedAgents: string[];
  context: Record<string, string>;
  createdAt: number;
  updatedAt: number;
}

export interface StoredChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'agent' | 'system';
  agentId?: string;
  content: string;
  isQuestion: boolean;
  options?: string[];
  timestamp: number;
}

export interface StoredDeliverable {
  id: string;
  sessionId?: string;
  projectId?: string;
  type: string;
  title: string;
  description?: string;
  url?: string;
  downloadUrl?: string;
  preview?: string;
  producedBy: string;
  createdAt: number;
}

export interface StoredDeliverableContent {
  deliverableId: string;
  content: string;
  contentType: string;
  fileName?: string;
}

export interface StoredDeliveryRequest {
  id: string;
  sessionId: string;
  agentId: string;
  description?: string;
  estimatedCost?: string;
  status: string;
  txHash?: string;
  output?: string;
  createdAt: number;
}

export interface StoredUsage {
  id: string;
  walletAddress?: string;
  sessionToken: string;
  chatCount: number;
  lastChatAt?: number;
  createdAt: number;
}

export interface StoredInvocationCost {
  id: string;
  sessionId?: string;
  agentId: string;
  model: string;
  inputTokens: number;
  outputTokens: number;
  apiCost: number;
  userCharge: number;
  mode: string;
  createdAt: number;
}

// ---- ProjectStore class ----

export class ProjectStore {
  private db: Database.Database;

  constructor(dbPath: string = './data/agentverse.db') {
    this.db = new Database(dbPath);
    this.db.pragma('journal_mode = WAL');
    this.init();
  }

  private init() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'planning',
        budget TEXT,
        metadata TEXT,
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS sessions (
        id TEXT PRIMARY KEY,
        project_id TEXT,
        name TEXT NOT NULL,
        description TEXT,
        status TEXT NOT NULL DEFAULT 'context-building',
        involved_agents TEXT NOT NULL DEFAULT '[]',
        context TEXT NOT NULL DEFAULT '{}',
        created_at INTEGER NOT NULL,
        updated_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS chat_messages (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        role TEXT NOT NULL,
        agent_id TEXT,
        content TEXT NOT NULL,
        is_question INTEGER DEFAULT 0,
        options TEXT,
        timestamp INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS deliverables (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        project_id TEXT,
        type TEXT NOT NULL,
        title TEXT NOT NULL,
        description TEXT,
        url TEXT,
        download_url TEXT,
        preview TEXT,
        produced_by TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS deliverable_content (
        deliverable_id TEXT PRIMARY KEY,
        content TEXT NOT NULL,
        content_type TEXT NOT NULL,
        file_name TEXT
      );

      CREATE TABLE IF NOT EXISTS delivery_requests (
        id TEXT PRIMARY KEY,
        session_id TEXT NOT NULL,
        agent_id TEXT NOT NULL,
        description TEXT,
        estimated_cost TEXT,
        status TEXT NOT NULL DEFAULT 'pending',
        tx_hash TEXT,
        output TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS usage (
        id TEXT PRIMARY KEY,
        wallet_address TEXT,
        session_token TEXT NOT NULL,
        chat_count INTEGER DEFAULT 0,
        last_chat_at INTEGER,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS invocation_costs (
        id TEXT PRIMARY KEY,
        session_id TEXT,
        agent_id TEXT NOT NULL,
        model TEXT NOT NULL,
        input_tokens INTEGER NOT NULL,
        output_tokens INTEGER NOT NULL,
        api_cost REAL NOT NULL,
        user_charge REAL NOT NULL,
        mode TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_id);
      CREATE INDEX IF NOT EXISTS idx_sessions_status ON sessions(status);
      CREATE INDEX IF NOT EXISTS idx_messages_session ON chat_messages(session_id);
      CREATE INDEX IF NOT EXISTS idx_messages_timestamp ON chat_messages(timestamp);
      CREATE INDEX IF NOT EXISTS idx_deliverables_session ON deliverables(session_id);
      CREATE INDEX IF NOT EXISTS idx_deliverables_project ON deliverables(project_id);
      CREATE INDEX IF NOT EXISTS idx_delivery_requests_session ON delivery_requests(session_id);
      CREATE INDEX IF NOT EXISTS idx_usage_wallet ON usage(wallet_address);
      CREATE INDEX IF NOT EXISTS idx_usage_token ON usage(session_token);
      CREATE INDEX IF NOT EXISTS idx_costs_session ON invocation_costs(session_id);
      CREATE INDEX IF NOT EXISTS idx_costs_agent ON invocation_costs(agent_id);
    `);
  }

  // ---- Projects ----

  saveProject(project: Omit<StoredProject, 'createdAt' | 'updatedAt'> & { createdAt?: number; updatedAt?: number }): StoredProject {
    const now = Date.now();
    const full: StoredProject = {
      ...project,
      createdAt: project.createdAt ?? now,
      updatedAt: project.updatedAt ?? now,
    };

    this.db.prepare(`
      INSERT OR REPLACE INTO projects (id, name, description, status, budget, metadata, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      full.id,
      full.name,
      full.description ?? null,
      full.status,
      full.budget ?? null,
      full.metadata ? JSON.stringify(full.metadata) : null,
      full.createdAt,
      full.updatedAt,
    );

    return full;
  }

  getProject(id: string): StoredProject | null {
    const row = this.db.prepare('SELECT * FROM projects WHERE id = ?').get(id) as ProjectRow | undefined;
    return row ? this.mapProject(row) : null;
  }

  listProjects(options: { status?: string; limit?: number } = {}): StoredProject[] {
    let query = 'SELECT * FROM projects WHERE 1=1';
    const params: unknown[] = [];

    if (options.status) {
      query += ' AND status = ?';
      params.push(options.status);
    }
    query += ' ORDER BY updated_at DESC';
    if (options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }

    return (this.db.prepare(query).all(...params) as ProjectRow[]).map(this.mapProject);
  }

  private mapProject(row: ProjectRow): StoredProject {
    return {
      id: row.id,
      name: row.name,
      description: row.description ?? undefined,
      status: row.status,
      budget: row.budget ?? undefined,
      metadata: row.metadata ? JSON.parse(row.metadata) : undefined,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // ---- Sessions ----

  saveSession(session: Omit<StoredSession, 'createdAt' | 'updatedAt'> & { createdAt?: number; updatedAt?: number }): StoredSession {
    const now = Date.now();
    const full: StoredSession = {
      ...session,
      createdAt: session.createdAt ?? now,
      updatedAt: session.updatedAt ?? now,
    };

    this.db.prepare(`
      INSERT OR REPLACE INTO sessions (id, project_id, name, description, status, involved_agents, context, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      full.id,
      full.projectId ?? null,
      full.name,
      full.description ?? null,
      full.status,
      JSON.stringify(full.involvedAgents),
      JSON.stringify(full.context),
      full.createdAt,
      full.updatedAt,
    );

    return full;
  }

  getSession(id: string): StoredSession | null {
    const row = this.db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as SessionRow | undefined;
    return row ? this.mapSession(row) : null;
  }

  listSessions(options: { projectId?: string; status?: string; limit?: number } = {}): StoredSession[] {
    let query = 'SELECT * FROM sessions WHERE 1=1';
    const params: unknown[] = [];

    if (options.projectId) {
      query += ' AND project_id = ?';
      params.push(options.projectId);
    }
    if (options.status) {
      query += ' AND status = ?';
      params.push(options.status);
    }
    query += ' ORDER BY updated_at DESC';
    if (options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }

    return (this.db.prepare(query).all(...params) as SessionRow[]).map(this.mapSession);
  }

  updateSessionStatus(id: string, status: string): void {
    this.db.prepare('UPDATE sessions SET status = ?, updated_at = ? WHERE id = ?').run(status, Date.now(), id);
  }

  updateSessionAgents(id: string, involvedAgents: string[]): void {
    this.db.prepare('UPDATE sessions SET involved_agents = ?, updated_at = ? WHERE id = ?')
      .run(JSON.stringify(involvedAgents), Date.now(), id);
  }

  updateSessionContext(id: string, context: Record<string, string>): void {
    this.db.prepare('UPDATE sessions SET context = ?, updated_at = ? WHERE id = ?')
      .run(JSON.stringify(context), Date.now(), id);
  }

  private mapSession(row: SessionRow): StoredSession {
    return {
      id: row.id,
      projectId: row.project_id ?? undefined,
      name: row.name,
      description: row.description ?? undefined,
      status: row.status,
      involvedAgents: JSON.parse(row.involved_agents),
      context: JSON.parse(row.context),
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  // ---- Chat Messages ----

  saveChatMessage(message: Omit<StoredChatMessage, 'id' | 'timestamp'> & { id?: string; timestamp?: number }): StoredChatMessage {
    const full: StoredChatMessage = {
      ...message,
      id: message.id ?? nanoid(),
      timestamp: message.timestamp ?? Date.now(),
    };

    this.db.prepare(`
      INSERT OR REPLACE INTO chat_messages (id, session_id, role, agent_id, content, is_question, options, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      full.id,
      full.sessionId,
      full.role,
      full.agentId ?? null,
      full.content,
      full.isQuestion ? 1 : 0,
      full.options ? JSON.stringify(full.options) : null,
      full.timestamp,
    );

    return full;
  }

  getChatMessages(sessionId: string, options: { limit?: number; since?: number } = {}): StoredChatMessage[] {
    let query = 'SELECT * FROM chat_messages WHERE session_id = ?';
    const params: unknown[] = [sessionId];

    if (options.since) {
      query += ' AND timestamp > ?';
      params.push(options.since);
    }
    query += ' ORDER BY timestamp ASC';
    if (options.limit) {
      query += ' LIMIT ?';
      params.push(options.limit);
    }

    return (this.db.prepare(query).all(...params) as ChatMessageRow[]).map(this.mapChatMessage);
  }

  private mapChatMessage(row: ChatMessageRow): StoredChatMessage {
    return {
      id: row.id,
      sessionId: row.session_id,
      role: row.role as 'user' | 'agent' | 'system',
      agentId: row.agent_id ?? undefined,
      content: row.content,
      isQuestion: row.is_question === 1,
      options: row.options ? JSON.parse(row.options) : undefined,
      timestamp: row.timestamp,
    };
  }

  // ---- Deliverables ----

  saveDeliverable(deliverable: Omit<StoredDeliverable, 'id' | 'createdAt'> & { id?: string; createdAt?: number }): StoredDeliverable {
    const full: StoredDeliverable = {
      ...deliverable,
      id: deliverable.id ?? nanoid(),
      createdAt: deliverable.createdAt ?? Date.now(),
    };

    this.db.prepare(`
      INSERT OR REPLACE INTO deliverables (id, session_id, project_id, type, title, description, url, download_url, preview, produced_by, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      full.id,
      full.sessionId ?? null,
      full.projectId ?? null,
      full.type,
      full.title,
      full.description ?? null,
      full.url ?? null,
      full.downloadUrl ?? null,
      full.preview ?? null,
      full.producedBy,
      full.createdAt,
    );

    return full;
  }

  getDeliverables(options: { sessionId?: string; projectId?: string; type?: string } = {}): StoredDeliverable[] {
    let query = 'SELECT * FROM deliverables WHERE 1=1';
    const params: unknown[] = [];

    if (options.sessionId) {
      query += ' AND session_id = ?';
      params.push(options.sessionId);
    }
    if (options.projectId) {
      query += ' AND project_id = ?';
      params.push(options.projectId);
    }
    if (options.type) {
      query += ' AND type = ?';
      params.push(options.type);
    }
    query += ' ORDER BY created_at DESC';

    return (this.db.prepare(query).all(...params) as DeliverableRow[]).map(this.mapDeliverable);
  }

  private mapDeliverable(row: DeliverableRow): StoredDeliverable {
    return {
      id: row.id,
      sessionId: row.session_id ?? undefined,
      projectId: row.project_id ?? undefined,
      type: row.type,
      title: row.title,
      description: row.description ?? undefined,
      url: row.url ?? undefined,
      downloadUrl: row.download_url ?? undefined,
      preview: row.preview ?? undefined,
      producedBy: row.produced_by,
      createdAt: row.created_at,
    };
  }

  // ---- Deliverable Content ----

  saveDeliverableContent(content: StoredDeliverableContent): void {
    this.db.prepare(`
      INSERT OR REPLACE INTO deliverable_content (deliverable_id, content, content_type, file_name)
      VALUES (?, ?, ?, ?)
    `).run(content.deliverableId, content.content, content.contentType, content.fileName ?? null);
  }

  getDeliverableContent(deliverableId: string): StoredDeliverableContent | null {
    const row = this.db.prepare('SELECT * FROM deliverable_content WHERE deliverable_id = ?')
      .get(deliverableId) as DeliverableContentRow | undefined;
    if (!row) return null;
    return {
      deliverableId: row.deliverable_id,
      content: row.content,
      contentType: row.content_type,
      fileName: row.file_name ?? undefined,
    };
  }

  // ---- Delivery Requests ----

  saveDeliveryRequest(request: Omit<StoredDeliveryRequest, 'createdAt'> & { createdAt?: number }): StoredDeliveryRequest {
    const full: StoredDeliveryRequest = {
      ...request,
      createdAt: request.createdAt ?? Date.now(),
    };

    this.db.prepare(`
      INSERT OR REPLACE INTO delivery_requests (id, session_id, agent_id, description, estimated_cost, status, tx_hash, output, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      full.id, full.sessionId, full.agentId,
      full.description ?? null, full.estimatedCost ?? null,
      full.status, full.txHash ?? null, full.output ?? null, full.createdAt,
    );

    return full;
  }

  getDeliveryRequests(sessionId: string): StoredDeliveryRequest[] {
    return (this.db.prepare('SELECT * FROM delivery_requests WHERE session_id = ? ORDER BY created_at ASC')
      .all(sessionId) as DeliveryRequestRow[]).map(this.mapDeliveryRequest);
  }

  updateDeliveryRequestStatus(id: string, status: string, txHash?: string, output?: string): void {
    const updates: string[] = ['status = ?'];
    const params: unknown[] = [status];

    if (txHash !== undefined) {
      updates.push('tx_hash = ?');
      params.push(txHash);
    }
    if (output !== undefined) {
      updates.push('output = ?');
      params.push(output);
    }
    params.push(id);

    this.db.prepare(`UPDATE delivery_requests SET ${updates.join(', ')} WHERE id = ?`).run(...params);
  }

  private mapDeliveryRequest(row: DeliveryRequestRow): StoredDeliveryRequest {
    return {
      id: row.id,
      sessionId: row.session_id,
      agentId: row.agent_id,
      description: row.description ?? undefined,
      estimatedCost: row.estimated_cost ?? undefined,
      status: row.status,
      txHash: row.tx_hash ?? undefined,
      output: row.output ?? undefined,
      createdAt: row.created_at,
    };
  }

  // ---- Usage Tracking ----

  getOrCreateUsage(sessionToken: string, walletAddress?: string): StoredUsage {
    // Try by wallet first, then session token
    let row: UsageRow | undefined;

    if (walletAddress) {
      row = this.db.prepare('SELECT * FROM usage WHERE wallet_address = ?').get(walletAddress) as UsageRow | undefined;
    }
    if (!row) {
      row = this.db.prepare('SELECT * FROM usage WHERE session_token = ?').get(sessionToken) as UsageRow | undefined;
    }

    if (row) {
      // Update wallet address if newly connected
      if (walletAddress && !row.wallet_address) {
        this.db.prepare('UPDATE usage SET wallet_address = ? WHERE id = ?').run(walletAddress, row.id);
        row.wallet_address = walletAddress;
      }
      return this.mapUsage(row);
    }

    // Create new usage record
    const id = nanoid();
    const now = Date.now();
    this.db.prepare(`
      INSERT INTO usage (id, wallet_address, session_token, chat_count, created_at)
      VALUES (?, ?, ?, 0, ?)
    `).run(id, walletAddress ?? null, sessionToken, now);

    return { id, walletAddress, sessionToken, chatCount: 0, createdAt: now };
  }

  incrementChatCount(usageId: string): number {
    const now = Date.now();
    this.db.prepare('UPDATE usage SET chat_count = chat_count + 1, last_chat_at = ? WHERE id = ?').run(now, usageId);
    const row = this.db.prepare('SELECT chat_count FROM usage WHERE id = ?').get(usageId) as { chat_count: number } | undefined;
    return row?.chat_count ?? 0;
  }

  private mapUsage(row: UsageRow): StoredUsage {
    return {
      id: row.id,
      walletAddress: row.wallet_address ?? undefined,
      sessionToken: row.session_token,
      chatCount: row.chat_count,
      lastChatAt: row.last_chat_at ?? undefined,
      createdAt: row.created_at,
    };
  }

  // ---- Invocation Costs ----

  saveInvocationCost(cost: Omit<StoredInvocationCost, 'id' | 'createdAt'> & { id?: string; createdAt?: number }): StoredInvocationCost {
    const full: StoredInvocationCost = {
      ...cost,
      id: cost.id ?? nanoid(),
      createdAt: cost.createdAt ?? Date.now(),
    };

    this.db.prepare(`
      INSERT INTO invocation_costs (id, session_id, agent_id, model, input_tokens, output_tokens, api_cost, user_charge, mode, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      full.id, full.sessionId ?? null, full.agentId, full.model,
      full.inputTokens, full.outputTokens, full.apiCost, full.userCharge,
      full.mode, full.createdAt,
    );

    return full;
  }

  getCostSummary(options: { sessionId?: string; agentId?: string } = {}): { totalApiCost: number; totalUserCharge: number; count: number } {
    let query = 'SELECT COALESCE(SUM(api_cost), 0) as total_api, COALESCE(SUM(user_charge), 0) as total_user, COUNT(*) as count FROM invocation_costs WHERE 1=1';
    const params: unknown[] = [];

    if (options.sessionId) {
      query += ' AND session_id = ?';
      params.push(options.sessionId);
    }
    if (options.agentId) {
      query += ' AND agent_id = ?';
      params.push(options.agentId);
    }

    const row = this.db.prepare(query).get(...params) as { total_api: number; total_user: number; count: number };
    return { totalApiCost: row.total_api, totalUserCharge: row.total_user, count: row.count };
  }

  // ---- Lifecycle ----

  close(): void {
    this.db.close();
  }
}

// Singleton instance
let projectStoreInstance: ProjectStore | null = null;

export function getProjectStore(dbPath?: string): ProjectStore {
  if (!projectStoreInstance) {
    projectStoreInstance = new ProjectStore(dbPath);
  }
  return projectStoreInstance;
}
