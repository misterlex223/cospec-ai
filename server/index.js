// 功能項目: 2.1.1 遞迴掃描指定目錄下所有 Markdown 文件
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const { glob } = require('glob');
const chokidar = require('chokidar');
const http = require('http');
const { Server } = require('socket.io');
// 引入 glob-gitignore 用於處理 .gitignore 過濾
let globGitignore;
try {
  globGitignore = require('glob-gitignore');
} catch (err) {
  console.warn('glob-gitignore not available, falling back to standard glob');
}

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});
const PORT = process.env.PORT || 3001;

// 處理 WebSocket 連線
function handleWebSocket(request, socket, head) {
  // 簡易的 WebSocket 握手實現
  const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
  const key = request.headers['sec-websocket-key'];
  const acceptKey = require('crypto')
    .createHash('sha1')
    .update(key + GUID)
    .digest('base64');

  const headers = [
    'HTTP/1.1 101 Switching Protocols',
    'Upgrade: websocket',
    'Connection: Upgrade',
    `Sec-WebSocket-Accept: ${acceptKey}`,
    '\r\n'
  ].join('\r\n');

  socket.write(headers);

  // 將客戶端添加到列表
  const client = { socket };
  wsClients.push(client);

  console.log(`WebSocket client connected, total clients: ${wsClients.length}`);

  // 處理客戶端關閉
  socket.on('close', () => {
    const index = wsClients.findIndex(c => c.socket === socket);
    if (index !== -1) {
      wsClients.splice(index, 1);
      console.log(`WebSocket client disconnected, remaining clients: ${wsClients.length}`);
    }
  });

  // 處理錯誤
  socket.on('error', (err) => {
    console.error('WebSocket error:', err);
    socket.terminate();
  });
}

// 向所有 Socket.io 客戶端發送消息
function broadcastToClients(message) {
  io.emit('file-change', message);
}

// 功能項目: 1.1.3 設定環境變數
const MARKDOWN_DIR = process.env.MARKDOWN_DIR || '/markdown';

const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// 安全性中間件
app.use(helmet()); // 添加多種安全頭部
app.use(cors());
app.use(express.json({ limit: '10mb' }));  // 限制請求體大小
app.use(morgan('dev'));

// 路由限制
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// 簡單的身份驗證中間件（演示用途，生產環境應使用更安全的方法）
function authenticateToken(req, res, next) {
  // 在實際應用中，您應該實現真正的 JWT 或會話驗證
  // 這裡僅作為示例
  const authHeader = req.headers['authorization'];

  // 簡單的密鑰驗證（僅用於演示）
  const validApiKey = process.env.API_KEY || 'demo-api-key';

  if (!authHeader) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  // 檢查格式: "Bearer <token>" 或直接是密鑰
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7, authHeader.length) : authHeader;

  if (token !== validApiKey) {
    return res.status(403).json({ error: 'Invalid token.' });
  }

  next();
}



// 輸入驗證和路徑清理函數
function sanitizePath(inputPath) {
  // 解碼 URI 組件
  try {
    const decodedPath = decodeURIComponent(inputPath);
    // 清理路徑，防止目錄遍歷
    const normalizedPath = path.normalize(decodedPath);
    // 確保路徑不以 .. 開頭或包含 ../ 模式
    if (normalizedPath.includes('../') || normalizedPath.startsWith('..')) {
      throw new Error('Invalid path: directory traversal detected');
    }
    return normalizedPath;
  } catch (e) {
    throw new Error('Invalid path: malformed URI');
  }
}

// 功能項目: 2.1.3 監控文件變更
let watcher;

// 添加文件緩存
let fileCache = {
  files: [],           // 文件列表緩存
  lastUpdated: 0,      // 上次更新時間
  isValid: false,      // 緩存是否有效
  isInitialized: false // 是否已初始化
};

// 重置緩存狀態
const invalidateCache = () => {
  fileCache.isValid = false;
  console.log('File cache invalidated');
};

// 獲取文件列表，優先使用緩存
const getFileList = async () => {
  // 如果緩存有效，直接返回
  if (fileCache.isValid && fileCache.files.length > 0) {
    console.log('Using cached file list');
    return fileCache.files;
  }

  console.log('Cache invalid, scanning directory...');
  // 緩存無效，重新掃描目錄
  try {
    const gitignorePath = path.join(MARKDOWN_DIR, '.gitignore');
    let hasGitignore = false;
    let files = [];

    try {
      await fs.access(gitignorePath);
      hasGitignore = true;
    } catch (error) {
      console.log('No .gitignore file found for file list');
    }

    // 使用 glob-gitignore 如果可用且有 .gitignore 文件
    if (globGitignore && hasGitignore) {
      try {
        files = await globGitignore.glob('**/*.md', {
          cwd: MARKDOWN_DIR,
          absolute: true,
          gitignore: {
            path: gitignorePath
          },
          ignore: ['**/node_modules/**']
        });
      } catch (err) {
        console.error('Error using glob-gitignore:', err);
        files = await glob(`${MARKDOWN_DIR}/**/*.md`, {
          ignore: [`${MARKDOWN_DIR}/**/node_modules/**`]
        });
      }
    } else {
      files = await glob(`${MARKDOWN_DIR}/**/*.md`, {
        ignore: [`${MARKDOWN_DIR}/**/node_modules/**`]
      });

      // 如果有 .gitignore 文件但沒有 glob-gitignore，手動過濾
      if (hasGitignore) {
        const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
        const gitignorePatterns = gitignoreContent
          .split('\n')
          .filter(line => line.trim() && !line.startsWith('#'))
          .map(pattern => pattern.trim());

        files = files.filter(file => {
          const relativePath = path.relative(MARKDOWN_DIR, file);

          for (const pattern of gitignorePatterns) {
            if (pattern.endsWith('/')) {
              if (relativePath.startsWith(pattern) || relativePath.includes('/' + pattern)) {
                return false;
              }
            } else if (pattern.includes('*')) {
              const regexPattern = pattern
                .replace(/\./g, '\\.')
                .replace(/\*/g, '.*');
              const regex = new RegExp(`^${regexPattern}$`);
              if (regex.test(relativePath) || regex.test(path.basename(relativePath))) {
                return false;
              }
            } else {
              if (relativePath === pattern || relativePath.endsWith('/' + pattern) || path.basename(relativePath) === pattern) {
                return false;
              }
            }
          }

          return true;
        });
      }
    }

    // 將絕對路徑轉換為相對路徑
    const relativePaths = files.map(file => {
      const relativePath = path.relative(MARKDOWN_DIR, file);
      return {
        path: relativePath,
        name: path.basename(file)
      };
    });

    // 更新緩存
    fileCache.files = relativePaths;
    fileCache.lastUpdated = Date.now();
    fileCache.isValid = true;
    fileCache.isInitialized = true;

    console.log(`File cache updated with ${relativePaths.length} files`);
    return relativePaths;
  } catch (error) {
    console.error('Error building file cache:', error);
    throw error;
  }
};
const setupWatcher = async () => {
  if (watcher) {
    watcher.close();
  }

  // 檢查是否有 .gitignore 文件
  const gitignorePath = path.join(MARKDOWN_DIR, '.gitignore');
  let hasGitignore = false;
  let gitignoreContent = '';

  try {
    await fs.access(gitignorePath);
    gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
    hasGitignore = true;
    console.log(`Found .gitignore for watcher at ${gitignorePath}`);
  } catch (error) {
    console.log('No .gitignore file found for watcher');
  }

  const watchOptions = {
    persistent: true,
    ignored: [
      /(^|[\/\\])\../, // 忽略隱藏文件
      '**/node_modules/**', // 忽略 node_modules 目錄
      '**/.cospec-sync/**' // 忽略 CoSpec 同步元數據目錄
    ]
  };

  // 如果有 .gitignore 文件，添加到忽略列表
  if (hasGitignore) {
    // 將 .gitignore 檔案內容轉換為 chokidar 可用的忽略模式
    const gitignorePatterns = gitignoreContent
      .split('\n')
      .filter(line => line.trim() && !line.startsWith('#'))
      .map(pattern => {
        // 確保模式是相對於 MARKDOWN_DIR 的
        return pattern.startsWith('/') ? pattern.substring(1) : pattern;
      });

    // 將模式添加到忽略列表
    watchOptions.ignored = [...watchOptions.ignored, ...gitignorePatterns.map(p => `${MARKDOWN_DIR}/${p}`)];
  }

  watcher = chokidar.watch(`${MARKDOWN_DIR}/**/*.md`, watchOptions);

  console.log(`Watching for changes in ${MARKDOWN_DIR} with options:`, watchOptions);

  // 監聽文件變更並更新緩存，同時透過 WebSocket 通知客戶端
  watcher
    .on('add', async (filePath) => {
      console.log(`File ${filePath} has been added`);
      invalidateCache(); // 文件添加時使緩存失效

      const relativePath = path.relative(MARKDOWN_DIR, filePath);

      // 向所有客戶端發送文件更新通知
      broadcastToClients({
        type: 'FILE_ADDED',
        path: relativePath,
        timestamp: Date.now()
      });

      // Context sync integration
      try {
        if (relativePath.endsWith('.md')) {
          const content = await fs.readFile(filePath, 'utf-8');
          fileSyncManager.handleFileChange(relativePath, content);
        }
      } catch (error) {
        console.error('[ContextSync] Error on file add:', error);
      }
    })
    .on('change', async (filePath) => {
      console.log(`File ${filePath} has been changed`);
      // 文件內容變更不需要使緩存失效，因為文件列表沒變

      const relativePath = path.relative(MARKDOWN_DIR, filePath);

      // 向所有客戶端發送文件更新通知
      broadcastToClients({
        type: 'FILE_CHANGED',
        path: relativePath,
        timestamp: Date.now()
      });

      // Context sync integration
      try {
        if (relativePath.endsWith('.md')) {
          const content = await fs.readFile(filePath, 'utf-8');
          fileSyncManager.handleFileChange(relativePath, content);
        }
      } catch (error) {
        console.error('[ContextSync] Error on file change:', error);
      }
    })
    .on('unlink', (filePath) => {
      console.log(`File ${filePath} has been removed`);
      invalidateCache(); // 文件刪除時使緩存失效

      const relativePath = path.relative(MARKDOWN_DIR, filePath);

      // 向所有客戶端發送文件更新通知
      broadcastToClients({
        type: 'FILE_DELETED',
        path: relativePath,
        timestamp: Date.now()
      });

      // Context sync integration
      try {
        if (relativePath.endsWith('.md')) {
          fileSyncManager.handleFileDelete(relativePath);
        }
      } catch (error) {
        console.error('[ContextSync] Error on file delete:', error);
      }
    });

  // 初始化緩存
  try {
    await getFileList();
    console.log('Initial file cache built');
  } catch (err) {
    console.error('Error building initial file cache:', err);
  }
};

// 功能項目: 2.1.1 遞迴掃描指定目錄下所有 Markdown 文件
app.get('/api/files', async (req, res) => {
  try {
    // 檢查目錄是否存在
    try {
      await fs.access(MARKDOWN_DIR);
    } catch (error) {
      return res.status(404).json({ error: `Markdown directory not found: ${MARKDOWN_DIR}` });
    }

    // 使用緩存機制獲取文件列表
    const files = await getFileList();
    res.json(files);
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ error: error.message });
  }
});

// 添加緩存控制端點
app.post('/api/files/refresh', authenticateToken, async (req, res) => {
  try {
    invalidateCache();
    const files = await getFileList();
    res.json({ success: true, fileCount: files.length });
  } catch (error) {
    console.error('Error refreshing file cache:', error);
    res.status(500).json({ error: error.message });
  }
});

// 功能項目: 2.2.1 讀取文件內容
app.get('/api/files/:path(*)', async (req, res) => {
  try {
    // 驗證並清理路徑
    const sanitizedPath = sanitizePath(req.params.path);

    // 確保路徑是 markdown 文件
    if (!sanitizedPath.toLowerCase().endsWith('.md')) {
      return res.status(400).json({ error: 'Only markdown files are allowed' });
    }

    const filePath = path.join(MARKDOWN_DIR, sanitizedPath);

    // 確保路徑在 MARKDOWN_DIR 內
    const resolvedPath = path.resolve(filePath);
    const resolvedMarkdownDir = path.resolve(MARKDOWN_DIR);
    if (!resolvedPath.startsWith(resolvedMarkdownDir)) {
      return res.status(400).json({ error: 'Invalid file path: outside allowed directory' });
    }

    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({ error: `File not found: ${sanitizedPath}` });
    }

    const content = await fs.readFile(filePath, 'utf-8');
    res.json({ path: sanitizedPath, content });
  } catch (error) {
    console.error('Error reading file:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// Context System Integration Routes (MUST be before wildcard routes)
// ============================================================================

const fileSyncManager = require('./fileSyncManager');
const kaiContextClient = require('./kaiContextClient');

// POST /api/files/:path/sync-to-context - Manually mark file for sync
app.post('/api/files/:path(*)/sync-to-context', authenticateToken, async (req, res) => {
  try {
    console.log('[ContextSync] Received sync request for path:', req.params.path);
    const filePath = sanitizePath(req.params.path);
    console.log('[ContextSync] Sanitized path:', filePath);
    const fullPath = path.join(MARKDOWN_DIR, filePath);
    console.log('[ContextSync] Full path:', fullPath);

    // Check if file exists
    try {
      await fs.access(fullPath);
    } catch (error) {
      console.error('[ContextSync] File not found:', fullPath);
      return res.status(404).json({ error: `File not found: ${filePath}` });
    }

    // Read file content
    const content = await fs.readFile(fullPath, 'utf-8');
    console.log('[ContextSync] File content length:', content.length);

    // Sync to context
    const result = await fileSyncManager.markForSync(filePath, content);
    console.log('[ContextSync] Sync result:', result);

    res.json(result);
  } catch (error) {
    console.error('[ContextSync] Failed to mark file for sync:', error);
    res.status(500).json({ error: error.message });
  }
});

// DELETE /api/files/:path/sync-to-context - Unmark file from sync
app.delete('/api/files/:path(*)/sync-to-context', authenticateToken, async (req, res) => {
  try {
    const filePath = sanitizePath(req.params.path);
    const result = await fileSyncManager.unmarkFromSync(filePath);
    res.json(result);
  } catch (error) {
    console.error('[ContextSync] Failed to unmark file from sync:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/files/:path/sync-status - Get sync status
app.get('/api/files/:path(*)/sync-status', async (req, res) => {
  try {
    const filePath = sanitizePath(req.params.path);
    const status = fileSyncManager.getSyncStatus(filePath);
    res.json(status);
  } catch (error) {
    console.error('[ContextSync] Failed to get sync status:', error);
    res.status(500).json({ error: error.message });
  }
});

// GET /api/context-config - Get context configuration
app.get('/api/context-config', async (req, res) => {
  try {
    const healthy = await kaiContextClient.healthCheck();
    res.json({
      enabled: kaiContextClient.enabled,
      healthy,
      projectId: kaiContextClient.projectId,
      patterns: fileSyncManager.getPatterns(),
      syncedFiles: fileSyncManager.getAllSyncedFiles(),
    });
  } catch (error) {
    console.error('[ContextSync] Failed to get config:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// File CRUD Routes (General wildcard routes - MUST be after specific routes)
// ============================================================================

// 功能項目: 2.2.2 保存文件內容
app.post('/api/files/:path(*)', authenticateToken, async (req, res) => {
  try {
    const { content } = req.body;
    if (content === undefined) {
      return res.status(400).json({ error: 'Content is required' });
    }

    // 驗證內容類型
    if (typeof content !== 'string') {
      return res.status(400).json({ error: 'Content must be a string' });
    }

    // 限制內容大小 (例如 10MB)
    if (Buffer.byteLength(content, 'utf8') > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'Content too large' });
    }

    // 驗證並清理路徑
    const sanitizedPath = sanitizePath(req.params.path);

    // 確保路徑是 markdown 文件
    if (!sanitizedPath.toLowerCase().endsWith('.md')) {
      return res.status(400).json({ error: 'Only markdown files are allowed' });
    }

    const filePath = path.join(MARKDOWN_DIR, sanitizedPath);

    // 確保路徑在 MARKDOWN_DIR 內
    const resolvedPath = path.resolve(filePath);
    const resolvedMarkdownDir = path.resolve(MARKDOWN_DIR);
    if (!resolvedPath.startsWith(resolvedMarkdownDir)) {
      return res.status(400).json({ error: 'Invalid file path: outside allowed directory' });
    }

    // 確保目錄存在
    const dirPath = path.dirname(filePath);
    await fs.mkdir(dirPath, { recursive: true });

    await fs.writeFile(filePath, content, 'utf-8');
    res.json({ success: true, path: sanitizedPath });
  } catch (error) {
    console.error('Error saving file:', error);
    res.status(500).json({ error: error.message });
  }
});

// 功能項目: 2.2.3 創建新文件
app.put('/api/files/:path(*)', authenticateToken, async (req, res) => {
  try {
    const { content = '' } = req.body;

    // 驗證內容類型
    if (typeof content !== 'string') {
      return res.status(400).json({ error: 'Content must be a string' });
    }

    // 限制內容大小
    if (Buffer.byteLength(content, 'utf8') > 10 * 1024 * 1024) {
      return res.status(400).json({ error: 'Content too large' });
    }

    // 驗證並清理路徑
    const sanitizedPath = sanitizePath(req.params.path);

    // 確保路徑是 markdown 文件
    if (!sanitizedPath.toLowerCase().endsWith('.md')) {
      return res.status(400).json({ error: 'Only markdown files are allowed' });
    }

    const filePath = path.join(MARKDOWN_DIR, sanitizedPath);

    // 確保路徑在 MARKDOWN_DIR 內
    const resolvedPath = path.resolve(filePath);
    const resolvedMarkdownDir = path.resolve(MARKDOWN_DIR);
    if (!resolvedPath.startsWith(resolvedMarkdownDir)) {
      return res.status(400).json({ error: 'Invalid file path: outside allowed directory' });
    }

    // 檢查文件是否已存在
    try {
      await fs.access(filePath);
      return res.status(409).json({ error: `File already exists: ${sanitizedPath}` });
    } catch (error) {
      // 文件不存在，可以創建
    }

    // 確保目錄存在
    const dirPath = path.dirname(filePath);
    await fs.mkdir(dirPath, { recursive: true });

    await fs.writeFile(filePath, content, 'utf-8');
    res.status(201).json({ success: true, path: sanitizedPath });
  } catch (error) {
    console.error('Error creating file:', error);
    res.status(500).json({ error: error.message });
  }
});

// 功能項目: 2.2.4 刪除文件
app.delete('/api/files/:path(*)', authenticateToken, async (req, res) => {
  try {
    // 驗證並清理路徑
    const sanitizedPath = sanitizePath(req.params.path);

    // 確保路徑是 markdown 文件
    if (!sanitizedPath.toLowerCase().endsWith('.md')) {
      return res.status(400).json({ error: 'Only markdown files are allowed' });
    }

    const filePath = path.join(MARKDOWN_DIR, sanitizedPath);

    // 確保路徑在 MARKDOWN_DIR 內
    const resolvedPath = path.resolve(filePath);
    const resolvedMarkdownDir = path.resolve(MARKDOWN_DIR);
    if (!resolvedPath.startsWith(resolvedMarkdownDir)) {
      return res.status(400).json({ error: 'Invalid file path: outside allowed directory' });
    }

    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({ error: `File not found: ${sanitizedPath}` });
    }

    await fs.unlink(filePath);
    res.json({ success: true, path: sanitizedPath });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: error.message });
  }
});

// 功能項目: 2.2.5 重命名文件
app.patch('/api/files/:path(*)', authenticateToken, async (req, res) => {
  try {
    const { newPath } = req.body;
    if (!newPath) {
      return res.status(400).json({ error: 'New path is required' });
    }

    // 驗證並清理路徑
    const sanitizedOldPath = sanitizePath(req.params.path);
    const sanitizedNewPath = sanitizePath(newPath);

    // 確保路徑是 markdown 文件
    if (!sanitizedOldPath.toLowerCase().endsWith('.md') || !sanitizedNewPath.toLowerCase().endsWith('.md')) {
      return res.status(400).json({ error: 'Only markdown files are allowed' });
    }

    const oldPath = path.join(MARKDOWN_DIR, sanitizedOldPath);
    const targetPath = path.join(MARKDOWN_DIR, sanitizedNewPath);

    // 確保路徑在 MARKDOWN_DIR 內
    const resolvedOldPath = path.resolve(oldPath);
    const resolvedNewPath = path.resolve(targetPath);
    const resolvedMarkdownDir = path.resolve(MARKDOWN_DIR);
    if (!resolvedOldPath.startsWith(resolvedMarkdownDir) || !resolvedNewPath.startsWith(resolvedMarkdownDir)) {
      return res.status(400).json({ error: 'Invalid file path: outside allowed directory' });
    }

    // 檢查源文件是否存在
    try {
      await fs.access(oldPath);
    } catch (error) {
      return res.status(404).json({ error: `File not found: ${sanitizedOldPath}` });
    }

    // 檢查目標文件是否已存在
    try {
      await fs.access(targetPath);
      return res.status(409).json({ error: `Target file already exists: ${sanitizedNewPath}` });
    } catch (error) {
      // 目標文件不存在，可以重命名
    }

    // 確保目標目錄存在
    const targetDir = path.dirname(targetPath);
    await fs.mkdir(targetDir, { recursive: true });

    await fs.rename(oldPath, targetPath);
    res.json({ success: true, oldPath: sanitizedOldPath, newPath: sanitizedNewPath });
  } catch (error) {
    console.error('Error renaming file:', error);
    res.status(500).json({ error: error.message });
  }
});

// ============================================================================
// AI 功能 API 端點
// ============================================================================

const { Configuration, OpenAIApi } = require('openai');
const { functionRegistry } = require('./functionRegistry');
const Mem0Service = require('./mem0Service');
const mem0Service = new Mem0Service();

// 初始化 OpenAI 配置
let openai;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const OPENAI_BASE_URL = process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';

if (OPENAI_API_KEY) {
  const configuration = new Configuration({
    apiKey: OPENAI_API_KEY,
    basePath: OPENAI_BASE_URL, // 支援自定義 API 端點
  });
  openai = new OpenAIApi(configuration);
  console.log(`AI service configured with endpoint: ${OPENAI_BASE_URL}, model: ${OPENAI_MODEL}`);
} else {
  console.warn('Warning: OPENAI_API_KEY not found. AI features will use mock responses.');
}

// Function to get function definitions for OpenAI
function getFunctionDefinitions() {
  const functions = [];
  for (const [name, func] of Object.entries(functionRegistry)) {
    functions.push({
      name: name,
      description: func.description,
      parameters: func.parameters
    });
  }
  return functions;
}

// AI 聊天端點 with function calling support
app.post('/api/ai/chat', async (req, res) => {
  try {
    const { message, context, filePath, conversation, systemPrompt } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // 檢索與當前對話相關的記憶
    let memoryContext = '';
    try {
      const memories = await mem0Service.searchMemories(message, 5);
      if (memories.results && memories.results.length > 0) {
        memoryContext = '根據之前的記憶：\n' + memories.results.map(mem => `- ${mem.content}`).join('\n') + '\n\n';
      }
    } catch (memError) {
      console.error('Error retrieving memories:', memError.message);
      // 如果記憶檢索失敗，繼續執行而不中斷流程
    }

    // 如果沒有配置 OpenAI API 密鑰，返回模擬回應
    if (!openai) {
      // 模擬 AI 回應
      const mockResponse = {
        response: `這是一個模擬的 AI 回應。您剛剛問道：「${message}」\n\n如果配置了 OpenAI API 密鑰，您將獲得實際的 AI 分析結果。\n\n可用工具: ${Object.keys(functionRegistry).join(', ')}`,
        updatedContent: null
      };
      return res.json(mockResponse);
    }

    // 構建對話歷史
    let defaultSystemPrompt = `你是一個 Markdown 文件編輯助手。你可以幫助用戶總結、重寫、格式化 Markdown 文件，回答有關文件內容的問題，以及提供其他文本相關的幫助。當前編輯的文件是 ${filePath || '未指定'}。文件內容是：\n\n${context || '無內容'}\n\n你可以使用以下工具來幫助用戶：${Object.keys(functionRegistry).join(', ')}\n\n請在需要時使用合適的工具來完成任務。}`;

    // 加入記憶上下文
    if (memoryContext) {
      defaultSystemPrompt = memoryContext + defaultSystemPrompt;
    }

    // 如果提供了自定義系統提示詞，則使用它，否則使用默認的
    let systemContent = systemPrompt || defaultSystemPrompt;

    // Get function definitions for OpenAI
    const functions = getFunctionDefinitions();

    // Build initial conversation history
    let conversationHistory = [
      { role: 'system', content: systemContent }
    ];

    // Add previous conversation history (up to 10 most recent messages)
    if (conversation && Array.isArray(conversation)) {
      const recentConversations = conversation.slice(-10).map(msg => ({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));
      conversationHistory = conversationHistory.concat(recentConversations);
    }

    // Add current user message
    conversationHistory.push({ role: 'user', content: message });

    // First API call to OpenAI with function definitions
    const response = await openai.createChatCompletion({
      model: OPENAI_MODEL,
      messages: conversationHistory,
      functions: functions,
      function_call: 'auto', // Allow model to decide when to call functions
      max_tokens: 1000,
      temperature: 0.7,
    });

    const choice = response.data.choices[0];
    let aiResponse = '';
    let updatedContent = null;
    let toolCalls = [];

    if (choice.finish_reason === 'function_call') {
      // Process function calls
      const functionCall = choice.message.function_call;
      const functionName = functionCall.name;
      const functionArgs = JSON.parse(functionCall.arguments);

      // Verify the function exists in our registry
      if (!functionRegistry[functionName]) {
        return res.status(400).json({ error: `Unknown function: ${functionName}` });
      }

      // Execute the function
      const functionResult = await functionRegistry[functionName].implementation(functionArgs);

      // Add function call and result to conversation history
      conversationHistory.push(choice.message);
      conversationHistory.push({
        role: 'function',
        name: functionName,
        content: JSON.stringify(functionResult)
      });

      // Make a second call to get the final response after function execution
      const secondResponse = await openai.createChatCompletion({
        model: OPENAI_MODEL,
        messages: conversationHistory,
        max_tokens: 1000,
        temperature: 0.7,
      });

      aiResponse = secondResponse.data.choices[0].message.content;

      // Check if the function modified content that should be returned
      if (functionResult.success && (functionName === 'write_file' || functionName === 'create_file')) {
        updatedContent = functionArgs.content || null;
      }

      toolCalls.push({
        function: functionName,
        arguments: functionArgs,
        result: functionResult
      });
    } else {
      // No function call was made, return normal response
      aiResponse = choice.message.content || '';
    }

    // 將對話內容保存到記憶中
    try {
      // 保存用戶消息到記憶
      await mem0Service.addCategorizedMemory(message, 'user_query', {
        filePath: filePath,
        timestamp: new Date().toISOString(),
        conversationId: 'current'
      });

      // 保存AI回應到記憶
      await mem0Service.addCategorizedMemory(aiResponse, 'assistant_response', {
        filePath: filePath,
        timestamp: new Date().toISOString(),
        conversationId: 'current',
        toolCalls: toolCalls
      });
    } catch (memError) {
      console.error('Error saving memories:', memError.message);
      // 如果記憶保存失敗，繼續執行而不中斷流程
    }

    // Return AI response
    res.json({
      response: aiResponse,
      updatedContent: updatedContent,
      toolCalls: toolCalls // Include tool call information for the frontend
    });
  } catch (error) {
    console.error('Error in AI chat:', error);
    res.status(500).json({ error: 'AI service error: ' + error.message });
  }
});

// AI 功能端點（總結、重寫等）
app.post('/api/ai/functions', async (req, res) => {
  try {
    const { function: functionName, context, filePath, systemPrompt } = req.body;

    if (!functionName || !context) {
      return res.status(400).json({ error: 'Function name and context are required' });
    }

    // 如果沒有配置 OpenAI API 密鑰，返回模擬回應
    if (!openai) {
      const mockResponses = {
        summarize: `這是一個模擬的文件總結功能。實際上，AI 會分析文件內容並生成摘要。\n\n原文件包含 ${context.length} 個字符，標題和段落結構將被保留。`,
        rewrite: `# 模擬重寫結果\n\n這是模擬的重寫內容。如果配置了 OpenAI API 密鑰，您將獲得真正的 AI 重寫結果。\n\n模擬優化：文本結構已改進，表達更清晰。`,
        format: `# 標題格式化\n\n- 項目 1\n- 項目 2\n\n段落之間添加了適當的空行。`,
        explain: `這是一個模擬的內容解釋功能。實際上，AI 會分析文件內容並提供詳細解釋。\n\n文件主要包含 Markdown 格式的文本內容。`
      };

      const mockResponse = {
        response: mockResponses[functionName] || `模擬的 ${functionName} 功能結果`,
        updatedContent: functionName === 'rewrite' ? mockResponses[functionName] : null
      };
      return res.json(mockResponse);
    }

    let prompt = '';
    let responseFormat = '';

    switch (functionName) {
      case 'summarize':
        prompt = `請總結以下 Markdown 文件的內容，保持主要信息和結構。文件路徑：${filePath || 'unknown'}\n\n文件內容：\n${context}`;
        responseFormat = 'response only summary';
        break;
      case 'rewrite':
        prompt = `請重寫以下 Markdown 文件，改進文字表達、結構和可讀性，但保持原意。文件路徑：${filePath || 'unknown'}\n\n文件內容：\n${context}`;
        responseFormat = 'modified markdown content';
        break;
      case 'format':
        prompt = `請格式化以下 Markdown 文件，使其結構更清晰，符合標準 Markdown 規範。文件路徑：${filePath || 'unknown'}\n\n文件內容：\n${context}`;
        responseFormat = 'formatted markdown content';
        break;
      case 'explain':
        prompt = `請詳細解釋以下 Markdown 文件的內容，包括主要觀點、結構和任何技術細節。文件路徑：${filePath || 'unknown'}\n\n文件內容：\n${context}`;
        responseFormat = 'explanation of content';
        break;
      default:
        return res.status(400).json({ error: `Unknown function: ${functionName}` });
    }

    // 使用默認系統提示詞，或使用自定義的
    let defaultSystemPrompt = '你是一個專業的 Markdown 文件處理助手。根據用戶的請求，對 Markdown 文件進行相應處理，並返回適當格式的結果。';
    let systemContent = systemPrompt || defaultSystemPrompt;

    // 調用 OpenAI API
    const response = await openai.createChatCompletion({
      model: OPENAI_MODEL, // 使用環境變數指定的模型
      messages: [
        { role: 'system', content: systemContent },
        { role: 'user', content: prompt }
      ],
      max_tokens: 1500,
      temperature: 0.5,
    });

    const aiResponse = response.data.choices[0].message.content;

    // 根據功能類型決定是否返回更新後的內容
    let updatedContent = null;
    if (functionName === 'rewrite' || functionName === 'format') {
      updatedContent = aiResponse;
    }

    // 返回 AI 回應和可能的更新後內容
    res.json({
      response: aiResponse,
      updatedContent: updatedContent
    });
  } catch (error) {
    console.error('Error in AI function:', error);
    res.status(500).json({ error: 'AI service error: ' + error.message });
  }
});

// 啟動服務器
server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Markdown directory: ${MARKDOWN_DIR}`);
  console.log(`WebSocket server available at ws://localhost:${PORT}/ws`);
  try {
    await setupWatcher();
    console.log('File watcher setup complete');
  } catch (err) {
    console.error('Error setting up file watcher:', err);
  }
});
