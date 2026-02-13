/**
 * File Change Hook
 *
 * Monitors file changes and triggers custom actions
 */

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'fs';
import { join, dirname, basename } from 'path';

interface HookConfig {
  name: string;
  description: string;
  events: string[];
  action: {
    command?: string;
    writeFile?: {
      path: string;
      content: string;
    };
  };
}

interface HookEvent {
  type: string;
  timestamp: string;
  filePath: string;
  sessionId: string;
}

interface HookResult {
  success: boolean;
  message: string;
  data?: unknown;
}

/**
 * Load hook configuration from project hooks
 */
function loadHooks(): Map<string, HookConfig> {
  const hooksConfigPath = join(process.cwd(), '.claude', 'hooks.json');

  try {
    if (existsSync(hooksConfigPath)) {
      const content = readFileSync(hooksConfigPath, 'utf-8');
      const hooks = JSON.parse(content);

      const hooksMap = new Map<string, HookConfig>();
      for (const hook of hooks) {
        hooksMap.set(hook.name, hook);
      }

      return hooksMap;
    }
  } catch (error) {
    console.warn(`No hooks configuration found at ${hooksConfigPath}`);
  }

  return new Map();
}

/**
 * Execute a hook action
 */
async function executeHook(hookName: string, event: HookEvent): Promise<HookResult> {
  const hooks = loadHooks();
  const hook = hooks.get(hookName);

  if (!hook || !hook.events.includes(event.type)) {
    return {
      success: false,
      message: `Hook ${hookName} not found or does not handle event type ${event.type}`,
    };
  }

  try {
    const { action } = hook;
    const result = await executeAction(action, event);

    return {
      success: true,
      message: `Hook ${hookName} executed successfully`,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      message: `Hook ${hookName} execution failed: ${(error as Error).message}`,
    };
  }
}

type HookAction = HookConfig['action'];

/**
 * Execute hook action (command or writeFile)
 */
async function executeAction(action: HookAction, _event: HookEvent): Promise<unknown> {
  if (action.command) {
    const { execSync } = require('child_process');
    try {
      const result = execSync(action.command, {
        cwd: process.cwd(),
        stdio: 'inherit',
        timeout: 30000,
      });

      return {
        stdout: result.stdout?.toString() || '',
        stderr: result.stderr?.toString() || '',
        exitCode: result.status || 0,
      };
    } catch (error) {
      throw error;
    }
  }

  if (action.writeFile) {
    const { path, content } = action.writeFile;
    const fullPath = join(process.cwd(), path);

    try {
      writeFileSync(fullPath, content, 'utf-8');

      return {
        filePath: fullPath,
        bytesWritten: Buffer.byteLength(content, 'utf-8'),
      };
    } catch (error) {
      throw error;
    }
  }

  throw new Error('Unknown action type');
}

/**
 * Watch for file changes and trigger hooks
 */
function startFileWatcher(projectDir: string) {
  const chokidar = require('chokidar');

  const hooks = loadHooks();
  const activeHooks = Array.from(hooks.values()).filter(h =>
    h.events.some(event =>
      event === 'file-write' ||
      event === 'file-read' ||
      event === 'file-change'
    )
  );

  if (activeHooks.length === 0) {
    console.log('No active hooks to watch for');
    return;
  }

  // Watch markdown directory for changes
  const watcher = chokidar.watch(projectDir, {
    ignored: [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/.cospec-sync/**',
    ],
    persistent: true,
  });

  watcher.on('all', (filePath: string, stats: { isDirectory?: () => boolean }) => {
    if (stats.isDirectory?.()) {
      const eventType = filePath ? 'file-write' : 'file-unlink';

      for (const hook of activeHooks) {
        executeHook(hook.name, {
          type: eventType,
          timestamp: new Date().toISOString(),
          filePath,
          sessionId: 'agent-session',
        });
      }
    }
  });

  watcher.on('error', (error: Error) => {
    console.error('File watcher error:', error);
  });
}

/**
 * Start hook server
 */
function startHookServer() {
  const http = require('http');

  const PORT = Number(process.env.HOOK_SERVER_PORT) || 9300;

  const server = http.createServer((req: any, res: any) => {
    // Simple health check endpoint
    if (req.method === 'GET' && req.url === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ status: 'ok', service: 'hook-server' }));
      return;
    }

    // Hook execution endpoint
    if (req.method === 'POST' && req.url === '/hook/execute') {
      let body = '';
      req.on('data', (chunk: any) => { body += chunk; });
      req.on('end', async () => {
        try {
          const { hookName, eventName, eventData } = JSON.parse(body);

          const result = await executeHook(hookName, {
            type: 'custom',
            timestamp: new Date().toISOString(),
            filePath: eventData?.filePath || '',
            sessionId: eventData?.sessionId || 'agent-session',
            ...(eventData as object),
          });

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(result));
        } catch (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: (error as Error).message }));
        }
      });
    }

    // List hooks endpoint
    if (req.method === 'GET' && req.url === '/hooks') {
      const hooks = loadHooks();
      const hooksList = Array.from(hooks.values()).map(h => ({
        name: h.name,
        description: h.description,
        events: h.events,
      }));

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ hooks: hooksList }));
    }
  });

  server.listen(PORT, () => {
    console.log(`Hook server listening on port ${PORT}`);
  });
}

// Export functions for use in other modules
export {
  loadHooks,
  executeHook,
  startFileWatcher,
  startHookServer,

  // Hook types
  HookEvent,
  HookResult,
  HookConfig,
};
