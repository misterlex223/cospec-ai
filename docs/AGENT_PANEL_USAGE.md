# Agent Panel 前端使用指南

本文件說明如何在 CoSpec AI 前端使用 Agent Panel 功能。

## 功能概述

Agent Panel 是一個浮動面板，讓用戶在編輯器中快速執行 AI Agent 來分析當前文件。

## 使用方式

### 1. 開啟 Agent Panel

在主編輯器頁面（`/edit/*`）的標題列右側，點擊 **Bot 圖示** (🤖) 來開啟或關閉 Agent Panel。

```typescript
// EditorPage.tsx - Bot icon 按鈕
<button
  style={{ padding: '0.25rem', borderRadius: '0.25rem', cursor: 'pointer', marginLeft: '0.5rem' }}
  onClick={() => dispatch(togglePanel())}
  title="AI Agent Panel"
>
  <Bot size={20} />
</button>
```

### 2. Agent Panel 組件

Agent Panel (`components/AgentPanel/index.tsx`) 包含以下功能：

#### 2.1 選擇 Agent 類型

使用 `AgentSelector` 組件選擇要執行的 Agent 類型：

| Agent 類型 | 說明 |
|-----------|------|
| `prd-analyzer` | 分析 PRD 的完整性、清晰度、可行性 |
| `code-reviewer` | 代碼審查（安全性、品質、效能） |
| `doc-generator` | 從程式碼生成 API 文檔、使用指南 |
| `version-advisor` | 根據 SemVer 建議版本號和發布策略 |

```typescript
// AgentSelector.tsx
const AGENT_OPTIONS = [
  { type: 'prd-analyzer', label: 'PRD Analyzer', ... },
  { type: 'code-reviewer', label: 'Code Reviewer', ... },
  { type: 'doc-generator', label: 'Doc Generator', ... },
  { type: 'version-advisor', label: 'Version Advisor', ... }
];
```

#### 2.2 進階選項

點擊「顯示進階選項」可以展開自訂 Prompt 輸入框：

```typescript
// 進階選項狀態
const [showAdvanced, setShowAdvanced] = useState(false);
const [customPrompt, setCustomPrompt] = useState('');
```

#### 2.3 執行 Agent

使用 `QuickRunButton` 執行選定的 Agent：

```typescript
// 執行處理函數
const handleRun = async () => {
  if (!selectedAgent || !filePath) return;

  try {
    const result = await dispatch(executeAgent({
      agentType: selectedAgent,
      targetFiles: [filePath],
      customPrompt: showAdvanced ? customPrompt : undefined
    })).unwrap();

    toast.success('Agent 已啟動');
  } catch (error: any) {
    toast.error(error.message || 'Agent 執行失敗');
  }
};
```

### 3. Agent Workbench (獨立工作台)

訪問 `/#/agent/workbench` 可以查看 Agent 執行歷史和統計資訊。

#### 3.1 AgentStatsPanel

顯示統計資訊：

```typescript
// AgentStatsPanel.tsx
const stats = useSelector((state: RootState) => state.agent.stats);

// 顯示內容：
// - 總執行次數 (stats.totalExecutions)
// - 成功率 (stats.successRate * 100)%
// - 平均執行時間 (stats.avgDuration / 1000) 秒
```

#### 3.2 AgentHistoryList

顯示執行記錄列表，支援：

- 查看執行詳情（導航到結果頁面）
- 刪除執行記錄

```typescript
// AgentHistoryList.tsx
const executions = useSelector((state: RootState) => state.agent.executions);

// 導航到結果頁面
const navigateToResult = (id: string) => {
  window.location.hash = `#/agent/result/${id}`;
};

// 刪除執行記錄
const handleDelete = async (id: string) => {
  if (!window.confirm('確定要刪除此記錄？')) return;
  await dispatch(deleteAgentExecution(id)).unwrap();
};
```

### 4. Agent Result Page (結果詳情)

訪問 `/#/agent/result/:id` 查看單筆執行的詳細結果。

#### 4.1 AgentOutputViewer

顯示執行結果：

```typescript
// AgentOutputViewer.tsx
const execution = useSelector((state: RootState) =>
  state.agent.executions.find(e => e.id === id)
);

// 顯示內容：
// - Agent 類型
// - 目標檔案
// - 執行時間
// - 執行狀態
// - 執行時間長度
// - 輸出內容
// - 錯誤訊息（如有）
```

#### 4.2 匯出功能

```typescript
// 匯出為 Markdown
const handleExport = async (format: 'markdown' | 'pdf') => {
  const response = await fetch(`/api/agent/export/${id}?format=${format}`);
  const data = await response.json();

  if (data.downloadUrl) {
    const a = document.createElement('a');
    a.href = data.downloadUrl;
    a.download = `agent-result-${id}.${format === 'markdown' ? 'md' : 'pdf'}`;
    a.click();
  }
};
```

## Redux 狀態管理

### Agent Slice

`store/slices/agentSlice.ts` 管理 Agent 相關狀態：

```typescript
interface AgentState {
  executions: AgentExecution[];        // 執行記錄列表
  currentExecution: AgentExecution | null;  // 當前執行中任務
  stats: AgentStats | null;           // 統計資訊
  isPanelOpen: boolean;                // 側邊 Panel 開關狀態
  filter: AgentFilter;                 // 列表篩選條件
  isLoading: boolean;                  // 載入中狀態
  errorMessage: string | null;          // 錯誤訊息
}
```

### 主要 Actions

```typescript
import {
  togglePanel,      // 切換 Panel 開關
  openPanel,        // 開啟 Panel
  closePanel,       // 關閉 Panel
  setFilter,        // 設置篩選條件
  clearFilter,      // 清除篩選條件
  addExecution,     // 新增執行記錄
  updateExecution,  // 更新執行記錄
  setCurrentExecution // 設置當前執行
} from '../../store/slices/agentSlice';
```

### Async Thunks

```typescript
import {
  fetchAgentHistory,    // 獲取執行歷史
  executeAgent,         // 執行 Agent
  deleteAgentExecution, // 刪除執行記錄
  fetchAgentExecution   // 獲取單筆執行記錄
} from '../../store/slices/agentSlice';
```

## 路由結構

```typescript
// App.tsx
<Routes>
  <Route path="/agent/workbench" element={<AgentWorkbenchPage />} />
  <Route path="/agent/result/:id" element={<AgentResultPage />} />
</Routes>
```

## 樣式說明

### Agent Panel 樣式

`components/AgentPanel/agent-panel.css` 定義 Panel 樣式：

```css
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
```

### Workbench 頁面標式

`pages/agent-workbench-page.css` 定義工作台頁面標式：

```css
.agent-workbench-page {
  min-height: 100vh;
  background: #f9fafb;
  padding: 2rem;
}

.workbench-container {
  max-width: 1200px;
  margin: 0 auto;
}
```

### Output Viewer 樣式

`components/AgentResult/output-viewer.css` 定義結果查看器標式：

```css
.output-viewer {
  min-height: 100vh;
  background: #f9fafb;
}

.output-viewer-content {
  max-width: 900px;
  margin: 2rem auto;
  padding: 0 2rem;
}
```

## 開發範例

### 在自訂組件中使用 Agent

```typescript
import { useDispatch, useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../../store';
import { togglePanel, executeAgent } from '../../store/slices/agentSlice';

export function MyComponent() {
  const dispatch = useDispatch<AppDispatch>();
  const isPanelOpen = useSelector((state: RootState) => state.agent.isPanelOpen);

  const handleExecuteAgent = async (agentType: AgentType, filePath: string) => {
    try {
      await dispatch(executeAgent({
        agentType,
        targetFiles: [filePath],
        customPrompt: '自訂指令...'
      })).unwrap();
    } catch (error) {
      console.error('Agent 執行失敗:', error);
    }
  };

  return (
    <div>
      <button onClick={() => dispatch(togglePanel())}>
        {isPanelOpen ? '關閉 Agent Panel' : '開啟 Agent Panel'}
      </button>
    </div>
  );
}
```

## 注意事項

1. **檔案路徑**：Agent 只能分析位於允許目錄內的檔案（`MARKDOWN_DIR`、`./specs/`、`./docs/`）

2. **執行時間**：每次 Agent 執行最多 5 分鐘

3. **同時執行**：同時最多執行 3 個 Agent

4. **重試機制**：失敗後會自動重試最多 3 次

5. **結果儲存**：執行結果儲存在 `.agent-output/` 目錄

---

**文件版本**: 1.0.0
**最後更新**: 2026-02-13
