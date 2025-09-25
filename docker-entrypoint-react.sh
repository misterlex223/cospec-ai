#!/bin/sh
# 功能項目: 1.1.4 設定容器啟動腳本
set -e

echo "Starting Vditor Markdown Editor App (React Version)..."

# 檢查 Markdown 目錄是否存在，如果不存在則創建
MARKDOWN_DIR="${MARKDOWN_DIR:-/markdown}"
echo "Using Markdown directory: $MARKDOWN_DIR"

if [ ! -d "$MARKDOWN_DIR" ]; then
    echo "Creating Markdown directory: $MARKDOWN_DIR"
    mkdir -p "$MARKDOWN_DIR"
fi

# 如果 Markdown 目錄為空，創建一個示例文件
if [ -z "$(ls -A "$MARKDOWN_DIR")" ]; then
    echo "Markdown directory is empty, creating example file..."
    cat > "$MARKDOWN_DIR/welcome.md" << EOF
# 歡迎使用 Vditor Markdown 編輯器

這是一個示例 Markdown 文件，您可以開始編輯或創建新的文件。

## 功能特點

- 所見即所得編輯
- 即時渲染
- 分屏預覽
- 支援各種 Markdown 語法

## 使用方法

1. 從側邊欄選擇文件
2. 使用編輯器編輯內容
3. 內容會自動保存

祝您使用愉快！
EOF
    echo "Example file created."
fi

# 啟動後端服務
echo "Starting backend server..."
cd /server
node index.js & 
BACKEND_PID=$!

# 啟動前端服務（根據環境變數決定啟動方式）
cd /app
if [ "$NODE_ENV" = "production" ]; then
    echo "Starting frontend server in production mode..."
    # 在生產環境中，使用 serve 來提供靜態文件
    npx serve -s dist -l 3000 &
    FRONTEND_PID=$!
else
    echo "Starting frontend server in development mode..."
    # 在開發環境中，使用 Vite 開發伺服器
    # 確保使用 --host 0.0.0.0 來允許外部訪問
    npm run dev -- --host 0.0.0.0 &
    FRONTEND_PID=$!
fi

# 處理信號
trap "kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT SIGTERM

# 等待子進程
wait $BACKEND_PID $FRONTEND_PID
