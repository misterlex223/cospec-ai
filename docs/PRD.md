# 產品需求文檔 (PRD)

> **專案**: CoSpec AI
> **版本**: 1.1.1
> **最後更新**: 2026-02-12
> **狀態**: Active Development

---

## 變更歷史

| 版本 | 日期 | 變更摘要 | 狀態 |
|------|------|----------|------|
| 1.2.0 | TBD | AI Chat 整合、測試覆蓋率提升、代碼質量改進 | 🚧 開發中 |
| 1.1.1 | 2026-02-12 | Server config changes and dependency updates | ✅ 已發布 |
| 1.1.0 | 2025-12-21 | Profile Editor with improved layout and CSS isolation | ✅ 已發布 |
| 1.0.0 | TBD | Initial release | 🔮 計劃中 |

---

## 當前版本開發 (v1.2.0)

### 1.1 Claude AI Chat 整合 🆕
**目的：** 整合 Claude Agent SDK 提供智能文檔輔助功能，改善用戶體驗
**變更：** 新增 AI 聊天面板，支援串流回應、多模態輸入、對話歷史

---

#### 1.1.1 現有問題分析

**UI/UX 問題：**
- AI Assistant 組件已實作但未在主頁面引入
- 使用內聯 CSS，未與 Tailwind CSS 設計一致
- 固定尺寸面板 (400px × 500px)，無響應式支援
- 對話記憶未持久化，頁面刷新後遺失
- 僅支援最新 10 條消息

**功能缺失：**
- 無串流回應（同步通信，長等待時間）
- 無檔案上傳給 AI 分析
- 無圖像處理支援
- 無工具輸出格式化
- 無錯誤重試機制

**技術限制：**
- 僅支援 OpenAI，無 Claude Agent SDK
- Function calling 設計靜態，擴展性有限
- API key 硬編碼在 client-side

---

#### 1.1.2 後端開發 (5-6天)

- [ ] **Claude Agent SDK 整合** (2天)
  - [ ] 安裝 `@anthropic-ai/sdk` 套件
  - [ ] 建立 Claude client (`server/claudeClient.js`)
  - [ ] 配置 API key 驗證（環境變數 `CLAUDE_API_KEY`）
  - [ ] 支援自定義 API endpoint
  - [ ] 錯誤處理和重試機制

- [ ] **串流 API 端點** (2天)
  - [ ] `POST /api/ai/chat/stream` - SSE 串流端點
  - [ ] `POST /api/ai/chat/ws` - WebSocket 串流端點
  - [ ] 請求取消機制（AbortController）
  - [ ] 並發請求控制（隊列管理）
  - [ ] 速率限制處理

- [ ] **多模態支援** (1天)
  - [ ] 圖像輸入處理（base64 / URL）
  - [ ] 檔案上傳端點（`POST /api/ai/upload`）
  - [ ] 檔案內容提取（PDF、DOCX 支援）
  - [ ] 臨時檔案儲存和清理

- [ ] **Function Calling 系統** (1-2天)
  - [ ] 重構 `server/functionRegistry.js` 支援 Claude tools
  - [ ] 工具動態註冊機制
  - [ ] 工具輸出格式化（Markdown 表格、代碼塊）
  - [ ] 現有工具遷移：
    - `list_files` - 列出 Markdown 檔案
    - `read_file` - 讀取檔案內容
    - `write_file` - 寫入內容到檔案
    - `create_file` - 建立新檔案
    - `delete_file` - 刪除檔案
    - `search_content` - 搜尋內容
    - `get_requirements` - 提取需求資訊
    - `get_system_design` - 提取系統設計元件

---

#### 1.1.3 前端 UI 開發 (7-8天)

- [ ] **Chat Panel 組件重構** (3-4天)
  - [ ] 使用 Tailwind CSS 重新設計 (`app-react/src/components/AIChatPanel.tsx`)
  - [ ] 響應式設計（mobile、tablet、desktop）
  - [ ] 可調整大小面板（resizable）
  - [ ] 整合到 EditorPage
  - [ ] 對話狀態 slice (`aiChatSlice.ts`)

- [ ] **訊息介面** (2天)
  - [ ] Message list 組件（支援自動滾動）
  - [ ] Markdown 渲染（支援 code highlighting）
  - [ ] 用戶/助手訊息樣式區分
  - [ ] 工具調用結果可視化
  - [ ] Loading 狀態和 streaming 指示器

- [ ] **輸入介面** (1-2天)
  - [ ] Textarea 支援多行輸入
  - [ ] 檔案上傳按鈕和預覽
  - [ ] 圖像粘貼支援
  - [ ] 送出按鈕和快捷鍵（Cmd/Ctrl + Enter）
  - [ ] 停止生成按鈕

- [ ] **對話歷史** (1天)
  - [ ] LocalStorage 持久化
  - [ ] 對話列表管理（新建、刪除、重命名）
  - [ ] 對話導出/導入
  - [ ] 搜尋歷史訊息

---

#### 1.1.4 Quick Actions (2天)

- [ ] **文檔操作** (1天)
  - [ ] 摘要文檔（提取關鍵點）
  - [ ] 重寫段落（改善語氣、清晰度）
  - [ ] 擴展內容（基於現有內容）
  - [ ] 檢查語法（中文/英文）
  - [ ] 翻譯內容（中英互譯）

- [ ] **代碼操作** (1天)
  - [ ] 程式檢查（JSON、YAML、Markdown）
  - [ ] 代碼解釋
  - [ ] 生成註釋
  - [ ] 重構建議

---

#### 1.1.5 測試 (2-3天)

- [ ] **單元測試** (1-2天)
  - [ ] `claudeClient.js` - Claude client 測試
  - [ ] API endpoints 測試
  - [ ] 工具函數測試
  - [ ] Redux slice 測試

- [ ] **整合測試** (1天)
  - [ ] End-to-end chat flow
  - [ ] Streaming response
  - [ ] Error handling
  - [ ] File upload flow

---

#### 1.1.6 依賴套件

**後端：**
```json
{
  "@anthropic-ai/sdk": "^0.x",
  "multer": "^1.x",        // 檔案上傳
  "sharp": "^0.x"          // 圖像處理
}
```

**前端：**
```json
{
  "react-markdown": "^10.x",
  "remark-gfm": "^4.x",     // GitHub Flavored Markdown
  "react-syntax-highlighter": "^15.x",
  "lucide-react": "^0.x"   // 圖示
}
```

### 1.2 測試覆蓋率提升 🆕
**目的：** 提升代碼測試覆蓋率至 70% 以上
**變更：** 為核心模組補充單元測試和整合測試

**任務清單：**
- [ ] **後端測試** (5天)
  - [ ] `server/index.js` - API endpoint 測試
  - [ ] `server/fileSyncManager.js` - 文件同步邏輯測試
  - [ ] `server/kaiContextClient.js` - Kai API client 測試
  - [ ] `server/profileManager.js` - Profile 管理測試
  - [ ] `server/validation.js` - 驗證邏輯測試

- [ ] **前端組件測試** (3天)
  - [ ] `FileTree.tsx` - 檔案樹組件測試
  - [ ] `MarkdownEditor.tsx` - 編輯器組件測試
  - [ ] `ProfileEditor` 相關組件測試
  - [ ] Redux slices 測試

- [ ] **測試基礎設施** (1天)
  - [ ] 設置 Jest/Vitest 配置
  - [ ] 測試工具函數和 fixtures
  - [ ] CI/CD 整合

### 1.3 代碼質量改進 🆕
**目的：** 統一代碼風格、錯誤處理和日誌系統
**變更：** 重構代碼以符合最佳實踐

**任務清單：**
- [ ] **異步模式統一** (1天)
  - [ ] 統一使用 async/await
  - [ ] 移除 Promise.then/.catch 模式

- [ ] **錯誤處理標準化** (2天)
  - [ ] 統一 API 錯誤回應格式
  - [ ] 前端錯誤邊界實作
  - [ ] WebSocket 重連機制

- [ ] **日誌系統** (1天)
  - [ ] 移除 console.log (生產環境)
  - [ ] 整合 winston 或 pino

- [ ] **配置管理** (1天)
  - [ ] 集中化配置管理
  - [ ] 環境變數驗證

---

## 1. 產品概述

### 1.1 產品定位

CoSpec AI 是一個 **AI 輔助的技術規格編輯平台**，專為開發者和技術團隊設計。不同於通用的文檔工具，CoSpec AI 專注於技術文檔—API 規格、需求文檔、系統設計—並具備深度 AI 整合和本地優先的架構。

### 1.2 目標用戶

| 用戶群體 | 描述 | 核心痛點 | CoSpec AI 價值 |
|----------|------|----------|-----------------|
| **獨立開發者** | 個人開發者、自由工作者、indie hacker | - 缺乏結構化的規格管理方式<br>- AI 工具分散在多個應用中<br>- 企業工具過於昂貴 | - npx 可安裝的獨立工具<br>- 本地優先，數據留在本地<br>- 免費且開源 |
| **小團隊 (3-50 人)** | 新創團隊、產品團隊 | - 需要協作但企業工具過於重量級<br>- Wiki 頁面容易過時<br>- 缺乏好的免費規格管理工具 | - Profile 系統標準化文檔<br>- Context sync 用於知識共享<br>- 團隊功能的路線圖 |
| **技術作家** | DevRel、API 文檔撰寫者 | - 通用編輯器不理解技術內容<br>- Markdown 仍是最佳格式但缺乏功能 | - Vditor 所見即所得<br>- AI 輔助摘要和格式化<br>- 代碼感知編輯 |
| **系統架構師** | 設計系統架構師、解決方案架構師 | - 需要以可視化方式記錄複雜系統<br>- 工具對架構圖支援不佳 | - 系統設計視圖和組件管理<br>- 架構圖視覺化<br>- AI 輔助設計建議 |

### 1.3 核心價值

1. **AI 輔助技術文檔** - AI 不僅是編輯工具，更是寫作助手
2. **Context 系統整合** - 自動同步重要文件到 Kai 的 context 系統供 AI 檢索
3. **Profile 系統** - 強制專案結構但不僵化—缺少文件顯示警告，一鍵生成
4. **本地優先** - 所有數據存儲在本地，雲端同步是可選的
5. **npx 可安裝** - 無需帳戶，無需信用卡，只需 `npx cospec-ai`

### 1.4 成功指標

| 指標 | 當前目標 | 成功定義 |
|------|----------|----------|
| **月活躍用戶 (MAU)** | 100+ | 透過口耳相傳穩定增長 |
| **npm 下載量** | 500+/月 | 透過 npx 自然發現 |
| **GitHub Stars** | 100+ | 社群興趣和驗證 |
| **Profile 使用率** | 30%+ 用戶 | Profile 系統採用 |
| **AI 功能使用率** | 50%+ 的會話 | AI 整合提供價值 |
| **留存率 (D7)** | 40%+ | 用戶找到持續價值 |

---

## 2. 功能需求

### 2.1 核心功能 (已實作)

#### 2.1.1 Markdown 編輯器 ✅
- **描述**: 基於 Vditor 的 Markdown 編輯器
- **功能**:
  - 所見即所得編輯
  - 即時預覽
  - 代碼語法高亮
  - 圖片上傳和嵌入
  - 快捷鍵支援

#### 2.1.2 檔案管理 ✅
- **描述**: 本地檔案系統的 CRUD 操作
- **功能**:
  - 檔案樹導航
  - 建立/編輯/刪除檔案
  - 檔案重新命名
  - 目錄展開/收合
  - 最近檔案導航

#### 2.1.3 Profile 系統 ✅
- **描述**: 專案結構定義和文檔生成
- **功能**:
  - Profile 配置 (JSON)
  - 必要文檔標記
  - Prompt 檔案管理
  - 一鍵生成文檔
  - Profile 編輯器 UI

#### 2.1.4 Context Sync ✅
- **描述**: 與 Kai context 系統整合
- **功能**:
  - 自動同步模式 (specs/**/*.md, requirements/**/*.md 等)
  - 手動同步/取消同步
  - Sync metadata 存儲 (不修改原檔案)
  - 檔案監控和自動觸發

#### 2.1.5 WebSocket 即時通訊 ✅
- **描述**: 伺服器推送檔案變更
- **功能**:
  - 檔案變更即時通知
  - 生成輸出即時串流
  - Profile 熱更新通知

#### 2.1.6 反向代理支援 ✅
- **描述**: 相對路徑支援任何代理路徑
- **功能**:
  - 相對資源路徑 (`base: './'`)
  - 相對 API 路徑 (`./api`)
  - Hash 路由 (`HashRouter`)

### 2.2 計劃中功能

#### 2.2.1 AI Chat 整合 🆕
- **優先級**: 高
- **描述**: 整合 OpenAI API 提供 AI 聊天功能
- **功能**:
  - [ ] Chat UI 介面
  - [ ] 文檔內容分析
  - [ ] 文字重寫和優化
  - [ ] 格式化建議
  - [ ] 內容解釋和摘要
- **預計**: v1.2.0

#### 2.2.2 Git 整合 🔮
- **優先級**: 中
- **描述**: Git 操作整合
- **功能**:
  - [ ] Commit 變更
  - [ ] Push/Pull
  - [ ] 版本歷史和 Diff 檢視
  - [ ] Branch 管理
- **預計**: v1.3.0

#### 2.2.3 團隊協作 🔮
- **優先級**: 低
- **描述**: 多用戶協作功能
- **功能**:
  - [ ] 多用戶編輯
  - [ ] 檔案分享
  - [ ] 權限管理
  - [ ] 評論功能
- **預計**: v2.0.0

---

## 3. 非功能需求

### 3.1 效能需求
- 編輯器回應時間 < 100ms
- API 回應時間 < 500ms
- 檔案載入時間 < 1s (對於 < 1MB 檔案)
- WebSocket 訊息延遲 < 100ms

### 3.2 安全需求
- 路徑消毒防範目錄遍歷攻擊
- API rate limiting
- Helmet security headers
- 寫操作需要 token 驗證
- 內容大小限制 (10MB)

### 3.3 可用性需求
- 系統可用性 > 99%
- 記憶體使用率 < 1GB
- CPU 使用率 < 80%
- 無重大 bug

### 3.4 相容性需求
- 支援 Chrome, Firefox, Safari, Edge (最新版本)
- Docker 部署
- npx 安裝
- 反向代理相容 (Kai, Nginx 等)

---

## 4. 技術限制

### 4.1 技術棧
- **前端**: React 19 + TypeScript + Vite
- **後端**: Node.js + Express
- **狀態管理**: Redux Toolkit
- **UI**: Tailwind CSS + shadcn/ui
- **編輯器**: Vditor
- **容器**: Docker

### 4.2 外部依賴
- OpenAI API (可選)
- Kai Context API (可選)

### 4.3 部署限制
- 單一 Docker 容器
- 需要持久化 volume 掛載
- 連接埠: 9280 (frontend), 9281 (backend API)

---

## 5. 用戶流程

### 5.1 首次使用流程
1. 用戶執行 `npx cospec-ai`
2. 應用程式啟動在 `http://localhost:9280`
3. 用戶看到預設的 markdown 目錄
4. 用戶可以選擇載入 profile 或直接編輯

### 5.2 建立新文檔流程
1. 用戶在檔案樹中右鍵點擊目錄
2. 選擇 "New File"
3. 輸入檔案名稱
4. 編輯器開啟新檔案

### 5.3 Profile 生成流程
1. 用戶載入 profile (或使用 Profile Editor 建立)
2. 檔案樹顯示缺少的必要文檔 (⚠️ 圖示)
3. 用戶右鍵點擊缺少的文檔
4. 選擇 "Generate from Profile"
5. 系統執行生成命令並串流輸出
6. 生成完成後檔案自動開啟

### 5.4 Context Sync 流程
1. 檔案監控偵測到檔案變更
2. 系統檢查檔案是否符合自動同步模式
3. 如果符合，呼叫 Kai Context API
4. 將 sync metadata 存儲到 `.cospec-sync/sync-metadata.json`
5. 原檔案不被修改

---

## 6. 競爭分析

| 競品 | 優勢 | 劣勢 | 我們的優勢 |
|------|------|------|------------|
| **Notion** | - 優秀 UI<br>- 大型生態系統 | - 昂貴<br>- Cloud-only<br>- 非 dev-focused | - 本地優先<br>- Developer-focused<br>- 免費 |
| **GitBook** | - 美觀的文檔<br>- 適合公開文檔 | - 不適合私用規格<br>- 有限的 offline 支援 | - 本地優先<br>- AI 整合 |
| **Swagger/OpenAPI** | - API spec 標準<br>- 適合 APIs | - 只限 API<br>- 複雜設置 | - 更廣泛的範圍<br>- 更簡單的 UX |
| **Obsidian** | - 本地優先<br>- 優秀插件 | - 太通用<br>- 非 spec-aware | - Spec-aware<br>- AI-native |

---

## 7. 開發里程碑

### 7.1 Milestone 1: 核心單人功能基礎 ✅
- [x] 檔案系統操作 API
- [x] 基礎 React 介面
- [x] 個人文檔管理機制
- [x] 基礎 UI 組件

### 7.2 Milestone 2: AI 整合 🆕
- [ ] OpenAI API 整合
- [ ] AI 聊天介面
- [ ] 智慧建議功能
- [ ] 回應格式化
- **預計**: v1.2.0

### 7.3 Milestone 3: Git 整合 🔮
- [ ] Git 操作整合
- [ ] 版本歷史檢視
- [ ] Diff 檢視
- [ ] Branch 管理
- **預計**: v1.3.0

### 7.4 Milestone 4: 團隊功能 🔮
- [ ] 多用戶支援
- [ ] 權限管理
- [ ] 評論功能
- [ ] 雲端同步 (可選)
- **預計**: v2.0.0

---

## 8. 風險評估

| 風險 | 影響 | 緩解措施 |
|------|------|----------|
| **低採用率** | 高 | 聚焦開發者社群，公開構建，快速回饋 |
| **AI 成本** | 中 | 用戶自備 API key；我們不代理 AI 請求 |
| **維護負擔** | 中 | 保持架構簡單；避免過度工程 |
| **競品複製功能** | 低 | 我們的護城河是本地優先 + 開源；專有工具難以複製 |

---

## 9. 附錄

### 9.1 術語表
- **Profile**: 專案結構定義，包含必要文檔和生成配置
- **Context Sync**: 與 Kai Context API 整合，將文檔同步為 AI 記憶
- **Local-First**: 數據優先存儲在本地，雲端功能為可選

### 9.2 相關文檔
- [Product Vision](../project/product-vision.md)
- [TECH.md](./TECH.md)
- [MVP Features](./mvp_features.md)
- [Development Setup](./DEVELOPMENT_SETUP.md)

---

*本 PRD 為活文檔，將根據用戶回饋和市場變化進行更新。*
