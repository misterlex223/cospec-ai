# Cloudflare Pages 部署指南

本文檔提供了將 CoSpec Markdown 編輯器部署到 Cloudflare Pages 的步驟。

## 前提條件

1. 已安裝 Node.js 18+ 和 npm/pnpm
2. 已安裝 Wrangler CLI (`npm install -g wrangler`)
3. 已有 Cloudflare 帳戶並登入 (`wrangler login`)

## 本地開發

### 1. 啟動本地開發服務器

```bash
# 使用 Vite 開發服務器
npm run dev

# 使用 Cloudflare Pages 開發服務器
npm run build
npm run pages:dev
```

### 2. 配置環境變量

編輯 `.env` 和 `.env.production` 文件以配置 API URL 和其他環境變量。

## 部署到 Cloudflare Pages

### 1. 使用 Wrangler CLI 部署

```bash
# 構建並部署
npm run pages:deploy
```

### 2. 使用 Cloudflare Dashboard 部署

1. 登入 [Cloudflare Dashboard](https://dash.cloudflare.com/)
2. 進入 Pages 部分
3. 創建新項目並連接到 GitHub 倉庫
4. 配置構建設置：
   - 構建命令: `npm run build`
   - 輸出目錄: `dist`
   - 根目錄: `app-react`
5. 配置環境變量：
   - `API_URL`: 後端 API 的 URL (例如: `http://localhost:3001/api`)

## 配置說明

### 文件結構

- `functions/`: Cloudflare Pages Functions
  - `_middleware.ts`: 全局中間件
  - `api/[[path]].ts`: API 代理
  - `health.ts`: 健康檢查端點
- `public/_routes.json`: 客戶端路由配置
- `.cloudflarerc`: Cloudflare Pages 配置

### 環境變量

- `VITE_API_URL`: 後端 API 的 URL
- `VITE_ENV`: 環境名稱 (`development` 或 `production`)

## 本地後端連接

在開發過程中，前端將通過代理連接到本地後端 API。在生產環境中，可以通過 Cloudflare Pages Functions 代理 API 請求，或者直接連接到後端 API。

## 故障排除

### CORS 錯誤

如果遇到 CORS 錯誤，請確保：

1. 後端 API 允許來自 Cloudflare Pages 域名的跨域請求
2. API 代理函數 (`functions/api/[[path]].ts`) 正確配置

### 路由問題

如果遇到 404 錯誤，請檢查：

1. `public/_routes.json` 文件是否正確配置
2. React Router 配置是否與 Cloudflare Pages 兼容
