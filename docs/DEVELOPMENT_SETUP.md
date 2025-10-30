# Development Setup Guide

## Overview

CoSpec AI uses a monorepo structure with pnpm workspaces. The project consists of:
- **Root**: Shared configuration and scripts
- **app-react**: Frontend React application
- **server**: Backend Node.js/Express server

## Prerequisites

- **Node.js**: v18.0.0 or higher
- **pnpm**: v8.0.0 or higher (recommended over npm/yarn)

```bash
# Install pnpm globally
npm install -g pnpm

# Verify installation
pnpm --version
```

## Project Structure

```
cospec-ai/
├── app-react/              # Frontend React + TypeScript + Vite
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── store/          # Redux state management
│   │   ├── services/       # API clients
│   │   └── types/          # TypeScript types
│   ├── package.json
│   └── vite.config.ts
├── server/                 # Backend Node.js + Express
│   ├── index.js            # Main server file
│   ├── profileManager.js   # Profile system
│   ├── fileSyncManager.js  # Context sync
│   └── package.json
├── bin/
│   └── cospec-ai.js        # CLI entry point
├── profiles/               # Example profiles
│   └── api-development/
├── docs/                   # Documentation
├── package.json            # Root package.json
├── pnpm-workspace.yaml     # Workspace configuration
└── pnpm-lock.yaml          # Lockfile
```

## Installation

### 1. Clone the Repository

```bash
git clone https://github.com/misterlex223/cospec-ai.git
cd cospec-ai
```

### 2. Install Dependencies

```bash
# Install all dependencies for root and workspaces
pnpm install
```

This will:
- Install root dependencies
- Install dependencies for `app-react`
- Install dependencies for `server`
- Create symlinks between workspaces

## Development Workflow

### Running Both Server and Client

The recommended way to develop is to run both server and client simultaneously:

```bash
pnpm run dev
```

This command uses `concurrently` to run:
1. **Backend server** (port 9280):
   - Express server with API endpoints
   - WebSocket server for real-time updates
   - File watching with chokidar
   - Auto-reload with nodemon

2. **Frontend dev server** (port 5173):
   - Vite dev server with hot module replacement (HMR)
   - TypeScript compilation
   - Proxies API requests to backend

**Output:**
```
[0] [nodemon] starting `node index.js`
[0] Server running on port 9280
[1] VITE v6.0.3  ready in 500 ms
[1] ➜  Local:   http://localhost:5173/
```

### Running Server Only

```bash
pnpm run dev:server
```

Use this when:
- Working on backend-only features
- Testing API endpoints
- Debugging server-side code

### Running Client Only

```bash
pnpm run dev:client
```

Use this when:
- Working on UI components
- Testing frontend features
- Server is already running

**Note:** The client expects the server to be running on port 9280.

### Running with Profiles

```bash
# Set environment variables
export PROFILE_NAME=api-development
export MARKDOWN_DIR=/path/to/markdown

# Run development mode
pnpm run dev

# Or inline
PROFILE_NAME=api-development MARKDOWN_DIR=./my-docs pnpm run dev
```

## Building

### Build Everything

```bash
pnpm run build:all
```

This will:
1. Build the React frontend (`app-react/dist/`)
2. Prepare server (no build needed for Node.js)

### Build Client Only

```bash
pnpm run build:client
```

Output: `app-react/dist/`

### Build for Production

```bash
# Build
pnpm run build:all

# Start production server
pnpm start
```

The production server will:
- Serve static frontend files from `app-react/dist/`
- Run the API server
- Use production optimizations

## Testing

### Manual Testing

1. **Start development servers:**
   ```bash
   pnpm run dev
   ```

2. **Access the application:**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:9280/api
   - WebSocket: ws://localhost:9280/ws

3. **Test file operations:**
   - Create a new file in the UI
   - Edit and save a file
   - Test file tree navigation

4. **Test profile features:**
   ```bash
   # Copy example profile
   cp -r profiles/api-development ~/.cospec-ai/profiles/

   # Restart with profile
   PROFILE_NAME=api-development pnpm run dev
   ```

   - Check ghost entries in file tree
   - Right-click and generate a file
   - Verify file creation

### API Testing

```bash
# Test profile endpoint
curl http://localhost:9280/api/profile | jq

# Test files endpoint
curl http://localhost:9280/api/files | jq

# Test file generation (requires auth)
curl -X POST \
  -H "Authorization: Bearer demo-api-key" \
  http://localhost:9280/api/profile/generate/SPEC.md
```

## Debugging

### Backend Debugging

The server uses `nodemon` which auto-restarts on file changes. Add console.log statements or use Node.js debugger:

```bash
# Run server with Node inspector
cd server
node --inspect index.js

# Or with nodemon
nodemon --inspect index.js
```

Then connect Chrome DevTools to `chrome://inspect`.

### Frontend Debugging

1. **Browser DevTools:**
   - Open http://localhost:5173
   - Press F12 for DevTools
   - Use React DevTools extension

2. **VS Code Debugging:**
   Create `.vscode/launch.json`:
   ```json
   {
     "version": "0.2.0",
     "configurations": [
       {
         "type": "chrome",
         "request": "launch",
         "name": "Launch Chrome",
         "url": "http://localhost:5173",
         "webRoot": "${workspaceFolder}/app-react/src"
       }
     ]
   }
   ```

### Common Issues

#### Port Already in Use

```bash
# Change server port
PORT=3000 pnpm run dev:server

# Find and kill process using port 9280
lsof -ti:9280 | xargs kill -9
```

#### Module Not Found

```bash
# Clean and reinstall
rm -rf node_modules app-react/node_modules server/node_modules
rm pnpm-lock.yaml
pnpm install
```

#### TypeScript Errors

```bash
# Rebuild TypeScript
cd app-react
pnpm run build
```

#### WebSocket Connection Failed

1. Check server is running on port 9280
2. Check firewall settings
3. Verify CORS configuration in server

## Environment Configuration

### Development (.env)

Create `.env` in the root directory:

```bash
# Server
PORT=9280
MARKDOWN_DIR=./markdown

# Profile
PROFILE_NAME=api-development

# Authentication
API_KEY=demo-api-key

# Kai Integration (optional)
KAI_PROJECT_ID=
KAI_BACKEND_URL=http://localhost:9900
```

### Production

For production, set environment variables directly:

```bash
export NODE_ENV=production
export PORT=9280
export MARKDOWN_DIR=/app/markdown
export API_KEY=your-secure-key
```

## IDE Setup

### VS Code (Recommended)

Install extensions:
- ESLint
- Prettier
- TypeScript and JavaScript Language Features
- React Developer Tools
- Tailwind CSS IntelliSense

Workspace settings (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "typescript.tsdk": "app-react/node_modules/typescript/lib",
  "eslint.workingDirectories": ["app-react"]
}
```

## Git Workflow

```bash
# Create feature branch
git checkout -b feature/your-feature

# Make changes and commit
git add .
git commit -m "feat: add new feature"

# Push and create PR
git push origin feature/your-feature
```

### Commit Message Convention

Follow conventional commits:
- `feat:` New features
- `fix:` Bug fixes
- `docs:` Documentation changes
- `style:` Code style changes
- `refactor:` Code refactoring
- `test:` Test additions/changes
- `chore:` Build process or auxiliary tool changes

## Workspace Commands

pnpm provides workspace-specific commands:

```bash
# Run script in specific workspace
pnpm --filter app-react run dev
pnpm --filter server run dev

# Install dependency in specific workspace
pnpm --filter app-react add axios
pnpm --filter server add express

# Run script in all workspaces
pnpm -r run build
```

## Performance Tips

### Frontend

1. **Use production build for testing:**
   ```bash
   pnpm run build:client
   pnpm start
   ```

2. **Analyze bundle size:**
   ```bash
   cd app-react
   pnpm run build -- --analyze
   ```

### Backend

1. **Use production mode:**
   ```bash
   NODE_ENV=production pnpm start
   ```

2. **Monitor memory usage:**
   ```bash
   node --max-old-space-size=4096 server/index.js
   ```

## Next Steps

- Read [QUICKSTART.md](../QUICKSTART.md) for quick start guide
- Read [CLAUDE.md](../CLAUDE.md) for comprehensive documentation
- Read [PROFILE_FEATURE_PLAN.md](./PROFILE_FEATURE_PLAN.md) for profile system details
- Explore [example profiles](../profiles/)

## Resources

- **pnpm Documentation**: https://pnpm.io/
- **Vite Documentation**: https://vitejs.dev/
- **React Documentation**: https://react.dev/
- **Express Documentation**: https://expressjs.com/
- **Redux Toolkit**: https://redux-toolkit.js.org/
