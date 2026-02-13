/**
 * CoSpec AI MCP Client
 *
 * Connects CoSpec AI Agent to external MCP servers for extended capabilities.
 * This allows the agent to use tools provided by external MCP servers.
 *
 * Example external MCP servers:
 * - Weather API servers
 * - Database connectors
 * - Code analysis services
 * - Document processors
 */

import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname } from 'path';

// Get CoSpec AI project root (parent of agents directory)
const COSPEC_ROOT = join(process.cwd(), '..');

/**
 * Tool: Read a markdown file from CoSpec AI's markdown directory
 */
const readCospecFile = tool({
  name: 'cospec_read_file',
  description: '讀取 CoSpec AI 專案目錄中的 Markdown 檔案',
  inputSchema: {
    filename: { type: 'string', description: '檔案名稱（如：PRD.md, README.md）' },
    lines: { type: 'number', description: '讀取的行數（可選，從檔頭開始）' },
  },
  handler: async (input, _extra) => {
    const { filename, lines } = input;
    const markdownPath = join(COSPEC_ROOT, 'markdown', filename);

    if (!existsSync(markdownPath)) {
      return {
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: `檔案不存在：${filename}`,
          path: markdownPath,
        }, undefined, 2),
      };
    }

    const content = readFileSync(markdownPath, 'utf-8');
    const totalLines = content.split('\n');
    const resultLines = lines ? totalLines.slice(0, lines) : totalLines;

    return {
      type: 'text',
      text: JSON.stringify({
        success: true,
        filename,
        path: markdownPath,
        totalLines: totalLines.length,
        content: resultLines.join('\n'),
      }, undefined, 2),
    };
  },
});

/**
 * Tool: Write or update a markdown file in CoSpec AI's markdown directory
 */
const writeCospecFile = tool({
  name: 'cospec_write_file',
  description: '寫入或更新 CoSpec AI 專案目錄中的 Markdown 檔案',
  inputSchema: {
    filename: { type: 'string', description: '檔案名稱（如：PRD.md, docs/new-api.md）' },
    content: { type: 'string', description: '要寫入的內容（支持 Markdown 格式）' },
    createDir: { type: 'boolean', description: '如果目錄不存在則自動創建' },
  },
  handler: async (input, _extra) => {
    const { filename, content, createDir = false } = input;
    const markdownPath = join(COSPEC_ROOT, 'markdown', filename);

    // Create directory if needed
    const dir = dirname(markdownPath);
    if (createDir && !existsSync(dir)) {
      require('fs').mkdirSync(dir, { recursive: true });
    }

    writeFileSync(markdownPath, content, 'utf-8');

    return {
      type: 'text',
      text: JSON.stringify({
        success: true,
        filename,
        path: markdownPath,
        bytesWritten: Buffer.byteLength(content, 'utf-8'),
      }, undefined, 2),
    };
  },
});

/**
 * Tool: List all markdown files in CoSpec AI's markdown directory
 */
const listCospecFiles = tool({
  name: 'cospec_list_files',
  description: '列出 CoSpec AI 專案目錄中的所有 Markdown 檔案',
  inputSchema: {
    subdirectory: { type: 'string', description: '子目錄（如：docs/）' },
    includeStats: { type: 'boolean', description: '是否包含檔案大小統計' },
  },
  handler: async (input, _extra) => {
    const { subdirectory, includeStats = false } = input;
    const markdownPath = join(COSPEC_ROOT, 'markdown', subdirectory || '');

    if (!existsSync(markdownPath)) {
      return {
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: '目錄不存在',
          path: markdownPath,
        }, undefined, 2),
      };
    }

    const files: Array<{
      name: string;
      path: string;
      size?: number;
      lines?: number;
    }> = [];

    function scanDirectory(dir: string, baseDir = '') {
      const items = readdirSync(dir);
      for (const item of items) {
        const fullPath = join(dir, item);
        try {
          const stat = statSync(fullPath);
          const relativePath = baseDir ? join(baseDir, item) : item;

          if (stat.isDirectory() && !item.startsWith('.')) {
            scanDirectory(fullPath, relativePath);
          } else if (item.endsWith('.md')) {
            const fileData: typeof files[0] = {
              name: relativePath,
              path: fullPath,
            };
            if (includeStats) {
              fileData.size = stat.size;
              fileData.lines = readFileSync(fullPath, 'utf-8').split('\n').length;
            }
            files.push(fileData);
          }
        } catch {
          // Skip files we can't read
        }
      }
    }

    scanDirectory(markdownPath);

    return {
      type: 'text',
      text: JSON.stringify({
        success: true,
        files: files.sort((a, b) => a.name.localeCompare(b.name)),
        subdirectory,
        total: files.length,
      }, undefined, 2),
    };
  },
});

/**
 * Create CoSpec AI MCP Server/Client
 *
 * This creates an SDK MCP server that exposes CoSpec tools.
 * To connect to EXTERNAL MCP servers, add them to the mcpServers config in query().
 *
 * Example external MCP servers (configure in query options):
 *
 * mcpServers: {
 *   cospec: createCospecMcpClient(),  // Local CoSpec tools
 *   weather: {
 *     type: 'stdio',
 *     command: 'weather-mcp',
 *     args: ['--api-key', process.env.WEATHER_API_KEY]
 *   },
 *   database: {
 *     type: 'http',
 *     url: 'http://localhost:3000/mcp'
 *   }
 * }
 */
export function createCospecMcpClient() {
  return createSdkMcpServer({
    name: 'cospec-ai',
    version: '1.0.0',
    tools: [
      readCospecFile,
      writeCospecFile,
      listCospecFiles,
    ],
  });
}

/**
 * Example: External MCP server connection configurations
 *
 * These can be added to the mcpServers object in query():
 *
 * // Connect to weather MCP server via stdio
 * export function weatherMcpClient() {
 *   return {
 *     type: 'stdio',
 *     command: 'npx',
 *     args: ['-y', '@modelcontextprotocol/server-weather'],
 *     env: {
 *       WEATHER_API_KEY: process.env.WEATHER_API_KEY,
 *     },
 *   };
 * }
 *
 * // Connect to database MCP server via HTTP
 * export function databaseMcpClient() {
 *   return {
 *     type: 'http',
 *     url: process.env.DATABASE_MCP_URL || 'http://localhost:3000/mcp',
 *     headers: {
 *       Authorization: `Bearer ${process.env.DATABASE_MCP_TOKEN}`,
 *     },
 *   };
 * }
 *
 * // Connect to filesystem MCP server via SSE
 * export function filesystemMcpClient() {
 *   return {
 *     type: 'sse',
 *     url: process.env.FILESYSTEM_MCP_URL || 'http://localhost:3001/sse',
 *   };
 * }
 */
