/**
 * Agent-related type definitions
 */

export type AgentType = 'prd-analyzer' | 'code-reviewer' | 'doc-generator' | 'version-advisor';

export interface AgentExecution {
  id: string;
  agentType: AgentType;
  targetFiles: string[];
  status: 'pending' | 'running' | 'success' | 'failed';
  summary: string;
  outputFilePath: string | null;
  startTime: string;
  endTime?: string;
  duration?: number;
  error?: string;
  retryCount: number;
  customPrompt?: string;
}

export interface AgentStats {
  totalExecutions: number;
  successCount: number;
  failedCount: number;
  successRate: number;
  avgDuration: number;
  byType: Record<string, number>;
}

export interface AgentState {
  executions: AgentExecution[];
  currentExecution: AgentExecution | null;
  stats: AgentStats | null;
  isPanelOpen: boolean;
  filter: {
    agentType?: string;
    status?: string;
    dateRange?: { start: string; end: string };
    searchQuery?: string;
  };
  isLoading: boolean;
  errorMessage: string | null;
}
