// 功能項目: 2.1.1 遞迴掃描指定目錄下所有 Markdown 文件
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const { glob } = require('glob');
const chokidar = require('chokidar');
const http = require('http');
// 引入 glob-gitignore 用於處理 .gitignore 過濾
let globGitignore;
try {
  globGitignore = require('glob-gitignore');
} catch (err) {
  console.warn('glob-gitignore not available, falling back to standard glob');
}

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3001;

// 創建簡易的 WebSocket 伺服器實現
let wsClients = [];

// 將 WebSocket 功能整合到 HTTP 伺服器
server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`).pathname;
  
  if (pathname === '/ws') {
    handleWebSocket(request, socket, head);
  } else {
    socket.destroy();
  }
});

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

// 向所有 WebSocket 客戶端發送消息
function broadcastToClients(message) {
  const data = JSON.stringify(message);
  
  // 簡易的 WebSocket 幾乎封裝
  const frame = Buffer.alloc(data.length + 2);
  frame[0] = 0x81; // 文本幾乎，結束幾乎
  frame[1] = data.length; // 簡化處理，僅適用於小於 126 字節的消息
  
  for (let i = 0; i < data.length; i++) {
    frame[i + 2] = data.charCodeAt(i);
  }
  
  wsClients.forEach(client => {
    try {
      if (client.socket.writable) {
        client.socket.write(frame);
      }
    } catch (err) {
      console.error('Error sending WebSocket message:', err);
    }
  });
}

// 功能項目: 1.1.3 設定環境變數
const MARKDOWN_DIR = process.env.MARKDOWN_DIR || '/markdown';

// 中間件
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// 健康檢查端點
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// 模擬的認證 API
const mockUsers = [
  {
    id: '1',
    username: 'testuser',
    email: 'test@example.com',
    password: 'password',
    created_at: Date.now() - 86400000,
    updated_at: Date.now() - 86400000
  }
];

const mockPersonalOrg = {
  id: 'personal-1',
  name: 'Test User\'s Personal Space',
  slug: 'testuser-personal',
  settings: {
    isPersonal: true,
    owner: '1'
  },
  role: 'owner',
  created_at: Date.now() - 86400000,
  updated_at: Date.now() - 86400000
};

// 登入 API
app.post('/api/auth/login', (req, res) => {
  const { email, password } = req.body;
  const user = mockUsers.find(u => u.email === email && u.password === password);
  
  if (user) {
    // 創建一個簡單的模擬令牌
    const token = Buffer.from(`${user.id}:${Date.now()}`).toString('base64');
    
    // 返回用戶信息和令牌
    res.json({
      user: { ...user, password: undefined },
      personalOrganization: mockPersonalOrg,
      token
    });
  } else {
    res.status(401).json({ error: '無效的電子郵件或密碼' });
  }
});

// 註冊 API
app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;
  
  // 檢查電子郵件是否已存在
  if (mockUsers.some(u => u.email === email)) {
    return res.status(409).json({ error: '電子郵件已被使用' });
  }
  
  // 創建新用戶
  const newUser = {
    id: String(mockUsers.length + 1),
    username,
    email,
    password,
    created_at: Date.now(),
    updated_at: Date.now()
  };
  
  mockUsers.push(newUser);
  
  // 創建個人空間
  const personalOrg = {
    id: `personal-${newUser.id}`,
    name: `${username}'s Personal Space`,
    slug: `${username.toLowerCase()}-personal`,
    settings: {
      isPersonal: true,
      owner: newUser.id
    },
    role: 'owner',
    created_at: Date.now(),
    updated_at: Date.now()
  };
  
  // 創建令牌
  const token = Buffer.from(`${newUser.id}:${Date.now()}`).toString('base64');
  
  // 返回用戶信息和令牌
  res.status(201).json({
    user: { ...newUser, password: undefined },
    personalOrganization: personalOrg,
    token
  });
});

// 獲取當前用戶信息
app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '無效的認證令牌' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    // 解析令牌
    const decoded = Buffer.from(token, 'base64').toString();
    const userId = decoded.split(':')[0];
    
    // 尋找用戶
    const user = mockUsers.find(u => u.id === userId);
    
    if (!user) {
      return res.status(401).json({ error: '無效的用戶' });
    }
    
    // 返回用戶信息
    res.json({
      user: { ...user, password: undefined },
      personalOrganization: mockPersonalOrg
    });
  } catch (err) {
    res.status(401).json({ error: '無效的令牌格式' });
  }
});

// 模擬的專案數據
const mockProjects = [
  {
    id: 'project-1',
    name: 'Sample Project',
    slug: 'sample-project',
    description: '這是一個樣本專案',
    role: 'owner',
    created_at: Date.now() - 86400000,
    updated_at: Date.now() - 3600000,
    github_repo: 'user/sample-repo',
    github_branch: 'main'
  },
  {
    id: 'project-2',
    name: 'Documentation',
    slug: 'documentation',
    description: '專案文檔',
    role: 'owner',
    created_at: Date.now() - 172800000,
    updated_at: Date.now() - 7200000
  }
];

// 模擬的文件數據
const mockFiles = [
  {
    id: 'file-1',
    name: 'README.md',
    path: '',
    content: '# Sample Project\n\nThis is a sample project for testing purposes.\n\n## Features\n\n- Feature 1\n- Feature 2\n- Feature 3',
    size: 120,
    created_at: Date.now() - 86400000,
    updated_at: Date.now() - 3600000
  },
  {
    id: 'file-2',
    name: 'CONTRIBUTING.md',
    path: '',
    content: '# Contributing Guidelines\n\nThank you for your interest in contributing to this project!\n\n## How to Contribute\n\n1. Fork the repository\n2. Create a new branch\n3. Make your changes\n4. Submit a pull request',
    size: 180,
    created_at: Date.now() - 172800000,
    updated_at: Date.now() - 7200000
  },
  {
    id: 'file-3',
    name: 'api.md',
    path: 'docs',
    content: '# API Documentation\n\n## Endpoints\n\n### GET /api/v1/users\n\nReturns a list of users.\n\n### POST /api/v1/users\n\nCreates a new user.',
    size: 150,
    created_at: Date.now() - 259200000,
    updated_at: Date.now() - 10800000
  }
];

// 驗證令牌中間件
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: '無效的認證令牌' });
  }
  
  const token = authHeader.split(' ')[1];
  
  try {
    // 解析令牌
    const decoded = Buffer.from(token, 'base64').toString();
    const userId = decoded.split(':')[0];
    
    // 尋找用戶
    const user = mockUsers.find(u => u.id === userId);
    
    if (!user) {
      return res.status(401).json({ error: '無效的用戶' });
    }
    
    // 將用戶信息添加到請求對象
    req.user = { ...user, password: undefined };
    next();
  } catch (err) {
    res.status(401).json({ error: '無效的令牌格式' });
  }
};

// 獲取個人空間專案列表
app.get('/api/personal-space/projects', authenticateToken, (req, res) => {
  res.json({ projects: mockProjects });
});

// 獲取用戶的組織列表
app.get('/api/auth/me/organizations', authenticateToken, (req, res) => {
  // 只返回個人空間作為組織
  res.json({ organizations: [mockPersonalOrg] });
});

// 獲取組織列表
app.get('/api/organizations', authenticateToken, (req, res) => {
  // 只返回個人空間作為組織
  res.json({ organizations: [mockPersonalOrg] });
});

// 創建新專案
app.post('/api/personal-space/projects', authenticateToken, (req, res) => {
  const { name, settings = {} } = req.body;
  
  if (!name) {
    return res.status(400).json({ error: '專案名稱是必需的' });
  }
  
  const newProject = {
    id: `project-${Date.now()}`,
    name,
    slug: name.toLowerCase().replace(/\s+/g, '-'),
    description: '',
    role: 'owner',
    created_at: Date.now(),
    updated_at: Date.now(),
    ...settings
  };
  
  mockProjects.push(newProject);
  
  res.status(201).json(newProject);
});

// 獲取專案詳情
app.get('/api/projects/:projectId', authenticateToken, (req, res) => {
  const project = mockProjects.find(p => p.id === req.params.projectId);
  
  if (!project) {
    return res.status(404).json({ error: '專案不存在' });
  }
  
  res.json(project);
});

// 獲取專案文件列表
app.get('/api/projects/:projectId/files', authenticateToken, (req, res) => {
  const project = mockProjects.find(p => p.id === req.params.projectId);
  
  if (!project) {
    return res.status(404).json({ error: '專案不存在' });
  }
  
  res.json({ files: mockFiles });
});

// 獲取文件詳情
app.get('/api/projects/:projectId/files/:fileId', authenticateToken, (req, res) => {
  const project = mockProjects.find(p => p.id === req.params.projectId);
  
  if (!project) {
    return res.status(404).json({ error: '專案不存在' });
  }
  
  const file = mockFiles.find(f => f.id === req.params.fileId);
  
  if (!file) {
    return res.status(404).json({ error: '文件不存在' });
  }
  
  res.json(file);
});

// 更新文件內容
app.put('/api/projects/:projectId/files/:fileId', authenticateToken, (req, res) => {
  const { content } = req.body;
  
  if (content === undefined) {
    return res.status(400).json({ error: '內容是必需的' });
  }
  
  const project = mockProjects.find(p => p.id === req.params.projectId);
  
  if (!project) {
    return res.status(404).json({ error: '專案不存在' });
  }
  
  const fileIndex = mockFiles.findIndex(f => f.id === req.params.fileId);
  
  if (fileIndex === -1) {
    return res.status(404).json({ error: '文件不存在' });
  }
  
  mockFiles[fileIndex] = {
    ...mockFiles[fileIndex],
    content,
    updated_at: Date.now()
  };
  
  res.json(mockFiles[fileIndex]);
});

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
      '**/node_modules/**' // 忽略 node_modules 目錄
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
    .on('add', filePath => {
      console.log(`File ${filePath} has been added`);
      invalidateCache(); // 文件添加時使緩存失效
      
      // 向所有客戶端發送文件更新通知
      broadcastToClients({
        type: 'FILE_ADDED',
        path: path.relative(MARKDOWN_DIR, filePath),
        timestamp: Date.now()
      });
    })
    .on('change', filePath => {
      console.log(`File ${filePath} has been changed`);
      // 文件內容變更不需要使緩存失效，因為文件列表沒變
      
      // 向所有客戶端發送文件更新通知
      broadcastToClients({
        type: 'FILE_CHANGED',
        path: path.relative(MARKDOWN_DIR, filePath),
        timestamp: Date.now()
      });
    })
    .on('unlink', filePath => {
      console.log(`File ${filePath} has been removed`);
      invalidateCache(); // 文件刪除時使緩存失效
      
      // 向所有客戶端發送文件更新通知
      broadcastToClients({
        type: 'FILE_DELETED',
        path: path.relative(MARKDOWN_DIR, filePath),
        timestamp: Date.now()
      });
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
app.post('/api/files/refresh', async (req, res) => {
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
app.get('/api/files/:path', async (req, res) => {
  try {
    const filePath = path.join(MARKDOWN_DIR, req.params.path);
    
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({ error: `File not found: ${req.params.path}` });
    }

    const content = await fs.readFile(filePath, 'utf-8');
    res.json({ path: req.params.path, content });
  } catch (error) {
    console.error('Error reading file:', error);
    res.status(500).json({ error: error.message });
  }
});

// 功能項目: 2.2.2 保存文件內容
app.post('/api/files/:path', async (req, res) => {
  try {
    const { content } = req.body;
    if (content === undefined) {
      return res.status(400).json({ error: 'Content is required' });
    }

    const filePath = path.join(MARKDOWN_DIR, req.params.path);
    
    // 確保目錄存在
    const dirPath = path.dirname(filePath);
    await fs.mkdir(dirPath, { recursive: true });
    
    await fs.writeFile(filePath, content, 'utf-8');
    res.json({ success: true, path: req.params.path });
  } catch (error) {
    console.error('Error saving file:', error);
    res.status(500).json({ error: error.message });
  }
});

// 功能項目: 2.2.3 創建新文件
app.put('/api/files/:path', async (req, res) => {
  try {
    const { content = '' } = req.body;
    const filePath = path.join(MARKDOWN_DIR, req.params.path);
    
    // 檢查文件是否已存在
    try {
      await fs.access(filePath);
      return res.status(409).json({ error: `File already exists: ${req.params.path}` });
    } catch (error) {
      // 文件不存在，可以創建
    }
    
    // 確保目錄存在
    const dirPath = path.dirname(filePath);
    await fs.mkdir(dirPath, { recursive: true });
    
    await fs.writeFile(filePath, content, 'utf-8');
    res.status(201).json({ success: true, path: req.params.path });
  } catch (error) {
    console.error('Error creating file:', error);
    res.status(500).json({ error: error.message });
  }
});

// 功能項目: 2.2.4 刪除文件
app.delete('/api/files/:path', async (req, res) => {
  try {
    const filePath = path.join(MARKDOWN_DIR, req.params.path);
    
    try {
      await fs.access(filePath);
    } catch (error) {
      return res.status(404).json({ error: `File not found: ${req.params.path}` });
    }
    
    await fs.unlink(filePath);
    res.json({ success: true, path: req.params.path });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: error.message });
  }
});

// 功能項目: 2.2.5 重命名文件
app.patch('/api/files/:path', async (req, res) => {
  try {
    const { newPath } = req.body;
    if (!newPath) {
      return res.status(400).json({ error: 'New path is required' });
    }
    
    const oldPath = path.join(MARKDOWN_DIR, req.params.path);
    const targetPath = path.join(MARKDOWN_DIR, newPath);
    
    // 檢查源文件是否存在
    try {
      await fs.access(oldPath);
    } catch (error) {
      return res.status(404).json({ error: `File not found: ${req.params.path}` });
    }
    
    // 檢查目標文件是否已存在
    try {
      await fs.access(targetPath);
      return res.status(409).json({ error: `Target file already exists: ${newPath}` });
    } catch (error) {
      // 目標文件不存在，可以重命名
    }
    
    // 確保目標目錄存在
    const targetDir = path.dirname(targetPath);
    await fs.mkdir(targetDir, { recursive: true });
    
    await fs.rename(oldPath, targetPath);
    res.json({ success: true, oldPath: req.params.path, newPath });
  } catch (error) {
    console.error('Error renaming file:', error);
    res.status(500).json({ error: error.message });
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
