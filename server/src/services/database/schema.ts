/**
 * SQL Schema constants
 */

export const AGENTS_TABLE = 'agents';
export const CONVERSATIONS_TABLE = 'conversations';
export const EXECUTIONS_TABLE = 'executions';

// Agent table schema
export const CREATE_AGENT_TABLE = `
  CREATE TABLE IF NOT EXISTS ${AGENTS_TABLE} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_type TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    capabilities TEXT
  );
`;

// Conversations table schema
export const CREATE_CONVERSATION_TABLE = `
  CREATE TABLE IF NOT EXISTS ${CONVERSATIONS_TABLE} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT NOT NULL,
    agent_type TEXT NOT NULL,
    title TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    messages TEXT,  -- JSON array of message objects
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`;

// Executions table schema
export const CREATE_EXECUTION_TABLE = `
  CREATE TABLE IF NOT EXISTS ${EXECUTIONS_TABLE} (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent_type TEXT NOT NULL,
    target_files TEXT,       -- JSON array
    status TEXT DEFAULT 'running',
    start_time TEXT DEFAULT CURRENT_TIMESTAMP,
    end_time TEXT,
    duration INTEGER,
    summary TEXT,
    output_file TEXT,
    error TEXT,
    retry_count INTEGER DEFAULT 0,
    custom_prompt TEXT,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`;

// Indexes
export const IDX_EXECUTIONS_AGENT_TYPE = 'idx_executions_agent_type';
export const IDX_EXECUTIONS_STATUS = 'idx_executions_status';
export const IDX_EXECUTIONS_START_TIME = 'idx_executions_start_time';
export const IDX_CONVERSATIONS_USER_ID = 'idx_conversations_user_id';
export const IDX_CONVERSATIONS_STATUS = 'idx_conversations_status';
export const IDX_CONVERSATIONS_CREATED_AT = 'idx_conversations_created_at';

export {};
