# CoSpec AI Markdown 編輯應用文檔

## 文檔結構

### 功能文件
- [AGENT_PANEL.md](AGENT_PANEL.md) - Agent Panel 功能完整文件（架構、API、開發指南）
- [AGENT_PANEL_USAGE.md](AGENT_PANEL_USAGE.md) - Agent Panel 前端使用指南
- [requirements.md](requirements.md) - 應用功能需求規格
- [solved_issues.md](solved_issues.md) - 已解決問題清單
- [改善計劃.md](改善計劃.md) - 應用改善計劃

### 計劃文件
- [plans/](../project/plans/) - 開發計劃文件
  - [2026-02-13-agent-panel-design.md](../project/plans/2026-02-13-agent-panel-design.md) - Agent Panel 設計文件
  - [2026-02-13-agent-panel-implementation.md](../project/plans/2026-02-13-agent-panel-implementation.md) - Agent Panel 實作計劃

### 變更記錄
- [changelogs/](changelogs/) - 變更記錄
  - [README.md](changelogs/README.md) - 變更記錄說明
  - [2025-10-10-improvements.md](changelogs/2025-10-10-improvements.md) - 2025年10月10日改進記錄

## 代碼標記

代碼中使用了標記註解來關聯程式區塊和文檔，格式如下：

```typescript
/**
 * 組件或函數描述
 * @see /docs/solved_issues.md#問題錨點 - 已解決問題參考
 * @see /docs/requirements.md#需求錨點 - 需求規格參考
 */
```

## 主要組件

### Agent Panel 功能

CoSpec AI 整合了 AI Agent 功能，讓用戶可以快速執行 AI Agent 來分析文件。

**支援的 Agent 類型：**
- **PRD Analyzer** - 分析產品需求文件的完整性、清晰度、可行性
- **Code Reviewer** - 代碼審查（安全性、品質、效能）
- **Doc Generator** - 從程式碼生成 API 文檔、使用指南
- **Version Advisor** - 根據 SemVer 建議版本號和發布策略

**功能特色：**
- 浮動面板快速執行
- 即時執行進度追蹤
- 獨立工作台管理執行歷史
- 結果匯出（Markdown、PDF）

詳細說明請參考 [AGENT_PANEL.md](AGENT_PANEL.md)

### 1. FileTree 組件

文件樹組件，負責顯示目錄結構、處理目錄展開/折疊和文件選擇。

- 路徑：`/app-react/src/components/FileTree/FileTree.tsx`
- 相關問題：
  - [文件樹展開狀態保持](solved_issues.md#21-文件樹展開狀態保持)
  - [文件樹展開閃爍問題](solved_issues.md#22-文件樹展開閃爍問題)

### 2. MarkdownEditor 組件

Markdown 編輯器組件，負責初始化 CoSpec AI Markdown 編輯器、加載文件內容和保存文件。

- 路徑：`/app-react/src/components/MarkdownEditor/MarkdownEditor.tsx`
- 相關問題：
  - [首次加載文件內容不顯示](solved_issues.md#31-首次加載文件內容不顯示)
  - [CoSpec AI 配置錯誤](solved_issues.md#32-cospec-ai-配置錯誤)

## 開發環境

### Vue 版本

使用 `docker-compose.yml` 啟動：

```bash
MARKDOWN_DIR=/path/to/markdown docker compose up
```

### React 版本

使用 `docker-compose-react-dev.yml` 啟動：

```bash
MARKDOWN_DIR=/path/to/markdown docker compose -f docker-compose-react-dev.yml up
```
