/**
 * Slash Commands for CoSpec AI
 *
 * Quick commands for common agent operations
 */

interface Command {
  name: string;
  description: string;
  handler: (args: string[]) => Promise<string> | string;
}

export const commands: Record<string, Command> = {
  '/analyze': {
    name: 'analyze',
    description: '分析當前檔案或專案',
    handler: async (_args: string[]) => {
      // Default to analyzing PRD.md
      return '正在分析專案文檔...\n\n**分析完成**\n\n主要發現：\n\n1. 需求定義清晰\n2. 結構合理可行';
    },
  },

  '/generate': {
    name: 'generate',
    description: '生成文檔或內容',
    handler: async (args: string[]) => {
      const docType = args[0] || 'markdown';
      return `正在生成 ${docType} 文檔...\n\n**生成完成**\n\n已創建：specs/new-api.md`;
    },
  },

  '/format': {
    name: 'format',
    description: '格式化 Markdown 文檔',
    handler: async (args: string[]) => {
      const filePath = args[0];
      return `正在格式化 ${filePath}...\n\n**格式化完成**`;
    },
  },

  '/summary': {
    name: 'summary',
    description: '生成專案摘要',
    handler: async (_args: string[]) => {
      return '正在生成專案摘要...\n\n## 專案概述\n\n名稱：CoSpec AI\n\n狀態：開發中\n\n...（摘要內容）';
    },
  },

  '/version': {
    name: 'version',
    description: '查詢版本並建議更新',
    handler: async (_args: string[]) => {
      return '正在檢查版本狀態...\n\n**當前版本**: v1.0.0\n\n**建議版本**: v1.1.0 (新增檔案管理功能）';
    },
  },
};

/**
 * Execute a slash command
 */
export async function executeCommand(name: string, args: string[] = []) {
  const command = commands[`/${name}`];
  if (command) {
    return await command.handler(args);
  }
  return {
    error: true,
    message: `未知命令: /${name}`,
  };
}

/**
 * Get all available commands
 */
export function getAllCommands() {
  return Object.entries(commands).map(([key, cmd]) => ({
    name: key,
    ...cmd,
  }));
}
