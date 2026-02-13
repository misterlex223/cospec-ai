# Git Diff 整合實作計劃

> **For Claude:** REQUIRED SUB-SKILL: 使用 @superpowers:executing-plans 來逐個執行此計劃中的任務。

**目標:** 在 CoSpec AI Markdown Editor 中整合 Git Diff 功能，讓 Agent 能夠檢視和管理檔案版本變更

**架構:** 使用現有的 GitService 作為後端 git 操作的抽象層，透過 WebSocket 發送即時進度，前端使用 Redux 管理狀態並整合到現有的 MarkdownEditor 組件

**技術疊：**
- 後端: Node.js + Express + Socket.IO (已存在)
- Git 操作: child_process.spawn + simple-git (現有 GitService)
- 後端: React + Redux Toolkit + TypeScript
- Diff 視視: react-diff-viewer 或自訂實作

---

## 前置任務：修正 GitService 語法錯誤

**檔案：**
- 修正: `server/services/gitService.js`

**Step 1: 分析現有 GitService 的問題**

現有 `gitService.js` 有以下語法錯誤需要修正：
- 第 23 行：`spawn('git', [...` 應該是 `spawn`
- 第 64-106 行：if 條件中使用未定義的變數
- 第 128 行：`{ stdout, stderr }` 應該是 `await exec()` 返回 Promise，需要 await
- 第 136 行：`--skip=${offset}` 模板字符串錯誤
- 第 144 行：缺少參數 `id`
- 第 152 行：參數傳遞錯誤
- 第 170 行：`slice(1)` 應該是 `slice(1)`
- 第 178 行：`'-q', '-q'` 應該是 `'-q', '-q'`
- 第 186-193 行：參數解構和模板字符串錯誤

**Step 2: 修正 spawn 語法**

```javascript
// 錯誤:
const gitCmd = spawn('git', ['--git-dir', this.gitDir, ...command, ...args.map(a => a.toString())], {

// 正確:
const gitCmd = spawn('git', ['--git-dir', this.gitDir, ...args, ...command], {
```

**Step 3: 修正 getStatus 方法**

```javascript
async getStatus() {
  const { stdout, stderr } = await this.exec('status', ['--porcelain']);
  return this.parseGitOutput(stdout + stderr);
}
```

**Step 4: 修正 getLog 方法**

```javascript
async getLog(limit = 20, offset = 0) {
  const { stdout, stderr } = await this.exec('log', [
    `-n ${limit}`,
    `--skip=${offset}`,
    '--format=%h %an %s'
  ]);
  return this.parseGitOutput(stdout + stderr);
}
```

**Step 5: 修正 getCommit 方法**

```javascript
async getCommit(id) {
  const { stdout, stderr } = await this.exec('show', [id, '--format=%h', '--stat']);
  return this.parseGitOutput(stdout + stderr);
}
```

**Step 6: 修正 diff 方法**

```javascript
async diff(pathA, pathB) {
  const { stdout, stderr } = await this.exec('diff', [
    '--no-color',
    '--no-pager',
    pathA,
    pathB
  ]);
  return this.parseGitOutput(stdout + stderr);
}
```

**Step 7: 修正其他方法**

```javascript
async getCurrentBranch() {
  const { stdout, stderr } = await this.exec('branch', ['--show-current']);
  const match = stdout.match(/^refs\\/heads\\/(.+)$/);
  return match ? match[1] : null;
}

async getBranches() {
  const { stdout, stderr } = await this.exec('branch', ['-a']);
  const lines = stdout.trim().split('\\n');
  return lines.filter(line => line.trim()).slice(1); // Remove header
}

async initRepo() {
  const { stdout, stderr } = await this.exec('init', ['-q']);
  return this.parseGitOutput(stdout + stderr);
}

async stageFiles(files = []) {
  const fileList = files.map(f => `"${f}"`);
  const { stdout, stderr } = await this.exec('add', ...fileList);
  return this.parseGitOutput(stdout + stderr);
}

async commitFiles(message) {
  const { stdout, stderr } = await this.exec('commit', ['-m', message]);
  return this.parseGitOutput(stdout + stderr);
}
```

**Step 8: 執行測試**

啟動 server 並測試 git 操作是否正常。

**Step 9: 提交**

```bash
cd /home/flexy/workspace
git add server/services/gitService.js
git commit -m "fix: correct GitService syntax errors"
```

---

## 任務 1: 新增 Git API 路由

**檔案：**
- 修正: `server/index.js` (在 Agent API 之後新增 Git API)
- 新增: `server/services/gitService.js` (已存在，需修正後整合)

**Step 1: 在 server/index.js 中引入 GitService**

```javascript
// 在 Agent Service 引入之後新增：
const GitService = require('./services/gitService');

// 初始化 Git Service (指向 markdown 目錄)
const gitService = new GitService(path.join(__dirname, '..', 'markdown'));
console.log('✓ Git service ready');
```

**Step 2: 新增 Git 狀態 API 路由**

```javascript
// ============================================================================
// Git API Routes
// ============================================================================

app.get('/api/git/status', async (req, res) => {
  try {
    const result = await gitService.getStatus();
    res.json(result);
  } catch (error) {
    console.error('Git status error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/git/log', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 20;
    const offset = parseInt(req.query.offset) || 0;
    const result = await gitService.getLog(limit, offset);
    res.json(result);
  } catch (error) {
    console.error('Git log error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/git/commit/:id', async (req, res) => {
  try {
    const result = await gitService.getCommit(req.params.id);
    res.json(result);
  } catch (error) {
    console.error('Git commit error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/git/diff', async (req, res) => {
  try {
    const { pathA, pathB } = req.query;
    if (!pathA || !pathB) {
      return res.status(400).json({ error: 'pathA and pathB are required' });
    }
    const result = await gitService.diff(pathA, pathB);
    res.json(result);
  } catch (error) {
    console.error('Git diff error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/git/branches', async (req, res) => {
  try {
    const branches = await gitService.getBranches();
    res.json({ branches });
  } catch (error) {
    console.error('Git branches error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/git/stage', authenticateToken, async (req, res) => {
  try {
    const { files } = req.body;
    if (!Array.isArray(files)) {
      return res.status(400).json({ error: 'files must be an array' });
    }
    const result = await gitService.stageFiles(files);
    res.json(result);
  } catch (error) {
    console.error('Git stage error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/git/commit', authenticateToken, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ error: 'message is required' });
    }
    const result = await gitService.commitFiles(message);
    res.json(result);
  } catch (error) {
    console.error('Git commit error:', error);
    res.status(500).json({ error: error.message });
  }
});
```

**Step 3: 更新 agentService 以發送 Git 進度**

```javascript
// 在 AgentService 中新增方法發送 git 操作進度
emitGitProgress(data, isError = false) {
  io.emit('git-progress', {
    type: isError ? 'error' : 'progress',
    data,
    timestamp: new Date().toISOString()
  });
}

// 在 gitService.js 中使用：
emitProgress(data, isError) {
  if (this.agentService) {
    this.agentService.emitGitProgress(data, isError);
  }
  }
```

**Step 4: 執行測試**

```bash
curl http://localhost:9280/api/git/status
curl http://localhost:9280/api/git/log?limit=5
```

**Step 5: 提交**

```bash
git add server/index.js server/services/gitService.js
git commit -m "feat: add Git API endpoints"
```

---

## 任務 2: 前端 Git 類型定義

**檔案：**
- 新增: `app-react/src/types/git.ts`

**Step 1: 創建 Git 類型檔案**

```typescript
/**
 * Git-related type definitions
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
  oldPath?: string; // for renamed files
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
```

**Step 2: 提交**

```bash
git add app-react/src/types/git.ts
git commit -m "feat: add Git type definitions"
```

---

## 任務 3: 前端 Git API 函數

**檔案：**
- 修正: `app-react/src/services/api.ts` (新增 gitApi)

**Step 1: 新增 gitApi 物件**

```typescript
// 在 api.ts 檔尾新增：

// ============================================================================
// Git API
// ============================================================================

import type {
  GitStatusResult,
  GitCommit,
  GitBranch,
  GitDiffResult,
  GitFileChange
} from '../types/git';

/**
 * Get git repository status
 */
export const getGitStatus = async (): Promise<GitStatusResult> => {
  const response = await api.get('/git/status');
  return response.data;
};

/**
 * Get commit history
 */
export const getGitLog = async (limit = 20, offset = 0): Promise<GitCommit[]> => {
  const response = await api.get('/git/log', {
    params: { limit: limit.toString(), offset: offset.toString() }
  });
  return response.data.commits || [];
};

/**
 * Get specific commit details
 */
export const getGitCommit = async (id: string): Promise<GitCommit> => {
  const response = await api.get(`/git/commit/${id}`);
  return response.data;
};

/**
 * Get diff between two refs
 */
export const getGitDiff = async (pathA: string, pathB: string): Promise<GitDiffResult> => {
  const response = await api.get('/git/diff', {
    params: { pathA, pathB }
  });
  return response.data;
};

/**
 * Get all branches
 */
export const getGitBranches = async (): Promise<GitBranch[]> => {
  const response = await api.get('/git/branches');
  return response.data.branches || [];
};

/**
 * Stage files for commit
 */
export const stageGitFiles = async (files: string[]): Promise<{ success: boolean }> => {
  const response = await api.post('/git/stage', { files });
  return response.data;
};

/**
 * Commit staged changes
 */
export const commitGitChanges = async (message: string): Promise<{ success: boolean }> => {
  const response = await api.post('/git/commit', { message });
  return response.data;
};
```

**Step 2: 提交**

```bash
git add app-react/src/services/api.ts
git commit -m "feat: add Git API functions"
```

---

## 任務 4: Git Redux Slice

**檔案：**
- 新增: `app-react/src/store/slices/gitSlice.ts`

**Step 1: 創建 gitSlice**

```typescript
/**
 * Git Redux Slice
 *
 * Manages git repository state, operations, and history
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { GitState, GitCommit, GitBranch, GitStatusResult } from '../../types/git';
import { getGitStatus, getGitLog, getGitBranches, stageGitFiles, commitGitChanges } from '../../services/api';

const initialState: GitState = {
  status: null,
  commits: [],
  branches: [],
  currentBranch: null,
  isLoading: false,
  errorMessage: null
};

// Async thunks
export const fetchGitStatus = createAsyncThunk(
  'git/fetchStatus',
  async () => {
    return await getGitStatus();
  }
);

export const fetchGitLog = createAsyncThunk(
  'git/fetchLog',
  async (params: { limit?: number; offset?: number } = {}) => {
    const commits = await getGitLog(params.limit, params.offset);
    return { commits };
  }
);

export const fetchGitBranches = createAsyncThunk(
  'git/fetchBranches',
  async () => {
    const branches = await getGitBranches();
    return { branches };
  }
);

export const stageFiles = createAsyncThunk(
  'git/stageFiles',
  async (files: string[]) => {
    return await stageGitFiles(files);
  }
);

export const commitChanges = createAsyncThunk(
  'git/commit',
  async (message: string) => {
    return await commitGitChanges(message);
  }
);

const gitSlice = createSlice({
  name: 'git',
  initialState,
  reducers: {
    clearError: (state) => {
      state.errorMessage = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch status
      .addCase(fetchGitStatus.pending, (state) => {
        state.isLoading = true;
        state.errorMessage = null;
      })
      .addCase(fetchGitStatus.fulfilled, (state, action) => {
        state.isLoading = false;
        state.status = action.payload;
      })
      .addCase(fetchGitStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.errorMessage = action.error as string;
      })

      // Fetch log
      .addCase(fetchGitLog.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchGitLog.fulfilled, (state, action) => {
        state.isLoading = false;
        state.commits = action.payload.commits;
      })
      .addCase(fetchGitLog.rejected, (state, action) => {
        state.isLoading = false;
        state.errorMessage = action.error as string;
      })

      // Fetch branches
      .addCase(fetchGitBranches.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchGitBranches.fulfilled, (state, action) => {
        state.isLoading = false;
        state.branches = action.payload.branches;
        state.currentBranch = action.payload.branches.find((b: GitBranch) => b.isCurrent)?.name || null;
      })
      .addCase(fetchGitBranches.rejected, (state, action) => {
        state.isLoading = false;
        state.errorMessage = action.error as string;
      })

      // Stage files
      .addCase(stageFiles.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(stageFiles.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(stageFiles.rejected, (state, action) => {
        state.isLoading = false;
        state.errorMessage = action.error as string;
      })

      // Commit
      .addCase(commitChanges.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(commitChanges.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(commitChanges.rejected, (state, action) => {
        state.isLoading = false;
        state.errorMessage = action.error as string;
      });
  },
});

export const { clearError } = gitSlice.actions;
export default gitSlice.reducer;
```

**Step 2: 更新 store/rootReducer**

```typescript
// 在 app-react/src/store/index.ts 中新增：
import gitReducer from './slices/gitSlice';

export const rootReducer = combineReducers({
  files: filesReducer,
  editor: editorReducer,
  context: contextReducer,
  profile: profileReducer,
  profileEditor: profileEditorReducer,
  ui: uiReducer,
  agent: agentReducer,
  git: gitReducer, // 新增
});
```

**Step 3: 提交**

```bash
git add app-react/src/store/slices/gitSlice.ts app-react/src/store/index.ts
git commit -m "feat: add Git Redux slice"
```

---

## 任務 5: DiffViewer 組件

**檔案：**
- 新增: `app-react/src/components/GitDiff/DiffViewer.tsx`
- 新增: `app-react/src/components/GitDiff/DiffViewer.css`

**Step 1: 安裝依賴**

```bash
cd /home/flexy/workspace/app-react
pnpm add react-diff-viewer
```

**Step 2: 創建 DiffViewer 組件**

```typescript
/**
 * Diff Viewer Component
 *
 * Displays git diff in a readable format
 */

import React from 'react';
import { Diff as DiffViewer } from 'react-diff-viewer';
import type { DiffHunk } from '../../types/git';
import './DiffViewer.css';

interface DiffViewerProps {
  hunks: DiffHunk[];
  oldPath?: string;
  newPath?: string;
  filePath?: string;
}

export function DiffViewer({ hunks, oldPath, newPath, filePath }: DiffViewerProps) {
  // 計算 diff 文本用於 react-diff-viewer
  const computeDiffText = () => {
    let oldText = '';
    let newText = '';
    let oldLineNum = 1;
    let newLineNum = 1;

    for (const hunk of hunks) {
      for (const line of hunk.lines) {
        switch (line.type) {
          case 'removed':
            oldText += `${line.oldNumber || oldLineNum++} ${line.content}\\n`;
            break;
          case 'added':
            newText += `${line.newNumber || newLineNum++} ${line.content}\\n`;
            break;
          case 'context':
            oldText += `${line.oldNumber || oldLineNum++} ${line.content}\\n`;
            newText += `${line.newNumber || newLineNum++} ${line.content}\\n`;
            break;
        }
      }
    }

    return { oldText, newText };
  };

  const { oldText, newText } = computeDiffText();

  if (!oldText && !newText) {
    return (
      <div className="diff-viewer-empty">
        <p>無法顯示差異</p>
      </div>
    );
  }

  return (
    <div className="diff-viewer-container">
      {(filePath || oldPath || newPath) && (
        <div className="diff-viewer-header">
          {filePath && <span className="diff-file-path">{filePath}</span>}
          {oldPath && newPath && (
            <span className="diff-compare">
              {oldPath} → {newPath}
            </span>
          )}
        </div>
      )}

      <DiffViewer
        oldValue={oldText}
        newValue={newText}
        splitView={true}
        compareMethod={DiffViewer.METHOD_WORD_WITH_SPACE}
        useDarkTheme={false}
        onLineNumberClick={(type: 'old' | 'new', number: number) => {
          console.log(`Clicked ${type} line ${number}`);
        }}
      />
    </div>
  );
}
```

**Step 3: 創建 CSS 檔案**

```css
.diff-viewer-container {
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  overflow: hidden;
  background: #ffffff;
}

.diff-viewer-header {
  padding: 12px 16px;
  background: #f8f9fa;
  border-bottom: 1px solid #e2e8f0;
  font-size: 14px;
}

.diff-file-path {
  font-family: 'SF Mono', 'Monaco', 'Couri New', monospace;
  font-weight: 600;
  color: #24292e;
}

.diff-compare {
  font-family: 'SF Mono', 'Monaco', 'Couri New', monospace;
  font-size: 13px;
  color: #6b7280;
}

.diff-viewer-empty {
  padding: 40px;
  text-align: center;
  color: #6b7280;
  font-style: italic;
}

/* react-diff-viewer 定制化 */
.diff-viewer-container :global(.d2h-git-wrapper) {
  border: none !important;
}

.diff-viewer-container :global(.d2h-wrapper) {
  border: none !important;
}

.diff-viewer-container :global(.d2h-code) {
  font-family: 'SF Mono', 'Monaco', 'Couri New', monospace !important;
  font-size: 13px !important;
  line-height: 1.6 !important;
}

.diff-viewer-container :global(.d2h-code-line) {
  padding: 2px 8px !important;
}

.diff-viewer-container :global(.d2h-code-added) {
  background-color: #e6ffec !important;
}

.diff-viewer-container :global(.d2h-code-removed) {
  background-color: #ffeef0 !important;
}

.diff-viewer-container :global(.d2h-code-header) {
  background-color: #f1f5f9 !important;
  color: #24292e !important;
  font-weight: 600 !important;
}
```

**Step 4: 提交**

```bash
git add app-react/src/components/GitDiff/DiffViewer.tsx app-react/src/components/GitDiff/DiffViewer.css app-react/package.json app-react/package-lock.json
git commit -m "feat: add DiffViewer component"
```

---

## 任務 6: GitHistory 組件

**檔案：**
- 新增: `app-react/src/components/GitDiff/GitHistory.tsx`
- 新增: `app-react/src/components/GitDiff/GitHistory.css`

**Step 1: 創建 GitHistory 組件**

```typescript
/**
 * Git History Component
 *
 * Displays commit history with file changes
 */

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../store';
import type { AppDispatch } from '../../store';
import { fetchGitLog, fetchGitStatus } from '../../store/slices/gitSlice';
import type { GitCommit } from '../../types/git';
import { Calendar, GitCommit as GitCommitIcon, GitBranch, GitPullRequest } from 'lucide-react';
import './GitHistory.css';

interface GitHistoryProps {
  filePath?: string; // Optional: filter commits for specific file
  limit?: number;
}

export function GitHistory({ filePath, limit = 20 }: GitHistoryProps) {
  const dispatch = useDispatch<AppDispatch>();
  const { commits, isLoading } = useSelector((state: RootState) => state.git);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    dispatch(fetchGitLog({ limit, offset }));
  }, [filePath, limit, offset]);

  useEffect(() => {
    dispatch(fetchGitStatus());
  }, []);

  const handleLoadMore = () => {
    setOffset(prev => prev + limit);
  };

  if (isLoading && commits.length === 0) {
    return (
      <div className="git-history-loading">
        <div className="loading-spinner"></div>
        <p>載入中...</p>
      </div>
    );
  }

  return (
    <div className="git-history-container">
      <div className="git-history-header">
        <GitBranch className="git-icon" size={18} />
        <h3>提交歷史</h3>
      </div>

      <div className="git-history-list">
        {commits.length === 0 ? (
          <div className="git-history-empty">
            <GitCommitIcon className="empty-icon" size={48} />
            <p>暫無提交記錄</p>
          </div>
        ) : (
          commits.map((commit) => (
            <div key={commit.hash} className="git-commit-item">
              <div className="commit-header">
                <GitCommitIcon className="commit-icon" size={16} />
                <span className="commit-hash">{commit.hash.substring(0, 8)}</span>
                <span className="commit-author">{commit.author}</span>
                <span className="commit-date">
                  {new Date(commit.date).toLocaleString('zh-TW', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              <div className="commit-message">{commit.message}</div>
              {commit.files && commit.files.length > 0 && (
                <div className="commit-files">
                  {commit.files.map((file, idx) => (
                    <span key={idx} className="commit-file">{file}</span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {commits.length >= limit && (
        <button
          className="load-more-btn"
          onClick={handleLoadMore}
          disabled={isLoading}
        >
          {isLoading ? '載入中...' : '載入更多'}
        </button>
      )}
    </div>
  );
}
```

**Step 2: 創建 CSS 檔案**

```css
.git-history-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-height: 500px;
  overflow-y: auto;
}

.git-history-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f8f9fa;
  border-radius: 8px 8px 0 0;
  border: 1px solid #e2e8f0;
}

.git-history-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #24292e;
}

.git-icon {
  color: #f97316;
}

.git-history-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.git-history-loading,
.git-history-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  gap: 16px;
  color: #6b7280;
}

.loading-spinner {
  width: 24px;
  height: 24px;
  border: 2px solid #e2e8f0;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.git-commit-item {
  padding: 12px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.git-commit-item:hover {
  border-color: #3b82f6;
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.1);
}

.commit-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.commit-icon {
  color: #6b7280;
}

.commit-hash {
  font-family: 'SF Mono', 'Monaco', monospace;
  font-size: 13px;
  font-weight: 600;
  color: #3b82f6;
  background: #eff6ff;
  padding: 2px 6px;
  border-radius: 4px;
}

.commit-author {
  font-size: 13px;
  color: #24292e;
  font-weight: 500;
}

.commit-date {
  margin-left: auto;
  font-size: 12px;
  color: #6b7280;
}

.commit-message {
  font-size: 14px;
  color: #374151;
  line-height: 1.5;
  margin-bottom: 8px;
}

.commit-files {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.commit-file {
  font-size: 12px;
  color: #6b7280;
  background: #f1f5f9;
  padding: 2px 8px;
  border-radius: 4px;
  font-family: 'SF Mono', 'Monaco', monospace;
}

.load-more-btn {
  padding: 10px 16px;
  background: #f8f9fa;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 14px;
  color: #24292e;
  cursor: pointer;
  transition: all 0.2s;
}

.load-more-btn:hover:not(:disabled) {
  background: #3b82f6;
  color: #ffffff;
  border-color: #3b82f6;
}

.load-more-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
```

**Step 3: 提交**

```bash
git add app-react/src/components/GitDiff/GitHistory.tsx app-react/src/components/GitDiff/GitHistory.css
git commit -m "feat: add GitHistory component"
```

---

## 任務 7: 整合到 MarkdownEditor

**檔案：**
- 修正: `app-react/src/components/MarkdownEditor/MarkdownEditor.tsx`

**Step 1: 新增 Git 檢案顯示選項卡**

```typescript
// 在 MarkdownEditor.tsx 中新增 imports:
import { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { GitHistory } from '../GitDiff/GitHistory';
import type { GitStatusResult } from '../../types/git';

// 在 MarkdownEditorProps 中新增可選 props:
interface MarkdownEditorProps {
  filePath: string;
  className?: string;
  showGitPanel?: boolean; // 新增
}

// 在組件內新增狀態：
const [showGitPanel, setShowGitPanel] = useState(false);
const gitStatus = useSelector((state: RootState) => state.git.status);
```

**Step 2: 新增切換按鈕**

```tsx
// 在文件資訊區塊後新增 Git 檢案切換：
<div className="editor-toolbar">
  {/* 現有工具欄... */}
  <button
    className={`git-toggle-btn ${showGitPanel ? 'active' : ''}`}
    onClick={() => setShowGitPanel(!showGitPanel)}
    title="顯示 Git 檢案"
  >
    <GitBranch size={16} />
    {gitStatus && (
      <span className="git-status-badge">
        {gitStatus.results?.filter(r => r.type === 'file').length || 0}
      </span>
    )}
  </button>
</div>
```

**Step 3: 新增 Git 面板**

```tsx
// 在 editor 下方新增 Git 面板：
{showGitPanel && (
  <div className="git-panel">
    <div className="git-panel-tabs">
      <button
        className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
        onClick={() => setActiveTab('history')}
      >
        歷史記錄
      </button>
      <button
        className={`tab-btn ${activeTab === 'diff' ? 'active' : ''}`}
        onClick={() => setActiveTab('diff')}
      >
        差異比對
      </button>
      <button
        className={`tab-btn ${activeTab === 'status' ? 'active' : ''}`}
        onClick={() => setActiveTab('status')}
      >
        目前狀態
      </button>
    </div>

    <div className="git-panel-content">
      {activeTab === 'history' && (
        <GitHistory filePath={filePath} limit={10} />
      )}
      {activeTab === 'status' && (
        <GitStatusDisplay status={gitStatus} />
      )}
      {activeTab === 'diff' && (
        <DiffViewer hunks={diffHunks} filePath={filePath} />
      )}
    </div>
  </div>
)}
```

**Step 4: 新增 CSS 樣式**

```css
/* 在 MarkdownEditorStyles.css 中新增： */

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #f8f9fa;
  border-bottom: 1px solid #e2e8f0;
}

.git-toggle-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.git-toggle-btn:hover {
  background: #f1f5f9;
  color: #24292e;
}

.git-toggle-btn.active {
  background: #eff6ff;
  color: #3b82f6;
  border-color: #3b82f6;
}

.git-status-badge {
  font-size: 11px;
  font-weight: 600;
  background: #f97316;
  color: #ffffff;
  padding: 2px 6px;
  border-radius: 10px;
}

.git-panel {
  border-top: 1px solid #e2e8f0;
  background: #ffffff;
  max-height: 400px;
  overflow-y: auto;
}

.git-panel-tabs {
  display: flex;
  border-bottom: 1px solid #e2e8f0;
  background: #f8f9fa;
}

.git-panel-tabs .tab-btn {
  padding: 10px 16px;
  background: transparent;
  border: none;
  border-bottom: 2px solid transparent;
  color: #6b7280;
  cursor: pointer;
  transition: all 0.2s;
}

.git-panel-tabs .tab-btn:hover {
  color: #24292e;
}

.git-panel-tabs .tab-btn.active {
  color: #3b82f6;
  border-bottom-color: #3b82f6;
}

.git-panel-content {
  padding: 16px;
}
```

**Step 5: 提交**

```bash
git add app-react/src/components/MarkdownEditor/MarkdownEditor.tsx app-react/src/components/MarkdownEditor/MarkdownEditorStyles.css
git commit -m "feat: integrate Git panel into MarkdownEditor"
```

---

## 任務 8: GitStatusDisplay 組件

**檔案：**
- 新增: `app-react/src/components/GitDiff/GitStatusDisplay.tsx`

**Step 1: 創建 GitStatusDisplay 組件**

```typescript
/**
 * Git Status Display Component
 *
 * Shows current git repository status
 */

import React from 'react';
import type { GitStatusResult, GitFileChange } from '../../types/git';
import { File, GitCommit, GitPullRequest, AlertCircle } from 'lucide-react';
import './GitStatusDisplay.css';

interface GitStatusDisplayProps {
  status: GitStatusResult | null;
}

export function GitStatusDisplay({ status }: GitStatusDisplayProps) {
  if (!status || !status.results) {
    return (
      <div className="git-status-empty">
        <AlertCircle size={32} />
        <p>無法獲取 Git 狀態</p>
      </div>
    );
  }

  const changes = status.results.filter(r => r.type === 'file');
  const renames = status.results.filter(r => r.type === 'rename');

  const getStatusIcon = (fileStatus: string) => {
    switch (fileStatus.charAt(0)) {
      case 'A': return '📝 新增';
      case 'M': return '📝 修改';
      case 'D': return '📝 刪除';
      case 'R': return '📝 重命名';
      case '?': return '❓ 未追蹤';
      default: return '❓ 未知';
    }
  };

  const getStatusClass = (fileStatus: string) => {
    const status = fileStatus.charAt(0);
    return `status-${status}`;
  };

  return (
    <div className="git-status-display">
      <div className="git-status-summary">
        <GitCommit size={18} />
        <span>
          {changes.length} 個檔案變更
          {renames.length > 0 && ` • ${renames.length} 個重命名`}
        </span>
      </div>

      {changes.length === 0 && renames.length === 0 ? (
        <div className="git-status-clean">
          <p>✓ 工作目錄是乾淨的</p>
        </div>
      ) : (
        <div className="git-status-changes">
          <h4>變更的檔案</h4>
          <div className="changes-list">
            {changes.map((change, index) => (
              <div
                key={index}
                className={`change-item ${getStatusClass(change.status)}`}
              >
                <File size={16} />
                <span className="change-path">{change.path}</span>
                <span className="change-status">{getStatusIcon(change.status)}</span>
              </div>
            ))}
            {renames.map((change, index) => (
              <div
                key={`rename-${index}`}
                className="change-item status-R"
              >
                <File size={16} />
                <span className="change-path">
                  {change.oldPath} → {change.newPath}
                </span>
                <span className="change-status">📝 重命名</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

**Step 2: 創建 CSS**

```css
.git-status-display {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.git-status-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 32px;
  color: #6b7280;
}

.git-status-summary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
  font-weight: 500;
  color: #24292e;
}

.git-status-clean {
  padding: 20px;
  text-align: center;
  color: #059669;
  font-weight: 500;
}

.git-status-changes h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #24292e;
}

.changes-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.change-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: 4px;
  font-size: 13px;
}

.change-item.status-A {
  border-left: 3px solid #059669;
}

.change-item.status-M {
  border-left: 3px solid #f97316;
}

.change-item.status-D {
  border-left: 3px solid #dc2626;
}

.change-item.status-R {
  border-left: 3px solid #8b5cf6;
}

.change-item.status-? {
  border-left: 3px solid #6b7280;
  opacity: 0.7;
}

.change-path {
  flex: 1;
  font-family: 'SF Mono', 'Monaco', monospace;
  color: #24292e;
}

.change-status {
  font-size: 12px;
  white-space: nowrap;
}
```

**Step 3: 提交**

```bash
git add app-react/src/components/GitDiff/GitStatusDisplay.tsx app-react/src/components/GitDiff/GitStatusDisplay.css
git commit -m "feat: add GitStatusDisplay component"
```

---

## 任務 9: WebSocket 整合

**檔案：**
- 修正: `server/services/gitService.js` (連接 agentService)
- 新增: `app-react/src/services/gitWebSocket.ts`

**Step 1: 更新 GitService 以發送進度**

```javascript
// 在 gitService.js constructor 中新增：
constructor(repoPath, agentService = null) {
  this.repoPath = repoPath;
  this.gitDir = path.join(repoPath, '.git');
  this.agentService = agentService;
}

// 更新 emitProgress 方法：
emitProgress(data, isError = false) {
  console.log(`[GitService] ${isError ? 'Error' : 'Progress'}:`, data);
  if (this.agentService && this.agentService.emitGitProgress) {
    this.agentService.emitGitProgress(data, isError);
  }
}
```

**Step 2: 在 agentService 中新增方法**

```javascript
// 在 agentService.js 中新增：
emitGitProgress(data, isError = false) {
  io.emit('git-progress', {
    type: isError ? 'error' : 'progress',
    data,
    timestamp: new Date().toISOString()
  });
}
```

**Step 3: 前端 WebSocket 監聽**

```typescript
/**
 * Git WebSocket Service
 *
 * Listens for git operation progress
 */

import type { GitOperation } from '../types/git';

export type GitProgressListener = (operation: GitOperation) => void;

class GitWebSocketService {
  private listeners: Set<GitProgressListener> = new Set();

  connect() {
    // 連接到現有的 WebSocket (共享 agentService 連接)
    const socket = (window as any).io;
    if (!socket) {
      console.error('WebSocket not available');
      return;
    }

    socket.on('git-progress', (data: { type: string; data: any; timestamp: string }) => {
      this.listeners.forEach(listener => {
        listener({
          type: data.type === 'error' ? 'error' : 'progress',
          status: 'pending',
          result: data.data
        });
      });
    });
  }

  subscribe(listener: GitProgressListener) {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }
}

export const gitWebSocket = new GitWebSocketService();
```

**Step 4: 提交**

```bash
git add server/services/gitService.js server/services/agentService.js app-react/src/services/gitWebSocket.ts
git commit -m "feat: add WebSocket integration for git operations"
```

---

## 任務 10: Agent 整合

**檔案：**
- 新增: `app-react/src/store/slices/agentSlice.ts` (新增 git 相關 actions)

**Step 1: 新增 Agent Git Actions**

```typescript
// 在 agentSlice.ts 中新增 async thunks：

export const agentGitStatus = createAsyncThunk(
  'agent/gitStatus',
  async (repoPath: string) => {
    const response = await axios.post('/api/agent/git/status', { repoPath });
    return response.data;
  }
);

export const agentGitLog = createAsyncThunk(
  'agent/gitLog',
  async (params: { repoPath: string; limit?: number; offset?: number }) => {
    const response = await axios.post('/api/agent/git/log', params);
    return response.data;
  }
);

export const agentGitDiff = createAsyncThunk(
  'agent/gitDiff',
  async (params: { repoPath: string; pathA: string; pathB: string }) => {
    const response = await axios.post('/api/agent/git/diff', params);
    return response.data;
  }
);

// 在 builder 中新增 cases：
builder
  .addCase(agentGitStatus.pending, (state) => {
    state.isLoading = true;
  })
  .addCase(agentGitStatus.fulfilled, (state, action) => {
    state.isLoading = false;
    // Store result in currentExecution for display
  })
  .addCase(agentGitStatus.rejected, (state, action) => {
    state.isLoading = false;
    state.errorMessage = action.error as string;
  });
```

**Step 2: 提交**

```bash
git add app-react/src/store/slices/agentSlice.ts
git commit -m "feat: add agent git actions"
```

---

## 任務 11: 測試與驗證

**檔案：**
- 新增: `app-react/src/components/GitDiff/__tests__/DiffViewer.test.tsx`
- 新增: `app-react/src/components/GitDiff/__tests__/GitHistory.test.tsx`

**Step 1: 安裝測試依賴**

```bash
cd /home/flexy/workspace/app-react
pnpm add -D @testing-library/react @testing-library/jest-dom @testing-library/user-event
```

**Step 2: DiffViewer 測試**

```typescript
/**
 * DiffViewer tests
 */

import { render, screen } from '@testing-library/react';
import { DiffViewer } from '../DiffViewer';
import type { DiffHunk } from '../../../types/git';

const mockHunks: DiffHunk[] = [
  {
    oldStart: 1,
    oldCount: 2,
    newStart: 1,
    newCount: 3,
    lines: [
      { type: 'context', content: 'function test() {', oldNumber: 1, newNumber: 1 },
      { type: 'removed', content: '  return old;', oldNumber: 2 },
      { type: 'added', content: '  return new;', newNumber: 2 },
      { type: 'added', content: '  const added = true;', newNumber: 3 }
    ]
  }
];

describe('DiffViewer', () => {
  it('should render diff hunks', () => {
    render(<DiffViewer hunks={mockHunks} filePath="test.md" />);
    expect(screen.getByText('test.md')).toBeInTheDocument();
  });

  it('should show empty state when no hunks', () => {
    render(<DiffViewer hunks={[]} />);
    expect(screen.getByText('無法顯示差異')).toBeInTheDocument();
  });
});
```

**Step 3: GitHistory 測試**

```typescript
/**
 * GitHistory tests
 */

import { render, screen, waitFor } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { GitHistory } from '../GitHistory';
import gitReducer from '../../../store/slices/gitSlice';

const mockStore = configureStore({
  reducer: {
    git: gitReducer
  },
  preloadedState: {
    git: {
      status: null,
      commits: [
        {
          hash: 'abc123',
          author: 'Test User',
          date: '2024-01-01T00:00:00Z',
          message: 'Test commit',
          files: ['test.md']
        }
      ],
      branches: [],
      currentBranch: null,
      isLoading: false,
      errorMessage: null
    }
  }
});

describe('GitHistory', () => {
  it('should render commit list', () => {
    render(
      <Provider store={mockStore}>
        <GitHistory limit={10} />
      </Provider>
    );
    expect(screen.getByText('Test commit')).toBeInTheDocument();
  });

  it('should show empty state when no commits', () => {
    const emptyStore = configureStore({
      reducer: { git: gitReducer },
      preloadedState: {
        git: {
          status: null,
          commits: [],
          branches: [],
          currentBranch: null,
          isLoading: false,
          errorMessage: null
        }
      }
    });

    render(
      <Provider store={emptyStore}>
        <GitHistory limit={10} />
      </Provider>
    );
    expect(screen.getByText('暫無提交記錄')).toBeInTheDocument();
  });
});
```

**Step 4: 執行測試**

```bash
cd /home/flexy/workspace/app-react
pnpm test
```

**Step 5: 提交**

```bash
git add app-react/src/components/GitDiff/__tests__/ app-react/package.json app-react/package-lock.json
git commit -m "test: add Git component tests"
```

---

## 任務 12: 文件更新

**檔案：**
- 修正: `docs/solved_issues.md` (新增 Git 功能項目)

**Step 1: 新增已解決問題記錄**

```markdown
## Git Diff 整合

### 功能描述
在 Markdown Editor 中整合 Git Diff 功能，允許用戶檢視檔案版本歷史和差異。

### 實作方式
1. 在編輯器右上方點擊 Git 分支圖示
2. 選擇「歷史記錄」標籤查看提交歷史
3. 選擇「差異比對」標籤查看檔案變更
4. 選擇「目前狀態」標籤查看工作目錄狀態

### 技術實作
- 後端: GitService + Socket.IO 進度發送
- 後端: React + Redux Toolkit
- Diff 覍視: react-diff-viewer
```

**Step 2: 提交**

```bash
git add docs/solved_issues.md
git commit -m "docs: add Git diff integration feature"
```

---

## 任務 13: 縂合測試

**檔案：**
- 無需新增檔案

**Step 1: 執行完整測試流程**

```bash
# 1. 啟動 server
cd /home/flexy/workspace/server
pnpm dev &

# 2. 構建前端
cd /home/flexy/workspace/app-react
pnpm build

# 3. 執行前端
pnpm dev &

# 4. 在瀏覽器中測試
# - 打開 http://localhost:5173
# - 選擇任意 Markdown 檔案
# - 點擊 Git 圖示
# - 查看歷史記錄
# - 查看檔案差異
# - 查看目前狀態

# 5. 執行 lint
pnpm lint

# 6. 執行測試
pnpm test
```

**Step 2: 確認所有功能正常**

確認以下功能正常運作：
- [ ] Git 狀態 API 回傳正確
- [ ] 歷史記錄正確顯示
- [ ] DiffViewer 正確顯示差異
- [ ] WebSocket 進度發送正常
- [ ] Lint 無錯誤
- [ ] 測試通過

**Step 3: 最後提交**

```bash
git add -A
git commit -m "feat: complete Git diff integration"

# 創建 tag
git tag -a v1.1.0-git-diff -m "Add Git diff integration feature"
```

---

## 執行檢查清單

完成上述所有任務後，確認以下檢查點：

### 後端檢查
- [ ] `/api/git/status` 回傳正確的 git 狀態
- [ ] `/api/git/log` 回傳提交歷史
- [ ] `/api/git/diff` 回傳檔案差異
- [ ] `/api/git/branches` 回傳分支列表
- [ ] WebSocket `git-progress` 事件正確發送
- [ ] 所有 API 錯由都有錯誤處理

### 後端檢查
- [ ] GitState 正確管理在 Redux store
- [ ] Git API 函數正確呼叫後端
- [ ] DiffViewer 正確顯示 diff
- [ ] GitHistory 正確顯示提交列表
- [ ] GitStatusDisplay 正確顯示狀態
- [ ] MarkdownEditor 整合 Git 面板
- [ ] 所有組件 TypeScript 無錯誤

### 整合檢查
- [ ] Agent 能夠透過指令執行 git 操作
- [ ] WebSocket 進度正確顯示
- [ ] 錯誤處理正確
- [ ] 用戶體驗良好

### 測試檢查
- [ ] 所有單元測試通過
- [ ] 組件測試覆蓋率 > 80%
- [ ] E2E 測試場景完整

---

**計劃完成並已儲存至 `project/plans/2026-02-13-git-diff-integration.md`。**

**兩種執行選項：**

1. **本會話 Subagent-Driven** - 我在本會話中逐個任務執行，每個任務後進行代碼審查
2. **獨立會話 Parallel** - 開啟新會話使用 @superpowers:executing-plans，批次執行並設置檢查點

**請選擇您希望的執行方式？**
