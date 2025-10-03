// API 處理程序：組織和項目
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// 從 users.js 導入認證中間件
let authenticate;
try {
  const usersModule = require('./users');
  authenticate = usersModule.authenticate;
} catch (error) {
  console.warn('User authentication module not available, proceeding without authentication');
  // 如果用戶模塊不可用，提供一個空的中間件
  authenticate = (req, res, next) => next();
}

// 數據存儲路徑
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');
const ORGANIZATIONS_FILE = path.join(DATA_DIR, 'organizations.json');
const PROJECTS_FILE = path.join(DATA_DIR, 'projects.json');
const FILES_FILE = path.join(DATA_DIR, 'files.json');

// 確保數據目錄存在
async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch (error) {
    console.error('Error creating data directory:', error);
  }
}

// 讀取數據文件
async function readDataFile(filePath, defaultValue = []) {
  try {
    await fs.access(filePath);
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (error) {
    // 如果文件不存在或解析錯誤，返回默認值
    return defaultValue;
  }
}

// 寫入數據文件
async function writeDataFile(filePath, data) {
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// 初始化數據文件
async function initializeDataFiles() {
  await ensureDataDir();
  
  // 檢查並初始化組織文件
  try {
    await fs.access(ORGANIZATIONS_FILE);
  } catch (error) {
    await writeDataFile(ORGANIZATIONS_FILE, []);
    console.log('Created organizations data file');
  }
  
  // 檢查並初始化項目文件
  try {
    await fs.access(PROJECTS_FILE);
  } catch (error) {
    await writeDataFile(PROJECTS_FILE, []);
    console.log('Created projects data file');
  }
  
  // 檢查並初始化文件數據文件
  try {
    await fs.access(FILES_FILE);
  } catch (error) {
    await writeDataFile(FILES_FILE, []);
    console.log('Created files data file');
  }
}

// 初始化數據文件
initializeDataFiles();

// 獲取所有組織
router.get('/organizations', authenticate, async (req, res) => {
  try {
    const organizations = await readDataFile(ORGANIZATIONS_FILE);
    res.json({ organizations });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ error: error.message });
  }
});

// 創建新組織
router.post('/organizations', authenticate, async (req, res) => {
  try {
    const { name, settings = {} } = req.body;
    
    if (!name) {
    }
    
    const organizations = await readDataFile(ORGANIZATIONS_FILE);
    
    // 創建新組織
    const newOrg = {
      id: uuidv4(),
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      settings: {
        ...settings,
        owner: req.userId, // 記錄組織擁有者
        isPersonal: false  // 預設非個人組織
      },
      role: 'owner',
      created_at: Date.now(),
      updated_at: Date.now()
    };
    
    organizations.push(newOrg);
    await writeDataFile(ORGANIZATIONS_FILE, organizations);
    
    res.status(201).json(newOrg);
  } catch (error) {
    console.error('Error creating organization:', error);
    res.status(500).json({ error: error.message });
  }
});

// 獲取單個組織
router.get('/organizations/:orgId', authenticate, async (req, res) => {
  try {
    const { orgId } = req.params;
    const organizations = await readDataFile(ORGANIZATIONS_FILE);
    
    const organization = organizations.find(org => org.id === orgId);
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    res.json(organization);
  } catch (error) {
    console.error('Error fetching organization:', error);
    res.status(500).json({ error: error.message });
  }
});

// 更新組織
router.put('/organizations/:orgId', authenticate, async (req, res) => {
  try {
    const { orgId } = req.params;
    const { name, settings } = req.body;
    
    const organizations = await readDataFile(ORGANIZATIONS_FILE);
    const orgIndex = organizations.findIndex(org => org.id === orgId);
    
    if (orgIndex === -1) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    // 更新組織
    organizations[orgIndex] = {
      ...organizations[orgIndex],
      name: name || organizations[orgIndex].name,
      settings: settings || organizations[orgIndex].settings,
      updated_at: Date.now()
    };
    
    await writeDataFile(ORGANIZATIONS_FILE, organizations);
    
    res.json(organizations[orgIndex]);
  } catch (error) {
    console.error('Error updating organization:', error);
    res.status(500).json({ error: error.message });
  }
});

// 刪除組織
router.delete('/organizations/:orgId', authenticate, async (req, res) => {
  try {
    const { orgId } = req.params;
    
    const organizations = await readDataFile(ORGANIZATIONS_FILE);
    const projects = await readDataFile(PROJECTS_FILE);
    
    const orgIndex = organizations.findIndex(org => org.id === orgId);
    
    if (orgIndex === -1) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    // 刪除組織
    organizations.splice(orgIndex, 1);
    await writeDataFile(ORGANIZATIONS_FILE, organizations);
    
    // 刪除相關項目
    const updatedProjects = projects.filter(project => project.organization_id !== orgId);
    await writeDataFile(PROJECTS_FILE, updatedProjects);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting organization:', error);
    res.status(500).json({ error: error.message });
  }
});

// 獲取組織的項目
router.get('/organizations/:orgId/projects', authenticate, async (req, res) => {
  try {
    const { orgId } = req.params;
    const projects = await readDataFile(PROJECTS_FILE);
    
    const orgProjects = projects.filter(project => project.organization_id === orgId);
    
    res.json({ projects: orgProjects });
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: error.message });
  }
});

// 創建新項目
router.post('/organizations/:orgId/projects', authenticate, async (req, res) => {
  try {
    const { orgId } = req.params;
    const { name, settings = {} } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }
    
    const organizations = await readDataFile(ORGANIZATIONS_FILE);
    const organization = organizations.find(org => org.id === orgId);
    
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    const projects = await readDataFile(PROJECTS_FILE);
    
    // 創建新項目
    const newProject = {
      id: uuidv4(),
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      organization_id: orgId,
      organization_name: organization.name,
      settings,
      role: 'owner',
      created_at: Date.now(),
      updated_at: Date.now()
    };
    
    projects.push(newProject);
    await writeDataFile(PROJECTS_FILE, projects);
    
    res.status(201).json(newProject);
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: error.message });
  }
});

// 獲取單個項目
router.get('/projects/:projectId', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const projects = await readDataFile(PROJECTS_FILE);
    
    const project = projects.find(proj => proj.id === projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    res.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: error.message });
  }
});

// 更新項目
router.put('/projects/:projectId', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, settings } = req.body;
    
    const projects = await readDataFile(PROJECTS_FILE);
    const projectIndex = projects.findIndex(proj => proj.id === projectId);
    
    if (projectIndex === -1) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // 更新項目
    projects[projectIndex] = {
      ...projects[projectIndex],
      name: name || projects[projectIndex].name,
      settings: settings || projects[projectIndex].settings,
      updated_at: Date.now()
    };
    
    await writeDataFile(PROJECTS_FILE, projects);
    
    res.json(projects[projectIndex]);
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: error.message });
  }
});

// 刪除項目
router.delete('/projects/:projectId', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const projects = await readDataFile(PROJECTS_FILE);
    const files = await readDataFile(FILES_FILE);
    
    const projectIndex = projects.findIndex(proj => proj.id === projectId);
    
    if (projectIndex === -1) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // 刪除項目
    projects.splice(projectIndex, 1);
    await writeDataFile(PROJECTS_FILE, projects);
    
    // 刪除相關文件
    const updatedFiles = files.filter(file => file.project_id !== projectId);
    await writeDataFile(FILES_FILE, updatedFiles);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: error.message });
  }
});

// 獲取項目的文件
router.get('/projects/:projectId/files', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const files = await readDataFile(FILES_FILE);
    
    const projectFiles = files.filter(file => file.project_id === projectId);
    
    res.json({ files: projectFiles });
  } catch (error) {
    console.error('Error fetching files:', error);
    res.status(500).json({ error: error.message });
  }
});

// 創建新文件
router.post('/projects/:projectId/files', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, content = '' } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'File name is required' });
    }
    
    const projects = await readDataFile(PROJECTS_FILE);
    const project = projects.find(proj => proj.id === projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const files = await readDataFile(FILES_FILE);
    
    // 創建新文件
    const newFile = {
      id: uuidv4(),
      name,
      path: name,
      project_id: projectId,
      content,
      size: Buffer.byteLength(content, 'utf8'),
      git_status: 'new',
      created_at: Date.now(),
      updated_at: Date.now()
    };
    
    files.push(newFile);
    await writeDataFile(FILES_FILE, files);
    
    res.status(201).json(newFile);
  } catch (error) {
    console.error('Error creating file:', error);
    res.status(500).json({ error: error.message });
  }
});

// 獲取單個文件
router.get('/projects/:projectId/files/:fileId', authenticate, async (req, res) => {
  try {
    const { projectId, fileId } = req.params;
    const files = await readDataFile(FILES_FILE);
    
    const file = files.find(f => f.id === fileId && f.project_id === projectId);
    
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    res.json(file);
  } catch (error) {
    console.error('Error fetching file:', error);
    res.status(500).json({ error: error.message });
  }
});

// 更新文件
router.put('/projects/:projectId/files/:fileId', authenticate, async (req, res) => {
  try {
    const { projectId, fileId } = req.params;
    const { content, name } = req.body;
    
    const files = await readDataFile(FILES_FILE);
    const fileIndex = files.findIndex(f => f.id === fileId && f.project_id === projectId);
    
    if (fileIndex === -1) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // 更新文件
    files[fileIndex] = {
      ...files[fileIndex],
      content: content !== undefined ? content : files[fileIndex].content,
      name: name || files[fileIndex].name,
      path: name || files[fileIndex].path,
      size: content !== undefined ? Buffer.byteLength(content, 'utf8') : files[fileIndex].size,
      git_status: files[fileIndex].git_status === 'synced' ? 'modified' : files[fileIndex].git_status,
      updated_at: Date.now()
    };
    
    await writeDataFile(FILES_FILE, files);
    
    res.json(files[fileIndex]);
  } catch (error) {
    console.error('Error updating file:', error);
    res.status(500).json({ error: error.message });
  }
});

// 刪除文件
router.delete('/projects/:projectId/files/:fileId', authenticate, async (req, res) => {
  try {
    const { projectId, fileId } = req.params;
    
    const files = await readDataFile(FILES_FILE);
    const fileIndex = files.findIndex(f => f.id === fileId && f.project_id === projectId);
    
    if (fileIndex === -1) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    // 刪除文件
    files.splice(fileIndex, 1);
    await writeDataFile(FILES_FILE, files);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting file:', error);
    res.status(500).json({ error: error.message });
  }
});

// GitHub 集成相關端點
router.post('/projects/:projectId/github/connect', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { github_repo, github_branch, github_access_token } = req.body;
    
    if (!github_repo || !github_access_token) {
      return res.status(400).json({ error: 'GitHub repo and access token are required' });
    }
    
    const projects = await readDataFile(PROJECTS_FILE);
    const projectIndex = projects.findIndex(proj => proj.id === projectId);
    
    if (projectIndex === -1) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    // 更新項目的 GitHub 信息
    projects[projectIndex] = {
      ...projects[projectIndex],
      github_repo,
      github_branch: github_branch || 'main',
      github_connected_at: Date.now(),
      updated_at: Date.now()
    };
    
    await writeDataFile(PROJECTS_FILE, projects);
    
    res.json({ success: true, message: 'GitHub repository connected successfully' });
  } catch (error) {
    console.error('Error connecting GitHub repo:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/projects/:projectId/github/pull', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const projects = await readDataFile(PROJECTS_FILE);
    const project = projects.find(proj => proj.id === projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    if (!project.github_repo) {
      return res.status(400).json({ error: 'Project is not connected to a GitHub repository' });
    }
    
    // 模擬從 GitHub 拉取更改
    res.json({ success: true, message: 'Pulled changes from GitHub successfully' });
  } catch (error) {
    console.error('Error pulling from GitHub:', error);
    res.status(500).json({ error: error.message });
  }
});

router.post('/projects/:projectId/github/push', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { commit_message, files: fileIds } = req.body;
    
    if (!commit_message || !fileIds || !Array.isArray(fileIds) || fileIds.length === 0) {
      return res.status(400).json({ error: 'Commit message and files are required' });
    }
    
    const projects = await readDataFile(PROJECTS_FILE);
    const project = projects.find(proj => proj.id === projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    if (!project.github_repo) {
      return res.status(400).json({ error: 'Project is not connected to a GitHub repository' });
    }
    
    const allFiles = await readDataFile(FILES_FILE);
    const filesToPush = allFiles.filter(file => fileIds.includes(file.id) && file.project_id === projectId);
    
    if (filesToPush.length === 0) {
      return res.status(404).json({ error: 'No valid files found to push' });
    }
    
    // 更新文件狀態為已同步
    const updatedFiles = allFiles.map(file => {
      if (fileIds.includes(file.id) && file.project_id === projectId) {
        return { ...file, git_status: 'synced', updated_at: Date.now() };
      }
      return file;
    });
    
    await writeDataFile(FILES_FILE, updatedFiles);
    
    // 模擬推送到 GitHub
    res.json({ 
      success: true, 
      message: 'Changes pushed to GitHub successfully',
      commit_id: `mock-commit-${Date.now().toString(16)}`
    });
  } catch (error) {
    console.error('Error pushing to GitHub:', error);
    res.status(500).json({ error: error.message });
  }
});

router.get('/projects/:projectId/github/operations', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    
    const projects = await readDataFile(PROJECTS_FILE);
    const project = projects.find(proj => proj.id === projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    if (!project.github_repo) {
      return res.status(400).json({ error: 'Project is not connected to a GitHub repository' });
    }
    
    // 模擬 Git 操作歷史
    const operations = [
      {
        id: 'op1',
        type: 'pull',
        timestamp: Date.now() - 86400000,
        status: 'success',
        details: 'Pulled 3 files from GitHub'
      },
      {
        id: 'op2',
        type: 'push',
        timestamp: Date.now() - 43200000,
        status: 'success',
        details: 'Pushed 2 files to GitHub',
        commit_id: 'mock-commit-abc123'
      }
    ];
    
    res.json({ operations });
  } catch (error) {
    console.error('Error fetching GitHub operations:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
