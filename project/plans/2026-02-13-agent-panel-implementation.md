# Agent Panel 實作計畫

> **For Claude:** REQUIRED SUB-SKILL: Use @superpowers:executing-plans or @superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** 為 CoSpec AI 新增 AI Agent Panel 功能，讓用戶可以在編輯器中呼叫 Agent 執行任務，並在獨立工作台管理執行歷史。

**Architecture:** Router-based 架構，Agent 功能完全獨立於編輯器。後端執行 Agent，透過 WebSocket 推送進度。SQLite 儲存元資料，檔案系統儲存完整輸出。

**Tech Stack:** React 19, Redux Toolkit, Node.js/Express, Socket.IO, SQLite, Agent SDK, Tailwind CSS

---

## Phase 1: 後端基礎設施

### Task 1: 建立 Agent 執行服務骨架

**Files:**
- Create: `server/agentService.js`
- Test: `server/__tests__/agentService.test.js`

**Step 1: Write failing test**

```javascript
// server/__tests__/agentService.test.js
describe('AgentService', () => {
  test('should initialize with Socket.IO instance', () => {
    const mockIo = { emit: jest.fn() };
    const service = new AgentService(mockIo);
    expect(service.io).toBe(mockIo);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd server && npm test`

**Step 3: Write minimal implementation**

```javascript
// server/agentService.js
class AgentService {
  constructor(io, db = null) {
    this.io = io;
    this.db = db;
    this.allowedDirs = [
      process.env.MARKDOWN_DIR || './markdown',
      './specs',
      './docs'
    ];
  }
}

module.exports = AgentService;
```

**Step 4: Run test to verify it passes**

Run: `cd server && npm test`

**Step 5: Commit**

```bash
git add server/agentService.js server/__tests__/agentService.test.js
git commit -m "feat: add AgentService skeleton"
```

---

### Task 2: 建立 SQLite 資料庫層

**Files:**
- Create: `server/agentDb.js`
- Create: `server/__tests__/agentDb.test.js`

**Step 1: Write failing test**

```javascript
// server/__tests__/agentDb.test.js
describe('AgentDB', () => {
  test('should create executions table on initialization', async () => {
    const db = new AgentDB(':memory:');
    await db.initialize();

    const tables = await db.getTables();
    expect(tables).toContain('agent_executions');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd server && npm test`

**Step 3: Write minimal implementation**

```javascript
// server/agentDb.js
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class AgentDB {
  constructor(dbPath = './agent-history.db') {
    this.dbPath = dbPath;
    this.db = null;
  }

  async initialize() {
    return new Promise((resolve, reject) => {
      this.db = new sqlite3.Database(this.dbPath, (err) => {
        if (err) reject(err);
        else resolve(this.createTables());
      });
    });
  }

  async createTables() {
    const sql = `
      CREATE TABLE IF NOT EXISTS agent_executions (
        id TEXT PRIMARY KEY,
        agent_type TEXT NOT NULL,
        target_files TEXT NOT NULL,
        status TEXT NOT NULL,
        summary TEXT,
        output_file_path TEXT,
        start_time TEXT NOT NULL,
        end_time TEXT,
        duration INTEGER,
        error TEXT,
        retry_count INTEGER DEFAULT 0,
        custom_prompt TEXT,
        created_at TEXT DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_agent_type ON agent_executions(agent_type);
      CREATE INDEX IF NOT EXISTS idx_status ON agent_executions(status);
      CREATE INDEX IF NOT EXISTS idx_start_time ON agent_executions(start_time);
    `;

    return new Promise((resolve, reject) => {
      this.db.exec(sql, (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }

  async insert(execution) {
    return new Promise((resolve, reject) => {
      const sql = `
        INSERT INTO agent_executions
        (id, agent_type, target_files, status, start_time, retry_count, custom_prompt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `;
      this.db.run(sql, [
        execution.id,
        execution.agentType,
        JSON.stringify(execution.targetFiles),
        execution.status,
        execution.startTime,
        execution.retryCount || 0,
        execution.customPrompt || null
      ], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  async findById(id) {
    return new Promise((resolve, reject) => {
      this.db.get(
        'SELECT * FROM agent_executions WHERE id = ?',
        [id],
        (err, row) => {
          if (err) reject(err);
          else resolve(row ? { ...row, targetFiles: JSON.parse(row.target_files) } : null);
        }
      );
    });
  }

  async findAll(options = {}) {
    const { limit = 50, offset = 0, agentType, status } = options;
    let sql = 'SELECT * FROM agent_executions';
    const params = [];

    const conditions = [];
    if (agentType) {
      conditions.push('agent_type = ?');
      params.push(agentType);
    }
    if (status) {
      conditions.push('status = ?');
      params.push(status);
    }

    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }

    sql += ' ORDER BY start_time DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) reject(err);
        else resolve(rows.map(row => ({ ...row, targetFiles: JSON.parse(row.target_files) })));
      });
    });
  }

  async getStats() {
    return new Promise((resolve, reject) => {
      const sql = `
        SELECT
          COUNT(*) as totalExecutions,
          SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successCount,
          SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failedCount,
          AVG(duration) as avgDuration,
          agent_type
        FROM agent_executions
        GROUP BY agent_type
      `;

      this.db.all(sql, [], (err, rows) => {
        if (err) reject(err);
        else {
          const stats = {
            totalExecutions: 0,
            successCount: 0,
            failedCount: 0,
            avgDuration: 0,
            byType: {}
          };

          rows.forEach(row => {
            stats.totalExecutions += row.totalExecutions;
            stats.successCount += row.successCount;
            stats.failedCount += row.failedCount;
            stats.byType[row.agent_type] = row.totalExecutions;
          });

          stats.successRate = stats.totalExecutions > 0
            ? stats.successCount / stats.totalExecutions
            : 0;

          resolve(stats);
        }
      });
    });
  }
}

module.exports = AgentDB;
```

**Step 4: Run test to verify it passes**

Run: `cd server && npm test`

**Step 5: Commit**

```bash
git add server/agentDb.js server/__tests__/agentDb.test.js
git commit -m "feat: add SQLite database layer for agent history"
```

---

### Task 3: 實作 Agent 執行核心邏輯

**Files:**
- Modify: `server/agentService.js`
- Create: `server/.agent-output/.gitkeep`

**Step 1: Write failing test**

```javascript
// server/__tests__/agentService.test.js
describe('AgentService.executeAgent', () => {
  test('should execute PRD analyzer and return execution ID', async () => {
    const mockIo = { emit: jest.fn() };
    const mockDb = { insert: jest.fn().mockResolvedValue(1) };
    const service = new AgentService(mockIo, mockDb);

    const result = await service.executeAgent('prd-analyzer', ['PRD.md'], {});

    expect(result.executionId).toBeDefined();
    expect(result.status).toBe('running');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `cd server && npm test`

**Step 3: Write implementation**

```javascript
// server/agentService.js
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

class AgentService {
  constructor(io, db = null) {
    this.io = io;
    this.db = db;
    this.allowedDirs = [
      process.env.MARKDOWN_DIR || path.join(__dirname, '..', 'markdown'),
      './specs',
      './docs'
    ];
    this.activeExecutions = new Map();
  }

  async executeAgent(agentType, targetFiles, options = {}) {
    // 1. Validate file paths
    const validatedPaths = this.validateFilePaths(targetFiles);
    if (validatedPaths.length === 0) {
      throw new Error('No valid files provided or files not in allowed directories');
    }

    // 2. Generate execution ID
    const executionId = uuidv4();

    // 3. Create execution record
    const execution = {
      id: executionId,
      agentType,
      targetFiles: validatedPaths,
      status: 'running',
      startTime: new Date().toISOString(),
      retryCount: options.retryCount || 0,
      customPrompt: options.customPrompt
    };

    if (this.db) {
      await this.db.insert(execution);
    }

    // 4. Emit status update
    this.emitStatusUpdate(execution);

    // 5. Spawn agent process
    await this.spawnAgentProcess(execution, options);

    return { executionId, status: 'running' };
  }

  async spawnAgentProcess(execution, options) {
    const { id, agentType, targetFiles } = execution;

    // Ensure output directory exists
    const outputDir = path.join(process.env.MARKDOWN_DIR || './markdown', '.agent-output');
    await fs.mkdir(outputDir, { recursive: true });

    const outputFile = path.join(outputDir, `${id}.md`);

    // Build agent command
    const agentArgs = [
      path.join(__dirname, '..', 'agents', 'index.js'),
      '--use-subagent',
      agentType,
      '--files',
      targetFiles.join(','),
      '--output',
      outputFile
    ];

    if (execution.customPrompt) {
      agentArgs.push('--prompt', execution.customPrompt);
    }

    const agentProcess = spawn('node', agentArgs, {
      cwd: path.join(__dirname, '..'),
      env: { ...process.env }
    });

    this.activeExecutions.set(id, agentProcess);

    let output = '';
    let errorOutput = '';

    // Handle stdout
    agentProcess.stdout.on('data', (data) => {
      const chunk = data.toString();
      output += chunk;
      this.emitProgress(id, chunk);
    });

    // Handle stderr
    agentProcess.stderr.on('data', (data) => {
      errorOutput += data.toString();
    });

    // Handle process exit
    agentProcess.on('close', async (code) => {
      this.activeExecutions.delete(id);

      if (code === 0) {
        await this.handleSuccess(id, outputFile, output);
      } else {
        await this.handleFailure(id, errorOutput || 'Agent process failed', output);
      }
    });
  }

  async handleSuccess(executionId, outputFile, output) {
    const duration = Date.now() - new Date(this.activeExecutions.get(executionId)?.startTime).getTime();

    if (this.db) {
      await this.db.updateStatus(executionId, 'success', {
        outputFilePath: outputFile,
        summary: this.generateSummary(output),
        duration
      });
    }

    this.emitComplete(executionId, {
      status: 'success',
      outputFilePath: outputFile,
      summary: this.generateSummary(output)
    });
  }

  async handleFailure(executionId, error, output) {
    const execution = await this.db?.findById(executionId);

    if (execution && execution.retryCount < 3) {
      // Retry
      await this.retryExecution(executionId);
    } else {
      // Mark as failed
      if (this.db) {
        await this.db.updateStatus(executionId, 'failed', {
          error,
          duration: Date.now() - new Date(execution.startTime).getTime()
        });
      }

      this.emitError(executionId, {
        error,
        retryCount: execution?.retryCount || 0
      });
    }
  }

  async retryExecution(executionId) {
    const execution = await this.db.findById(executionId);
    execution.retryCount++;

    await this.db.update(execution);

    this.emitStatusUpdate({
      ...execution,
      status: 'retrying'
    });

    await this.executeAgent(execution.agentType, execution.targetFiles, {
      retryCount: execution.retryCount,
      customPrompt: execution.customPrompt
    });
  }

  validateFilePaths(filePaths) {
    return filePaths.filter(filePath => {
      const fullPath = path.resolve(process.env.MARKDOWN_DIR || './markdown', filePath);
      return this.allowedDirs.some(dir => {
        const resolvedDir = path.resolve(dir);
        return fullPath.startsWith(resolvedDir);
      });
    });
  }

  generateSummary(output) {
    // Extract first 200 chars as summary
    const text = output.replace(/[#*`\[\]]/g, '').trim();
    return text.substring(0, 200) + (text.length > 200 ? '...' : '');
  }

  // WebSocket emission helpers
  emitStatusUpdate(execution) {
    if (this.io) {
      this.io.emit('agent-status-update', {
        executionId: execution.id,
        status: execution.status,
        agentType: execution.agentType,
        startTime: execution.startTime
      });
    }
  }

  emitProgress(executionId, output) {
    if (this.io) {
      this.io.emit('agent-progress', {
        executionId,
        output,
        timestamp: new Date().toISOString()
      });
    }
  }

  emitComplete(executionId, result) {
    if (this.io) {
      this.io.emit('agent-complete', {
        executionId,
        ...result
      });
    }
  }

  emitError(executionId, error) {
    if (this.io) {
      this.io.emit('agent-error', {
        executionId,
        ...error
      });
    }
  }
}

module.exports = AgentService;
```

**Step 4: Run test to verify it passes**

Run: `cd server && npm test`

**Step 5: Create output directory and commit**

```bash
mkdir -p server/.agent-output
echo "" > server/.agent-output/.gitkeep

git add server/agentService.js server/.agent-output/.gitkeep
git commit -m "feat: implement agent execution core logic with retry mechanism"
```

---

### Task 4: 整合 AgentService 到 Express 伺服器

**Files:**
- Modify: `server/index.js`

**Step 1: Add agent service initialization**

```javascript
// server/index.js - Add after profileManager import
const AgentService = require('./agentService');
const AgentDB = require('./agentDb');

// Initialize Agent DB and Service
const agentDb = new AgentDB(path.join(__dirname, '..', 'agent-history.db'));
await agentDb.initialize().catch(err => {
  console.error('Failed to initialize agent database:', err);
});

const agentService = new AgentService(io, agentDb);
```

**Step 2: Add agent API routes**

```javascript
// server/index.js - Add after profile routes

// Agent execution endpoint
app.post('/api/agent/execute', authenticateToken, async (req, res) => {
  try {
    const { agentType, targetFiles, customPrompt, outputPath } = req.body;

    if (!agentType || !targetFiles || !Array.isArray(targetFiles)) {
      return res.status(400).json({
        error: 'Missing required fields: agentType, targetFiles'
      });
    }

    const validTypes = ['prd-analyzer', 'code-reviewer', 'doc-generator', 'version-advisor'];
    if (!validTypes.includes(agentType)) {
      return res.status(400).json({
        error: `Invalid agentType. Must be one of: ${validTypes.join(', ')}`
      });
    }

    const result = await agentService.executeAgent(agentType, targetFiles, {
      customPrompt,
      outputPath
    });

    res.json(result);
  } catch (error) {
    console.error('Agent execution error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Agent history endpoint
app.get('/api/agent/history', async (req, res) => {
  try {
    const { limit = 20, offset = 0, agentType, status } = req.query;

    const executions = await agentDb.findAll({
      limit: parseInt(limit),
      offset: parseInt(offset),
      agentType,
      status
    });

    const stats = await agentDb.getStats();

    res.json({
      executions,
      total: executions.length,
      stats
    });
  } catch (error) {
    console.error('Agent history error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Agent single execution endpoint
app.get('/api/agent/history/:id', async (req, res) => {
  try {
    const execution = await agentDb.findById(req.params.id);

    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    res.json(execution);
  } catch (error) {
    console.error('Agent fetch error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Agent delete endpoint
app.delete('/api/agent/history/:id', authenticateToken, async (req, res) => {
  try {
    await agentDb.delete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('Agent delete error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

**Step 3: Restart server to verify**

Run: `cd server && npm run dev`

Check logs for: "Agent DB initialized successfully"

**Step 4: Commit**

```bash
git add server/index.js
git commit -m "feat: integrate AgentService with API endpoints"
```

---

## Phase 2: 前端狀態管理

### Task 5: 建立 Agent Redux Slice

**Files:**
- Create: `app-react/src/store/slices/agentSlice.ts`
- Create: `app-react/src/types/agent.ts`

**Step 1: Create agent types**

```typescript
// app-react/src/types/agent.ts
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
```

**Step 2: Create agent slice**

```typescript
// app-react/src/store/slices/agentSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import type { AgentExecution, AgentStats, AgentState } from '../../types/agent';

const initialState: AgentState = {
  executions: [],
  currentExecution: null,
  stats: null,
  isPanelOpen: false,
  filter: {},
  isLoading: false,
  errorMessage: null,
};

// Async thunks
export const fetchAgentHistory = createAsyncThunk(
  'agent/fetchHistory',
  async (params: { limit?: number; offset?: number; agentType?: string; status?: string } = {}) => {
    const response = await axios.get('/api/agent/history', { params });
    return {
      executions: response.data.executions as AgentExecution[],
      stats: response.data.stats as AgentStats
    };
  }
);

export const fetchAgentExecution = createAsyncThunk(
  'agent/fetchExecution',
  async (id: string) => {
    const response = await axios.get(`/api/agent/history/${id}`);
    return response.data as AgentExecution;
  }
);

export const executeAgent = createAsyncThunk(
  'agent/execute',
  async (params: { agentType: string; targetFiles: string[]; customPrompt?: string }) => {
    const response = await axios.post('/api/agent/execute', params);
    return response.data; // { executionId, status }
  }
);

export const deleteAgentExecution = createAsyncThunk(
  'agent/deleteExecution',
  async (id: string) => {
    await axios.delete(`/api/agent/history/${id}`);
    return id;
  }
);

const agentSlice = createSlice({
  name: 'agent',
  initialState,
  reducers: {
    togglePanel: (state) => {
      state.isPanelOpen = !state.isPanelOpen;
    },
    openPanel: (state) => {
      state.isPanelOpen = true;
    },
    closePanel: (state) => {
      state.isPanelOpen = false;
    },
    setFilter: (state, action: PayloadAction<Partial<AgentState['filter']>>) => {
      state.filter = { ...state.filter, ...action.payload };
    },
    clearFilter: (state) => {
      state.filter = {};
    },
    addExecution: (state, action: PayloadAction<AgentExecution>) => {
      state.executions.unshift(action.payload);
      state.currentExecution = action.payload;
    },
    updateExecution: (state, action: PayloadAction<Partial<AgentExecution> & { id: string }>) => {
      const index = state.executions.findIndex(e => e.id === action.payload.id);
      if (index !== -1) {
        state.executions[index] = { ...state.executions[index], ...action.payload };
      }
      if (state.currentExecution?.id === action.payload.id) {
        state.currentExecution = { ...state.currentExecution, ...action.payload };
      }
    },
    setCurrentExecution: (state, action: PayloadAction<AgentExecution | null>) => {
      state.currentExecution = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch history
    builder
      .addCase(fetchAgentHistory.pending, (state) => {
        state.isLoading = true;
        state.errorMessage = null;
      })
      .addCase(fetchAgentHistory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.executions = action.payload.executions;
        state.stats = action.payload.stats;
      })
      .addCase(fetchAgentHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.errorMessage = action.error.message || 'Failed to fetch history';
      });

    // Execute agent
    builder
      .addCase(executeAgent.pending, (state) => {
        state.isLoading = true;
        state.errorMessage = null;
      })
      .addCase(executeAgent.fulfilled, (state, action) => {
        state.isLoading = false;
        // Execution will be added via WebSocket event
      })
      .addCase(executeAgent.rejected, (state, action) => {
        state.isLoading = false;
        state.errorMessage = action.error.message || 'Failed to execute agent';
      });

    // Delete execution
    builder
      .addCase(deleteAgentExecution.fulfilled, (state, action) => {
        state.executions = state.executions.filter(e => e.id !== action.payload);
      });
  },
});

export const {
  togglePanel,
  openPanel,
  closePanel,
  setFilter,
  clearFilter,
  addExecution,
  updateExecution,
  setCurrentExecution,
} = agentSlice.actions;

export default agentSlice.reducer;
```

**Step 3: Register slice in store**

```typescript
// app-react/src/store/index.ts
import agentReducer from './slices/agentSlice';

export const store = configureStore({
  reducer: {
    files: filesReducer,
    ui: uiReducer,
    editor: editorReducer,
    profile: profileReducer,
    agent: agentReducer,  // Add this
  },
});
```

**Step 4: Commit**

```bash
git add app-react/src/types/agent.ts app-react/src/store/slices/agentSlice.ts app-react/src/store/index.ts
git commit -m "feat: add agent Redux slice with async thunks"
```

---

### Task 6: 建立 WebSocket 監聽器

**Files:**
- Create: `app-react/src/services/agentWebSocket.ts`

**Step 1: Create WebSocket listener**

```typescript
// app-react/src/services/agentWebSocket.ts
import { store } from '../store';
import { addExecution, updateExecution, setCurrentExecution } from '../store/slices/agentSlice';
import { connectWebSocket } from './websocket';

let isConnected = false;

export function connectAgentWebSocket() {
  // Reuse existing socket connection
  const socket = connectWebSocket();

  if (isConnected) {
    return socket;
  }

  // Agent status update
  socket.on('agent-status-update', (data: {
    executionId: string;
    status: string;
    agentType: string;
    startTime: string;
  }) => {
    store.dispatch(addExecution({
      id: data.executionId,
      agentType: data.agentType as any,
      targetFiles: [],
      status: data.status as any,
      summary: '',
      outputFilePath: null,
      startTime: data.startTime,
      retryCount: 0
    }));
  });

  // Agent complete
  socket.on('agent-complete', (data: {
    executionId: string;
    status: string;
    outputFilePath: string;
    summary: string;
  }) => {
    store.dispatch(updateExecution({
      id: data.executionId,
      status: data.status as any,
      outputFilePath: data.outputFilePath,
      summary: data.summary
    }));
  });

  // Agent error
  socket.on('agent-error', (data: {
    executionId: string;
    error: string;
    retryCount: number;
  }) => {
    store.dispatch(updateExecution({
      id: data.executionId,
      status: 'failed',
      error: data.error
    }));
  });

  // Agent progress
  socket.on('agent-progress', (data: {
    executionId: string;
    output: string;
  }) => {
    // Update summary with latest output
    store.dispatch(updateExecution({
      id: data.executionId,
      summary: data.output.slice(0, 200)
    }));
  });

  isConnected = true;
  return socket;
}
```

**Step 2: Initialize in main.tsx**

```typescript
// app-react/src/main.tsx
import { connectAgentWebSocket } from './services/agentWebSocket';

async function initializeApp() {
  try {
    // ... existing code ...

    // Initialize Agent WebSocket
    connectAgentWebSocket();

    // ... rest of code ...
  } catch (error) {
    // ...
  }
}
```

**Step 3: Commit**

```bash
git add app-react/src/services/agentWebSocket.ts app-react/src/main.tsx
git commit -m "feat: add WebSocket listener for agent events"
```

---

## Phase 3: 基礎 UI 元件

### Task 7: 建立 AgentPanel 組件

**Files:**
- Create: `app-react/src/components/AgentPanel/index.tsx`
- Create: `app-react/src/components/AgentPanel/AgentSelector.tsx`
- Create: `app-react/src/components/AgentPanel/QuickRunButton.tsx`

**Step 1: Create AgentSelector**

```typescript
// app-react/src/components/AgentPanel/AgentSelector.tsx
import React from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import type { AgentType } from '../../types/agent';
import { FileText, Code, FileCheck, Tag } from 'lucide-react';

interface AgentSelectorProps {
  selectedAgent: AgentType | null;
  onAgentChange: (agent: AgentType) => void;
}

const AGENT_OPTIONS: Array<{ type: AgentType; label: string; icon: React.ReactNode; description: string }> = [
  {
    type: 'prd-analyzer',
    label: 'PRD Analyzer',
    icon: <FileText size={20} />,
    description: '分析 PRD 的完整性、清晰度、可行性'
  },
  {
    type: 'code-reviewer',
    label: 'Code Reviewer',
    icon: <Code size={20} />,
    description: '代碼審查（安全性、品質、效能）'
  },
  {
    type: 'doc-generator',
    label: 'Doc Generator',
    icon: <FileCheck size={20} />,
    description: '從程式碼生成 API 文檔、使用指南'
  },
  {
    type: 'version-advisor',
    label: 'Version Advisor',
    icon: <Tag size={20} />,
    description: '根據 SemVer 建議版本號和發布策略'
  }
];

export function AgentSelector({ selectedAgent, onAgentChange }: AgentSelectorProps) {
  return (
    <div className="agent-selector">
      <label className="pe-label">選擇 Agent 類型</label>
      <div className="agent-options">
        {AGENT_OPTIONS.map(option => (
          <button
            key={option.type}
            className={`agent-option ${selectedAgent === option.type ? 'selected' : ''}`}
            onClick={() => onAgentChange(option.type)}
          >
            <div className="agent-option-icon">{option.icon}</div>
            <div className="agent-option-content">
              <div className="agent-option-label">{option.label}</div>
              <div className="agent-option-description">{option.description}</div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
```

**Step 2: Create QuickRunButton**

```typescript
// app-react/src/components/AgentPanel/QuickRunButton.tsx
import React from 'react';
import { Play } from 'lucide-react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';

interface QuickRunButtonProps {
  selectedAgent: string | null;
  targetFile: string | null;
  onRun: () => void;
  disabled?: boolean;
}

export function QuickRunButton({ selectedAgent, targetFile, onRun, disabled }: QuickRunButtonProps) {
  const isLoading = useSelector((state: RootState) => state.agent.isLoading);

  const canRun = selectedAgent && targetFile && !isLoading && !disabled;

  return (
    <button
      className={`pe-btn pe-btn-primary ${canRun ? '' : 'disabled'}`}
      onClick={onRun}
      disabled={!canRun}
    >
      <Play size={18} />
      {isLoading ? '執行中...' : '執行 Agent'}
    </button>
  );
}
```

**Step 3: Create main AgentPanel**

```typescript
// app-react/src/components/AgentPanel/index.tsx
import React, { useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { X } from 'lucide-react';
import { AgentSelector } from './AgentSelector';
import { QuickRunButton } from './QuickRunButton';
import { closePanel, executeAgent } from '../../store/slices/agentSlice';
import type { AgentType } from '../../types/agent';
import { toast } from 'react-toastify';
import { useParams } from 'react-router-dom';

export function AgentPanel() {
  const dispatch = useDispatch<AppDispatch>();
  const { '*': filePath } = useParams();
  const isPanelOpen = useSelector((state: RootState) => state.agent.isPanelOpen);
  const currentExecution = useSelector((state: RootState) => state.agent.currentExecution);

  const [selectedAgent, setSelectedAgent] = useState<AgentType | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customPrompt, setCustomPrompt] = useState('');

  if (!isPanelOpen) return null;

  const handleRun = async () => {
    if (!selectedAgent || !filePath) return;

    try {
      const result = await dispatch(executeAgent({
        agentType: selectedAgent,
        targetFiles: [filePath],
        customPrompt: showAdvanced ? customPrompt : undefined
      })).unwrap();

      toast.success('Agent 已啟動');
      // Optional: Navigate to result page
      // window.location.hash = `#/agent/result/${result.executionId}`;
    } catch (error: any) {
      toast.error(error.message || 'Agent 執行失敗');
    }
  };

  return (
    <div className="agent-panel">
      <div className="agent-panel-header">
        <h3>AI Agent Panel</h3>
        <button
          className="pe-btn pe-btn-icon"
          onClick={() => dispatch(closePanel())}
        >
          <X size={20} />
        </button>
      </div>

      <div className="agent-panel-content">
        <AgentSelector
          selectedAgent={selectedAgent}
          onAgentChange={setSelectedAgent}
        />

        {showAdvanced && (
          <div className="advanced-options">
            <label className="pe-label">自訂 Prompt（可選）</label>
            <textarea
              className="pe-textarea"
              value={customPrompt}
              onChange={(e) => setCustomPrompt(e.target.value)}
              placeholder="輸入自訂指令..."
              rows={3}
            />
          </div>
        )}

        <button
          className="pe-btn pe-btn-ghost"
          onClick={() => setShowAdvanced(!showAdvanced)}
        >
          {showAdvanced ? '隱藏進階選項' : '顯示進階選項'}
        </button>

        <div className="agent-panel-actions">
          <QuickRunButton
            selectedAgent={selectedAgent}
            targetFile={filePath || null}
            onRun={handleRun}
          />
        </div>

        {currentExecution && (
          <div className="current-execution">
            <div className="execution-status">
              <span className={`status-badge ${currentExecution.status}`}>
                {currentExecution.status === 'running' ? '執行中' :
                 currentExecution.status === 'success' ? '成功' :
                 currentExecution.status === 'failed' ? '失敗' : '等待中'}
              </span>
            </div>
            {currentExecution.summary && (
              <div className="execution-summary">
                {currentExecution.summary}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 4: Add styles**

```css
/* app-react/src/styles/agent-panel.css */
.agent-panel {
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  width: 400px;
  background: white;
  border-left: 1px solid #e5e7eb;
  box-shadow: -4px 0 12px rgba(0, 0, 0, 0.1);
  z-index: 1000;
  display: flex;
  flex-direction: column;
}

.agent-panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.agent-panel-header h3 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
}

.agent-panel-content {
  flex: 1;
  overflow-y: auto;
  padding: 1.5rem;
}

.agent-options {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-top: 0.75rem;
}

.agent-option {
  display: flex;
  gap: 0.75rem;
  padding: 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.agent-option:hover {
  border-color: #3b82f6;
  background: #f9fafb;
}

.agent-option.selected {
  border-color: #3b82f6;
  background: #eff6ff;
}

.agent-option-icon {
  flex-shrink: 0;
  color: #3b82f6;
}

.agent-option-label {
  font-weight: 500;
  color: #1f2937;
}

.agent-option-description {
  font-size: 0.875rem;
  color: #6b7280;
}

.agent-panel-actions {
  margin-top: 1.5rem;
}

.advanced-options {
  margin-top: 1.5rem;
}

.current-execution {
  margin-top: 1.5rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 0.5rem;
}

.status-badge {
  display: inline-block;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
}

.status-badge.running {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.success {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.failed {
  background: #fee2e2;
  color: #991b1b;
}
```

**Step 5: Commit**

```bash
git add app-react/src/components/AgentPanel/
git commit -m "feat: add AgentPanel component with selector and run button"
```

---

### Task 8: 整合 AgentPanel 到 EditorPage

**Files:**
- Modify: `app-react/src/pages/EditorPage.tsx`

**Step 1: Add AgentPanel to EditorPage**

```typescript
// app-react/src/pages/EditorPage.tsx
import { AgentPanel } from '../components/AgentPanel';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { Bot } from 'lucide-react';

function EditorPage() {
  const dispatch = useDispatch();
  const isAgentPanelOpen = useSelector((state: RootState) => state.agent.isPanelOpen);

  // ... existing code ...

  return (
    <div className="editor-page">
      {/* Existing header */}
      <header className="editor-header">
        {/* ... existing header content ... */}

        {/* Add Agent Panel toggle button */}
        <button
          className={`header-btn ${isAgentPanelOpen ? 'active' : ''}`}
          onClick={() => dispatch(togglePanel())}
          title="AI Agent Panel"
        >
          <Bot size={20} />
        </button>
      </header>

      {/* Existing content */}
      <div className={`editor-content ${isAgentPanelOpen ? 'with-agent-panel' : ''}`}>
        {/* ... existing editor content ... */}
      </div>

      {/* Agent Panel */}
      <AgentPanel />
    </div>
  );
}
```

**Step 2: Update styles**

```css
/* app-react/src/styles/editor.css */
.editor-content.with-agent-panel {
  margin-right: 400px; /* Make room for Agent Panel */
}

.header-btn.active {
  background: #eff6ff;
  color: #3b82f6;
}
```

**Step 3: Test integration**

1. Run: `cd app-react && npm run dev`
2. Navigate to editor
3. Click bot icon in header
4. Verify Agent Panel opens on right side

**Step 4: Commit**

```bash
git add app-react/src/pages/EditorPage.tsx app-react/src/styles/editor.css
git commit -m "feat: integrate AgentPanel into EditorPage with toggle button"
```

---

## Phase 4: 獨立工作台頁面

### Task 9: 建立 AgentWorkbenchPage

**Files:**
- Create: `app-react/src/pages/AgentWorkbenchPage.tsx`
- Modify: `app-react/src/App.tsx`

**Step 1: Create AgentStatsPanel component**

```typescript
// app-react/src/components/AgentWorkbench/AgentStatsPanel.tsx
import React from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { BarChart, Clock, CheckCircle, XCircle } from 'lucide-react';

export function AgentStatsPanel() {
  const stats = useSelector((state: RootState) => state.agent.stats);

  if (!stats) {
    return <div className="stats-loading">載入中...</div>;
  }

  return (
    <div className="stats-panel">
      <div className="stat-card">
        <div className="stat-icon">
          <BarChart size={24} />
        </div>
        <div className="stat-content">
          <div className="stat-value">{stats.totalExecutions}</div>
          <div className="stat-label">總執行次數</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon success">
          <CheckCircle size={24} />
        </div>
        <div className="stat-content">
          <div className="stat-value">{Math.round(stats.successRate * 100)}%</div>
          <div className="stat-label">成功率</div>
        </div>
      </div>

      <div className="stat-card">
        <div className="stat-icon">
          <Clock size={24} />
        </div>
        <div className="stat-content">
          <div className="stat-value">{Math.round(stats.avgDuration / 1000)}s</div>
          <div className="stat-label">平均時間</div>
        </div>
      </div>
    </div>
  );
}
```

**Step 2: Create AgentHistoryList component**

```typescript
// app-react/src/components/AgentWorkbench/AgentHistoryList.tsx
import React, { useEffect } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { fetchAgentHistory, deleteAgentExecution } from '../../store/slices/agentSlice';
import { Trash2, ExternalLink } from 'lucide-react';
import { toast } from 'react-toastify';

export function AgentHistoryList() {
  const dispatch = useDispatch<AppDispatch>();
  const executions = useSelector((state: RootState) => state.agent.executions);
  const isLoading = useSelector((state: RootState) => state.agent.isLoading);

  useEffect(() => {
    dispatch(fetchAgentHistory());
  }, [dispatch]);

  const handleDelete = async (id: string) => {
    if (!window.confirm('確定要刪除此記錄？')) return;

    try {
      await dispatch(deleteAgentExecution(id)).unwrap();
      toast.success('已刪除');
    } catch (error: any) {
      toast.error(error.message || '刪除失敗');
    }
  };

  const navigateToResult = (id: string) => {
    window.location.hash = `#/agent/result/${id}`;
  };

  if (isLoading) {
    return <div className="history-loading">載入中...</div>;
  }

  if (executions.length === 0) {
    return <div className="history-empty">尚無執行記錄</div>;
  }

  return (
    <div className="history-list">
      {executions.map(execution => (
        <div key={execution.id} className="history-item">
          <div className="history-item-header">
            <div className="history-item-title">
              <span className={`agent-type-badge ${execution.agentType}`}>
                {execution.agentType}
              </span>
              <span className="execution-time">
                {new Date(execution.startTime).toLocaleString('zh-TW')}
              </span>
            </div>
            <div className="history-item-actions">
              <button
                className="pe-btn pe-btn-icon"
                onClick={() => navigateToResult(execution.id)}
                title="查看詳情"
              >
                <ExternalLink size={16} />
              </button>
              <button
                className="pe-btn pe-btn-icon"
                onClick={() => handleDelete(execution.id)}
                title="刪除"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>

          <div className="history-item-body">
            <div className="execution-files">
              {execution.targetFiles.map(file => (
                <span key={file} className="file-tag">{file}</span>
              ))}
            </div>

            {execution.summary && (
              <div className="execution-summary">
                {execution.summary}
              </div>
            )}

            <div className={`execution-status ${execution.status}`}>
              {execution.status === 'success' ? '✓ 成功' :
               execution.status === 'failed' ? '✗ 失敗' :
               execution.status === 'running' ? '⟳ 執行中' : '等待中'}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
```

**Step 3: Create AgentWorkbenchPage**

```typescript
// app-react/src/pages/AgentWorkbenchPage.tsx
import React from 'react';
import { AgentStatsPanel } from '../components/AgentWorkbench/AgentStatsPanel';
import { AgentHistoryList } from '../components/AgentWorkbench/AgentHistoryList';
import './agent-workbench-page.css';

export function AgentWorkbenchPage() {
  return (
    <div className="agent-workbench-page">
      <div className="workbench-container">
        <header className="workbench-header">
          <h1>AI Agent 工作台</h1>
          <p className="workbench-subtitle">管理 Agent 執行記錄和統計資訊</p>
        </header>

        <AgentStatsPanel />

        <section className="history-section">
          <h2>執行記錄</h2>
          <AgentHistoryList />
        </section>
      </div>
    </div>
  );
}
```

**Step 4: Add styles**

```css
/* app-react/src/pages/agent-workbench-page.css */
.agent-workbench-page {
  min-height: 100vh;
  background: #f9fafb;
  padding: 2rem;
}

.workbench-container {
  max-width: 1200px;
  margin: 0 auto;
}

.workbench-header {
  margin-bottom: 2rem;
}

.workbench-header h1 {
  font-size: 2rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 0.5rem 0;
}

.workbench-subtitle {
  color: #6b7280;
  margin: 0;
}

.stats-panel {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  padding: 1.5rem;
  border-radius: 0.75rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  gap: 1rem;
}

.stat-icon {
  flex-shrink: 0;
  width: 48px;
  height: 48px;
  border-radius: 0.5rem;
  background: #eff6ff;
  color: #3b82f6;
  display: flex;
  align-items: center;
  justify-content: center;
}

.stat-icon.success {
  background: #d1fae5;
  color: #065f46;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 1.5rem;
  font-weight: 700;
  color: #1f2937;
}

.stat-label {
  font-size: 0.875rem;
  color: #6b7280;
}

.history-section h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 1rem;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.history-item {
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.history-item-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.history-item-title {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.agent-type-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 500;
  background: #eff6ff;
  color: #3b82f6;
}

.execution-time {
  font-size: 0.875rem;
  color: #6b7280;
}

.history-item-actions {
  display: flex;
  gap: 0.5rem;
}

.history-item-body {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.execution-files {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.file-tag {
  padding: 0.125rem 0.5rem;
  background: #f3f4f6;
  border-radius: 0.25rem;
  font-size: 0.75rem;
  color: #374151;
  font-family: monospace;
}

.execution-summary {
  font-size: 0.875rem;
  color: #4b5563;
  line-height: 1.5;
}

.execution-status {
  font-size: 0.875rem;
  font-weight: 500;
}

.execution-status.success {
  color: #059669;
}

.execution-status.failed {
  color: #dc2626;
}

.execution-status.running {
  color: #d97706;
}
```

**Step 5: Add route to App.tsx**

```typescript
// app-react/src/App.tsx
import { AgentWorkbenchPage } from './pages/AgentWorkbenchPage';

function App() {
  return (
    <Provider store={store}>
      <ErrorBoundary>
        <NotificationProvider>
          <Router>
            <Routes>
              <Route path="/" element={<Navigate to="/edit" replace />} />
              <Route path="/edit" element={<EditorPage />} />
              <Route path="/edit/*" element={<EditorPage />} />
              <Route path="/agent/workbench" element={<AgentWorkbenchPage />} />
              <Route path="/agent/result/:id" element={<div>TODO</div>} />
            </Routes>
          </Router>
        </NotificationProvider>
      </ErrorBoundary>
    </Provider>
  );
}
```

**Step 6: Test navigation**

1. Run: `cd app-react && npm run dev`
2. Navigate to `#/agent/workbench`
3. Verify stats panel and history list display

**Step 7: Commit**

```bash
git add app-react/src/pages/AgentWorkbenchPage.tsx
git add app-react/src/components/AgentWorkbench/
git add app-react/src/App.tsx
git add app-react/src/pages/agent-workbench-page.css
git commit -m "feat: add AgentWorkbenchPage with stats and history"
```

---

## Phase 5: 執行結果詳情頁面

### Task 10: 建立 AgentResultPage

**Files:**
- Create: `app-react/src/pages/AgentResultPage.tsx`
- Create: `app-react/src/components/AgentResult/AgentOutputViewer.tsx`

**Step 1: Create AgentOutputViewer component**

```typescript
// app-react/src/components/AgentResult/AgentOutputViewer.tsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { fetchAgentExecution } from '../../store/slices/agentSlice';
import { ArrowLeft, RefreshCw, Download } from 'lucide-react';
import { toast } from 'react-toastify';
import ReactMarkdown from 'react-markdown';

export function AgentOutputViewer() {
  const { id } = useParams<{ id: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const execution = useSelector((state: RootState) =>
    state.agent.executions.find(e => e.id === id)
  );
  const [output, setOutput] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (id && !execution) {
      dispatch(fetchAgentExecution(id));
    }
  }, [id, execution, dispatch]);

  useEffect(() => {
    if (execution?.outputFilePath) {
      loadOutput();
    }
  }, [execution]);

  const loadOutput = async () => {
    if (!execution?.outputFilePath) return;

    setIsLoading(true);
    try {
      const response = await fetch(`./api/files/${execution.outputFilePath}`);
      if (response.ok) {
        const text = await response.text();
        setOutput(text);
      }
    } catch (error) {
      console.error('Failed to load output:', error);
      toast.error('載入輸出失敗');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = async (format: 'markdown' | 'pdf') => {
    if (!output) return;

    try {
      const response = await fetch(`/api/agent/export/${id}?format=${format}`);
      const data = await response.json();

      if (data.downloadUrl) {
        const a = document.createElement('a');
        a.href = data.downloadUrl;
        a.download = `agent-result-${id}.${format === 'markdown' ? 'md' : 'pdf'}`;
        a.click();
      }
    } catch (error) {
      toast.error('匯出失敗');
    }
  };

  if (!execution) {
    return <div className="output-viewer-loading">載入中...</div>;
  }

  return (
    <div className="output-viewer">
      <div className="output-viewer-header">
        <button className="back-btn" onClick={() => window.history.back()}>
          <ArrowLeft size={20} />
          返回
        </button>

        <h1>Agent 執行結果</h1>

        <div className="output-actions">
          <button className="pe-btn pe-btn-ghost" onClick={loadOutput}>
            <RefreshCw size={18} />
            重新載入
          </button>
          <button
            className="pe-btn pe-btn-secondary"
            onClick={() => handleExport('markdown')}
          >
            <Download size={18} />
            匯出 Markdown
          </button>
          <button
            className="pe-btn pe-btn-secondary"
            onClick={() => handleExport('pdf')}
          >
            <Download size={18} />
            匯出 PDF
          </button>
        </div>
      </div>

      <div className="output-viewer-content">
        <div className="execution-metadata">
          <div className="metadata-row">
            <span className="metadata-label">Agent 類型:</span>
            <span className="metadata-value">{execution.agentType}</span>
          </div>
          <div className="metadata-row">
            <span className="metadata-label">目標檔案:</span>
            <div className="metadata-value">
              {execution.targetFiles.map(f => (
                <span key={f} className="file-tag">{f}</span>
              ))}
            </div>
          </div>
          <div className="metadata-row">
            <span className="metadata-label">執行時間:</span>
            <span className="metadata-value">
              {new Date(execution.startTime).toLocaleString('zh-TW')}
            </span>
          </div>
          <div className="metadata-row">
            <span className="metadata-label">狀態:</span>
            <span className={`status-badge ${execution.status}`}>
              {execution.status === 'success' ? '成功' :
               execution.status === 'failed' ? '失敗' :
               execution.status === 'running' ? '執行中' : '等待中'}
            </span>
          </div>
          {execution.duration && (
            <div className="metadata-row">
              <span className="metadata-label">執行時間:</span>
              <span className="metadata-value">
                {(execution.duration / 1000).toFixed(2)} 秒
              </span>
            </div>
          )}
        </div>

        {isLoading ? (
          <div className="output-loading">載入輸出中...</div>
        ) : output ? (
          <div className="output-content">
            <ReactMarkdown>{output}</ReactMarkdown>
          </div>
        ) : (
          <div className="output-empty">無輸出內容</div>
        )}

        {execution.error && (
          <div className="error-output">
            <h3>錯誤訊息</h3>
            <pre>{execution.error}</pre>
          </div>
        )}
      </div>
    </div>
  );
}
```

**Step 2: Create AgentResultPage**

```typescript
// app-react/src/pages/AgentResultPage.tsx
import React from 'react';
import { AgentOutputViewer } from '../components/AgentResult/AgentOutputViewer';

export function AgentResultPage() {
  return <AgentOutputViewer />;
}
```

**Step 3: Add styles**

```css
/* app-react/src/components/AgentResult/output-viewer.css */
.output-viewer {
  min-height: 100vh;
  background: #f9fafb;
}

.output-viewer-header {
  background: white;
  padding: 1.5rem 2rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  align-items: center;
  gap: 1rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.output-viewer-header h1 {
  flex: 1;
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.back-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border: 1px solid #e5e7eb;
  border-radius: 0.5rem;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
}

.back-btn:hover {
  background: #f9fafb;
}

.output-actions {
  display: flex;
  gap: 0.5rem;
}

.output-viewer-content {
  max-width: 900px;
  margin: 2rem auto;
  padding: 0 2rem;
}

.execution-metadata {
  background: white;
  border-radius: 0.75rem;
  padding: 1.5rem;
  margin-bottom: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.metadata-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid #f3f4f6;
}

.metadata-row:last-child {
  border-bottom: none;
}

.metadata-label {
  font-weight: 500;
  color: #374151;
  min-width: 100px;
}

.metadata-value {
  color: #6b7280;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.875rem;
  font-weight: 500;
}

.status-badge.success {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.failed {
  background: #fee2e2;
  color: #991b1b;
}

.status-badge.running {
  background: #fef3c7;
  color: #92400e;
}

.output-content {
  background: white;
  border-radius: 0.75rem;
  padding: 2rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  min-height: 300px;
}

.output-content h1,
.output-content h2,
.output-content h3 {
  color: #1f2937;
  margin-top: 1.5rem;
}

.output-content h1:first-child,
.output-content h2:first-child,
.output-content h3:first-child {
  margin-top: 0;
}

.output-content code {
  background: #f3f4f6;
  padding: 0.125rem 0.25rem;
  border-radius: 0.25rem;
  font-size: 0.875em;
}

.output-content pre {
  background: #1f2937;
  color: #f9fafb;
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  margin: 1rem 0;
}

.output-content pre code {
  background: transparent;
  padding: 0;
  color: inherit;
}

.error-output {
  background: #fee2e2;
  border: 1px solid #fca5a5;
  border-radius: 0.75rem;
  padding: 1.5rem;
  margin-top: 2rem;
}

.error-output h3 {
  color: #991b1b;
  margin: 0 0 1rem 0;
}

.error-output pre {
  background: #7f1d1d;
  color: #fef2f2;
  padding: 1rem;
  border-radius: 0.5rem;
  overflow-x: auto;
  margin: 0;
}

.output-empty,
.output-loading {
  text-align: center;
  padding: 3rem;
  color: #6b7280;
}
```

**Step 4: Update route in App.tsx**

```typescript
// app-react/src/App.tsx
import { AgentResultPage } from './pages/AgentResultPage';

// In Routes:
<Route path="/agent/result/:id" element={<AgentResultPage />} />
```

**Step 5: Test result page**

1. Run: `cd app-react && npm run dev`
2. Execute an agent from editor
3. Click on result to navigate to `/agent/result/:id`
4. Verify output displays correctly

**Step 6: Commit**

```bash
git add app-react/src/pages/AgentResultPage.tsx
git add app-react/src/components/AgentResult/
git add app-react/src/App.tsx
git commit -m "feat: add AgentResultPage with output viewer and export"
```

---

## Phase 6: 匯出功能

### Task 11: 實作後端匯出端點

**Files:**
- Modify: `server/index.js`

**Step 1: Add export dependencies**

```bash
cd server
npm install pdfkit
```

**Step 2: Add export endpoint**

```javascript
// server/index.js
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

// Agent export endpoint
app.get('/api/agent/export/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { format = 'markdown' } = req.query;

    const execution = await agentDb.findById(id);
    if (!execution) {
      return res.status(404).json({ error: 'Execution not found' });
    }

    if (!execution.output_file_path) {
      return res.status(400).json({ error: 'No output file available' });
    }

    const outputPath = path.join(process.env.MARKDOWN_DIR, execution.output_file_path);
    const outputContent = await fs.readFile(outputPath, 'utf-8');

    if (format === 'markdown') {
      // Return markdown file
      const filename = `agent-result-${id}.md`;
      res.setHeader('Content-Type', 'text/markdown');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(outputContent);
    } else if (format === 'pdf') {
      // Generate PDF
      const doc = new PDFDocument();
      const filename = `agent-result-${id}.pdf`;

      // Add content to PDF (simplified)
      doc.fontSize(12);
      doc.text(outputContent, {
        width: 410,
        align: 'left'
      });

      // Generate buffer
      const chunks = [];
      doc.on('data', chunk => chunks.push(chunk));
      doc.on('end', () => {
        const pdfBuffer = Buffer.concat(chunks);

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send(pdfBuffer);
      });

      doc.end();
    } else {
      res.status(400).json({ error: 'Invalid format. Use markdown or pdf' });
    }
  } catch (error) {
    console.error('Export error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

**Step 3: Commit**

```bash
git add server/index.js server/package.json server/package-lock.json
git commit -m "feat: add agent export endpoint (Markdown and PDF)"
```

---

## Phase 7: 右鍵選單整合

### Task 12: 加入右鍵「使用 Agent 分析」選項

**Files:**
- Modify: `app-react/src/components/FileTree/FileTree.tsx`

**Step 1: Add context menu option**

```typescript
// app-react/src/components/FileTree/FileTree.tsx
import { openPanel, executeAgent } from '../../store/slices/agentSlice';
import { Bot } from 'lucide-react';

// In context menu items:
const contextMenuItems = [
  // ... existing items ...
  {
    label: '🤖 使用 Agent 分析',
    icon: <Bot size={16} />,
    action: (filePath: string) => {
      dispatch(openPanel());
      // Auto-select appropriate agent based on file type
      let agentType: AgentType = 'prd-analyzer';

      if (filePath.endsWith('.md')) {
        if (filePath.includes('PRD') || filePath.toLowerCase().includes('requirement')) {
          agentType = 'prd-analyzer';
        } else if (filePath.toLowerCase().includes('spec')) {
          agentType = 'code-reviewer';
        } else {
          agentType = 'doc-generator';
        }
      }

      // Execute agent (this will need state management to pass selected agent)
      dispatch(executeAgent({
        agentType,
        targetFiles: [filePath],
        customPrompt: undefined
      }));
    }
  }
];
```

**Note:** This may require additional state management to pre-select the agent type in the panel.

**Step 2: Commit**

```bash
git add app-react/src/components/FileTree/FileTree.tsx
git commit -m "feat: add context menu option to analyze file with Agent"
```

---

## Phase 8: 測試與優化

### Task 13: 編寫整合測試

**Files:**
- Create: `server/__tests__/integration/agent-flow.test.js`

**Step 1: Write integration test**

```javascript
// server/__tests__/integration/agent-flow.test.js
const request = require('supertest');
const app = require('../../index');

describe('Agent Integration Flow', () => {
  test('should execute agent and retrieve history', async () => {
    // 1. Execute agent
    const executeResponse = await request(app)
      .post('/api/agent/execute')
      .set('Authorization', 'Bearer demo-api-key')
      .send({
        agentType: 'prd-analyzer',
        targetFiles: ['PRD.md']
      })
      .expect(200);

    expect(executeResponse.body.executionId).toBeDefined();

    // 2. Get execution history
    const historyResponse = await request(app)
      .get('/api/agent/history')
      .expect(200);

    expect(historyResponse.body.executions).toBeInstanceOf(Array);
    expect(historyResponse.body.executions.length).toBeGreaterThan(0);

    // 3. Get specific execution
    const executionId = executeResponse.body.executionId;
    const detailResponse = await request(app)
      .get(`/api/agent/history/${executionId}`)
      .expect(200);

    expect(detailResponse.body.id).toBe(executionId);
  });
});
```

**Step 2: Run integration tests**

Run: `cd server && npm test`

**Step 3: Commit**

```bash
git add server/__tests__/integration/
git commit -m "test: add agent integration tests"
```

---

### Task 14: 更新 README 文檔

**Files:**
- Modify: `README.md` or `CLAUDE.md`

**Step 1: Add Agent Panel documentation**

```markdown
# Agent Panel 功能

CoSpec AI 現在整合了 AI Agent 功能，讓你可以：

- 在編輯器中快速呼叫 AI Agent 執行任務
- 在獨立工作台管理 Agent 執行歷史
- 查看 Agent 執行結果和統計資訊
- 匯出 Agent 執行結果

## 可用的 Agent 類型

1. **PRD Analyzer** - 分析 PRD 的完整性、清晰度、可行性
2. **Code Reviewer** - 代碼審查（安全性、品質、效能）
3. **Doc Generator** - 從程式碼生成 API 文檔、使用指南
4. **Version Advisor** - 根據 SemVer 建議版本號和發布策略

## 使用方式

### 從編輯器呼叫 Agent

1. 開啟文件時，點擊標題欄的 🤖 圖示開啟 Agent Panel
2. 選擇 Agent 類型
3. 點擊「執行 Agent」按鈕
4. 查看執行結果或跳轉到結果頁面

### 右鍵選單

在檔案樹中右鍵檔案，選擇「🤖 使用 Agent 分析」

### 工作台

訪問 `#/agent/workbench` 查看所有 Agent 執行記錄和統計資訊。
```

**Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add Agent Panel feature documentation"
```

---

## 總結

此計畫包含 14 個主要任務，涵蓋：

✅ 後端：AgentService、SQLite 資料庫、API 端點
✅ 前端：Redux slice、WebSocket 監聽、UI 元件
✅ 頁面：工作台、結果詳情
✅ 功能：執行、歷史、統計、匯出
✅ 測試：單元測試、整合測試

**總預估計時間**: 完整實作約需 6-8 小時

**下一步**: 選擇執行方式並開始實作
