# Vditor Markdown 編輯應用

這個倉庫包含了一個基於 [Vditor](https://github.com/Vanessa219/vditor) 的 Markdown 編輯應用，使用 Docker 容器化，並支持掛載本地目錄作為 Markdown 文件的存儲位置。前端使用 React 開發，後端使用 Node.js/Express，並支持部署到 Cloudflare Pages 和 Workers。

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

### React 版本

1. 克隆此倉庫：
   ```bash
   git clone https://github.com/yourusername/vditor-docker.git
   cd vditor-docker
   ```

2. 構建並啟動容器：
   ```bash
   docker compose -f docker-compose-react.yml up -d
   ```

3. 在瀏覽器中訪問應用：
   ```
   http://localhost:3000
   ```

### 開發模式

1. 克隆此倉庫並進入目錄：
   ```bash
   git clone https://github.com/yourusername/vditor-docker.git
   cd vditor-docker
   ```

2. 使用環境變數指定 Markdown 文件目錄並啟動容器：
   ```bash
   MARKDOWN_DIR=/path/to/your/markdown/files docker compose -f docker-compose-react-dev.yml up -d
   ```

3. 在瀏覽器中訪問應用：
   ```
   http://localhost:3000
   ```

### Cloudflare 部署

1. 部署到 Cloudflare Workers 和 Pages：
   ```bash
   ./deploy-staging.sh
   ```

2. 訪問部署的應用：
   ```
   https://cospec-staging.pages.dev
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
docker build -t vditor-app .
```

運行容器：
```bash
docker run -p 3000:3000 -p 3001:3001 -v /path/to/your/markdown/files:/markdown vditor-app
## 文件結構

```
.
│── app-react/            # React 前端應用程式
│   │── public/           # 公共資源
│   │── src/              # 前端源碼
│   │   │── components/    # React 組件
│   │   │── contexts/      # React 上下文
│   │   │── hooks/         # 自定義 hooks
│   │   │── lib/           # 库文件
│   │   │── services/      # 服務層
│   │   └── utils/         # 工具函數
│   │── .env               # 開發環境變數
│   │── .env.production    # 生產環境變數
│   │── .env.staging      # 測試環境變數
│   │── index.html         # HTML 入口
│   │── package.json       # 前端依賴
│   └── vite.config.ts     # Vite 配置
│── docs/                 # 功能需求文檔
│── server/               # 後端 API 服務
│   │── index.js          # 後端入口點
│   └── package.json      # 後端依賴
│── src/                  # Cloudflare Workers 源碼
│   │── api/              # API 處理函數
│   │── utils/            # 工具函數
│   │── schemas/          # 數據庫結構
│   └── templates/        # Worker 模板
│── deploy-staging.sh     # 部署腳本
│── Dockerfile.react      # React 版本 Docker 構建文件
│── docker-compose-react.yml    # 標準模式的 Docker Compose 配置
│── docker-compose-react-dev.yml # 開發模式的 Docker Compose 配置
│── docker-entrypoint-react.sh  # 容器入口點腳本
│── markdown/             # 默認的 Markdown 文件目錄
│── wrangler.toml         # Cloudflare Workers 配置
└── README.md             # 說明文件
```

## 技術棲手

- **前端**: React, TypeScript, Vite, TailwindCSS, Shadcn/UI, Vditor
- **後端**: Node.js, Express
- **雲端**: Cloudflare Pages, Cloudflare Workers, D1 數據庫, R2 存儲
- **容器化**: Docker, Docker Compose

## 授權許可

此應用程式基於 MIT 許可證提供。Vditor 本身也是基於 MIT 許可證授權的。
