/**
 * WebSocket types
 */

export interface SocketData {
  type: string;
  payload: unknown;
}

export interface AgentProgressUpdate {
  executionId: string;
  agentType: string;
  status: 'running' | 'success' | 'failed';
  progress: number;
  message?: string;
  timestamp: string;
}

export interface FileChangeUpdate {
  path: string;
  type: 'created' | 'modified' | 'deleted';
  timestamp: string;
}

export interface ServerNotification {
  type: 'info' | 'warning' | 'error';
  message: string;
  timestamp: string;
}

export interface SocketEventData {
  event: string;
  data: SocketData;
}

export {};
