/**
 * SQLite3 database wrapper
 */

import type { Database } from 'sqlite3';

export function openDb(path: string, mode: string = 'readwrite'): Database {
  const sqlite3 = require('sqlite3');
  return new sqlite3.Database(path, mode);
}

export {};
