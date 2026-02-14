/**
 * Agent Service - manages AI agent operations
 */

import type { Database } from 'sqlite3';

// Types
export interface AgentServiceConfig {
  db: Database;
}

export interface AgentOptions {
  agentType: string;
  targetFiles: string[];
  customPrompt?: string;
  userId?: string;
}

export interface AgentRecord {
  id: number;
  agentType: string;
  name: string;
  description: string;
  icon: string | undefined;
  capabilities: string[];
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

export class AgentService {
  private db: Database;

  constructor(config: AgentServiceConfig) {
    this.db = config.db;
  }

  /**
   * Get all available agent types
   */
  getAgentTypes(): AgentRecord[] {
    const rows = this.db.all('SELECT * FROM agents') as unknown as Record<string, unknown>[];
    return rows.map(row => ({
      id: row.id as number,
      agentType: row.agent_type as string,
      name: row.name as string,
      description: row.description as string,
      icon: row.icon === undefined ? undefined : row.icon as string | undefined,
      capabilities: row.capabilities ? JSON.parse(row.capabilities as string) : [],
    }));
  }

  /**
   * Get agent type by ID
   */
  getAgentType(id: string): AgentRecord | null {
    const row = this.db.get(
      'SELECT * FROM agents WHERE id = ?',
      [id]
    ) as unknown as Record<string, unknown> | undefined;

    if (!row) return null;

    return {
      id: row.id as number,
      agentType: row.agent_type as string,
      name: row.name as string,
      description: row.description as string,
      icon: row.icon === undefined ? undefined : row.icon as string | undefined,
      capabilities: row.capabilities ? JSON.parse(row.capabilities as string) : [],
    };
  }

  /**
   * Create a new agent execution
   */
  createExecution(options: AgentOptions): number {
    const startTime = new Date().toISOString();
    const targetFilesJson = JSON.stringify(options.targetFiles);

    const result = this.db.run(
      'INSERT INTO executions (agent_type, target_files, status, start_time, custom_prompt) VALUES (?, ?, ?, ?, ?)',
      [options.agentType, targetFilesJson, 'running', startTime, options.customPrompt ?? null]
    ) as unknown as { lastID: number };

    return result.lastID;
  }

  /**
   * Update execution status
   */
  updateExecutionStatus(
    id: number,
    status: 'success' | 'failed',
    summary?: string,
    outputFile?: string,
    error?: string
  ): void {
    const endTime = new Date().toISOString();

    const row = this.db.get(
      'SELECT start_time FROM executions WHERE id = ?',
      [id]
    ) as unknown as { start_time: string } | undefined;

    let duration: number | undefined;
    if (row) {
      const start = new Date(row.start_time).getTime();
      duration = Date.now() - start;
    }

    this.db.run(
      'UPDATE executions SET status = ?, end_time = ?, duration = ?, summary = ?, output_file = ?, error = ? WHERE id = ?',
      [status, endTime, duration ?? null, summary ?? null, outputFile ?? null, error ?? null, id]
    );
  }

  /**
   * Get execution by ID
   */
  getExecution(id: number): AgentExecution | null {
    const row = this.db.get(
      'SELECT * FROM executions WHERE id = ?',
      [id]
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
   * Get executions by status
   */
  getExecutionsByStatus(status: 'running' | 'success' | 'failed'): AgentExecution[] {
    const rows = this.db.all(
      'SELECT * FROM executions WHERE status = ? ORDER BY start_time DESC',
      [status]
    ) as unknown as Record<string, unknown>[];

    return rows.map(row => ({
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
    }));
  }

  /**
   * Get executions by agent type
   */
  getExecutionsByAgentType(agentType: string): AgentExecution[] {
    const rows = this.db.all(
      'SELECT * FROM executions WHERE agent_type = ? ORDER BY start_time DESC',
      [agentType]
    ) as unknown as Record<string, unknown>[];

    return rows.map(row => ({
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
    }));
  }

  /**
   * Increment retry count for an execution
   */
  incrementRetryCount(id: number): void {
    this.db.run(
      'UPDATE executions SET retry_count = retry_count + 1 WHERE id = ?',
      [id]
    );
  }

  /**
   * Delete execution by ID
   */
  deleteExecution(id: number): void {
    this.db.run('DELETE FROM executions WHERE id = ?', [id]);
  }
}

export {};
