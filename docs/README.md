# CoSpec AI Markdown 編輯應用文檔

## 文檔結構

- [requirements.md](requirements.md) - 應用功能需求規格
- [solved_issues.md](solved_issues.md) - 已解決問題清單
- [改善計劃.md](改善計劃.md) - 應用改善計劃
- [changelogs/](changelogs/) - 變更記錄
  - [README.md](changelogs/README.md) - 變更記錄說明
  - [2025-10-10-improvements.md](changelogs/2025-10-10-improvements.md) - 2025年10月10日改進記錄
- [cloudflare-migration/](cloudflare-migration/) - Cloudflare SaaS 遷移規格文檔
  - [saas-migration-spec.md](cloudflare-migration/saas-migration-spec.md) - SaaS 遷移規格
  - [data-model.md](cloudflare-migration/data-model.md) - 數據模型設計
  - [architecture-diagram-fixed.md](cloudflare-migration/architecture-diagram-fixed.md) - 架構圖
  - [migration-strategy.md](cloudflare-migration/migration-strategy.md) - 遷移策略

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
