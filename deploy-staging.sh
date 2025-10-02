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
echo "更新 wrangler.toml 中的資源 ID..."

# 取得剛剛創建的 D1 數據庫 ID
DB_ID=$(npx wrangler d1 list | grep cospec-db-staging | awk '{print $1}')
NAMESPACE_ID=$(npx wrangler dispatch-namespace list | grep cospec-namespace-staging | awk '{print $1}')

echo "D1 數據庫 ID: $DB_ID"
echo "Dispatch Namespace ID: $NAMESPACE_ID"

# 更新 wrangler.toml 文件
if [ -n "$DB_ID" ]; then
  # 更新頂層的 D1 數據庫綁定
  sed -i "s/database_id = \"staging-db-id-will-be-generated-after-creation\"/database_id = \"$DB_ID\"/g" wrangler.toml
  # 確保頂層也有相同的綁定
  if ! grep -q "COSPEC_DB_STAGING" wrangler.toml; then
    sed -i "/# Staging D1 Database binding/,+5d" wrangler.toml 2>/dev/null || true
    sed -i "/# D1 Database binding/a \
# Staging D1 Database binding\n[[d1_databases]]\nbinding = \"COSPEC_DB_STAGING\"\ndatabase_name = \"cospec-db-staging\"\ndatabase_id = \"$DB_ID\"" wrangler.toml
  fi
fi

# 3. 部署 D1 數據庫結構
echo "部署 D1 數據庫結構..."

# 先部署到本地以測試 SQL 語法
echo "部署到本地數據庫..."
npx wrangler d1 execute cospec-db-staging --file=./src/schemas/schema.sql

# 確認後部署到遠程
echo "部署到遠程數據庫..."
npx wrangler d1 execute cospec-db-staging --file=./src/schemas/schema.sql --remote

# 4. 部署 Worker
echo "部署 Worker 到 Staging 環境..."

# 移除路由配置，避免部署錯誤
if grep -q "route =" wrangler.toml; then
  sed -i "/route =/d" wrangler.toml
fi

# 部署 Worker
npx wrangler deploy --env staging

# 取得 Worker URL
WORKER_URL=$(npx wrangler deployments --env staging | grep -o "https://[^ ]*\.workers\.dev" | head -1)
echo "Worker URL: $WORKER_URL"

# 5. 部署前端
echo "部署前端到 Cloudflare Pages..."
cd app-react
npm install

# 更新 .env.staging 文件中的 API URL
if [ -n "$WORKER_URL" ]; then
  echo "# Staging 環境配置" > .env.staging
  echo "VITE_API_URL=$WORKER_URL/api" >> .env.staging
  echo "VITE_ENV=staging" >> .env.staging
  echo "更新了 .env.staging 文件中的 API URL"
fi

# 安裝 terser
if ! npm list terser --depth=0 | grep -q terser; then
  echo "安裝 terser..."
  npm install terser --save-dev
fi

# 使用 staging 模式構建
echo "構建 staging 版本..."
npm run build:staging

# 部署到 Cloudflare Pages
echo "部署到 Cloudflare Pages..."
npx wrangler pages deploy dist --project-name=cospec-staging

echo "部署完成！"
echo "前端 URL: https://cospec-staging.pages.dev"
echo "API URL: $WORKER_URL"
