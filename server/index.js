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
const serveStatic = require('serve-static');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// 引入 glob-gitignore 用於處理 .gitignore 過濾
let globGitignore;
try {
  globGitignore = require('glob-gitignore');
} catch (err) {
  console.warn('glob-gitignore not available, falling back to standard glob');
}

// Services
const AgentService = require('./agentService');
const GitService = require('./services/gitService');
const AgentDB = require('./agentDb');
const fileSyncManager = require('./fileSyncManager');
const kaiContextClient = require('./kaiContextClient');
const profileManager = require('./profileManager');

// ============================================================================
// Configuration & Initialization
// ============================================================================

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

const PORT = process.env.PORT || 9280;
const MARKDOWN_DIR = process.env.MARKDOWN_DIR || path.join(__dirname, '..', 'markdown');
const MAX_CONTENT_SIZE = 10 * 1024 * 1024; // 10MB

// Git Service
const gitService = new GitService(path.join(__dirname, '..', 'markdown'));
console.log('✓ Git service ready');

// Agent DB and Service
const agentDb = new AgentDB(path.join(__dirname, '..', 'agent-history.db'));
let agentService;

agentDb.initialize()
  .then(() => {
    console.log('✓ Agent database initialized');
    agentService = new AgentService(io, agentDb);
    console.log('✓ Agent service ready');
  })
  .catch(err => console.error('✗ Failed to initialize agent database:', err));

// ============================================================================
// Static File Serving
// ============================================================================

const distPath = path.join(__dirname, '..', 'app-react', 'dist');
const rootDistPath = path.join(__dirname, '..', 'dist');

function setupStaticFiles() {
  const fsSync = require('fs');

  // Try app-react/dist first
  try {
    if (fsSync.statSync(distPath).isDirectory()) {
      app.use(serveStatic(distPath));
      return;
    }
  } catch {}

  // Fall back to root dist
  try {
    if (fsSync.statSync(rootDistPath).isDirectory()) {
      app.use(serveStatic(rootDistPath));
      console.log('Using root dist directory for static files');
      return;
    }
  } catch {}

  console.warn('Warning: Frontend build directory not found');
  console.warn('Run `npm run build` in the app-react directory to build the frontend');
}

setupStaticFiles();

// ============================================================================
// Middleware
// ============================================================================

app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(morgan('dev'));

const limiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// ============================================================================
// Utility Functions
// ============================================================================

function broadcastToClients(message) {
  io.emit('file-change', message);
}

function sanitizePath(inputPath) {
  try {
    const decodedPath = decodeURIComponent(inputPath);
    const normalizedPath = path.normalize(decodedPath);
    if (normalizedPath.includes('../') || normalizedPath.startsWith('..')) {
      throw new Error('Invalid path: directory traversal detected');
    }
    return normalizedPath;
  } catch (e) {
    throw new Error('Invalid path: malformed URI');
  }
}

function validateMarkdownPath(filePath) {
  if (!filePath.toLowerCase().endsWith('.md')) {
    throw new Error('Only markdown files are allowed');
  }
}

function resolveSafePath(sanitizedPath) {
  const filePath = path.join(MARKDOWN_DIR, sanitizedPath);
  const resolvedPath = path.resolve(filePath);
  const resolvedMarkdownDir = path.resolve(MARKDOWN_DIR);

  if (!resolvedPath.startsWith(resolvedMarkdownDir)) {
    throw new Error('Invalid file path: outside allowed directory');
  }

  return filePath;
}

async function ensureFileExists(filePath) {
  try {
    await fs.access(filePath);
  } catch (error) {
    throw new Error(`File not found: ${path.basename(filePath)}`);
  }
}

async function ensureFileDoesNotExist(filePath) {
  try {
    await fs.access(filePath);
    throw new Error(`File already exists: ${path.basename(filePath)}`);
  } catch (error) {
    if (error.message.includes('already exists')) throw error;
    // File doesn't exist, which is what we want
  }
}

function validateContent(content) {
  if (typeof content !== 'string') {
    throw new Error('Content must be a string');
  }
  if (Buffer.byteLength(content, 'utf8') > MAX_CONTENT_SIZE) {
    throw new Error('Content too large');
  }
}

// Async wrapper for route handlers
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Service readiness checkers
const checkAgentService = (req, res, next) => {
  if (!agentService) return res.status(503).json({ error: 'Agent service not ready' });
  next();
};

const checkAgentDb = (req, res, next) => {
  if (!agentDb) return res.status(503).json({ error: 'Agent database not ready' });
  next();
};

// ============================================================================
// Authentication
// ============================================================================

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const validApiKey = process.env.API_KEY || 'demo-api-key';

  if (!authHeader) {
    return res.status(401).json({ error: 'Access denied. No token provided.' });
  }

  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;

  if (token !== validApiKey) {
    return res.status(403).json({ error: 'Invalid token.' });
  }

  next();
}

// ============================================================================
// File Cache
// ============================================================================

const fileCache = {
  files: [],
  lastUpdated: 0,
  isValid: false,
  isInitialized: false
};

const invalidateCache = () => {
  fileCache.isValid = false;
  console.log('File cache invalidated');
};

const getFileList = async () => {
  if (fileCache.isValid && fileCache.files.length > 0) {
    console.log('Using cached file list');
    return fileCache.files;
  }

  console.log('Cache invalid, scanning directory...');

  try {
    const gitignorePath = path.join(MARKDOWN_DIR, '.gitignore');
    let hasGitignore = false;
    let files = [];

    try {
      await fs.access(gitignorePath);
      hasGitignore = true;
    } catch {
      console.log('No .gitignore file found for file list');
    }

    // Use glob-gitignore if available
    if (globGitignore && hasGitignore) {
      try {
        files = await globGitignore.glob('**/*.md', {
          cwd: MARKDOWN_DIR,
          absolute: true,
          gitignore: { path: gitignorePath },
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

      // Manual .gitignore filtering if needed
      if (hasGitignore) {
        const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
        const patterns = gitignoreContent
          .split('\n')
          .filter(line => line.trim() && !line.startsWith('#'))
          .map(p => p.trim());

        files = files.filter(file => {
          const relativePath = path.relative(MARKDOWN_DIR, file);
          return !patterns.some(pattern => matchesGitignorePattern(relativePath, pattern));
        });
      }
    }

    const relativePaths = files.map(file => ({
      path: path.relative(MARKDOWN_DIR, file),
      name: path.basename(file)
    }));

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

function matchesGitignorePattern(relativePath, pattern) {
  if (pattern.endsWith('/')) {
    return relativePath.startsWith(pattern) || relativePath.includes('/' + pattern);
  }
  if (pattern.includes('*')) {
    const regexPattern = pattern.replace(/\./g, '\\.').replace(/\*/g, '.*');
    const regex = new RegExp(`^${regexPattern}$`);
    return regex.test(relativePath) || regex.test(path.basename(relativePath));
  }
  return relativePath === pattern || relativePath.endsWith('/' + pattern) || path.basename(relativePath) === pattern;
}

// ============================================================================
// File Watcher
// ============================================================================

let watcher;

async function handleFileEvent(filePath, eventType) {
  const relativePath = path.relative(MARKDOWN_DIR, filePath);

  if (eventType !== 'unlink') {
    try {
      if (relativePath.endsWith('.md')) {
        const content = await fs.readFile(filePath, 'utf-8');
        fileSyncManager.handleFileChange(relativePath, content);
      }
    } catch (error) {
      console.error('[ContextSync] Error on file event:', error);
    }
  } else {
    try {
      if (relativePath.endsWith('.md')) {
        fileSyncManager.handleFileDelete(relativePath);
      }
    } catch (error) {
      console.error('[ContextSync] Error on file delete:', error);
    }
  }
}

async function setupWatcher() {
  if (watcher) watcher.close();

  const gitignorePath = path.join(MARKDOWN_DIR, '.gitignore');
  let hasGitignore = false;
  let gitignoreContent = '';

  try {
    await fs.access(gitignorePath);
    gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
    hasGitignore = true;
    console.log(`Found .gitignore for watcher at ${gitignorePath}`);
  } catch {
    console.log('No .gitignore file found for watcher');
  }

  const watchOptions = {
    persistent: true,
    ignored: [
      /(^|[\/\\])\../,
      '**/node_modules/**',
      '**/.cospec-sync/**'
    ]
  };

  if (hasGitignore) {
    const gitignorePatterns = gitignoreContent
      .split('\n')
      .filter(line => line.trim() && !line.startsWith('#'))
      .map(p => p.startsWith('/') ? p.substring(1) : p);
    watchOptions.ignored.push(...gitignorePatterns.map(p => `${MARKDOWN_DIR}/${p}`));
  }

  watcher = chokidar.watch(`${MARKDOWN_DIR}/**/*.md`, watchOptions);
  console.log(`Watching for changes in ${MARKDOWN_DIR}`);

  watcher
    .on('add', async (filePath) => {
      console.log(`File ${filePath} has been added`);
      invalidateCache();
      const relativePath = path.relative(MARKDOWN_DIR, filePath);
      broadcastToClients({ type: 'FILE_ADDED', path: relativePath, timestamp: Date.now() });
      await handleFileEvent(filePath, 'add');
    })
    .on('change', async (filePath) => {
      console.log(`File ${filePath} has been changed`);
      const relativePath = path.relative(MARKDOWN_DIR, filePath);
      broadcastToClients({ type: 'FILE_CHANGED', path: relativePath, timestamp: Date.now() });
      await handleFileEvent(filePath, 'change');
    })
    .on('unlink', async (filePath) => {
      console.log(`File ${filePath} has been removed`);
      invalidateCache();
      const relativePath = path.relative(MARKDOWN_DIR, filePath);
      broadcastToClients({ type: 'FILE_DELETED', path: relativePath, timestamp: Date.now() });
      await handleFileEvent(filePath, 'unlink');
    });

  try {
    await getFileList();
    console.log('Initial file cache built');
  } catch (err) {
    console.error('Error building initial file cache:', err);
  }
}

// ============================================================================
// File API Routes
// ============================================================================

// GET /api/files - List all markdown files
app.get('/api/files', asyncHandler(async (req, res) => {
  try {
    await fs.access(MARKDOWN_DIR);
  } catch {
    return res.status(404).json({ error: `Markdown directory not found: ${MARKDOWN_DIR}` });
  }

  let files = await getFileList();

  if (profileManager.isLoaded()) {
    files = await profileManager.annotateFiles(files, MARKDOWN_DIR);
  }

  res.json(files);
}));

// POST /api/files/refresh - Refresh file cache
app.post('/api/files/refresh', authenticateToken, asyncHandler(async (req, res) => {
  invalidateCache();
  const files = await getFileList();
  res.json({ success: true, fileCount: files.length });
}));

// GET /api/files/:path(*) - Read file content
app.get('/api/files/:path(*)', asyncHandler(async (req, res) => {
  const sanitizedPath = sanitizePath(req.params.path);
  validateMarkdownPath(sanitizedPath);
  const filePath = resolveSafePath(sanitizedPath);
  await ensureFileExists(filePath);

  const content = await fs.readFile(filePath, 'utf-8');
  res.json({ path: sanitizedPath, content });
}));

// POST /api/files/:path(*) - Save file content
app.post('/api/files/:path(*)', authenticateToken, asyncHandler(async (req, res) => {
  const { content } = req.body;

  if (content === undefined) {
    return res.status(400).json({ error: 'Content is required' });
  }

  validateContent(content);

  const sanitizedPath = sanitizePath(req.params.path);
  validateMarkdownPath(sanitizedPath);
  const filePath = resolveSafePath(sanitizedPath);

  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf-8');

  res.json({ success: true, path: sanitizedPath });
}));

// PUT /api/files/:path(*) - Create new file
app.put('/api/files/:path(*)', authenticateToken, asyncHandler(async (req, res) => {
  const { content = '' } = req.body;

  validateContent(content);

  const sanitizedPath = sanitizePath(req.params.path);
  validateMarkdownPath(sanitizedPath);
  const filePath = resolveSafePath(sanitizedPath);

  await ensureFileDoesNotExist(filePath);
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, 'utf-8');

  res.status(201).json({ success: true, path: sanitizedPath });
}));

// DELETE /api/files/:path(*) - Delete file
app.delete('/api/files/:path(*)', authenticateToken, asyncHandler(async (req, res) => {
  const sanitizedPath = sanitizePath(req.params.path);
  validateMarkdownPath(sanitizedPath);
  const filePath = resolveSafePath(sanitizedPath);

  await ensureFileExists(filePath);
  await fs.unlink(filePath);

  res.json({ success: true, path: sanitizedPath });
}));

// PATCH /api/files/:path(*) - Rename file
app.patch('/api/files/:path(*)', authenticateToken, asyncHandler(async (req, res) => {
  const { newPath } = req.body;

  if (!newPath) {
    return res.status(400).json({ error: 'New path is required' });
  }

  const sanitizedOldPath = sanitizePath(req.params.path);
  const sanitizedNewPath = sanitizePath(newPath);

  validateMarkdownPath(sanitizedOldPath);
  validateMarkdownPath(sanitizedNewPath);

  const oldPath = resolveSafePath(sanitizedOldPath);
  const targetPath = resolveSafePath(sanitizedNewPath);

  // Verify both paths are safe (resolveSafePath only checks one)
  const resolvedMarkdownDir = path.resolve(MARKDOWN_DIR);
  if (!path.resolve(targetPath).startsWith(resolvedMarkdownDir)) {
    return res.status(400).json({ error: 'Invalid file path: outside allowed directory' });
  }

  await ensureFileExists(oldPath);
  await ensureFileDoesNotExist(targetPath);

  await fs.mkdir(path.dirname(targetPath), { recursive: true });
  await fs.rename(oldPath, targetPath);

  res.json({ success: true, oldPath: sanitizedOldPath, newPath: sanitizedNewPath });
}));

// ============================================================================
// Context Sync Routes
// ============================================================================

app.post('/api/files/:path(*)/sync-to-context', authenticateToken, asyncHandler(async (req, res) => {
  const filePath = sanitizePath(req.params.path);
  const fullPath = path.join(MARKDOWN_DIR, filePath);

  await ensureFileExists(fullPath);

  const content = await fs.readFile(fullPath, 'utf-8');
  const result = await fileSyncManager.markForSync(filePath, content);

  res.json(result);
}));

app.delete('/api/files/:path(*)/sync-to-context', authenticateToken, asyncHandler(async (req, res) => {
  const filePath = sanitizePath(req.params.path);
  const result = await fileSyncManager.unmarkFromSync(filePath);
  res.json(result);
}));

app.get('/api/files/:path(*)/sync-status', asyncHandler(async (req, res) => {
  const filePath = sanitizePath(req.params.path);
  const status = fileSyncManager.getSyncStatus(filePath);
  res.json(status);
}));

app.get('/api/context-config', asyncHandler(async (req, res) => {
  const healthy = await kaiContextClient.healthCheck();
  res.json({
    enabled: kaiContextClient.enabled,
    healthy,
    projectId: kaiContextClient.projectId,
    patterns: fileSyncManager.getPatterns(),
    syncedFiles: fileSyncManager.getAllSyncedFiles(),
  });
}));

// ============================================================================
// Configuration API
// ============================================================================

app.get('/api/config', (req, res) => {
  res.json({
    profileEditorMode: process.env.PROFILE_EDITOR_MODE === 'true',
    profileName: process.env.PROFILE_NAME || null,
  });
});

// ============================================================================
// Profile API Routes
// ============================================================================

app.get('/api/profile', asyncHandler(async (req, res) => {
  if (!profileManager.isLoaded()) {
    return res.json({ profile: null });
  }

  res.json({
    profile: profileManager.getProfile(),
    profileName: profileManager.getProfileName(),
    profilePath: profileManager.getProfilePath(),
  });
}));

app.get('/api/profile/files', asyncHandler(async (req, res) => {
  if (!profileManager.isLoaded()) {
    return res.json({ files: [] });
  }

  const files = await getFileList();
  const annotatedFiles = await profileManager.annotateFiles(files, MARKDOWN_DIR);
  const requiredFiles = annotatedFiles.filter(f => f.profileMetadata?.required);

  res.json({ files: requiredFiles });
}));

app.get('/api/profile/prompt/:path(*)', asyncHandler(async (req, res) => {
  if (!profileManager.isLoaded()) {
    return res.status(404).json({ error: 'No profile loaded' });
  }

  const filePath = sanitizePath(req.params.path);
  const doc = profileManager.getDocumentByPath(filePath);

  if (!doc || !doc.promptFile) {
    return res.status(404).json({ error: 'Prompt file not found for document' });
  }

  const promptFilePath = profileManager.resolvePromptFile(doc.promptFile);

  try {
    const content = await fs.readFile(promptFilePath, 'utf-8');
    res.json({ path: doc.promptFile, absolutePath: promptFilePath, content });
  } catch (err) {
    return res.status(404).json({ error: `Prompt file not found: ${doc.promptFile}` });
  }
}));

app.post('/api/profile/generate/:path(*)', authenticateToken, asyncHandler(async (req, res) => {
  if (!profileManager.isLoaded()) {
    return res.status(404).json({ error: 'No profile loaded' });
  }

  const filePath = sanitizePath(req.params.path);
  const context = profileManager.getGenerationContext(filePath);

  if (!context.command) {
    return res.status(400).json({ error: 'No generation command defined for this document' });
  }

  const targetPath = path.join(MARKDOWN_DIR, filePath);
  await fs.mkdir(path.dirname(targetPath), { recursive: true });

  let command = context.command
    .replace(/{filePath}/g, targetPath)
    .replace(/{promptText}/g, context.promptText || '');

  if (context.promptFile) {
    command = command.replace(/{promptFile}/g, context.promptFile);
  }

  console.log(`[ProfileGen] Executing command for ${filePath}:`, command);

  const { spawn } = require('child_process');
  const child = spawn(command, [], { shell: true, cwd: MARKDOWN_DIR });
  const outputBuffer = [];

  child.stdout.on('data', (data) => {
    const output = data.toString();
    outputBuffer.push(output);
    io.emit('generation-output', { path: filePath, output, isError: false });
  });

  child.stderr.on('data', (data) => {
    const output = data.toString();
    outputBuffer.push(output);
    io.emit('generation-output', { path: filePath, output, isError: true });
  });

  child.on('close', async (code) => {
    const success = code === 0;
    console.log(`[ProfileGen] Command finished with code ${code} for ${filePath}`);

    io.emit('generation-complete', {
      path: filePath,
      success,
      output: outputBuffer.join(''),
      exitCode: code,
    });

    if (success) {
      invalidateCache();
      broadcastToClients({ type: 'file-added', path: filePath });
    }
  });

  child.on('error', (err) => {
    console.error(`[ProfileGen] Command error for ${filePath}:`, err);
    io.emit('generation-complete', {
      path: filePath,
      success: false,
      error: err.message,
    });
  });

  res.json({ success: true, message: 'Generation started' });
}));

app.get('/api/profile/validate', asyncHandler(async (req, res) => {
  if (!profileManager.isLoaded()) {
    return res.status(404).json({ error: 'No profile loaded' });
  }

  const profile = profileManager.getProfile();
  const validation = await profileManager.validateProfile(profile);
  res.json(validation);
}));

// ============================================================================
// Profile Management Routes
// ============================================================================

app.get('/api/profiles', asyncHandler(async (req, res) => {
  const profiles = await profileManager.listAvailableProfiles();
  res.json({ profiles });
}));

app.get('/api/profiles/:name', asyncHandler(async (req, res) => {
  const profileName = req.params.name;
  const profile = await profileManager.getProfileContent(profileName);
  res.json({ profile, profileName });
}));

app.post('/api/profiles', authenticateToken, asyncHandler(async (req, res) => {
  const { name, config } = req.body;

  if (!name || !config) {
    return res.status(400).json({ error: 'Name and config are required' });
  }

  const profile = await profileManager.createProfile(name, config);
  res.json({ success: true, profile, profileName: name });
}));

app.put('/api/profiles/:name', authenticateToken, asyncHandler(async (req, res) => {
  const profileName = req.params.name;
  const { config } = req.body;

  if (!config) {
    return res.status(400).json({ error: 'Config is required' });
  }

  const profile = await profileManager.updateProfile(profileName, config);
  res.json({ success: true, profile, profileName });
}));

app.delete('/api/profiles/:name', authenticateToken, asyncHandler(async (req, res) => {
  const profileName = req.params.name;
  await profileManager.deleteProfile(profileName);
  res.json({ success: true, profileName });
}));

app.post('/api/profiles/:name/load', authenticateToken, asyncHandler(async (req, res) => {
  const profileName = req.params.name;
  const profile = await profileManager.reloadProfile(profileName);

  invalidateCache();

  io.emit('profile-reloaded', { profileName, profile });

  res.json({
    success: true,
    profile,
    profileName,
    profilePath: profileManager.getProfilePath(),
  });
}));

app.post('/api/profiles/:name/prompts', authenticateToken, asyncHandler(async (req, res) => {
  const profileName = req.params.name;
  const { path: promptPath, content } = req.body;

  if (!promptPath || content === undefined) {
    return res.status(400).json({ error: 'Path and content are required' });
  }

  await profileManager.savePromptFile(profileName, promptPath, content);
  res.json({ success: true, path: promptPath });
}));

app.delete('/api/profiles/:name/prompts', authenticateToken, asyncHandler(async (req, res) => {
  const profileName = req.params.name;
  const { path: promptPath } = req.body;

  if (!promptPath) {
    return res.status(400).json({ error: 'Path is required' });
  }

  await profileManager.deletePromptFile(profileName, promptPath);
  res.json({ success: true, path: promptPath });
}));

app.get('/api/profiles/:name/prompts/:path(*)', asyncHandler(async (req, res) => {
  const profileName = req.params.name;
  const promptPath = req.params.path;

  const content = await profileManager.readPromptFile(profileName, promptPath);
  res.json({ content, path: promptPath });
}));

// ============================================================================
// Agent API Routes
// ============================================================================

const VALID_AGENT_TYPES = ['prd-analyzer', 'code-reviewer', 'doc-generator', 'version-advisor'];

app.post('/api/agent/execute', authenticateToken, checkAgentService, asyncHandler(async (req, res) => {
  const { agentType, targetFiles, customPrompt, outputPath } = req.body;

  if (!agentType || !targetFiles || !Array.isArray(targetFiles)) {
    return res.status(400).json({ error: 'Missing required fields: agentType, targetFiles' });
  }

  if (!VALID_AGENT_TYPES.includes(agentType)) {
    return res.status(400).json({ error: `Invalid agentType. Must be one of: ${VALID_AGENT_TYPES.join(', ')}` });
  }

  const result = await agentService.executeAgent(agentType, targetFiles, { customPrompt, outputPath });
  res.json(result);
}));

app.get('/api/agent/history', checkAgentDb, asyncHandler(async (req, res) => {
  const { limit = 20, offset = 0, agentType, status } = req.query;

  const executions = await agentDb.findAll({
    limit: parseInt(limit),
    offset: parseInt(offset),
    agentType,
    status
  });

  const stats = await agentDb.getStats();

  res.json({ executions, total: executions.length, stats });
}));

app.get('/api/agent/history/:id', checkAgentDb, asyncHandler(async (req, res) => {
  const execution = await agentDb.findById(req.params.id);

  if (!execution) {
    return res.status(404).json({ error: 'Execution not found' });
  }

  res.json(execution);
}));

app.delete('/api/agent/history/:id', authenticateToken, checkAgentDb, asyncHandler(async (req, res) => {
  await agentDb.delete(req.params.id);
  res.json({ success: true });
}));

app.get('/api/agent/types', checkAgentService, (req, res) => {
  const types = agentService.getAgentTypes();
  res.json({ types });
});

app.get('/api/agent/types/:id', checkAgentService, (req, res) => {
  const agentType = agentService.getAgentTypeById(req.params.id);

  if (!agentType) {
    return res.status(404).json({ error: 'Agent type not found' });
  }

  res.json(agentType);
});

app.get('/api/agent/suggestions', checkAgentService, asyncHandler(async (req, res) => {
  const { file } = req.query;
  const suggestions = await agentService.getSuggestions(file);
  res.json({ suggestions });
}));

app.post('/api/agent/chat', checkAgentService, asyncHandler(async (req, res) => {
  const { message, contextFiles, agentType, conversationId } = req.body;

  if (!message || typeof message !== 'string') {
    return res.status(400).json({ error: 'Message is required' });
  }

  const result = await agentService.executeChat(message, {
    contextFiles: contextFiles || [],
    agentType: agentType || 'general',
    conversationId
  });

  res.json(result);
}));

app.get('/api/agent/conversations', checkAgentService, asyncHandler(async (req, res) => {
  const conversations = await agentService.getConversationsWithMessages();
  res.json({ conversations });
}));

app.post('/api/agent/conversations', checkAgentService, asyncHandler(async (req, res) => {
  const { userId, agentType, title, firstMessage } = req.body;
  const conversation = await agentService.createConversation(userId, agentType, title, firstMessage);
  res.json({ conversation });
}));

app.get('/api/agent/conversations/:id', checkAgentService, asyncHandler(async (req, res) => {
  const conversation = await agentService.getConversationWithMessages(req.params.id);

  if (!conversation) {
    return res.status(404).json({ error: 'Conversation not found' });
  }

  res.json(conversation);
}));

app.delete('/api/agent/conversations/:id', authenticateToken, checkAgentService, asyncHandler(async (req, res) => {
  await agentService.deleteConversation(req.params.id);
  res.json({ success: true });
}));

// ============================================================================
// Git API Routes
// ============================================================================

app.get('/api/git/status', asyncHandler(async (req, res) => {
  const result = await gitService.getStatus();
  res.json(result);
}));

app.get('/api/git/log', asyncHandler(async (req, res) => {
  const limit = parseInt(req.query.limit) || 20;
  const offset = parseInt(req.query.offset) || 0;
  const result = await gitService.getLog(limit, offset);
  res.json(result);
}));

app.get('/api/git/commit/:id', asyncHandler(async (req, res) => {
  const result = await gitService.getCommit(req.params.id);
  res.json(result);
}));

app.get('/api/git/diff', asyncHandler(async (req, res) => {
  const { pathA, pathB } = req.query;

  if (!pathA || !pathB) {
    return res.status(400).json({ error: 'pathA and pathB are required' });
  }

  const result = await gitService.diff(pathA, pathB);
  res.json(result);
}));

app.get('/api/git/branches', asyncHandler(async (req, res) => {
  const branches = await gitService.getBranches();
  res.json({ branches });
}));

app.post('/api/git/stage', authenticateToken, asyncHandler(async (req, res) => {
  const { files } = req.body;

  if (!Array.isArray(files)) {
    return res.status(400).json({ error: 'files must be an array' });
  }

  const result = await gitService.stageFiles(files);
  res.json(result);
}));

app.post('/api/git/commit', authenticateToken, asyncHandler(async (req, res) => {
  const { message } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'message is required' });
  }

  const result = await gitService.commitFiles(message);
  res.json(result);
}));

// ============================================================================
// Catch-all Route
// ============================================================================

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/') || req.path.startsWith('/ws/')) {
    return res.status(404).json({ error: 'API endpoint not found' });
  }

  const fsSync = require('fs');
  let indexPath = path.join(distPath, 'index.html');

  if (!fsSync.existsSync(indexPath)) {
    const rootIndexPath = path.join(rootDistPath, 'index.html');
    if (fsSync.existsSync(rootIndexPath)) {
      indexPath = rootIndexPath;
    } else {
      return res.status(500).send('Frontend build not found. Please run build process.');
    }
  }

  res.sendFile(indexPath, (err) => {
    if (err) res.status(500).send('Error loading the application');
  });
});

// ============================================================================
// Server Startup
// ============================================================================

server.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Markdown directory: ${MARKDOWN_DIR}`);
  console.log(`WebSocket server available at ws://localhost:${PORT}/ws`);

  const profileName = process.env.PROFILE_NAME;
  if (profileName) {
    try {
      await profileManager.loadProfile(profileName);
      console.log(`Profile "${profileName}" loaded successfully`);
    } catch (err) {
      console.error(`Failed to load profile "${profileName}":`, err.message);
    }
  }

  try {
    await setupWatcher();
    console.log('File watcher setup complete');
  } catch (err) {
    console.error('Error setting up file watcher:', err);
  }
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});
