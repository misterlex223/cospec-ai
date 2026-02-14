/**
 * Database query builders (legacy - consider removing)
 */

export interface AgentQueryOptions {
  limit?: number;
  offset?: number;
  agentType?: string;
  status?: string;
  orderBy?: 'createdAt' | 'startTime' | 'duration';
}

export interface ConversationQueryOptions {
  limit?: number;
  offset?: number;
  userId?: string;
  status?: string;
  orderBy?: 'createdAt' | 'updatedAt';
}

export {};
