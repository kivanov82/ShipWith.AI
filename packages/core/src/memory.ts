// Memory management for global and per-project context
import * as fs from 'fs';
import * as path from 'path';
import type { MemoryEntry, AgentId } from './types';
import { nanoid } from 'nanoid';

const MEMORY_DIR = path.join(process.cwd(), 'memory');

export class MemoryManager {
  private globalDir: string;
  private projectsDir: string;

  constructor(baseDir: string = MEMORY_DIR) {
    this.globalDir = path.join(baseDir, 'global');
    this.projectsDir = path.join(baseDir, 'projects');
    this.ensureDirectories();
  }

  private ensureDirectories(): void {
    if (!fs.existsSync(this.globalDir)) {
      fs.mkdirSync(this.globalDir, { recursive: true });
    }
    if (!fs.existsSync(this.projectsDir)) {
      fs.mkdirSync(this.projectsDir, { recursive: true });
    }
  }

  private getProjectDir(projectId: string): string {
    const dir = path.join(this.projectsDir, projectId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  // Global memory operations
  readGlobal(filename: string): string | null {
    const filepath = path.join(this.globalDir, filename);
    if (fs.existsSync(filepath)) {
      return fs.readFileSync(filepath, 'utf-8');
    }
    return null;
  }

  writeGlobal(filename: string, content: string): void {
    const filepath = path.join(this.globalDir, filename);
    fs.writeFileSync(filepath, content, 'utf-8');
  }

  appendGlobal(filename: string, content: string): void {
    const filepath = path.join(this.globalDir, filename);
    fs.appendFileSync(filepath, `\n${content}`, 'utf-8');
  }

  // Project memory operations
  readProject(projectId: string, filename: string): string | null {
    const filepath = path.join(this.getProjectDir(projectId), filename);
    if (fs.existsSync(filepath)) {
      return fs.readFileSync(filepath, 'utf-8');
    }
    return null;
  }

  writeProject(projectId: string, filename: string, content: string): void {
    const filepath = path.join(this.getProjectDir(projectId), filename);
    fs.writeFileSync(filepath, content, 'utf-8');
  }

  appendProject(projectId: string, filename: string, content: string): void {
    const filepath = path.join(this.getProjectDir(projectId), filename);
    fs.appendFileSync(filepath, `\n${content}`, 'utf-8');
  }

  // Structured memory entries
  addEntry(entry: Omit<MemoryEntry, 'id' | 'createdAt'>): MemoryEntry {
    const fullEntry: MemoryEntry = {
      ...entry,
      id: nanoid(),
      createdAt: Date.now(),
    };

    const filename = `${entry.category}.jsonl`;
    const line = JSON.stringify(fullEntry);

    if (entry.scope === 'global') {
      this.appendGlobal(filename, line);
    } else if (entry.projectId) {
      this.appendProject(entry.projectId, filename, line);
    }

    return fullEntry;
  }

  getEntries(options: {
    scope: 'global' | 'project';
    projectId?: string;
    category?: MemoryEntry['category'];
  }): MemoryEntry[] {
    const entries: MemoryEntry[] = [];
    const categories: MemoryEntry['category'][] = options.category
      ? [options.category]
      : ['decision', 'learning', 'context', 'artifact'];

    for (const category of categories) {
      const filename = `${category}.jsonl`;
      let content: string | null = null;

      if (options.scope === 'global') {
        content = this.readGlobal(filename);
      } else if (options.projectId) {
        content = this.readProject(options.projectId, filename);
      }

      if (content) {
        const lines = content.split('\n').filter(Boolean);
        for (const line of lines) {
          try {
            entries.push(JSON.parse(line));
          } catch {
            // Skip invalid lines
          }
        }
      }
    }

    return entries.sort((a, b) => b.createdAt - a.createdAt);
  }

  // Context builder for agent invocation
  buildContext(projectId?: string): string {
    const parts: string[] = [];

    // Global context
    const globalContext = this.readGlobal('context.md');
    if (globalContext) {
      parts.push('## Global Context\n' + globalContext);
    }

    const bestPractices = this.readGlobal('best-practices.md');
    if (bestPractices) {
      parts.push('## Best Practices\n' + bestPractices);
    }

    // Project-specific context
    if (projectId) {
      const projectContext = this.readProject(projectId, 'context.md');
      if (projectContext) {
        parts.push(`## Project Context\n${projectContext}`);
      }

      const decisions = this.readProject(projectId, 'decisions.md');
      if (decisions) {
        parts.push(`## Decisions Made\n${decisions}`);
      }
    }

    return parts.join('\n\n---\n\n');
  }

  // Record a decision
  recordDecision(
    projectId: string | undefined,
    decision: string,
    rationale: string,
    madeBy: AgentId | 'user'
  ): void {
    const timestamp = new Date().toISOString();
    const entry = `### ${timestamp}\n**Decision:** ${decision}\n**Rationale:** ${rationale}\n**Made by:** ${madeBy}\n`;

    if (projectId) {
      this.appendProject(projectId, 'decisions.md', entry);
    } else {
      this.appendGlobal('decisions.md', entry);
    }
  }

  // Record a learning
  recordLearning(learning: string, source: AgentId): void {
    const timestamp = new Date().toISOString();
    const entry = `- [${timestamp}] (${source}): ${learning}`;
    this.appendGlobal('learnings.md', entry);
  }
}

// Singleton instance
let memoryInstance: MemoryManager | null = null;

export function getMemory(baseDir?: string): MemoryManager {
  if (!memoryInstance) {
    memoryInstance = new MemoryManager(baseDir);
  }
  return memoryInstance;
}
