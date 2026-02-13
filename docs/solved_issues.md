# CoSpec AI Markdown 編輯應用 - 已解決問題清單

## 1. 前端框架重構

### 1.1. Vue 到 React 的遷移
- **問題描述**：原應用使用 Vue.js 框架開發，但開發者更熟悉 React 生態系統
- **解決方案**：將應用從 Vue.js 重構為 React + TypeScript + Vite + Shadcn UI
- **相關文件**：
  - `/app-react/` - 重構後的 React 應用目錄
  - `/Dockerfile.react` - React 應用的 Docker 配置
  - `/docker-compose-react-dev.yml` - React 開發環境的 Docker Compose 配置

### 1.2. 配置問題
- **問題描述**：重構後的應用在 Docker 環境中啟動時遇到 PostCSS 配置問題
- **解決方案**：修改 PostCSS 配置文件格式，從 ESM 改為 CommonJS，並安裝 `@tailwindcss/postcss` 包
- **相關文件**：
  - `/app-react/postcss.config.cjs` - 修改後的 PostCSS 配置文件

## 2. 用戶界面問題

### 2.1. 文件樹展開狀態保持
- **問題描述**：點擊文件後，展開的樹狀結構會被重置，回到只顯示最上層目錄和文件的狀態
- **解決方案**：
  - 添加 `expandedPaths` 狀態來跟踪展開的目錄路徑
  - 使用 `div` 元素和條件渲染替代 HTML `details` 元素，避免衝突
  - 添加自動展開包含當前文件的所有目錄的功能
- **相關文件**：
  - `/app-react/src/components/FileTree/FileTree.tsx` - 文件樹組件

### 2.2. 文件樹展開閃爍問題
- **問題描述**：點擊展開目錄後，目錄不斷開合閃爍
- **解決方案**：
  - 移除 HTML `details` 和 `summary` 元素，使用普通的 `div` 元素
  - 使用自定義的展開/折疊邏輯，而不是依賴瀏覽器原生行為
- **相關文件**：
  - `/app-react/src/components/FileTree/FileTree.tsx` - 文件樹組件

## 3. Markdown 編輯器問題

### 3.1. 首次加載文件內容不顯示
- **問題描述**：第一次選擇文件時，內容不會顯示，需要選擇其他文件後再回來才能顯示
- **解決方案**：
  - 使用 Promise 封裝編輯器初始化過程
  - 使用 `requestAnimationFrame` 代替 `setTimeout`
  - 使用 `flushSync` 確保狀態更新已完成
  - 使用 `async/await` 處理異步操作
- **相關文件**：
  - `/app-react/src/components/MarkdownEditor/MarkdownEditor.tsx` - Markdown 編輯器組件

### 3.2. Vditor 配置錯誤
- **問題描述**：Vditor 初始化時報錯 `customWysiwygToolbar is not a function`
- **解決方案**：
  - 簡化 Vditor 的工具欄配置
  - 移除可能導致問題的選項
  - 使用更基本的工具欄選項
- **相關文件**：
  - `/app-react/src/components/MarkdownEditor/MarkdownEditor.tsx` - Markdown 編輯器組件

## 4. GitHub 整合問題

### 4.1. 倉庫綁定與認證
- **問題描述**：需要安全地存儲和管理 GitHub 訪問令牌，同時確保多用戶環境下的隔離性
- **解決方案**：
  - 實現加密存儲 GitHub 訪問令牌
  - 使用 OAuth 應用授權流程代替個人訪問令牌
  - 為每個專案單獨存儲訪問憑證
  - 實現令牌自動刷新機制

### 4.2. Git 操作與文件系統整合
- **問題描述**：需要將 Git 操作與現有的文件系統功能無縫整合，確保文件狀態一致性
- **解決方案**：
  - 實現文件系統操作與 Git 操作的事務性處理
  - 在文件樹中顯示 Git 狀態標識
  - 在編輯器中實現差異顯示功能
  - 添加衝突解決界面
- **相關文件**：
  - `/docs/requirements.md` - 更新後的需求規格

### 4.3. 多用戶協作衝突
- **問題描述**：多用戶同時編輯同一文件可能導致 Git 衝突，需要有效的衝突解決機制
- **解決方案**：
  - 實現文件鎖定機制，防止同時編輯
  - 添加實時協作狀態顯示
  - 開發三向合併界面，輔助用戶解決衝突
  - 實現自動合併策略，減少簡單衝突的手動處理
