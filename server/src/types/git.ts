/**
 * Git operation types
 */

export type GitStatusChar = 'M' | 'A' | 'D' | 'R' | '??' | '!!';

export interface GitStatusResult {
  success: boolean;
  results: GitStatusEntry[];
  output: string;
  error?: string;
}

export interface GitStatusEntry {
  type: 'file' | 'rename' | 'branch' | 'error';
  status?: string;
  path?: string;
  oldPath?: string;
  newPath?: string;
  name?: string;
  error?: string;
}

export interface GitLogEntry {
  hash: string;
  author: string;
  date: string;
  message: string;
}

export interface GitLogResult {
  success: boolean;
  results: GitLogEntry[];
  output: string;
  error?: string;
}

export interface GitDiffResult {
  success: boolean;
  diff: string;
  output: string;
  error?: string;
}

export interface GitCommit {
  hash: string;
  author: string;
  date: string;
  message: string;
  files: string[];
}

export {};
