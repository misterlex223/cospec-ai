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
- **WebSocket**: Socket.IO client for real-time communication with backend
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

### Using pnpm (Recommended)

**Prerequisites:**
```bash
# Install pnpm if not already installed
npm install -g pnpm
```

**Development (runs both server and client simultaneously):**
```bash
# Install all dependencies (root + workspaces)
pnpm install

# Run both server and client in development mode
pnpm run dev

# This will start:
# - Backend server on port 9280 (or PORT env var)
# - Frontend dev server with hot reload on port 5173 (Vite default)
# - WebSocket server on the same port as backend (9280)
```

**Development with Profile:**
```bash
# Start with a specific profile
pnpm run dev --profile api-development

# Or set environment variables first
export PROFILE_NAME=api-development
export MARKDOWN_DIR=/path/to/your/markdown
pnpm run dev
```

**Individual Commands:**
```bash
# Run only server
pnpm run dev:server

# Run only client
pnpm run dev:client

# Build everything
pnpm run build:all

# Build only client
pnpm run build:client
```

### Docker-based Development
```bash
# Standard production mode
docker compose up --build

# Development mode with live reload
docker compose -f docker-compose-dev.yml up --build

# With custom markdown directory
MARKDOWN_DIR=/path/to/markdown docker compose up --build
```

### Direct Development (without Docker, using npm)
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
# Using pnpm (recommended)
pnpm run build:all

# Using npm
npm run build:client

# Docker build
docker build -t cospec-ai-app .
```

### Environment Variables
- `MARKDOWN_DIR`: Directory for storing Markdown files (default: `./markdown`)
- `PROFILE_NAME`: Name of profile to load from `~/.cospec-ai/profiles/` (optional)
- `PORT`: Server port (default: `9280`)
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

**Profile Management:**
- `GET /api/profile`: Get loaded profile configuration
- `GET /api/profile/files`: Get required files with existence status
- `GET /api/profile/prompt/:path`: Get prompt file content for preview
- `POST /api/profile/generate/:path`: Execute generation command for file (requires auth)
- `GET /api/profile/validate`: Validate profile configuration

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

## Document Profile Feature

The Document Profile feature allows users to define required documents and folders with AI generation capabilities. Profiles help standardize project structure and automate document generation using external commands or AI agents.

### Profile Storage

Profiles are stored in `~/.cospec-ai/profiles/<profile-name>/`:
```
~/.cospec-ai/profiles/
└── api-development/
    ├── profile.json          # Main profile configuration
    └── prompts/              # Agent prompt files
        ├── api-spec.md
        ├── requirements.md
        └── architecture.md
```

### CLI Usage

**List all available profiles:**
```bash
npx cospec-ai list-profiles
```

This displays all profiles found in `~/.cospec-ai/profiles/` with their name, version, description, and path.

**Start CoSpec AI with a profile:**
```bash
npx cospec-ai --profile api-development
```

**Create a new profile:**
```bash
npx cospec-ai init-profile my-project
```

This creates a profile skeleton at `~/.cospec-ai/profiles/my-project/` with:
- `profile.json` - Example profile configuration
- `prompts/example.md` - Example prompt file

**Launch Profile Editor:**
```bash
npx cospec-ai --profile-editor
```

This starts CoSpec AI in Profile Editor mode, a visual interface for creating and managing profiles. See [PROFILE_EDITOR.md](docs/PROFILE_EDITOR.md) for detailed documentation.

### Profile Configuration

**Profile JSON Structure:**
```json
{
  "name": "API Development Profile",
  "version": "1.0.0",
  "description": "Profile for REST API development projects",
  "documents": [
    {
      "name": "API Specification",
      "path": "SPEC.md",
      "description": "Main API specification document",
      "promptFile": "prompts/api-spec.md",
      "promptText": "Generate comprehensive API spec",
      "command": "kai agent execute --prompt-file {promptFile} --output {filePath}"
    }
  ],
  "folders": [
    {
      "name": "Requirements",
      "path": "requirements/",
      "description": "Requirements documentation folder",
      "documentType": "requirement",
      "documents": [...]
    }
  ]
}
```

**Field Descriptions:**
- `name`: Display name of the profile
- `version`: Profile version (semver)
- `description`: Brief description of the profile's purpose
- `documents`: Array of required top-level documents
- `folders`: Array of folders with their required documents

**Document Configuration:**
- `name`: Document display name
- `path`: Path relative to markdown directory (e.g., "SPEC.md" or "requirements/api.md")
- `description`: Purpose of the document
- `promptFile`: Path to prompt file relative to profile directory (e.g., "prompts/api-spec.md")
- `promptText`: Additional prompt text for generation
- `command`: Shell command to execute for generation

**Command Variable Substitution:**
- `{promptFile}`: Absolute path to the prompt file
- `{filePath}`: Absolute path to the target file in markdown directory
- `{promptText}`: The promptText value from profile.json

Example:
```bash
kai agent execute --prompt-file {promptFile} --output {filePath} --context "{promptText}"
```

### Frontend Integration

**File Tree Enhancements:**
- Missing required files show with:
  - Red warning icon (⚠️)
  - Grayed out text
  - "Missing" badge
  - Tooltip with document name and description
- Existing required files show:
  - "Required" badge (blue)
  - Tooltip with profile information
- Ghost entries: Missing files appear in tree at their expected location

**Context Menu:**
- Right-click on missing required file: "⚡ Generate from Profile"
- Right-click on existing required file: "⚡ Regenerate"
- Only shown if document has a generation command

**Generation Flow:**
1. User right-clicks file and selects "Generate from Profile"
2. Frontend dispatches `generateFile()` action
3. Backend executes the command with variable substitution
4. Real-time output streamed via WebSocket
5. On success: File tree refreshes, file auto-opens in editor
6. On failure: Error notification shown

### Backend Implementation

**Server Components:**
- `server/profileManager.js`: Profile loading, validation, path resolution
- Profile loaded on server startup if `PROFILE_NAME` environment variable set
- Validates profile schema and checks prompt file existence
- Provides methods for document lookup and generation context

**API Endpoints:**
- `GET /api/profile`: Get loaded profile configuration
- `GET /api/profile/files`: Get required files with existence status
- `GET /api/profile/prompt/:path`: Get prompt file content for preview
- `POST /api/profile/generate/:path`: Execute generation command (requires auth)
- `GET /api/profile/validate`: Validate profile configuration

**Profile Management API (for Profile Editor):**
- `GET /api/profiles`: List all available profiles
- `GET /api/profiles/:name`: Get specific profile content
- `POST /api/profiles`: Create new profile (requires auth)
- `PUT /api/profiles/:name`: Update profile (requires auth)
- `DELETE /api/profiles/:name`: Delete profile (requires auth)
- `POST /api/profiles/:name/load`: Hot reload profile (requires auth)
- `POST /api/profiles/:name/prompts`: Create/update prompt file (requires auth)
- `DELETE /api/profiles/:name/prompts`: Delete prompt file (requires auth)
- `GET /api/profiles/:name/prompts/:path(*)`: Get prompt file content
- `GET /api/config`: Get app configuration (editor mode status)

**ProfileManager CRUD Methods:**
- `createProfile(name, config)`: Create new profile with validation
- `updateProfile(name, config)`: Update existing profile (creates backup)
- `deleteProfile(name)`: Delete profile directory
- `reloadProfile(name)`: Hot reload profile without server restart
- `savePromptFile(profileName, path, content)`: Save/update prompt file
- `deletePromptFile(profileName, path)`: Delete prompt file
- `readPromptFile(profileName, path)`: Read prompt file content

**Generation Process:**
1. Validate document exists in profile and has command
2. Resolve prompt file to absolute path
3. Build command with variable substitution
4. Execute via `child_process.spawn()`
5. Stream stdout/stderr to clients via WebSocket
6. On success: Invalidate file cache, broadcast file-added event
7. On failure: Emit error event

**WebSocket Events:**
- `generation-output`: Real-time command output `{ path, output, isError }`
- `generation-complete`: Generation finished `{ path, success, exitCode, output }`
- `profile-reloaded`: Profile hot reload event `{ profileName, profile }`

### Frontend State Management

**Redux Profile Slice (`profileSlice.ts`):**
- Stores profile configuration, required files
- Manages generation state per file (isGenerating, output, success, error)
- Handles WebSocket events for real-time updates
- Caches prompt file content

**Actions:**
- `fetchProfile()`: Load profile from server
- `fetchPromptContent(filePath)`: Get prompt file content
- `generateFile(filePath)`: Trigger file generation
- `addGenerationOutput()`: Handle WebSocket output events
- `setGenerationComplete()`: Handle generation completion

**Redux Profile Editor Slice (`profileEditorSlice.ts`):**
- Manages profile editing state (available profiles, editing profile, validation)
- Handles profile CRUD operations
- Manages prompt file editing
- Tracks active profile and hot reload state

**Profile Editor Components:**
- `ProfileEditorApp.tsx`: Main app wrapper for editor mode
- `ProfileBrowser.tsx`: Profile list with create/edit/delete/activate actions
- `ProfileEditorPage.tsx`: Profile configuration editor
- `DocumentList.tsx`: Document management with drag-drop support
- `FolderList.tsx`: Folder and nested document management
- `PromptFileManager.tsx`: Simple textarea for quick prompt editing

**Mode Detection:**
- `main.tsx` checks `/api/config` on startup
- Renders `ProfileEditorApp` if `profileEditorMode === true`
- Renders regular `App` for markdown editing mode
- No code changes needed for proxy deployment

### Example Profiles

CoSpec AI includes example profiles in `/profiles/`:

**api-development**: REST API project template
- Required documents: SPEC.md, README.md
- Folders: requirements/, docs/
- Prompts for API specs, functional/non-functional requirements, architecture

**Usage:**
1. Copy example profile to `~/.cospec-ai/profiles/`:
   ```bash
   cp -r profiles/api-development ~/.cospec-ai/profiles/
   ```
2. Customize profile.json and prompts as needed
3. Start CoSpec AI with the profile:
   ```bash
   npx cospec-ai --profile api-development
   ```

### Profile Development Workflow

1. **Create Profile Skeleton:**
   ```bash
   npx cospec-ai init-profile my-project
   cd ~/.cospec-ai/profiles/my-project
   ```

2. **Edit profile.json:**
   - Add required documents and folders
   - Specify file paths and descriptions
   - Define generation commands

3. **Create Prompt Files:**
   - Add prompt files in `prompts/` directory
   - Write clear instructions for AI agents
   - Include examples and structure guidelines

4. **Test Profile:**
   ```bash
   npx cospec-ai --profile my-project
   ```
   - Right-click missing files in tree
   - Select "Generate from Profile"
   - Verify generated content

5. **Iterate:**
   - Refine prompts based on output quality
   - Adjust commands if needed
   - Add more documents as requirements grow

### Integration with Kai Agents

CoSpec AI is designed to work with Kai's agent system for document generation:

**Example Command:**
```bash
kai agent execute --prompt-file {promptFile} --output {filePath}
```

**Prompt File Format:**
Markdown files containing:
- Clear instructions for the AI
- Structure guidelines
- Examples
- Required sections

**Workflow:**
1. User triggers generation from UI
2. CoSpec AI executes Kai agent command
3. Kai agent reads prompt file
4. Kai agent generates content
5. Output written to target file
6. CoSpec AI detects new file and refreshes tree

### Best Practices

1. **Profile Organization:**
   - One profile per project type
   - Group related documents in folders
   - Use clear, descriptive names

2. **Prompt Files:**
   - Be specific about requirements
   - Include structure templates
   - Provide examples
   - Specify format (Markdown, JSON, etc.)

3. **Generation Commands:**
   - Use absolute paths via variables
   - Handle errors gracefully
   - Log output for debugging
   - Test commands manually first

4. **Profile Versioning:**
   - Use semantic versioning
   - Document breaking changes
   - Keep prompts updated with profile

5. **Security:**
   - Validate profile JSON schema
   - Sanitize file paths
   - Require authentication for generation
   - Limit command execution scope