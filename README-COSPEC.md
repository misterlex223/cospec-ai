# CoSpec - Markdown Editor SaaS Platform

CoSpec is a cloud-native SaaS platform for Markdown editing with GitHub integration, built on Cloudflare's edge computing and storage services.

## Features

- **Multi-tenant Architecture**: Organization, project, and user hierarchies
- **GitHub Integration**: Connect projects to GitHub repositories
- **Markdown Editing**: WYSIWYG Markdown editor with real-time collaboration
- **Git Operations**: Pull, commit, push, and branch management
- **Global Edge Deployment**: Low-latency access from anywhere

## Architecture

CoSpec is built on Cloudflare's edge computing and storage services:

- **Workers for Platforms**: Multi-tenant worker isolation
- **D1 Database**: Serverless SQL database for structured data
- **R2 Storage**: Object storage for Markdown content
- **Cloudflare Pages**: Frontend application hosting

## Development

### Prerequisites

- Node.js 18+
- Wrangler CLI
- Cloudflare account with Workers for Platforms enabled

### Setup

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/cospec.git
   cd cospec
   ```

2. Install dependencies:
   ```
   npm install
   ```

3. Configure Wrangler:
   ```
   npx wrangler login
   ```

4. Start development server:
   ```
   npm run dev
   ```

### Deployment

Deploy to Cloudflare:
```
npm run deploy
```

## Project Structure

- `src/dispatcher.js` - Dynamic Dispatch Worker
- `src/models/` - Data models
- `src/utils/` - Utility functions
- `src/schemas/` - Database schemas
- `src/templates/` - Worker templates

## License

MIT
