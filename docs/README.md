# Vditor Markdown 編輯應用文檔

## 文檔結構

- [requirements.md](requirements.md) - 應用功能需求規格
- [solved_issues.md](solved_issues.md) - 已解決問題清單

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

Markdown 編輯器組件，負責初始化 Vditor 編輯器、加載文件內容和保存文件。

- 路徑：`/app-react/src/components/MarkdownEditor/MarkdownEditor.tsx`
- 相關問題：
  - [首次加載文件內容不顯示](solved_issues.md#31-首次加載文件內容不顯示)
  - [Vditor 配置錯誤](solved_issues.md#32-vditor-配置錯誤)

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
