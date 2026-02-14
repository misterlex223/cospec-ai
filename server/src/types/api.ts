/**
 * API request/response types
 */

import type {
  FileEntry,
  AgentType,
  GitStatusResult,
} from './index.js';

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string | ApiErrorDetail;
  timestamp: string;
}

export interface ApiErrorDetail {
  message: string;
  code?: string;
  details?: unknown;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface FileListResponse extends PaginatedResponse<FileEntry> {}

export interface AgentListResponse {
  agents: AgentType[];
  total: number;
}

export interface ProfileListResponse {
  profiles: string[];
  active?: string;
}

export interface GitStatusResponse {
  branch: string;
  status: GitStatusResult;
}

export {};
