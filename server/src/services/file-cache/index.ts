/**
 * File cache service - in-memory caching
 */

export interface CacheEntry<T> {
  value: T;
  timestamp: number;
  ttl: number;
}

export interface CacheOptions {
  maxSize: number;
  defaultTTL: number;
}

export class FileCache {
  private cache: Map<string, CacheEntry<unknown>>;
  private options: CacheOptions;
  private keys: string[] = [];

  constructor(options: CacheOptions) {
    this.options = options;
    this.cache = new Map();
  }

  /**
   * Get cached value
   */
  get<T>(_key: string): T | undefined {
    const entry = this.cache.get(_key) as CacheEntry<T> | undefined;
    if (!entry) return undefined;

    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(_key);
      return undefined;
    }

    return entry.value;
  }

  /**
   * Set cached value
   */
  set<T>(_key: string, value: T, ttl?: number): void {
    const entry: CacheEntry<T> = {
      value,
      timestamp: Date.now(),
      ttl: ttl ?? this.options.defaultTTL,
    };

    this.cache.set(_key, entry);
    this.keys.push(_key);

    // Enforce max size
    if (this.cache.size > this.options.maxSize) {
      const oldestKey = this.keys.shift();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }
  }

  /**
   * Check if key exists
   */
  has(_key: string): boolean {
    return this.cache.has(_key);
  }

  /**
   * Delete cached value
   */
  delete(_key: string): boolean {
    return this.cache.delete(_key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
    this.keys = [];
  }

  /**
   * Get cache statistics
   */
  getStats(): { size: number; keys: number } {
    return {
      size: this.cache.size,
      keys: this.keys.length,
    };
  }
}

export {};
