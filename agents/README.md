# CoSpec AI Agent Integration

Document management and development workflow agent for CoSpec AI with external MCP client integration.

## Features

- **PRD Analysis** - Analyze Product Requirements Documents for completeness
- **Version Management** - Track version state and suggest semantic versioning
- **Document Generation** - Generate API docs, guides, and release notes
- **MCP Client Integration** - Connect to external MCP servers for extended capabilities

## MCP Client Integration

CoSpec AI Agent can connect to external MCP servers to extend its capabilities:

### Supported MCP Server Types

1. **SSE (Server-Sent Events)**
   ```typescript
   mcpServers: {
      weather: {
         type: 'sse',
         url: 'https://example.com/mcp/weather',
       }
   }
   ```

2. **Stdio (Standard Input/Output)**
   ```typescript
   mcpServers: {
      database: {
         type: 'stdio',
         command: 'python',
         args: ['-m', 'database-server', '--conn-str', 'sqlite:///path/to/db.sqlite3'],
       }
   }
   ```

3. **HTTP**
   ```typescript
   mcpServers: {
      customapi: {
         type: 'http',
         url: 'https://api.example.com/mcp',
         headers: {
            'Authorization': 'Bearer YOUR_TOKEN'
         }
       }
   }
   ```

### Use Cases

- **Database MCP**: Store agent state, cache results, or persist document metadata
- **Weather API**: Fetch real-time data for context-aware suggestions
- **Custom AI Tools**: Connect to specialized AI services for specific tasks
- **Version Control**: Connect to Git MCP for automatic version bumping

## Setup

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Set up environment:
   ```bash
   cp .env.example .env
   # Edit .env and add your ANTHROPIC_API_KEY
   ```

3. Run the agent:
   ```bash
   pnpm start "你的提示詞"
   ```

## Development

Run in watch mode:
```bash
pnpm dev
```

Type check:
```bash
pnpm typecheck
```

## Running with MCP Servers

### Option 1: Programmatic (in code)

```typescript
import { runAgent } from './index.js';

await runAgent('查詢今天的天氣', {
  mcpServers: {
    weather: {
      type: 'sse',
      url: 'https://weather.example.com/mcp/weather',
    }
  }
});
```

### Option 2: Config File

Create `agents/mcp-servers.json`:
```json
{
  "weather": {
    "type": "sse",
    "url": "https://weather.example.com/mcp/weather"
  }
}
```

Then run:
```bash
pnpm start "查詢今天的天氣" --mcpConfigFile ./mcp-servers.json
```

## Example Prompts

- "分析 PRD.md 並建議改進方向"
- "從 specs/api-design.md 生成 API 文件"
- "查詢今天的天氣並建議適合的開發活動" (需要天氣 MCP)
- "將文件摘要存到資料庫" (需要資料庫 MCP)

## License

MIT
