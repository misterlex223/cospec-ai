/**
 * Database client for Agent operations
 */

import type { Database, RunResult } from 'sqlite3';
import { openDb } from './sqlite3.js';

// Table names
const AGENTS_TABLE = 'agents';
const EXECUTIONS_TABLE = 'executions';
const CONVERSATIONS_TABLE = 'conversations';

// SQL schemas
const CREATE_AGENT_TABLE = `
  CREATE TABLE IF NOT EXISTS ${AGENTS_TABLE} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_type TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    capabilities TEXT
  );
`;

const CREATE_CONVERSATION_TABLE = `
  CREATE TABLE IF NOT EXISTS ${CONVERSATIONS_TABLE} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    agent_type TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    messages TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`;

const CREATE_EXECUTION_TABLE = `
  CREATE TABLE IF NOT EXISTS ${EXECUTIONS_TABLE} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_type TEXT NOT NULL,
    target_files TEXT,
    status TEXT DEFAULT 'running',
    start_time TEXT DEFAULT CURRENT_TIMESTAMP,
    end_time TEXT,
    duration INTEGER,
    summary TEXT,
    output_file TEXT,
    error TEXT,
    retry_count INTEGER DEFAULT 0,
    custom_prompt TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`;

// Types
export interface DatabaseConfig {
  path: string;
  readonly?: boolean;
}

export interface AgentRecord {
  id: number;
  agentType: string;
  targetFiles: string[];
  status: 'running' | 'success' | 'failed';
  startTime: string;
  endTime: string | undefined;
  duration: number | undefined;
  summary: string | undefined;
  outputFile: string | undefined;
  error: string | undefined;
  retryCount: number;
  customPrompt: string | undefined;
  createdAt: string;
}

export interface AgentExecution {
  id: number;
  agentType: string;
  targetFiles: string[];
  status: 'running' | 'success' | 'failed';
  startTime: string;
  endTime: string | undefined;
  duration: number | undefined;
  summary: string | undefined;
  outputFile: string | undefined;
  error: string | undefined;
  retryCount: number;
  customPrompt: string | undefined;
  createdAt: string;
}

export class DatabaseError extends Error {
  constructor(message: string, public sql?: string) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export class AgentDB {
  private db: Database;

  constructor(config: DatabaseConfig) {
    this.db = openDb(config.path, config.readonly ? 'readonly' : 'readwrite');
    this.initialize();
  }

  private initialize(): void {
    this.db.exec(CREATE_AGENT_TABLE);
    this.db.exec(CREATE_CONVERSATION_TABLE);
    this.db.exec(CREATE_EXECUTION_TABLE);
  }

  /**
   * Get all agent types
   */
  getAllAgentTypes(): AgentRecord[] {
    const result = this.db.all(`SELECT * FROM ${AGENTS_TABLE}`);
    return result as unknown as AgentRecord[];
  }

  /**
   * Create a new agent execution record
   */
  createExecution(agentType: string, targetFiles: string[], customPrompt?: string): number {
    const startTime = new Date().toISOString();

    const stmt = this.db.prepare(
      `INSERT INTO ${EXECUTIONS_TABLE} (agent_type, target_files, status, start_time, custom_prompt) VALUES (?, ?, ?, ?, ?)`
    );

    const result = stmt.run(agentType, JSON.stringify(targetFiles), 'running', startTime, customPrompt || null) as RunResult;
    stmt.finalize();

    return result.lastID;
  }

  /**
   * Update execution status
   */
  updateStatus(id: number, status: 'success' | 'failed', summary?: string): void {
    const endTime = new Date().toISOString();

    const startTimeRow = this.db.get(
      `SELECT start_time FROM ${EXECUTIONS_TABLE} WHERE id = ?`,
      id
    ) as unknown as { start_time: string } | undefined;

    let duration: number | undefined;
    if (startTimeRow) {
      const start = new Date(startTimeRow.start_time).getTime();
      duration = Date.now() - start;
    }

    this.db.run(
      `UPDATE ${EXECUTIONS_TABLE} SET status = ?, end_time = ?, duration = ?, summary = ? WHERE id = ?`,
      status,
      endTime,
      duration || null,
      summary || null,
      id
    );
  }

  /**
   * Get execution by ID
   */
  getExecutionById(id: number): AgentExecution | null {
    const row = this.db.get(
      `SELECT * FROM ${EXECUTIONS_TABLE} WHERE id = ?`,
      id
    ) as unknown as Record<string, unknown> | undefined;

    if (!row) return null;

    return {
      id: row.id as number,
      agentType: row.agent_type as string,
      targetFiles: row.target_files ? JSON.parse(row.target_files as string) : [],
      status: row.status as 'running' | 'success' | 'failed',
      startTime: row.start_time as string,
      endTime: row.end_time === undefined ? undefined : row.end_time as string | undefined,
      duration: row.duration === undefined ? undefined : parseInt(row.duration as string),
      summary: row.summary === undefined ? undefined : row.summary as string | undefined,
      outputFile: row.output_file === undefined ? undefined : row.output_file as string | undefined,
      error: row.error === undefined ? undefined : row.error as string | undefined,
      retryCount: row.retry_count as number,
      customPrompt: row.custom_prompt === undefined ? undefined : row.custom_prompt as string | undefined,
      createdAt: row.created_at as string,
    };
  }

  /**
   * Close database connection
   */
  close(): void {
    this.db.close();
  }
}

export {};
