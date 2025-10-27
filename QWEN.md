# QWEN.md

This file provides guidance to Qwen Code when working with code in this repository.

## Project Overview

The CoSpec AI Markdown Editor is a containerized application that provides a React-based Markdown editing environment with file management capabilities. The application uses Vditor as the Markdown editor and provides both file tree navigation and real-time editing features. It also integrates with mem0 for AI memory management.

## Architecture

### Frontend (React)
- **Framework**: React 19 + TypeScript + Vite
- **State Management**: Redux Toolkit with slices for files, UI, editor, and notifications
- **Routing**: React Router
- **Styling**: Tailwind CSS with shadcn/ui components
- **Markdown Editor**: Vditor library
- **Testing**: Playwright for end-to-end testing
- **Location**: `/app-react/`

### Backend (Node.js/Express)
- **Framework**: Node.js + Express + Socket.IO
- **File Operations**: CRUD operations for Markdown files with security validations
- **File Watching**: Uses chokidar to monitor file changes and update clients via WebSocket
- **AI Integration**: Integration with mem0 for memory management
- **Security**: Helmet, CORS, rate limiting, path sanitization, and basic token authentication
- **Location**: `/server/`

### Containerization
- **Docker**: Single container running both frontend and backend services
- **Ports**: 3000 (frontend), 3001 (backend API)
- **Volume Mount**: Supports mounting local directory to `/markdown` for persistent file storage
- **Database**: PostgreSQL with pgvector extension for mem0 integration

## Development Commands

### Docker-based Development
```bash
# Standard production mode
docker compose up --build

# Development mode with live reload
docker compose -f docker-compose-dev.yml up --build

# With custom markdown directory
MARKDOWN_DIR=/path/to/markdown docker compose up --build

# Development mode with mem0 integration
docker compose -f docker-compose-dev.yml up --build
```

### Direct Development (without Docker)
```bash
# Frontend
cd app-react
npm install
npm run dev

# Backend
cd server
npm install
npm run dev
```

### Build Commands
```bash
# Frontend build
cd app-react
npm run build

# Backend build (Node.js app, no separate build step needed)

# Docker build
docker build -t cospec-ai-app .
```

### Testing Commands
```bash
# Run Playwright end-to-end tests
cd app-react
npm run test

# Run Playwright tests with UI
cd app-react
npm run test:ui

# Run mem0 integration tests
node tests/mem0-integration.test.js
```

### Environment Variables
- `MARKDOWN_DIR`: Directory for storing Markdown files (default: `/markdown`)
- `NODE_ENV`: Environment mode (`production` or `development`)
- `API_KEY`: Backend API authentication key (default: `demo-api-key`)
- `OPENAI_API_KEY`: OpenAI API key for AI features
- `OPENAI_BASE_URL`: OpenAI API base URL (default: `https://api.openai.com/v1`)
- `OPENAI_MODEL`: OpenAI model to use (default: `gpt-3.5-turbo`)
- `MEM0_API_KEY`: mem0 API key for memory management
- `MEM0_USER_ID`: User ID for mem0 integration
- `MEM0_MODEL`: Model for mem0 integration
- `VECTOR_STORE_PROVIDER`: Vector store provider (memory or pgvector)

## Key Components

### Frontend
- **EditorPage**: Main application layout with resizable file tree and editor area
- **FileTree**: Component for browsing and managing files with expandable directory structure
- **MarkdownEditor**: Vditor-based editor component with file loading/saving
- **Navigator**: Component for navigating between recently viewed files

### Backend API Endpoints
- `GET /api/files`: Retrieve all Markdown files in directory
- `GET /api/files/:path`: Read file content
- `POST /api/files/:path`: Save file content (requires auth)
- `PUT /api/files/:path`: Create new file (requires auth)
- `DELETE /api/files/:path`: Delete file (requires auth)
- `PATCH /api/files/:path`: Rename file (requires auth)
- `POST /api/files/refresh`: Refresh file cache (requires auth)

### File Structure
- `/app-react/` - React frontend application
- `/server/` - Node.js/Express backend server
- `/docs/` - Documentation files
- `/markdown/` - Default directory for Markdown files
- `/tests/` - Test files for AI and mem0 integration
- `Dockerfile` - Container build configuration
- `docker-compose.yml` - Production Docker Compose configuration
- `docker-compose-dev.yml` - Development Docker Compose configuration
- `docker-entrypoint.sh` - Container entrypoint script

## Security Features
- Path sanitization to prevent directory traversal
- Rate limiting on API endpoints
- Helmet security headers
- Basic token-based authentication for write operations
- Content size limits (10MB)
- CORS configuration
- Input validation and type checking

## Development Workflow
1. For development: Use `docker-compose-dev.yml` to mount source directories for live reloading
2. For production: Use standard `docker-compose.yml` which builds and serves static assets
3. API authentication is required for write operations (POST, PUT, DELETE, PATCH)
4. File operations are restricted to Markdown files only
5. The application monitors the mounted directory for external file changes via chokidar
6. For AI features: Set up OpenAI and mem0 API keys in environment variables

## AI and Memory Integration
The application integrates with mem0 for memory management:
- Memory is associated with users via `MEM0_USER_ID`
- Uses OpenAI models for embeddings and completions
- Supports both in-memory and PostgreSQL vector storage
- Provides context-aware AI assistance in the editor

## Agent Task 功能擴展與整合

### 1. 擴展 Agent Task 功能支援多種任務類型

目前的 Agent 架構已經支援文件處理和內容分析任務，我們擴展支援更多類型的任務：

- **軟體開發任務**：需求分析、系統設計、代碼生成、測試用例生成
- **研究任務**：資料收集、文獻綜述、內容摘要
- **創意任務**：文案撰寫、創意發想、內容優化
- **分析任務**：數據分析、趨勢預測、風險評估

### 2. 基於自然語言的 Agent Task 創建機制

將目前表單式的任務創建方式改為自然語言處理方式：

- 利用 AI Assistant 分析用戶對話內容
- 自動識別任務類型和參數
- 生成相應的 Agent Task
- 提供任務確認機制讓用戶確認任務細節

### 3. 重新設計 Agent Manager UI

整合所有 Agent 任務的管理界面：

- 統一的任務列表視圖
- 任務進度即時顯示
- 任務詳情查看和管理
- 任務歷史記錄查詢
- 任務分類和篩選功能

### 4. AI Assistant 自動判斷並創建 Agent Task

讓 AI Assistant 成為任務創建的統一入口：

- 分析對話內容識別任務需求
- 自動創建相應的 Agent Task
- 提供任務狀態追蹤和結果反饋

這個計畫將實現一個更智能、更統一的 Agent 任務管理系統，提升用戶體驗和工作效率。