# CoSpec AI - Unified Server with npx Support

## 專案概述

CoSpec AI 是一個整合在 Kai 平台中的 Markdown 編輯應用，提供所見即所得的 Markdown 編輯體驗。該應用現在 operates as a unified server with both frontend and backend combined into a single Node.js application that can be launched with `npx cospec-ai`. It supports mounting local directories as Markdown file storage and has seamless integration with the Kai platform context system.

### 核心功能

- **樹狀文件瀏覽器**: 左側邊欄顯示所有 Markdown 文件的目錄結構
- **所見即所得編輯**: 基於 Vditor 的強大 Markdown 編輯器
- **即時預覽**: 支援分屏預覽和即時渲染
- **文件操作**: 創建、讀取、更新和刪除 Markdown 文件
- **實時同步**: 所有變更直接寫入主機文件系統
- **AI 集成**: 內建 AI 功能，支援總結、重寫、格式化、解釋等操作
- **上下文同步**: 自動將特定類型的文件同步到 Kai 平台的上下文系統
- **對話歷史**: 使用 FileSyncManager API 處理對話歷史和相關資訊
- **npx 支援**: 可直接使用 `npx cospec-ai` 命令啟動應用

### 技術架構

- **前端**: React + TypeScript + Vite + Redux Toolkit + React Router + Tailwind CSS
- **後端**: Node.js + Express + Socket.io + Chokidar (文件監控)
- **前端編輯器**: Vditor (所見即所得 Markdown 編輯器)
- **後端語言**: JavaScript/Node.js
- **統一伺服器**: Express server with static file serving and API endpoints
- **CLI 工具**: yargs for command-line argument parsing
- **資料庫**: 依賴於 FileSyncManager API 進行資料存儲和管理

## 建置與執行

### 使用 npx (推薦)

1. **直接啟動應用**:
   ```bash
   npx cospec-ai
   ```

2. **在瀏覽器中訪問應用**:
   ```
   http://localhost:9280
   ```

### 標準模式部署

1. **安裝依賴**:
   ```bash
   npm install
   ```

2. **構建前端**:
   ```bash
   npm run build
   ```

3. **啟動服務器**:
   ```bash
   npm start
   ```

### 開發模式部署

1. **啟動開發服務器**:
   ```bash
   npm run dev
   ```

2. **在瀏覽器中訪問應用**:
   ```
   http://localhost:3000
   ```

### 使用選項

- **指定端口**:
  ```bash
  npx cospec-ai --port 8080
  ```

- **指定 Markdown 目錄**:
  ```bash
  npx cospec-ai --markdown-dir /path/to/your/markdown/files
  ```

- **同時指定端口和目錄**:
  ```bash
  npx cospec-ai --port 8080 --markdown-dir ./my-docs
  ```

### 環境變數配置

| 變數名稱 | 預設值 | 說明 |
|----------|--------|------|
| `MARKDOWN_DIR` | `./markdown` | 指定存放 Markdown 文件的目錄 |
| `PORT` | 9280 | CoSpec AI 服務端口 (Unified server) |
| `NODE_ENV` | `production` | 運行環境 (production/dev) |
| `OPENAI_API_KEY` | (無) | OpenAI API 密鑰 (AI 功能用) |
| `OPENAI_BASE_URL` | `https://api.openai.com/v1` | OpenAI API 基礎 URL |
| `OPENAI_MODEL` | `gpt-3.5-turbo` | OpenAI 模型名稱 |
| `KAI_BACKEND_URL` | (無) | Kai 平台後端 URL (上下文同步用) |
| `KAI_PROJECT_ID` | (無) | Kai 平台專案 ID (上下文同步用) |


### 從原始碼建置

構建統一應用程序：

```bash
npm run build
```

此命令會構建前端 React 應用並複製到 server 的靜態服務目錄。

## 資料夾結構

```
.
├── app-react/                   # React 前端應用程式
│   ├── public/                  # 公共資源
│   ├── src/                     # 前端原始碼
│   │   ├── components/          # React 組件
│   │   ├── pages/               # 頁面組件
│   │   ├── services/            # API 服務
│   │   ├── store/               # Redux store
│   │   ├── utils/               # 工具函數
│   │   └── types/               # TypeScript 類型定義
│   ├── package.json             # 前端依賴
│   └── vite.config.ts           # Vite 配置
├── server/                      # Node.js 後端服務
│   ├── index.js                 # 主伺服器文件 (Unified server)
│   ├── fileSyncManager.js       # 文件同步管理器
│   ├── kaiContextClient.js      # Kai 上下文系統客戶端
│   ├── functionRegistry.js      # AI 函數註冊表
│   └── package.json             # 後端依賴
├── bin/                         # CLI 入口點
│   └── cospec-ai.js             # npx 入口點腳本
├── dist/                        # 前端構建輸出目錄 (Unified server static files)
├── build-frontend.js            # 前端構建腳本
├── markdown/                    # 預設的 Markdown 文件目錄
├── test-markdown/               # 測試用 Markdown 文件目錄
├── docs/                        # 文件資料夾
├── Dockerfile                   # Docker 構建文件
├── docker-compose.yml           # 標準模式的 Docker Compose 配置
├── docker-compose-dev.yml       # 開發模式的 Docker Compose 配置
├── docker-entrypoint.sh         # 容器入口點腳本
├── README.md                    # 說明文件
└── QWEN.md                      # 本說明文件
```

## 開發指南

### 前端開發

前端使用 React + TypeScript + Vite 框架，主要功能組件位於 `app-react/src` 目錄中：

- **頁面組件**: `app-react/src/pages/EditorPage.tsx` 是主要的編輯器頁面
- **API 服務**: `app-react/src/services/api.ts` 處理與後端的通訊
- **Redux Store**: `app-react/src/store/` 管理應用狀態
- **組件**: `app-react/src/components/` 包含可重用的 UI 組件

### 後端 API (Unified Server)

後端提供完整的 REST API 用於文件操作，現在在統一服務器中運行：

- **GET /api/files**: 獲取所有 Markdown 文件列表
- **GET /api/files/{path}**: 獲取特定文件內容
- **POST /api/files/{path}**: 保存文件內容
- **PUT /api/files/{path}**: 創建新文件
- **DELETE /api/files/{path}**: 刪除文件
- **PATCH /api/files/{path}**: 重命名文件
- **POST /api/files/refresh**: 重新整理文件緩存
- **POST /api/ai/chat**: AI 聊天功能
- **POST /api/ai/functions**: AI 功能（總結、重寫、格式化等）

### 統一服務器架構

- **單一端口**: 服務器在單一端口上運行 (默認 9280)
- **API 路由**: 所有 API 請求在 `/api/*` 路徑下處理
- **靜態文件**: 前端文件在所有其他路徑提供服務
- **WebSocket**: Socket.IO 處理實時文件變更通知

### 上下文同步機制

CoSpec AI 與 Kai 平台的上下文系統有深度整合：

- **自動同步**: 符合特定模式的文件會自動同步到上下文系統（如 `specs/`, `requirements/`, `*.spec.md` 等）
- **手動同步**: 使用者可以手動標記文件進行同步
- **元數據提取**: 從 Markdown 文件的 frontmatter 提取元數據
- **變更去抖動**: 文件變更後等待 3 秒再同步以避免頻繁操作

### AI 功能

應用程式內建 AI 功能，支援：

1. **對話式 AI**: 能夠回答關於文件內容的問題
2. **文件總結**: 生成文件的簡潔摘要
3. **內容重寫**: 改進文字表達和結構
4. **格式化**: 優化 Markdown 格式
5. **內容解釋**: 提供詳細的內容說明

## 集成與擴展

### Kai 平台集成

- 透過 `KAI_BACKEND_URL` 和 `KAI_PROJECT_ID` 環境變數配置與 Kai 平台的連接
- 自動將特定類型的 Markdown 文件（如規格文件）同步到 Kai 的上下文系統中
- 在文件元數據中保留同步狀態資訊

### npx 集成

- 使用 yargs 實現命令行參數解析
- 支援端口和 Markdown 目錄的命令行配置
- 自動構建靜態資源並服務前端

### 安全機制

- **路徑清理**: 防止目錄遍歷攻擊
- **路由限制**: 使用 rate limiting 防止惡意請求
- **身份驗證**: 使用簡單的 API 密鑰機制 (可擴展為 JWT 或 OAuth)
- **內容大小限制**: 限制上傳文件大小

## 運行時行為 (Unified Server)

### 啟動流程

1. **檢查並創建 Markdown 目錄**
2. **根據環境變數啟動統一服務器**:
   - API 端點在 `/api/*` 路徑提供服務
   - 靜態前端文件在所有其他路徑提供服務
   - WebSocket 連接通過 Socket.IO 提供
3. **啟動文件監控器**:
   - 監控 Markdown 目錄變化
   - 通過 WebSocket 向前端廣播變更

### 文件監控

後端使用 chokidar 庫監控 Markdown 目錄變化，支援：

- 文件添加、修改、刪除的即時通知
- 透過 Socket.io 向前端廣播文件變更
- 透過 .gitignore 檔案忽略特定文件

## 故障排除

### 常見問題

1. **無法訪問應用**:
   - 確認服務已啟動: `npx cospec-ai` 或 `npm start`
   - 檢查端口是否被佔用

2. **文件無法保存**:
   - 確認目錄權限: 檢查指定的目錄權限
   - 檢查路徑是否正確: 避免目錄遍歷

3. **AI 功能無效**:
   - 確認 `OPENAI_API_KEY` 環境變數已設置
   - 檢查 OpenAI API 是否正常

4. **前端加載問題**:
   - 確認已運行 `npm run build` 構建前端資源
   - 檢查 `dist` 目錄是否存在

### 日誌檢查

查看服務器日誌：
```bash
npx cospec-ai
```

### 開發模式問題

在開發模式下，如果遇到前端 hot-reload 不工作：
- 確保掛載了正確的源碼目錄
- 檢查 Vite 配置是否正確設置了端口和代理
- 確認前端和後端端口在開發模式下配置正確

### 記憶系統問題

如果記憶系統未正常工作：
- 確認 PostgreSQL 資料庫連接參數
