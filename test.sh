#!/bin/bash
# 功能項目: 4.2.2 權限問題處理

# 檢查 Docker 是否已安裝
if ! command -v docker &> /dev/null; then
    echo "錯誤: Docker 未安裝，請先安裝 Docker"
    exit 1
fi

# 檢查 Docker Compose 是否已安裝
if ! command -v docker compose &> /dev/null; then
    echo "錯誤: Docker Compose 未安裝，請先安裝 Docker Compose"
    exit 1
fi

# 檢查 markdown 目錄是否存在，如果不存在則創建
if [ ! -d "./markdown" ]; then
    echo "創建 markdown 目錄..."
    mkdir -p ./markdown
fi

# 檢查 markdown 目錄權限
if [ ! -w "./markdown" ]; then
    echo "錯誤: markdown 目錄沒有寫入權限"
    exit 1
fi

# 構建 Docker 映像
echo "構建 Docker 映像..."
docker build -t vditor-app .

# 如果構建失敗，則退出
if [ $? -ne 0 ]; then
    echo "錯誤: Docker 映像構建失敗"
    exit 1
fi

# 啟動容器
echo "啟動容器..."
docker compose up -d

# 如果啟動失敗，則退出
if [ $? -ne 0 ]; then
    echo "錯誤: 容器啟動失敗"
    exit 1
fi

# 等待服務啟動
echo "等待服務啟動..."
sleep 5

# 檢查服務是否正常運行
echo "檢查服務..."
if curl -s http://localhost:3000 > /dev/null; then
    echo "前端服務運行正常"
else
    echo "錯誤: 前端服務未正常運行"
fi

if curl -s http://localhost:3001/api/files > /dev/null; then
    echo "後端服務運行正常"
else
    echo "錯誤: 後端服務未正常運行"
fi

echo "測試完成，您可以在瀏覽器中訪問 http://localhost:3000 使用應用程式"
echo "使用 'docker compose down' 命令停止服務"
