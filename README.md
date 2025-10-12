# CoSpec AI Markdown 編輯應用

這個倉庫包含了一個基於 [Vditor](https://github.com/Vanessa219/vditor) 的 Markdown 編輯應用，使用 Docker 容器化，並支持掛載本地目錄作為 Markdown 文件的存儲位置。

## 功能特點

- 容器化的 Markdown 編輯環境
- 樹狀結構的文件瀏覽器
- 所見即所得的 Markdown 編輯器
- 支持創建、讀取、更新和刪除 Markdown 文件
- 本地目錄與容器實時同步
- 響應式設計，適配不同設備

## 前提條件

- Docker
- Docker Compose

## 快速開始

### 標準模式

1. 克隆此倉庫：
   ```bash
   git clone https://github.com/yourusername/cospec-ai.git
   cd cospec-ai
   ```

2. 構建並啟動容器：
   ```bash
   docker compose up -d
   ```

3. 在瀏覽器中訪問應用：
   ```
   http://localhost:3000
   ```

### 開發模式

1. 克隆此倉庫並進入目錄：
   ```bash
   git clone https://github.com/yourusername/cospec-ai.git
   cd cospec-ai
   ```

2. 使用環境變數指定 Markdown 文件目錄並啟動容器：
   ```bash
   MARKDOWN_DIR=/path/to/your/markdown/files docker compose -f docker-compose-dev.yml up -d
   ```

3. 在瀏覽器中訪問應用：
   ```
   http://localhost:3000
   ```

## 配置

### 環境變數

您可以配置以下環境變數：

- `MARKDOWN_DIR`：指定存放 Markdown 文件的目錄（默認：`./markdown`）

示例：
```bash
MARKDOWN_DIR=/path/to/your/markdown/files docker compose up -d
```

**注意**：
- 掛載的 Markdown 目錄與容器內的目錄是實時同步的，任何在編輯器中的更改都會直接寫入到本地文件系統。
- 如果指定的 Markdown 目錄為空，系統會自動創建一個示例文件。

## 使用方法

一旦容器運行，您可以在 `http://localhost:3000` 訪問應用。主要功能包括：

1. **瀏覽文件**：左側側邊欄顯示所有 Markdown 文件的樹狀結構
2. **編輯文件**：點擊文件後在右側編輯區域使用 Vditor 編輯器進行編輯
3. **創建新文件**：點擊側邊欄上方的「新建文件」按鈕
4. **文件操作**：右鍵點擊文件或目錄可以進行重命名、刪除等操作

## 從源碼構建

如果您想手動構建 Docker 映像：

```bash
docker build -t cospec-ai-app .
```

運行容器：
```bash
docker run -p 3000:3000 -p 3001:3001 -v /path/to/your/markdown/files:/markdown cospec-ai-app
```

## 文件結構

```
.
├── app/                  # 應用程式源碼
│   ├── public/           # 公共資源
│   ├── server/           # 後端 API 服務
│   ├── src/              # 前端源碼
│   │   ├── assets/        # 靜態資源
│   │   ├── components/    # Vue 組件
│   │   ├── router/        # 路由配置
│   │   ├── stores/        # Pinia 狀態管理
│   │   ├── utils/         # 工具函數
│   │   └── views/         # 頁面視圖
│   ├── .env               # 環境變數
│   ├── index.html         # HTML 入口
│   ├── package.json       # 前端依賴
│   └── vite.config.js     # Vite 配置
├── docs/                 # 功能需求文檔
├── Dockerfile            # Docker 構建文件
├── docker-compose.yml    # 標準模式的 Docker Compose 配置
├── docker-compose-dev.yml # 開發模式的 Docker Compose 配置
├── docker-entrypoint.sh  # 容器入口點腳本
├── markdown/             # 默認的 Markdown 文件目錄
└── README.md             # 說明文件
```

## 技術棧

- **前端**：React, TypeScript, Vite, Redux Toolkit, React Router, CoSpec AI
- **後端**：Node.js, Express, Socket.io
- **容器化**：Docker, Docker Compose

## Docker 配置

本項目提供兩種 Docker 配置：

### 生產環境
```bash
# 使用默認配置運行（構建並運行生產版本）
docker compose up --build

# 指定 markdown 目錄
MARKDOWN_DIR=/path/to/your/markdown docker compose up --build
```

### 開發環境
```bash
# 開發模式運行（源碼掛載，實時重載）
docker compose -f docker-compose-dev.yml up --build

# 開發模式指定 markdown 目錄
MARKDOWN_DIR=/path/to/your/markdown docker compose -f docker-compose-dev.yml up --build
```

## 授權許可

此應用程式基於 MIT 許可證提供。Vditor 本身也是基於 MIT 許可證授權的。
