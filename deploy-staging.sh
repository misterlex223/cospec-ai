#!/bin/bash
# CoSpec Staging 部署腳本

set -e

echo "開始部署 CoSpec 到 Staging 環境..."

# 1. 創建 Staging 資源
echo "創建 Staging 資源..."
echo "創建 D1 數據庫..."
npx wrangler d1 create cospec-db-staging

echo "創建 R2 存儲桶..."
npx wrangler r2 bucket create cospec-storage-staging

echo "創建 Dispatch Namespace..."
npx wrangler dispatch-namespace create cospec-namespace-staging

# 2. 更新 wrangler.toml 中的資源 ID
# 注意：實際使用時需要手動更新 wrangler.toml 中的 database_id

# 3. 部署 D1 數據庫結構
echo "部署 D1 數據庫結構..."
npx wrangler d1 execute cospec-db-staging --file=./src/schemas/schema.sql

# 4. 部署 Worker
echo "部署 Worker 到 Staging 環境..."
npx wrangler deploy --env staging

# 5. 部署前端
echo "部署前端到 Cloudflare Pages..."
cd app-react
npm install

# 使用 staging 模式構建並部署
echo "構建並部署到 Cloudflare Pages..."
npm run pages:deploy:staging

echo "部署完成！"
echo "前端 URL: https://cospec-staging.pages.dev"
echo "API URL: https://api-staging.cospec.pages.dev"
