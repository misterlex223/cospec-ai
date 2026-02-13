# Agent Panel 設計文檔

**日期**: 2026-02-13
**狀態**: 設計完成，待實作
**作者**: Claude AI

---

## 1. 概述

### 1.1 目標

為 CoSpec AI 新增 **Agent Panel 功能**，讓用戶可以：

1. 在主編輯器中快速呼叫 AI Agent 執行任務
2. 在獨立工作台管理 Agent 執行歷史
3. 查看 Agent 執行結果和統計資訊
4. 匯出 Agent 執行結果

### 1.2 Agent 類型

- **PRD Analyzer** - 分析 PRD 的完整性、清晰度、可行性
- **Code Reviewer** - 代碼審查（安全性、品質、效能）
- **Doc Generator** - 從程式碼生成 API 文檔、使用指南
- **Version Advisor** - 根據 SemVer 建議版本號和發布策略

---

## 2. 架構設計

### 2.1 路由結構 (Router-Based)

```typescript
/                          → EditorPage（主編輯器）
/edit                      → EditorPage（主編輯器）
/agent/workbench           → AgentWorkbenchPage（獨立工作台）
/agent/result/:id          → AgentResultPage（執行結果詳情）
```

**設計原則**：
- Agent 功能完全獨立，不干擾現有編輯器邏輯
- 支援直接分享連結（例如：`/#/agent/result/123`）
- 未來可擴展為獨立微應用

### 2.2 App.tsx 修改

```tsx
<Routes>
  <Route path="/" element={<Navigate to="/edit" replace />} />
  <Route path="/edit" element={<EditorPage />} />
  <Route path="/edit/*" element={<EditorPage />} />
  <Route path="/agent/workbench" element={<AgentWorkbenchPage />} />
  <Route path="/agent/result/:id" element={<AgentResultPage />} />
</Routes>
```

### 2.3 EditorPage 內嵌

- 右側新增可收合的 Agent Panel（類似 VS Code 側邊欄）
- 點擊執行後跳轉到 `/agent/result/:id` 查看詳情

---

## 3. 元件結構

### 3.1 元件樹

```
pages/
  AgentWorkbenchPage.tsx          （獨立工作台頁面）
  AgentResultPage.tsx             （執行結果詳情頁面）

components/
  AgentPanel/
    index.tsx                   （編輯器內側邊 Panel）
    AgentSelector.tsx            （Agent 選擇器）
    QuickRunButton.tsx           （快速執行按鈕）
    AdvancedOptions.tsx           （進階選項）
    AgentProgress.tsx            （執行進度顯示）

  AgentWorkbench/
    AgentStatsPanel.tsx          （統計面板）
    AgentHistoryList.tsx         （執行記錄列表）
    AgentHistoryItem.tsx         （單筆記錄項目）
    AgentStatusBadge.tsx         （狀態標籤）
    AgentExportButton.tsx        （匯出按鈕）

  AgentResult/
    AgentResultHeader.tsx        （標題區塊）
    AgentOutputViewer.tsx        （輸出內容查看器）
    AgentMetadata.tsx            （元資料）
    AgentActionButtons.tsx      （操作按鈕）
```

### 3.2 Redux State 結構

```typescript
// store/slices/agentSlice.ts

interface AgentState {
  executions: AgentExecution[];        // 執行記錄列表
  currentExecution: AgentExecution | null;  // 當前執行中任務
  stats: AgentStats;                   // 統計資訊
  isPanelOpen: boolean;                // 側邊 Panel 開關狀態
  filter: AgentFilter;                 // 列表篩選條件
}

interface AgentExecution {
  id: string;
  agentType: 'prd-analyzer' | 'code-reviewer' | 'doc-generator' | 'version-advisor';
  targetFiles: string[];
  status: 'pending' | 'running' | 'success' | 'failed';
  summary: string;                  // 簡短摘要（儲存在 DB）
  outputFilePath: string | null;     // 完整輸出檔案路徑
  startTime: string;
  endTime?: string;
  duration?: number;                // 執行時間（毫秒）
  error?: string;
  retryCount: number;
  customPrompt?: string;            // 用戶自訂 prompt
}

interface AgentStats {
  totalExecutions: number;
  successCount: number;
  failedCount: number;
  successRate: number;
  avgDuration: number;
  byType: {
    'prd-analyzer': number;
    'code-reviewer': number;
    'doc-generator': number;
    'version-advisor': number;
  };
}

interface AgentFilter {
  agentType?: string;
  status?: string;
  dateRange?: { start: string; end: string };
  searchQuery?: string;
}
```

### 3.3 視覺風格

**極簡風格**：
- 使用 Tailwind CSS 灰色系為主
- 圓角、陰影效果與現有 ProfileEditor 一致
- 側邊 Panel 寬度固定 400px，可收合

---

## 4. 後端 API 設計

### 4.1 Agent 執行端點

```javascript
POST /api/agent/execute

Request:
{
  "agentType": "prd-analyzer" | "code-reviewer" | "doc-generator" | "version-advisor",
  "targetFiles": ["SPEC.md"],           // 目標檔案（相對於 MARKDOWN_DIR）
  "customPrompt": string | undefined,   // 進階選項：自訂 prompt
  "outputPath": string | undefined     // 可選：指定輸出檔案路徑
}

Response:
{
  "executionId": "uuid",
  "status": "running",
  "message": "Agent execution started"
}
```

### 4.2 執行歷史端點

```javascript
GET /api/agent/history?limit=20&offset=0&agentType=prd-analyzer&status=success

Response:
{
  "executions": AgentExecution[],
  "total": 150,
  "stats": {
    "totalExecutions": 150,
    "successRate": 0.92,
    "avgDuration": 45000,
    "byType": {
      "prd-analyzer": 45,
      "code-reviewer": 38,
      "doc-generator": 42,
      "version-advisor": 25
    }
  }
}

GET /api/agent/history/:id

Response: AgentExecution（包含完整 outputFilePath）

DELETE /api/agent/history/:id

Response: { "success": true }
```

### 4.3 匯出端點

```javascript
GET /api/agent/export/:id?format=markdown|pdf

Response:
{
  "downloadUrl": "/downloads/agent-result-123.pdf"
}
```

### 4.4 Agent 執行服務

**檔案**: `server/agentService.js`

```javascript
class AgentService {
  constructor(io, db) {
    this.io = io;              // Socket.IO 實例
    this.db = db;              // SQLite 資料庫
    this.allowedDirs = [       // 允許的目錄
      process.env.MARKDOWN_DIR,
      '/specs',
      '/docs'
    ];
  }

  // 執行 Agent
  async executeAgent(agentType, targetFiles, options = {}) {
    // 1. 驗證檔案路徑在允許的目錄內
    const validatedPaths = this.validateFilePaths(targetFiles);

    // 2. 生成執行 ID
    const executionId = generateUUID();

    // 3. 建立執行記錄
    const execution = {
      id: executionId,
      agentType,
      targetFiles: validatedPaths,
      status: 'running',
      startTime: new Date().toISOString(),
      retryCount: 0
    };
    await this.db.insert(execution);

    // 4. 透過 WebSocket 推送狀態
    this.emitStatusUpdate(execution);

    // 5. 呼叫 Agent SDK（使用 child_process.spawn）
    const agentProcess = spawn('node', [
      './agents/index.js',
      `--agent=${agentType}`,
      `--files=${validatedPaths.join(',')}`,
      `--output=.agent-output/${executionId}.md`,
      options.customPrompt ? `--prompt=${options.customPrompt}` : ''
    ]);

    // 6. 處理輸出並儲存
    let output = '';
    agentProcess.stdout.on('data', (data) => {
      output += data.toString();
      this.emitProgress(executionId, output);
    });

    agentProcess.on('close', async (code) => {
      if (code === 0) {
        // 成功：儲存完整輸出
        await this.saveOutput(executionId, output);
        await this.updateStatus(executionId, 'success');
        this.emitComplete(executionId, { outputFilePath: `.agent-output/${executionId}.md` });
      } else {
        // 失敗：儲存錯誤並重試
        await this.handleError(executionId, output);
        await this.retryIfNeeded(executionId);
      }
    });
  }

  // 自動重試機制（最多 3 次）
  async retryIfNeeded(executionId) {
    const execution = await this.db.findById(executionId);
    if (execution.retryCount < 3) {
      execution.retryCount++;
      await this.db.update(execution);
      await this.executeAgent(execution.agentType, execution.targetFiles, {
        retryCount: execution.retryCount
      });
    }
  }

  // 檔案路徑驗證
  validateFilePaths(filePaths, allowedDirectories) {
    return filePaths.filter(path => {
      const fullPath = resolve(process.env.MARKDOWN_DIR, path);
      return allowedDirectories.some(dir => fullPath.startsWith(dir));
    });
  }
}
```

### 4.5 WebSocket 事件

```javascript
// server → client
'agent-status-update': {
  executionId, status, progress, summary
}

'agent-complete': {
  executionId, result, outputFilePath
}

'agent-error': {
  executionId, error, retryCount
}

'agent-progress': {
  executionId, output, timestamp
}
```

---

## 5. 資料儲存設計

### 5.1 SQLite 資料庫結構

**檔案**: `server/agent-history.db`

```sql
CREATE TABLE agent_executions (
  id TEXT PRIMARY KEY,
  agent_type TEXT NOT NULL,
  target_files TEXT NOT NULL,          -- JSON array
  status TEXT NOT NULL,
  summary TEXT,                       -- 簡短摘要
  output_file_path TEXT,
  start_time TEXT NOT NULL,
  end_time TEXT,
  duration INTEGER,
  error TEXT,
  retry_count INTEGER DEFAULT 0,
  custom_prompt TEXT,
  created_at TEXT DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_agent_type ON agent_executions(agent_type);
CREATE INDEX idx_status ON agent_executions(status);
CREATE INDEX idx_start_time ON agent_executions(start_time);
```

### 5.2 檔案系統儲存

**目錄**: `.agent-output/`

```
.agent-output/
  ├── {execution-id-1}.md      -- 完整輸出
  ├── {execution-id-2}.md
  └── ...
```

---

## 6. 功能需求

### 6.1 主編輯器整合

- **右鍵選單整合**：在 FileTree 的檔案右鍵選單中加入「🤖 使用 Agent 分析」
- **側邊 Panel**：可收合的 Agent Panel，顯示執行進度
- **快速跳轉**：執行完成後可跳轉到結果頁面

### 6.2 智能參數配置

- **簡化模式（預設）**：
  - 選擇 Agent 類型
  - 自動讀取當前檔案內容
  - 一鍵執行

- **進階選項（可展開）**：
  - 自訂 prompt
  - 選擇多個檔案
  - 指定輸出路徑

### 6.3 獨立工作台

- **執行記錄列表**：顯示所有 Agent 執行歷史
- **篩選功能**：按 Agent 類型、狀態、時間範圍篩選
- **統計面板**：使用次數、平均執行時間、成功率

### 6.4 執行結果詳情

- **輸出查看器**：Markdown 渲染顯示 Agent 輸出
- **元資料**：執行時間、Token 使用量、目標檔案
- **操作按鈕**：重新執行、匯出、關閉

### 6.5 匯出功能

- **格式支援**：Markdown、PDF
- **匯出範圍**：單筆記錄、多筆記錄、全部記錄
- **下載連結**：生成臨時下載連結

### 6.6 錯誤處理

- **顯示錯誤**：在 UI 顯示友善的錯誤訊息
- **儲存記錄**：將錯誤堆疊儲存在資料庫
- **自動重試**：失敗後自動重試 1-3 次

---

## 7. 安全性考量

### 7.1 檔案路徑驗證

- Agent 只能讀取配置的允許目錄內的檔案
- 防止路徑遍歷攻擊（`../../../etc/passwd`）

### 7.2 執行時間限制

- 單次 Agent 執行最長 5 分鐘
- 超時自動終止程序

### 7.3 資源限制

- 同時最多執行 3 個 Agent
- 佇列管理超出限制的請求

---

## 8. 測試策略

### 8.1 單元測試

- AgentService 執行邏輯
- 檔案路徑驗證
- 重試機制

### 8.2 整合測試

- API 端點測試
- WebSocket 事件測試
- 資料庫操作測試

### 8.3 E2E 測試

- 完整執行流程：從編輯器呼叫 Agent → 查看結果
- 匯出功能測試
- 錯誤處理測試

---

## 9. 實作優先順序

1. **Phase 1**: 後端 API + AgentService
2. **Phase 2**: Redux slice + 基礎元件
3. **Phase 3**: AgentPanel（編輯器整合）
4. **Phase 4**: AgentWorkbenchPage（獨立工作台）
5. **Phase 5**: AgentResultPage（結果詳情）
6. **Phase 6**: 匯出功能
7. **Phase 7**: 統計面板
8. **Phase 8**: 測試與優化

---

## 10. 未來擴展

- [ ] 支援自訂 Agent 類型
- [ ] Agent 鏈（多個 Agent 串接執行）
- [ ] 定時執行（cron jobs）
- [ ] Agent 模板庫
- [ ] 協作執行（多用戶共享 Agent 結果）
