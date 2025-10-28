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
- **Context Sync**: Integrates with Kai's context system to sync markdown files as memories
- **Sync Metadata**: Stores sync state in `.cospec-sync/sync-metadata.json` (does NOT modify original files)
- **Security**: Helmet, CORS, rate limiting, path sanitization, and basic token authentication
- **Location**: `/server/`

### Containerization
- **Docker**: Single container running both frontend and backend services
- **Ports**: 9280 (frontend), 9281 (backend API)
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
- `KAI_PROJECT_ID`: Project ID for context sync integration (optional)
- `KAI_BACKEND_URL`: Kai backend URL for context API (optional, default: `http://host.docker.internal:9900`)

## Key Components

### Frontend
- **EditorPage**: Main application layout with resizable file tree and editor area
- **FileTree**: Component for browsing and managing files with expandable directory structure
- **MarkdownEditor**: Vditor-based editor component with file loading/saving
- **Navigator**: Component for navigating between recently viewed files

### Backend API Endpoints

**File Operations:**
- `GET /api/files`: Retrieve all Markdown files in directory
- `GET /api/files/:path`: Read file content
- `POST /api/files/:path`: Save file content (requires auth)
- `PUT /api/files/:path`: Create new file (requires auth)
- `DELETE /api/files/:path`: Delete file (requires auth)
- `PATCH /api/files/:path`: Rename file (requires auth)
- `POST /api/files/refresh`: Refresh file cache (requires auth)

**Context Sync (Kai Integration):**
- `POST /api/files/:path/sync-to-context`: Manually mark file for sync to Kai context (requires auth)
- `DELETE /api/files/:path/sync-to-context`: Unmark file from sync (requires auth)
- `GET /api/files/:path/sync-status`: Get sync status for a file
- `GET /api/context-config`: Get context sync configuration and health status

### File Structure
- `/app-react/` - React frontend application
- `/server/` - Node.js/Express backend server
  - `index.js` - Main server with file watcher and API routes
  - `fileSyncManager.js` - Manages context sync state (auto-sync patterns, metadata storage)
  - `kaiContextClient.js` - Client for Kai context API
- `/docs/` - Documentation files
- `/markdown/` - Default directory for Markdown files
  - `.cospec-sync/` - Hidden directory for sync metadata (auto-created, gitignored)
    - `sync-metadata.json` - Persistent sync state (memoryId, lastSync, status per file)
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
   - Frontend: `/your-path/*` → port 9280
   - API: `/your-path/api/*` → port 9281

2. **No code changes needed**: The relative paths configuration works with any proxy path.

3. **If using a different base path**, you can override at build time:
   ```bash
   npm run build -- --base=/custom-path/
   ```
   However, using `./` is recommended for maximum flexibility.

## Context Sync Integration

CoSpec AI integrates with Kai's context system to automatically sync markdown files as memories. This enables AI-powered context retrieval and knowledge management.

### Auto-Sync Patterns

Files matching these patterns are automatically synced to Kai's context system:
- `specs/**/*.md` - Specification documents
- `requirements/**/*.md` - Requirements documents
- `docs/specs/**/*.md` - Spec documentation
- `**/*.spec.md` - Files ending with `.spec.md`
- `SPEC.md` - Root spec file
- `REQUIREMENTS.md` - Root requirements file

### Manual Sync Control

Users can manually mark/unmark files for sync via:
- **Frontend UI**: Context menu option on files in the file tree
- **API**: `POST /api/files/:path/sync-to-context` endpoint

### Sync Metadata Storage

**Important**: CoSpec AI does NOT modify original markdown files. All sync metadata is stored separately in `.cospec-sync/sync-metadata.json`.

**Metadata Structure**:
```json
{
  "version": 1,
  "lastUpdated": "2025-01-23T10:30:00.000Z",
  "syncedFiles": {
    "specs/api-design.md": {
      "memoryId": "abc-123-def-456",
      "lastSync": "2025-01-23T10:29:45.000Z",
      "status": "synced"
    }
  }
}
```

### File Watcher Behavior

The chokidar file watcher monitors markdown files and triggers sync operations:
- **On file add**: Auto-sync if matches pattern
- **On file change**: Debounced sync (3 second delay) if previously synced or matches pattern
- **On file delete**: Remove from context system if previously synced

**Important**: The watcher ignores `.cospec-sync/**` to prevent infinite loops.

### Sync Lifecycle

1. **Initial Load**: `fileSyncManager.initialize()` loads existing sync state from metadata file
2. **File Change Detected**: Watcher triggers `handleFileChange()` with debouncing
3. **Sync Execution**: `syncFile()` calls Kai context API to create/update memory
4. **Metadata Update**: `saveMetadata()` persists sync state without modifying original file
5. **No Loop**: Metadata writes to `.cospec-sync/` don't trigger watcher (ignored directory)

### Troubleshooting

**Issue**: Infinite sync loop (file keeps syncing repeatedly)
- **Cause**: Watcher not ignoring `.cospec-sync/` directory
- **Fix**: Verify `watchOptions.ignored` includes `'**/.cospec-sync/**'` in `index.js`

**Issue**: Sync state lost after container restart
- **Cause**: `.cospec-sync/` directory not persisted
- **Fix**: Ensure `MARKDOWN_DIR` volume mount includes the `.cospec-sync/` subdirectory

**Issue**: Files not auto-syncing
- **Cause**: File path doesn't match any auto-sync pattern
- **Fix**: Use manual sync API or add pattern to `DEFAULT_SYNC_PATTERNS` in `fileSyncManager.js`

### Design Principles

1. **No File Pollution**: Original markdown files are never modified for sync purposes
2. **Separation of Concerns**: Sync metadata stored in dedicated hidden directory
3. **Idempotency**: Multiple syncs of same file content result in update, not duplicate
4. **Debouncing**: File changes are debounced to avoid excessive API calls during editing
5. **Graceful Degradation**: If Kai backend is unavailable, sync fails gracefully without breaking editor