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
