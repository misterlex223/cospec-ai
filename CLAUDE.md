# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

The CoSpec AI Markdown Editor is a containerized application that provides a React-based Markdown editing environment with file management capabilities. The application uses Vditor as the Markdown editor and provides both file tree navigation and real-time editing features.

**Important**: This application is designed to work behind reverse proxies (such as Kai's proxy). It uses relative paths for assets and APIs, and hash-based routing to ensure compatibility with any proxy path.

## Architecture

### Frontend (React)
- **Framework**: React 19 + TypeScript + Vite
- **State Management**: Redux Toolkit with slices for files, UI, editor, and notifications
- **Routing**: React Router with **HashRouter** (for reverse proxy compatibility)
- **Styling**: Tailwind CSS with shadcn/ui components
- **Markdown Editor**: Vditor library
- **Location**: `/app-react/`
- **Build Configuration**: Uses relative paths (`base: './'`) for reverse proxy support

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

## Reverse Proxy Configuration

CoSpec AI is designed to work behind reverse proxies (such as Kai's proxy system). The following configurations ensure compatibility:

### 1. Relative Asset Paths (app-react/vite.config.ts)

```typescript
export default defineConfig({
  plugins: [react()],
  base: './', // Use relative paths for assets to support reverse proxy
  // ...
})
```

**Why**: Vite's `base: './'` option generates relative paths for all assets (JS, CSS, images) in the built HTML. This ensures assets load correctly regardless of the proxy path.

**Example**:
- Without `base: './'`: `<script src="/assets/index.js">` → fails at `/proxy-path/`
- With `base: './'`: `<script src="./assets/index.js">` → works at any path

### 2. Relative API Base URL (app-react/src/services/api.ts)

```typescript
const api = axios.create({
  baseURL: './api', // Use relative path to support reverse proxy
});
```

**Why**: Using a relative API base URL (`./api` instead of `/api`) makes API requests relative to the current page URL.

**Example**:
- Page: `http://proxy.com/flexy/123/docs/`
- API call to `./api/files` resolves to: `http://proxy.com/flexy/123/docs/api/files` ✓
- API call to `/api/files` would resolve to: `http://proxy.com/api/files` ✗

### 3. Hash-based Routing (app-react/src/App.tsx)

```typescript
import { HashRouter as Router } from 'react-router-dom'

function App() {
  return (
    <Router>
      {/* routes */}
    </Router>
  )
}
```

**Why**: `HashRouter` uses URL fragments (`#/edit`) for routing, which:
- Are never sent to the server (remain client-side only)
- Work at any deployment path without configuration
- Avoid conflicts with reverse proxy path segments

**Comparison**:
- `BrowserRouter` at `/flexy/123/docs/` navigates to `/edit` → `http://proxy.com/edit` ✗
- `HashRouter` at `/flexy/123/docs/` navigates to `#/edit` → `http://proxy.com/flexy/123/docs/#/edit` ✓

### Reverse Proxy Integration with Kai

When deployed in a Flexy container managed by Kai:
- Frontend is accessible at: `http://kai-backend/flexy/:id/docs/`
- API is accessible at: `http://kai-backend/flexy/:id/docs/api/*`

Kai's backend routes API requests (`/docs/api/*`) to port 9281 and frontend requests (`/docs/*`) to port 9280.

### Testing Reverse Proxy Configuration

To verify the configuration works correctly:

1. **Build the application**:
   ```bash
   cd app-react
   npm run build
   ```

2. **Check built HTML uses relative paths**:
   ```bash
   cat dist/index.html | grep 'src='
   # Should show: <script src="./assets/index-*.js">
   ```

3. **Check API base URL in built code**:
   ```bash
   grep -o './api' dist/assets/index-*.js | head -1
   # Should return: ./api
   ```

4. **Test behind a proxy**:
   Serve the app at a subpath and verify assets and API calls work correctly.

### Modifying for Different Proxy Configurations

If deploying behind a different reverse proxy:

1. **Ensure proxy routes match**:
   - Frontend: `/your-path/*` → port 3000
   - API: `/your-path/api/*` → port 3001

2. **No code changes needed**: The relative paths configuration works with any proxy path.

3. **If using a different base path**, you can override at build time:
   ```bash
   npm run build -- --base=/custom-path/
   ```
   However, using `./` is recommended for maximum flexibility.