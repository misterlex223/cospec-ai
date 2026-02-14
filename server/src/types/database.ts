/**
 * Database type definitions
 */

export interface DatabaseConfig {
  path: string;
  readonly?: boolean;
}

export interface SqliteResult {
  changes: number;
  lastID: number;
}

export interface AgentRecord {
  id: number;
  agentType: string;
  targetFiles: string[];
  status: 'running' | 'success' | 'failed';
  startTime: string;
  endTime?: string;
  duration?: number;
  summary?: string;
  outputFile?: string;
  error?: string;
  retryCount: number;
  customPrompt?: string;
  createdAt: string;
}

export interface AgentExecution {
  id: number;
  agentType: string;
  targetFiles: string[];
  status: 'running' | 'success' | 'failed';
  startTime: string;
  endTime?: string;
  duration?: number;
  summary?: string;
  outputFile?: string;
  error?: string;
  retryCount: number;
  customPrompt?: string;
  createdAt: string;
}

export interface ConversationRecord {
  id: number;
  userId: string;
  agentType: string;
  title: string;
  status: 'active' | 'archived';
  messages: string;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessageRecord {
  id: number;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export {};
