# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The CoSpec AI Markdown Editor is a containerized application that provides a React-based Markdown editing environment with file management capabilities. The application uses Vditor as the Markdown editor and provides both file tree navigation and real-time editing features.

## Architecture

### Frontend (React)
- **Framework**: React 19 + TypeScript + Vite
- **State Management**: Redux Toolkit with slices for files, UI, editor, and notifications
- **Routing**: React Router
- **Styling**: Tailwind CSS with shadcn/ui components
- **Markdown Editor**: Vditor library
- **Location**: `/app-react/`

### Backend (Node.js/Express)
- **Framework**: Node.js + Express + Socket.IO
- **File Operations**: CRUD operations for Markdown files with security validations
- **File Watching**: Uses chokidar to monitor file changes and update clients via WebSocket
- **Security**: Helmet, CORS, rate limiting, path sanitization, and basic token authentication
- **Location**: `/server/`

### Containerization
- **Docker**: Single container running both frontend and backend services
- **Ports**: 3000 (frontend), 3001 (backend API)
- **Volume Mount**: Supports mounting local directory to `/markdown` for persistent file storage

## Development Commands

### Docker-based Development
```bash
# Standard production mode
docker compose up --build

# Development mode with live reload
docker compose -f docker-compose-dev.yml up --build

# With custom markdown directory
MARKDOWN_DIR=/path/to/markdown docker compose up --build
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

### Environment Variables
- `MARKDOWN_DIR`: Directory for storing Markdown files (default: `/markdown`)
- `NODE_ENV`: Environment mode (`production` or `development`)
- `API_KEY`: Backend API authentication key (default: `demo-api-key`)

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
- `Dockerfile` - Container build configuration
- `docker-compose.yml` - Production Docker Compose configuration
- `docker-compose-dev.yml` - Development Docker Compose configuration

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