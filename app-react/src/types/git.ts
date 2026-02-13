/**
 * Git Type Definitions
 *
 * TypeScript types for Git operations and state management
 */

export type GitFileStatus = 'A' | 'M' | 'D' | 'R' | '??' | '!!';

export interface GitStatusResult {
  success: boolean;
  results: GitFileChange[];
  output?: string;
  error?: string;
}

export interface GitFileChange {
  type: 'file' | 'rename';
  status: GitFileStatus;
  path: string;
  oldPath?: string;
}

export interface GitCommit {
  hash: string;
  author: string;
  date: string;
  message: string;
  files?: string[];
}

export interface GitBranch {
  name: string;
  isCurrent: boolean;
}

export interface GitDiffResult {
  success: boolean;
  hunks?: DiffHunk[];
  output?: string;
  error?: string;
}

export interface DiffHunk {
  oldStart: number;
  oldCount: number;
  newStart: number;
  newCount: number;
  lines: DiffLine[];
}

export interface DiffLine {
  type: 'added' | 'removed' | 'context' | 'header';
  content: string;
  oldNumber?: number;
  newNumber?: number;
}

export interface GitState {
  status: GitStatusResult | null;
  commits: GitCommit[];
  branches: GitBranch[];
  currentBranch: string | null;
  isLoading: boolean;
  errorMessage: string | null;
}

export interface GitOperation {
  type: 'status' | 'log' | 'diff' | 'stage' | 'commit' | 'checkout';
  status: 'pending' | 'success' | 'error';
  result?: any;
  error?: string;
}
