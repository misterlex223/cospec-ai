# 技術架構文檔 (TECH)

> **專案**: CoSpec AI
> **版本**: 1.1.1
> **最後更新**: 2026-02-12
> **狀態**: Active Development

---

## 1. 技術棧

### 1.1 前端

| 類別 | 技術 | 版本 | 用途 |
|------|------|------|------|
| **Framework** | React | 19.1.1 | UI 框架 |
| **Language** | TypeScript | 5.7.2 | 型別安全 |
| **Build Tool** | Vite | 6.0.3 | 建置工具 |
| **State Management** | Redux Toolkit | 2.2.1 | 狀態管理 |
| **Routing** | React Router | 7.9.2 | 路由 (HashRouter) |
| **Styling** | Tailwind CSS | 3.4.17 | 樣式系統 |
| **UI Components** | shadcn/ui | - | UI 組件庫 |
| **Icons** | Lucide React | 0.544.0 | 圖示庫 |
| **Markdown Editor** | Vditor | 3.11.2 | Markdown 編輯器 |
| **HTTP Client** | Axios | 1.12.2 | API 請求 |
| **Notifications** | React Toastify | 10.0.5 | 通知提示 |

### 1.2 後端

| 類別 | 技術 | 版本 | 用途 |
|------|------|------|------|
| **Runtime** | Node.js | - | 執行環境 |
| **Framework** | Express | 4.21.2 | Web 框架 |
| **WebSocket** | Socket.IO | 4.7.2 | 即時通訊 |
| **File Watcher** | Chokidar | 3.5.3 | 檔案監控 |
| **Security** | Helmet | 7.1.0 | HTTP Headers |
| **CORS** | cors | 2.8.5 | CORS 配置 |
| **Rate Limiting** | express-rate-limit | 7.1.5 | API 限流 |
| **Logging** | Morgan | 1.10.0 | 請求日誌 |
| **AI Integration** | Anthropic SDK | TBD | Claude Agent SDK 整合 |
| **File Serving** | serve-static | 1.16.2 | 靜態檔案 |

### 1.3 資料庫

| 類別 | 技術 | 用途 |
|------|------|------|
| **Primary** | File System | Markdown 檔案存儲 |
| **Metadata** | JSON File | `.cospec-sync/sync-metadata.json` |
| **Cache** | In-Memory | 檔案列表快取 |

### 1.4 基礎設施

| 類別 | 技術 | 用途 |
|------|------|------|
| **Platform** | Docker | 容器化部署 |
| **Orchestration** | Docker Compose | 本地開發和生產部署 |
| **Reverse Proxy** | Kai Proxy | 反向代理支援 |
| **Package Manager** | pnpm | 套件管理 (workspaces) |

### 1.5 開發工具

| 類別 | 技術 | 版本 | 用途 |
|------|------|------|------|
| **Linting** | ESLint | 9.17.0 | 代碼檢查 |
| **Type Checking** | TypeScript | 5.7.2 | 型別檢查 |
| **Testing** | Playwright | 1.56.0 | E2E 測試 |
| **Dev Server** | Nodemon | 3.0.1 | 熱重載 |
| **Concurrent** | concurrently | 9.1.0 | 同時執行指令 |

---

## 2. 系統架構

### 2.1 架構圖

```
┌─────────────────────────────────────────────────────────────────┐
│                         Docker Container                          │
│                                                                   │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Frontend (React)                         │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────────┐ │  │
│  │  │ File Tree   │  │ Vditor      │  │ Profile Editor     │ │  │
│  │  │ Component   │  │ Editor      │  │                    │ │  │
│  │  └─────────────┘  └─────────────┘  └───────────────────┘ │  │
│  │                                                              │  │
│  │  Redux Store (files, ui, editor, notifications, profile)     │  │
│  │                                                              │  │
│  │  Port: 9280 ←─────────────────────────────────────────────  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                          ↓↑                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │                    Backend (Express)                        │  │
│  │                                                              │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────────┐ │  │
│  │  │ API Routes  │  │ File Sync    │  │ Profile Manager    │ │  │
│  │  │             │  │ Manager      │  │                    │ │  │
│  │  └─────────────┘  └─────────────┘  └───────────────────┘ │  │
│  │                                                              │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────────┐ │  │
│  │  │ File Watcher│  │ WebSocket    │  │ Kai Context Client│ │  │
│  │  │ (Chokidar)  │  │ Server       │  │                    │ │  │
│  │  └─────────────┘  └─────────────┘  └───────────────────┘ │  │
│  │                                                              │  │
│  │  Port: 9281 ←─────────────────────────────────────────────  │  │
│  └───────────────────────────────────────────────────────────┘  │
│                          ↓↑                                      │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │              File System (./markdown)                       │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌───────────────────┐ │  │
│  │  │ Specs/      │  │ Requirements/│  │ .cospec-sync/      │ │  │
│  │  └─────────────┘  └─────────────┘  └───────────────────┘ │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│  Volume Mount: /markdown → Local Directory                       │
└─────────────────────────────────────────────────────────────────┘
                          ↓↑
                    ┌──────────────┐
                    │ Kai Context  │
                    │ API (Optional)│
                    └──────────────┘
```

### 2.2 核心模組

#### 2.2.1 Frontend Modules

**EditorPage** (`app-react/src/pages/EditorPage.tsx`)
- 主應用程式佈局
- 可調整大小的檔案樹和編輯器區域

**FileTree** (`app-react/src/components/FileTree.tsx`)
- 檔案瀏覽和管理
- 可展開的目錄結構
- Context menu (重新命名、刪除、生成等)

**MarkdownEditor** (`app-react/src/components/MarkdownEditor.tsx`)
- Vditor 封裝組件
- 檔案載入和儲存

**ProfileEditorApp** (`app-react/src/components/profile/`)
- Profile 編輯器 UI
- Profile Browser
- Profile 編輯頁面
- Document/Folder 管理
- Prompt 檔案管理

#### 2.2.2 Backend Modules

**Server** (`server/index.js`)
- Express 伺服器主入口
- API 路由設置
- WebSocket 伺服器
- 檔案監控設置

**File Sync Manager** (`server/fileSyncManager.js`)
- Context sync 狀態管理
- 自動同步模式
- Metadata 存儲

**Kai Context Client** (`server/kaiContextClient.js`)
- Kai Context API 客戶端
- Sync 操作執行

**Profile Manager** (`server/profileManager.js`)
- Profile 載入和驗證
- Prompt 檔案解析
- 生成命令執行

### 2.3 資料流

#### 2.3.1 檔案載入流程

```
User Action (Click file)
    ↓
FileTree Component (dispatch fetchFileContent(path))
    ↓
Redux Thunk Action
    ↓
API Call: GET /api/files/:path
    ↓
Server: Read file from disk
    ↓
Response: File content
    ↓
Redux: setFileContent(content)
    ↓
Vditor: Load content
```

#### 2.3.2 檔案儲存流程

```
User Action (Save file)
    ↓
MarkdownEditor (dispatch saveFile(path, content))
    ↓
Redux Thunk Action
    ↓
API Call: POST /api/files/:path (with API key)
    ↓
Server: Validate, write to disk
    ↓
Chokidar: Detect change
    ↓
File Sync Manager: Check sync patterns
    ↓
Kai Context Client: Sync if applicable
    ↓
WebSocket: Broadcast update
    ↓
Client: Refresh file tree
```

#### 2.3.3 Profile 生成流程

```
User Action (Right-click → Generate from Profile)
    ↓
FileTree (dispatch generateFile(path))
    ↓
API Call: POST /api/profile/generate/:path
    ↓
Profile Manager: Build command with variable substitution
    ↓
Spawn: Execute generation command
    ↓
WebSocket: Stream output { path, output, isError }
    ↓
Client: Update generation state
    ↓
On Complete: Refresh file tree, open file
```

---

## 3. 設計原則

### 3.1 核心原則

1. **本地優先，雲端可選**
   - 數據必須始終存儲在本地
   - 雲端功能是附加功能，非必要條件
   - 核心功能無需帳戶

2. **AI 作為助手，非替代品**
   - AI 幫助，但用戶保持控制
   - 所有 AI 功能可禁用
   - 未經用戶操作不發送數據到 AI

3. **結構但不僵化**
   - Profile 建議結構，不強制執行
   - 缺少文件是警告，非錯誤
   - 用戶可自訂 profile

4. **開發者體驗至上**
   - 快捷鍵盤快捷鍵
   - CLI 優先 (npx 可安裝)
   - 無強制 UI 流程
   - 尊重開發者工作流程

5. **預設開放**
   - 開源代碼
   - 開放標準 (Markdown, OpenAPI)
   - 歡迎社群貢獻
   - 無廠商鎖定

### 3.2 技術原則

1. **保持簡單**
   - 不為假設的未來過度工程化
   - 標準工具 (React, Node.js)
   - 避免不必要的抽象

2. **API 優先**
   - 所有功能可透過 API 存取
   - 支援自動化

3. **容器優先**
   - Docker 用於簡化部署
   - 自託管支援

4. **反向代理相容**
   - 相對路徑用於資源和 API
   - Hash 路由用於導航

---

## 4. 目錄結構

```
cospec-ai/
├── app-react/              # React 前端應用
│   ├── src/
│   │   ├── components/     # React 組件
│   │   ├── pages/         # 頁面組件
│   │   ├── store/         # Redux store
│   │   │   ├── slices/    # Redux slices
│   │   │   │   ├── filesSlice.ts
│   │   │   │   ├── uiSlice.ts
│   │   │   │   ├── editorSlice.ts
│   │   │   │   ├── notificationsSlice.ts
│   │   │   │   └── profileSlice.ts
│   │   │   └── store.ts  # Store 配置
│   │   ├── services/      # API 服務
│   │   ├── types/         # TypeScript 類型
│   │   ├── utils/         # 工具函數
│   │   ├── App.tsx        # 主應用組件
│   │   └── main.tsx       # 入口點
│   ├── public/            # 靜態資源
│   ├── package.json
│   ├── vite.config.ts     # Vite 配置 (base: './')
│   ├── tailwind.config.js
│   └── tsconfig.json
│
├── server/                # Node.js 後端伺服器
│   ├── index.js           # 主伺服器入口
│   ├── fileSyncManager.js # Context sync 管理
│   ├── kaiContextClient.js # Kai API 客戶端
│   ├── profileManager.js  # Profile 管理
│   ├── routes/            # API 路由
│   ├── middleware/        # Express 中間件
│   └── package.json
│
├── bin/                   # CLI 命令
│   └── cospec-ai.js       # npx 入口點
│
├── profiles/              # 範例 Profiles
│   └── api-development/   # API 開發 profile 範例
│
├── markdown/              # 預設 Markdown 目錄
│   └── .cospec-sync/      # Sync metadata (不提交到 git)
│       └── sync-metadata.json
│
├── dist/                  # 前端建置輸出
│
├── docs/                  # 文檔
│   ├── PRD.md            # 產品需求文檔
│   ├── TECH.md           # 技術架構文檔
│   ├── DEVELOPMENT_SETUP.md
│   ├── PROFILE_EDITOR.md
│   └── ...
│
├── project/               # 專案管理
│   ├── plans/            # 開發計劃
│   ├── worklogs/         # 工作日誌
│   ├── version-history/   # 版本歷史
│   └── product-vision.md # 產品願景
│
├── tests/                 # 測試檔案
│   └── e2e/             # Playwright E2E 測試
│
├── docker-compose.yml     # 生產部署配置
├── docker-compose-dev.yml # 開發部署配置
├── Dockerfile            # 容器建置配置
├── package.json          # Root package.json
├── pnpm-workspace.yaml  # pnpm workspace 配置
├── CLAUDE.md            # Claude Code 指引
└── README.md            # 專案 README
```

---

## 5. API 規格

### 5.1 檔案操作 API

#### GET /api/files
獲取所有 Markdown 檔案列表

**回應**:
```json
[
  {
    "name": "SPEC.md",
    "path": "SPEC.md",
    "type": "file",
    "exists": true
  },
  {
    "name": "docs",
    "path": "docs/",
    "type": "directory",
    "children": [...]
  }
]
```

#### GET /api/files/:path
讀取檔案內容

**回應**:
```json
{
  "content": "# File Content\n...",
  "path": "SPEC.md"
}
```

#### POST /api/files/:path
儲存檔案內容 (需要 auth)

**請求**:
```json
{
  "content": "# Updated Content\n...",
  "apiKey": "demo-api-key"
}
```

**回應**:
```json
{
  "success": true,
  "path": "SPEC.md"
}
```

### 5.2 Context Sync API

#### POST /api/files/:path/sync-to-context
手動同步檔案到 context (需要 auth)

**回應**:
```json
{
  "success": true,
  "memoryId": "abc-123-def-456",
  "lastSync": "2025-01-23T10:29:45.000Z"
}
```

#### DELETE /api/files/:path/sync-to-context
取消同步 (需要 auth)

#### GET /api/files/:path/sync-status
獲取同步狀態

**回應**:
```json
{
  "synced": true,
  "memoryId": "abc-123-def-456",
  "lastSync": "2025-01-23T10:29:45.000Z"
}
```

### 5.3 Profile API

#### GET /api/profile
獲取已載入的 profile 配置

#### GET /api/profile/files
獲取必要檔案列表及其存儲狀態

#### POST /api/profile/generate/:path
執行檔案生成 (需要 auth)

**請求**:
```json
{
  "apiKey": "demo-api-key"
}
```

---

## 6. WebSocket 事件

### 6.1 伺服器 → 客戶端

| 事件 | 資料 | 描述 |
|------|------|------|
| `file-added` | `{ path, name }` | 新檔案被添加 |
| `file-changed` | `{ path }` | 檔案內容變更 |
| `file-deleted` | `{ path }` | 檔案被刪除 |
| `file-renamed` | `{ oldPath, newPath }` | 檔案被重新命名 |
| `generation-output` | `{ path, output, isError }` | 生成輸出 |
| `generation-complete` | `{ path, success, exitCode, output }` | 生成完成 |
| `profile-reloaded` | `{ profileName, profile }` | Profile 熱更新 |

### 6.2 客戶端 → 伺服器

| 事件 | 資料 | 描述 |
|------|------|------|
| `subscribe` | `{ path }` | 訂閱檔案變更 |

---

## 7. 安全考量

### 7.1 已實作的安全措施

| 措施 | 實作 | 描述 |
|------|------|------|
| **Path Sanitization** | ✓ | 防範目錄遍歷攻擊 |
| **Rate Limiting** | ✓ | API 限流 |
| **Helmet** | ✓ | Security headers |
| **CORS** | ✓ | CORS 配置 |
| **API Key Auth** | ✓ | 寫操作需要驗證 |
| **Content Size Limit** | ✓ | 10MB 限制 |

### 7.2 安全最佳實踐

1. **永遠不信任用戶輸入**
   - 路徑消毒
   - 內容驗證
   - 大小限制

2. **最小權限原則**
   - Docker 容器非 root 執行
   - 檔案系統存取限制在 markdown 目錄

3. **敏感資料保護**
   - API key 不記錄到日誌
   - 環境變數存儲敏感配置

---

## 8. 效能最佳化

### 8.1 前端最佳化

| 策略 | 實作 | 描述 |
|------|------|------|
| **Code Splitting** | ✓ | Vite 自動分割 |
| **Lazy Loading** | 部分 | 大型組件可延遲載入 |
| **Memoization** | 部分 | React.memo, useMemo 適用使用 |
| **Debouncing** | ✓ | 檔案變更 debouncing (3s) |

### 8.2 後端最佳化

| 策略 | 實作 | 描述 |
|------|------|------|
| **File Caching** | ✓ | 檔案列表記憶體快取 |
| **Debouncing** | ✓ | Sync 操作 debouncing |
| **WebSocket** | ✓ | 避免輪詢 |

### 8.3 效能指標

| 指標 | 目標 | 當前 |
|------|------|------|
| 編輯器回應時間 | < 100ms | ✓ |
| API 回應時間 | < 500ms | ✓ |
| 檔案載入時間 (< 1MB) | < 1s | ✓ |
| WebSocket 延遲 | < 100ms | ✓ |

---

## 9. 技術債務追蹤

### 9.1 測試相關債務

| 項目 | 優先級 | 預估工時 | 說明 |
|------|--------|----------|------|
| **後端單元測試** | P0 | 2週 | 15 個 JS 檔案完全無測試（index.js, fileSyncManager.js, kaiContextClient.js, profileManager.js, validation.js） |
| **前端組件測試** | P1 | 1-2週 | EditorPage, FileTree, AIAssistant 等核心組件缺乏單元測試 |
| **測試覆蓋率提升** | P0 | - | 當前估計 < 20%，目標 > 70% |
| **API 整合測試** | P1 | 3天 | API 端點的整合測試 |

### 9.2 代碼質量債務

| 項目 | 優先級 | 預估工時 | 說明 |
|------|--------|----------|------|
| **異步模式統一** | P1 | 2天 | 後端混用 async/await 和 Promise.then/.catch，需統一 |
| **錯誤處理標準化** | P1 | 3天 | API 錯誤回應格式不一致（有些返回完整物件，有些返回字串） |
| **WebSocket 事件命名** | P2 | 1天 | 駝峰式（file-added）和底線式（FILE_ADDED）混用 |
| **日誌系統** | P2 | 2天 | 15 處 console.log/warn/error，生產環境應使用 winston 等專業日誌庫 |
| **語言一致性** | P2 | 1天 | 評論混用繁體中文和英文 |
| **移除開發占位符** | P2 | 1天 | editorSlice.ts 第 40-44 行有占位符代碼 |

### 9.3 架構改進債務

| 項目 | 優先級 | 預估工時 | 說明 |
|------|--------|----------|------|
| **前端錯誤邊界** | P1 | 1天 | 未實作全域錯誤處理（Error Boundary） |
| **WebSocket 重連機制** | P1 | 2天 | 連接中斷後需手動重整頁面 |
| **檔案快取失效策略** | P1 | 2天 | 檔案變更後快取未正確失效 |
| **配置管理集中化** | P2 | 3天 | 配置邏輯分散在多處，環境變數驗證不完整 |
| **權限系統升級** | P2 | 1週 | 目前僅簡單 API Key 驗證，缺乏用戶權限管理 |
| **大檔案處理優化** | P3 | 1週 | 大檔案處理可能阻塞主線程 |

### 9.4 安全性債務

| 項目 | 優先級 | 預估工時 | 說明 |
|------|--------|----------|------|
| **內容大小限制可配置化** | P1 | 1天 | 目前硬編碼為 10MB |
| **路徑清理重複代碼** | P2 | 1天 | 路徑消毒邏輯有重複 |
| **輸入驗證強化** | P1 | 2天 | 環境變數和 API 參數驗證不完整 |

### 9.5 性能債務

| 項目 | 優先級 | 預估工時 | 說明 |
|------|--------|----------|------|
| **檔案列表快取策略** | P1 | 2天 | API 回應可快取減少磁碟 I/O |
| **同步機制重構** | P2 | 3天 | fileSyncManager.js 使用手動模式匹配，應改為靈活配置 |

### 9.6 債務統計

| 類別 | P0 | P1 | P2 | P3 | 合計 |
|------|----|----|----|----|------|
| 測試 | 1 | 2 | 1 | - | 4 |
| 代碼質量 | - | 2 | 4 | - | 6 |
| 架構 | - | 4 | 2 | 1 | 7 |
| 安全性 | - | 2 | 2 | - | 4 |
| 性能 | - | 2 | 1 | - | 3 |
| **合計** | **1** | **12** | **10** | **1** | **24** |

---

## 10. 部署

### 10.1 Docker 部署

**建置映像檔**:
```bash
docker build -t cospec-ai-app .
```

**執行容器**:
```bash
docker run -d \
  -p 9280:9280 \
  -p 9281:9281 \
  -v /path/to/markdown:/markdown \
  -e MARKDOWN_DIR=/markdown \
  cospec-ai-app
```

### 10.2 Docker Compose

**生產環境**:
```bash
docker compose up -d
```

**開發環境** (live reload):
```bash
docker compose -f docker-compose-dev.yml up
```

### 10.3 npx 安裝

```bash
npx cospec-ai
```

預設啟動在 `http://localhost:9280`

---

## 11. 故障排除

### 11.1 常見問題

| 問題 | 原因 | 解決方案 |
|------|------|----------|
| 檔案變更未同步 | Chokidar 未忽略 `.cospec-sync/` | 確認 `watchOptions.ignored` 包含 `'**/.cospec-sync/**'` |
| Sync 狀態丟失 | 容器重啟後未持久化 | 確認 volume mount 包含 `.cospec-sync/` |
| 檔案未自動同步 | 路徑不符合自動同步模式 | 使用手動同步 API 或添加模式 |
| 靜態資源 404 | 反向代理配置問題 | 確認 proxy 路由配置正確 |

### 11.2 調試模式

**啟動 debug 日誌**:
```bash
DEBUG=* npx cospec-ai
```

**檢檔視監控狀態**:
```bash
curl http://localhost:9281/api/files
```

---

*本 TECH.md 為活文檔，隨著架構演進進行更新。*
