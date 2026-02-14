/**
 * Service layer exports
 */

export { AgentDB, DatabaseError, type DatabaseConfig } from './database/client.js';
export { openDb } from './database/sqlite3.js';
export { AgentService } from './agent/index.js';
export type { AgentServiceConfig, AgentOptions } from './agent/index.js';

// Logger
export type { LoggerConfig } from './logger/index.js';
export type { LogEntry } from './logger/index.js';

// File services
export type { FileSyncOptions, SyncStatus, FileChangeEvent } from './file-sync/index.js';
export type { CacheEntry, CacheOptions } from './file-cache/index.js';

// Git services
export type { GitStatusEntry, GitDiffResult, GitLogEntry, GitStatusResult, GitServiceConfig } from './git/index.js';

export {};
