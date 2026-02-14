/**
 * File system types
 */

export interface FileEntry {
  path: string;
  name: string;
  exists?: boolean;
  size?: number;
  modified?: string;
}

export interface FileContent {
  path: string;
  content: string;
  encoding?: string;
}

export interface FileSyncStatus {
  status: 'synced' | 'not-synced' | 'auto-eligible' | 'error';
  memoryId?: string;
  lastSync?: string;
  error?: string;
}

export interface FileWatcherEvent {
  type: 'add' | 'change' | 'unlink';
  path: string;
  timestamp: number;
}

export interface FileCacheEntry {
  path: string;
  name: string;
  lastModified: Date;
  size?: number;
}

export interface FileWriteOptions {
  encoding?: BufferEncoding;
  mode?: number;
  flag?: string;
}

export {};
