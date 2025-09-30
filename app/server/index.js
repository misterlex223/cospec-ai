// 功能項目: 2.1.1 遞迴掃描指定目錄下所有 Markdown 文件
const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const morgan = require('morgan');
const { glob } = require('glob');
const chokidar = require('chokidar');
// 引入 glob-gitignore 用於處理 .gitignore 過濾
let globGitignore;
try {
  globGitignore = require('glob-gitignore');
} catch (err) {
  console.warn('glob-gitignore not available, falling back to standard glob');
}

const app = express();
const PORT = process.env.PORT || 3001;

// 功能項目: 1.1.3 設定環境變數
const MARKDOWN_DIR = process.env.MARKDOWN_DIR || '/markdown';

// 中間件
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// 功能項目: 2.1.3 監控文件變更
let watcher;
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

  watcher
    .on('add', path => console.log(`File ${path} has been added`))
    .on('change', path => console.log(`File ${path} has been changed`))
    .on('unlink', path => console.log(`File ${path} has been removed`));
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

    let files = [];
    
    // 檢查 .gitignore 文件是否存在
    const gitignorePath = path.join(MARKDOWN_DIR, '.gitignore');
    let hasGitignore = false;
    
    try {
      await fs.access(gitignorePath);
      hasGitignore = true;
      // console.log(`Found .gitignore at ${gitignorePath}`);
    } catch (error) {
      console.log('No .gitignore file found, will not filter by gitignore rules');
    }
    
    // 使用 glob-gitignore 如果可用且有 .gitignore 文件
    if (globGitignore && hasGitignore) {
      console.log('Using glob-gitignore to filter files');
      
      try {
        // 使用 glob-gitignore 的 glob 方法
        files = await globGitignore.glob('**/*.md', {
          cwd: MARKDOWN_DIR,
          absolute: true,
          gitignore: { // 指定 gitignore 文件
            path: gitignorePath
          },
          ignore: ['**/node_modules/**'] // 額外忽略 node_modules
        });
        
        console.log(`Found ${files.length} files after gitignore filtering`);
      } catch (err) {
        console.error('Error using glob-gitignore:', err);
        // 如果出錯，回退到標準 glob
        files = await glob(`${MARKDOWN_DIR}/**/*.md`, {
          ignore: [`${MARKDOWN_DIR}/**/node_modules/**`]
        });
      }
    } else {
      // 使用標準 glob，但仍然忽略 node_modules
      console.log('Using standard glob with node_modules filtering');
      files = await glob(`${MARKDOWN_DIR}/**/*.md`, {
        ignore: [`${MARKDOWN_DIR}/**/node_modules/**`]
      });
      
      // 如果有 .gitignore 文件但沒有 glob-gitignore，手動讀取和過濾
      if (hasGitignore && !globGitignore) {
        console.log('Manually filtering by .gitignore patterns');
        try {
          const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
          const gitignorePatterns = gitignoreContent
            .split('\n')
            .filter(line => line.trim() && !line.startsWith('#'))
            .map(pattern => pattern.trim());
          
          // console.log('Loaded .gitignore patterns:', gitignorePatterns);
          
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
        } catch (err) {
          console.error('Error processing .gitignore:', err);
        }
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

    res.json(relativePaths);
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ error: error.message });
  }
});

// 功能項目: 2.2.1 讀取文件內容
app.get('/api/files/:path(*)', async (req, res) => {
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
app.post('/api/files/:path(*)', async (req, res) => {
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
app.put('/api/files/:path(*)', async (req, res) => {
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
app.delete('/api/files/:path(*)', async (req, res) => {
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
app.patch('/api/files/:path(*)', async (req, res) => {
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
app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Markdown directory: ${MARKDOWN_DIR}`);
  try {
    await setupWatcher();
    console.log('File watcher setup complete');
  } catch (err) {
    console.error('Error setting up file watcher:', err);
  }
});
