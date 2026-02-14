/**
 * Service layer types
 */

export interface ServiceOptions {
  debug?: boolean;
  timeout?: number;
}

export interface CacheOptions {
  maxSize: number;
  ttl: number;
}

export interface WatcherOptions {
  debounceMs: number;
  ignorePatterns: string[];
}

export interface SyncOptions {
  autoSync: boolean;
  debounceMs: number;
  conflictResolution: 'local' | 'remote' | 'manual';
}

export {};
