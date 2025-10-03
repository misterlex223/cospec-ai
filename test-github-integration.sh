#!/bin/bash
# GitHub 集成測試腳本

set -e

echo "開始測試 GitHub 集成..."

# 1. 創建測試組織
echo "創建測試組織..."
ORG_RESPONSE=$(curl -s -X POST http://localhost:3002/api/organizations \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{"name": "Test Organization", "settings": {"description": "Test Organization for GitHub Integration"}}')

ORG_ID=$(echo $ORG_RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "組織 ID: $ORG_ID"

# 2. 創建測試項目
echo "創建測試項目..."
PROJECT_RESPONSE=$(curl -s -X POST http://localhost:3002/api/organizations/$ORG_ID/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{"name": "Test Project", "settings": {"description": "Test Project for GitHub Integration"}}')

PROJECT_ID=$(echo $PROJECT_RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "項目 ID: $PROJECT_ID"

# 3. 連接 GitHub 倉庫
echo "連接 GitHub 倉庫..."
GITHUB_RESPONSE=$(curl -s -X POST http://localhost:3002/api/projects/$PROJECT_ID/github/connect \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{"github_repo": "misterlex223/test-repo", "github_branch": "main", "github_access_token": "test-token"}')

echo "GitHub 連接響應: $GITHUB_RESPONSE"

# 4. 從 GitHub 拉取更改
echo "從 GitHub 拉取更改..."
PULL_RESPONSE=$(curl -s -X POST http://localhost:3002/api/projects/$PROJECT_ID/github/pull \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{}')

echo "拉取響應: $PULL_RESPONSE"

# 5. 創建測試文件
echo "創建測試文件..."
FILE_RESPONSE=$(curl -s -X POST http://localhost:3002/api/projects/$PROJECT_ID/files \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{"name": "test.md", "content": "# Test File\n\nThis is a test file for GitHub integration."}')

FILE_ID=$(echo $FILE_RESPONSE | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
echo "文件 ID: $FILE_ID"

# 6. 推送更改到 GitHub
echo "推送更改到 GitHub..."
PUSH_RESPONSE=$(curl -s -X POST http://localhost:3002/api/projects/$PROJECT_ID/github/push \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d "{\"commit_message\": \"Test commit\", \"files\": [\"$FILE_ID\"]}")

echo "推送響應: $PUSH_RESPONSE"

# 7. 獲取 Git 操作歷史
echo "獲取 Git 操作歷史..."
OPERATIONS_RESPONSE=$(curl -s -X GET http://localhost:3002/api/projects/$PROJECT_ID/github/operations \
  -H "Authorization: Bearer test-token")

echo "操作歷史: $OPERATIONS_RESPONSE"

echo "測試完成！"
