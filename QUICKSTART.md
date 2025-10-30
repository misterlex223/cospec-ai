# CoSpec AI - Quick Start Guide

## Installation

```bash
# Clone the repository
git clone https://github.com/misterlex223/cospec-ai.git
cd cospec-ai

# Install pnpm if not already installed
npm install -g pnpm

# Install all dependencies
pnpm install
```

## Running in Development Mode

### Option 1: Run Both Server and Client (Recommended)

```bash
# Start both backend server and frontend dev server
pnpm run dev
```

This will start:
- **Backend Server**: `http://localhost:9280` (API + WebSocket)
- **Frontend Dev Server**: `http://localhost:5173` (Vite with hot reload)

The frontend will proxy API requests to the backend automatically.

### Option 2: Run with a Document Profile

```bash
# First, create or copy a profile
pnpm run init-profile my-project
# or copy an example
cp -r profiles/api-development ~/.cospec-ai/profiles/

# Start with the profile
PROFILE_NAME=api-development pnpm run dev
```

### Option 3: Run Server or Client Separately

```bash
# Run only the backend server
pnpm run dev:server

# Run only the frontend (in another terminal)
pnpm run dev:client
```

## Building for Production

```bash
# Build both client and server
pnpm run build:all

# Or build separately
pnpm run build:client
pnpm run build:server
```

## Using the Document Profile Feature

### 1. Create a New Profile

```bash
# Initialize a new profile
npx cospec-ai init-profile my-api-project

# This creates:
# ~/.cospec-ai/profiles/my-api-project/
#   ├── profile.json
#   └── prompts/
#       └── example.md
```

### 2. Customize Your Profile

Edit `~/.cospec-ai/profiles/my-api-project/profile.json`:

```json
{
  "name": "My API Project",
  "version": "1.0.0",
  "description": "REST API project template",
  "documents": [
    {
      "name": "API Specification",
      "path": "SPEC.md",
      "description": "Main API specification",
      "promptFile": "prompts/api-spec.md",
      "promptText": "Generate API spec with endpoints",
      "command": "echo 'API Spec content' > {filePath}"
    }
  ],
  "folders": [
    {
      "name": "Requirements",
      "path": "requirements/",
      "description": "Requirements folder",
      "documentType": "requirement",
      "documents": [...]
    }
  ]
}
```

### 3. Add Prompt Files

Create `~/.cospec-ai/profiles/my-api-project/prompts/api-spec.md`:

```markdown
# API Specification Generation Prompt

Generate a comprehensive REST API specification including:
1. Overview and purpose
2. Authentication method
3. Endpoints with request/response schemas
4. Error handling
5. Rate limiting
```

### 4. Start CoSpec AI with Your Profile

```bash
npx cospec-ai --profile my-api-project --markdown-dir ./my-docs
```

### 5. Generate Documents from Profile

In the UI:
1. Open `http://localhost:9280`
2. See missing required files with ⚠️ icon
3. Right-click on a missing file
4. Select "⚡ Generate from Profile"
5. Watch the generation in real-time
6. File appears and opens automatically

## Using Example Profiles

### Copy and Use the API Development Profile

```bash
# Copy the example profile
cp -r profiles/api-development ~/.cospec-ai/profiles/

# Start CoSpec AI with it
npx cospec-ai --profile api-development --markdown-dir ./my-api-docs

# Or in development mode
PROFILE_NAME=api-development MARKDOWN_DIR=./my-api-docs pnpm run dev
```

The API Development profile includes:
- **SPEC.md**: API specification document
- **README.md**: Project readme
- **requirements/functional.md**: Functional requirements
- **requirements/non-functional.md**: Non-functional requirements
- **docs/architecture.md**: Architecture documentation

## Environment Variables

Create a `.env` file in the root directory:

```bash
# Server configuration
PORT=9280
MARKDOWN_DIR=./markdown

# Profile configuration
PROFILE_NAME=api-development

# API authentication
API_KEY=demo-api-key

# Kai Context Integration (optional)
KAI_PROJECT_ID=your-project-id
KAI_BACKEND_URL=http://localhost:9900
```

## Useful Commands

```bash
# Development
pnpm run dev              # Run both server and client
pnpm run dev:server       # Run only server
pnpm run dev:client       # Run only client

# Building
pnpm run build:all        # Build everything
pnpm run build:client     # Build only client

# Profile management
npx cospec-ai init-profile <name>                    # Create new profile
npx cospec-ai --profile <name>                       # Start with profile
npx cospec-ai --profile <name> --markdown-dir <dir>  # Start with profile and custom directory

# Production
pnpm start                # Start production server (after building)
```

## Troubleshooting

### Port Already in Use

```bash
# Change the port
PORT=3000 pnpm run dev
```

### Profile Not Loading

```bash
# Check if profile exists
ls ~/.cospec-ai/profiles/<profile-name>/profile.json

# Validate profile
npx cospec-ai --profile <name>
# Check server logs for validation errors
```

### Frontend Not Connecting to Backend

In development mode, the frontend proxies to `http://localhost:9280` by default. Check:
1. Backend server is running on port 9280
2. No firewall blocking localhost connections

### Dependencies Issues

```bash
# Clean install
rm -rf node_modules app-react/node_modules server/node_modules
rm pnpm-lock.yaml
pnpm install
```

## Next Steps

- Read the full documentation in [CLAUDE.md](./CLAUDE.md)
- Check the [Profile Feature documentation](./docs/PROFILE_FEATURE_PLAN.md)
- Explore [example profiles](./profiles/)
- Set up [Kai Agent integration](./CLAUDE.md#integration-with-kai-agents) for AI-powered generation

## Support

- Report issues: https://github.com/misterlex223/cospec-ai/issues
- Documentation: [CLAUDE.md](./CLAUDE.md)
- Example profiles: [profiles/](./profiles/)
