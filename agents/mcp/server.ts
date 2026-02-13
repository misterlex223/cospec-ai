/**
 * CoSpec AI MCP Server
 *
 * Exposes CoSpec AI specific tools to Claude Agents via Model Context Protocol.
 * Also connects to external MCP servers for extended capabilities.
 */

import { createSdkMcpServer, tool } from '@anthropic-ai/claude-agent-sdk';
import { readFileSync, writeFileSync, readdirSync, statSync, existsSync } from 'fs';
import { join, dirname, basename } from 'path';

// Get CoSpec AI project root (parent of agents directory)
const COSPEC_ROOT = join(dirname(process.cwd()), '..');

/**
 * Tool: Read a markdown file from CoSpec AI's markdown directory
 */
export const readCospecFile = tool({
  name: 'cospec_read_file',
  description: '讀取 CoSpec AI 專案目錄中的 Markdown 檔案',
  inputSchema: {
    filename: { type: 'string', description: '檔案名稱（如：PRD.md, README.md）' },
    lines: { type: 'number', description: '讀取的行數（可選，從檔頭開始）' },
  },
  handler: async (input, extra) => {
    const { filename, lines = 1 } = input;
    const markdownPath = join(COSPEC_ROOT, 'markdown', filename);

    if (!existsSync(markdownPath)) {
      return {
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: `檔案不存在：${filename}`,
          path: markdownPath,
        }),
      };
    }

    const content = readFileSync(markdownPath, 'utf-8');
    const totalLines = content.split('\n');
    const lineCount = totalLines.length;
    const resultLines = lines ? totalLines.slice(0, lines) : totalLines;

    return {
      type: 'text',
      text: JSON.stringify({
        success: true,
        filename,
        path: markdownPath,
        totalLines: lineCount,
        returnedLines: resultLines.length,
        preview: resultLines.slice(0, 10).join('\n'),
      }),
    };
  },
});

/**
 * Tool: Write or update a markdown file in CoSpec AI's markdown directory
 */
export const writeCospecFile = tool({
  name: 'cospec_write_file',
  description: '寫入或更新 CoSpec AI 專案目錄中的 Markdown 檔案',
  inputSchema: {
    filename: { type: 'string', description: '檔案名稱（如：PRD.md, docs/new-api.md）' },
    content: { type: 'string', description: '要寫入的內容（支持 Markdown 格式）' },
    createDir: { type: 'boolean', description: '如果目錄不存在則自動創建' },
  },
  handler: async (input, extra) => {
    const { filename, content, createDir } = input;
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
      }),
    };
  },
});

/**
 * Tool: List all markdown files in CoSpec AI's markdown directory
 */
export const listCospecFiles = tool({
  name: 'cospec_list_files',
  description: '列出 CoSpec AI 專案目錄中的所有 Markdown 檔案',
  inputSchema: {
    pattern: { type: 'string', description: 'Glob 模式（如：**/*.md, docs/**/*.md）' },
    includeStats: { type: 'boolean', description: '是否包含檔案大小和行數統計' },
  },
  handler: async (input, extra) => {
    const { pattern, includeStats } = input;
    const markdownPath = join(COSPEC_ROOT, 'markdown');

    if (!existsSync(markdownPath)) {
      return {
        type: 'text',
        text: JSON.stringify({
          success: false,
          error: 'Markdown 目錄不存在',
          path: markdownPath,
        }),
      };
    }

    // Simple glob implementation
    const files: Array<{
      name: string;
      path: string;
      size: number;
      lines: number;
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
            files.push({
              name: relativePath,
              path: fullPath,
              size: stat.size,
              lines: readFileSync(fullPath, 'utf-8').split('\n').length,
            });
          }
        } catch (err) {
          // Skip files we can't read
        }
      }
    }

    scanDirectory(markdownPath);

    const result = {
      success: true,
      files: files.sort((a, b) => a.name.localeCompare(b.name)),
      pattern,
      total: files.length,
    };

    return {
      type: 'text',
      text: JSON.stringify(result),
    };
  },
});

/**
 * Create CoSpec AI MCP Server with local tools and external MCP support
 */
export function createCospecMcpServer() {
  // Tool: List markdown files
  const listFiles = tool({
    name: 'cospec_list_files',
    description: '列出 markdown目錄中的所有檔案',
    inputSchema: {
      subdirectory: { type: 'string', description: '子目錄（如：docs/）' },
    },
    handler: async (input, extra) => {
      const { subdirectory } = input;
      const markdownPath = join(COSPEC_ROOT, 'markdown', subdirectory || '');

      if (!existsSync(markdownPath)) {
        return {
          type: 'text',
          text: JSON.stringify({
            success: false,
            error: `目錄不存在：${subdirectory || '/'}`,
            path: markdownPath,
          }),
        };
      }

      // Simple glob implementation for subdirectory
      const files: Array<{
        name: string;
        path: string;
        size: number;
        lines: number;
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
              files.push({
                name: relativePath,
                path: fullPath,
                size: stat.size,
                lines: readFileSync(fullPath, 'utf-8').split('\n').length,
              });
            }
          } catch (err) {
            // Skip files we can't read
          }
        }
      }

      scanDirectory(markdownPath);

      const result = {
        success: true,
        files: files.sort((a, b) => a.name.localeCompare(b.name)),
        subdirectory,
        total: files.length,
      };

      return {
        type: 'text',
        text: JSON.stringify(result),
      };
    },
  });

  // Create SDK MCP Server with all tools
  const server = createSdkMcpServer({
    name: 'cospec-ai',
    version: '1.0.0',
    tools: [
      readCospecFile,
      writeCospecFile,
      listFiles,
    ],
  });

  return server;
}
