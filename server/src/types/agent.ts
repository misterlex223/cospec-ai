/**
 * Agent type definitions
 */

export interface AgentType {
  id: string;
  name: string;
  description: string;
  icon: string;
  capabilities: string[];
}

export interface AgentExecution {
  id: string;
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

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface Conversation {
  id: string;
  userId: string;
  agentType: string;
  title: string;
  status: 'active' | 'archived';
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

export interface SuggestionTemplate {
  id: string;
  text: string;
  prompt: string;
}

export {};
