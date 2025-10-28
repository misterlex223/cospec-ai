# CoSpec AI - Integrated Markdown Editor with AI Capabilities

CoSpec AI is an integrated Markdown editor with AI capabilities that runs as a unified server application. It provides a complete solution for creating, editing, and managing Markdown files with AI-assisted features through npx.

## Features

- Markdown editing with real-time preview
- File management with directory browsing
- AI-assisted editing (summarize, rewrite, format, explain)
- Real-time file synchronization
- Context system integration
- WebSocket-based live updates
- Command-line interface with npx

## Installation & Usage

To use CoSpec AI globally with npx (no installation required):

```bash
npx cospec-ai
```

The application will be available at http://localhost:9280

### Command Line Options

```bash
npx cospec-ai [options]
```

- `--port, -p`: Port to run the server on (default: 9280)
- `--markdown-dir, -m`: Directory to store markdown files (default: ./markdown)
- `--help`: Show help information

### Examples

```bash
# Start with default settings
npx cospec-ai

# Start on a custom port
npx cospec-ai --port 8080

# Use a custom markdown directory
npx cospec-ai --markdown-dir /path/to/my/markdown/files

# Use both options
npx cospec-ai --port 8080 --markdown-dir ./my-docs
```

## Configuration

### Environment Variables

When running via npx, you can set environment variables:

- `MARKDOWN_DIR`: Directory to store markdown files (default: `./markdown`)
- `PORT`: Port to run the server on (default: `9280`)
- `OPENAI_API_KEY`: API key for OpenAI integration (optional)
- `OPENAI_BASE_URL`: Base URL for OpenAI API (default: `https://api.openai.com/v1`)
- `OPENAI_MODEL`: OpenAI model to use (default: `gpt-3.5-turbo`)
- `KAI_BACKEND_URL`: Backend URL for context system integration (optional)
- `KAI_PROJECT_ID`: Project ID for context system integration (optional)

## API Endpoints

- `GET /api/files` - Get list of markdown files
- `GET /api/files/{path}` - Get content of a specific file
- `POST /api/files/{path}` - Save content to a file
- `PUT /api/files/{path}` - Create a new file
- `DELETE /api/files/{path}` - Delete a file
- `PATCH /api/files/{path}` - Rename a file
- `POST /api/files/refresh` - Refresh file cache
- `POST /api/ai/chat` - AI chat functionality
- `POST /api/ai/functions` - AI functions (summarize, rewrite, etc.)

## Context System Integration

CoSpec AI includes integration with the Kai platform's context system for automatic synchronization of specific files. Files matching certain patterns (e.g., in `specs/` directory, files ending with `.spec.md`) are automatically synchronized to the context system.

## Development

To run the application in development mode:

1. Clone the repository:
   ```bash
   git clone https://github.com/misterlex223/cospec-ai.git
   cd cospec-ai
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run in development mode:
   ```bash
   npm run dev
   ```

## Package Information

- **NPM Package**: cospec-ai
- **License**: MIT
- **Repository**: https://github.com/misterlex223/cospec-ai
- **Author**: Unclemon / misterlex223

## License

This project is licensed under the MIT License.