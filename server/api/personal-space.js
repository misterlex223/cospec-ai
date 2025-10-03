// API 處理程序：個人空間和目錄管理
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
const DIRECTORIES_FILE = path.join(DATA_DIR, 'directories.json');
const DIRECTORY_INFO_FILE = path.join(DATA_DIR, 'directory_info.json');

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

// 確保數據文件存在
async function ensureDataFiles() {
  try {
    // 檢查並初始化目錄數據文件
    try {
      await fs.access(DIRECTORIES_FILE);
    } catch (error) {
      await writeDataFile(DIRECTORIES_FILE, []);
      console.log('Created directories data file');
    }
    
    // 檢查並初始化目錄信息數據文件
    try {
      await fs.access(DIRECTORY_INFO_FILE);
    } catch (error) {
      await writeDataFile(DIRECTORY_INFO_FILE, {});
      console.log('Created directory info data file');
    }
  } catch (error) {
    console.error('Error initializing data files:', error);
  }
}

// 初始化數據文件
ensureDataFiles();

// 獲取用戶的個人空間項目
router.get('/personal-space/projects', authenticate, async (req, res) => {
  try {
    const organizations = await readDataFile(ORGANIZATIONS_FILE);
    const projects = await readDataFile(PROJECTS_FILE);
    
    // 查找用戶的個人組織
    const personalOrg = organizations.find(org => 
      org.settings && org.settings.isPersonal && org.settings.owner === req.userId
    );
    
    if (!personalOrg) {
      return res.status(404).json({ error: 'Personal space not found' });
    }
    
    // 查找個人組織的項目
    const personalProjects = projects.filter(project => project.organization_id === personalOrg.id);
    
    res.json({ projects: personalProjects });
  } catch (error) {
    console.error('Error fetching personal projects:', error);
    res.status(500).json({ error: error.message });
  }
});

// 在個人空間中創建新項目
router.post('/personal-space/projects', authenticate, async (req, res) => {
  try {
    const { name, settings = {} } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Project name is required' });
    }
    
    const organizations = await readDataFile(ORGANIZATIONS_FILE);
    
    // 查找用戶的個人組織
    const personalOrg = organizations.find(org => 
      org.settings && org.settings.isPersonal && org.settings.owner === req.userId
    );
    
    if (!personalOrg) {
      return res.status(404).json({ error: 'Personal space not found' });
    }
    
    const projects = await readDataFile(PROJECTS_FILE);
    
    // 創建新項目
    const newProject = {
      id: uuidv4(),
      name,
      slug: name.toLowerCase().replace(/\s+/g, '-'),
      organization_id: personalOrg.id,
      organization_name: personalOrg.name,
      settings,
      role: 'owner',
      created_at: Date.now(),
      updated_at: Date.now()
    };
    
    projects.push(newProject);
    await writeDataFile(PROJECTS_FILE, projects);
    
    res.status(201).json(newProject);
  } catch (error) {
    console.error('Error creating project in personal space:', error);
    res.status(500).json({ error: error.message });
  }
});

// 獲取項目的文件和目錄
router.get('/projects/:projectId/files', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { path: dirPath = '' } = req.query;
    
    const files = await readDataFile(FILES_FILE);
    const directories = await readDataFile(DIRECTORIES_FILE);
    
    // 查找指定路徑下的文件
    const projectFiles = files.filter(file => 
      file.project_id === projectId && 
      file.path === dirPath
    ).map(file => ({
      ...file,
      is_directory: false
    }));
    
    // 查找指定路徑下的目錄
    const projectDirs = directories.filter(dir => 
      dir.project_id === projectId && 
      dir.parent_path === dirPath
    ).map(dir => ({
      id: dir.id,
      name: dir.name,
      path: dir.path,
      is_directory: true,
      created_at: dir.created_at,
      updated_at: dir.updated_at,
      project_id: dir.project_id,
      size: 0 // 目錄大小暫時設為 0
    }));
    
    // 獲取目錄顯示名稱
    const directoryInfo = await readDataFile(DIRECTORY_INFO_FILE, {});
    const projectDirInfo = directoryInfo[projectId] || {};
    
    // 合併文件和目錄，並添加顯示名稱
    const allItems = [...projectFiles, ...projectDirs].map(item => {
      const displayInfo = projectDirInfo[`${dirPath}/${item.name}`] || {};
      return {
        ...item,
        display_name: displayInfo.display_name || null
      };
    });
    
    res.json({ files: allItems });
  } catch (error) {
    console.error('Error fetching files and directories:', error);
    res.status(500).json({ error: error.message });
  }
});

// 創建新目錄
router.post('/projects/:projectId/directories', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, path: parentPath = '' } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'Directory name is required' });
    }
    
    const projects = await readDataFile(PROJECTS_FILE);
    const project = projects.find(proj => proj.id === projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const directories = await readDataFile(DIRECTORIES_FILE);
    
    // 檢查目錄是否已存在
    const dirExists = directories.some(dir => 
      dir.project_id === projectId && 
      dir.parent_path === parentPath && 
      dir.name === name
    );
    
    if (dirExists) {
      return res.status(409).json({ error: 'Directory already exists' });
    }
    
    // 創建新目錄
    const newDir = {
      id: uuidv4(),
      name,
      parent_path: parentPath,
      path: parentPath ? `${parentPath}/${name}` : name,
      project_id: projectId,
      created_at: Date.now(),
      updated_at: Date.now()
    };
    
    directories.push(newDir);
    await writeDataFile(DIRECTORIES_FILE, directories);
    
    res.status(201).json(newDir);
  } catch (error) {
    console.error('Error creating directory:', error);
    res.status(500).json({ error: error.message });
  }
});

// 獲取目錄信息
router.get('/projects/:projectId/directory-info', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { path: dirPath = '' } = req.query;
    
    const directoryInfo = await readDataFile(DIRECTORY_INFO_FILE, {});
    const projectDirInfo = directoryInfo[projectId] || {};
    
    // 獲取指定目錄的信息
    const info = {};
    Object.keys(projectDirInfo).forEach(key => {
      if (key.startsWith(dirPath)) {
        const relativePath = key.substring(dirPath.length);
        if (relativePath.startsWith('/') && !relativePath.substring(1).includes('/')) {
          const dirName = relativePath.substring(1);
          info[dirName] = projectDirInfo[key].display_name || '';
        }
      }
    });
    
    res.json({ info });
  } catch (error) {
    console.error('Error fetching directory info:', error);
    res.status(500).json({ error: error.message });
  }
});

// 保存目錄信息
router.post('/projects/:projectId/directory-info', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { path: dirPath = '', info } = req.body;
    
    if (!info || typeof info !== 'object') {
      return res.status(400).json({ error: 'Directory info is required' });
    }
    
    const directoryInfo = await readDataFile(DIRECTORY_INFO_FILE, {});
    
    // 初始化項目目錄信息
    if (!directoryInfo[projectId]) {
      directoryInfo[projectId] = {};
    }
    
    // 更新目錄信息
    Object.keys(info).forEach(dirName => {
      const fullPath = dirPath ? `${dirPath}/${dirName}` : dirName;
      directoryInfo[projectId][fullPath] = {
        display_name: info[dirName]
      };
    });
    
    await writeDataFile(DIRECTORY_INFO_FILE, directoryInfo);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error saving directory info:', error);
    res.status(500).json({ error: error.message });
  }
});

// 更新文件 API 以支持目錄路徑
router.post('/projects/:projectId/files', authenticate, async (req, res) => {
  try {
    const { projectId } = req.params;
    const { name, content = '', path: dirPath = '' } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'File name is required' });
    }
    
    const projects = await readDataFile(PROJECTS_FILE);
    const project = projects.find(proj => proj.id === projectId);
    
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    
    const files = await readDataFile(FILES_FILE);
    
    // 檢查文件是否已存在
    const fileExists = files.some(file => 
      file.project_id === projectId && 
      file.path === dirPath && 
      file.name === name
    );
    
    if (fileExists) {
      return res.status(409).json({ error: 'File already exists' });
    }
    
    // 創建新文件
    const newFile = {
      id: uuidv4(),
      name,
      path: dirPath,
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

// 移動文件到不同目錄
router.patch('/projects/:projectId/files/:fileId/move', authenticate, async (req, res) => {
  try {
    const { projectId, fileId } = req.params;
    const { targetPath } = req.body;
    
    if (targetPath === undefined) {
      return res.status(400).json({ error: 'Target path is required' });
    }
    
    const files = await readDataFile(FILES_FILE);
    
    // 查找文件
    const fileIndex = files.findIndex(file => file.id === fileId && file.project_id === projectId);
    if (fileIndex === -1) {
      return res.status(404).json({ error: 'File not found' });
    }
    
    const file = files[fileIndex];
    const oldPath = file.path;
    
    // 檢查目標路徑中是否已有同名文件
    const fileExists = files.some(f => 
      f.project_id === projectId && 
      f.path === targetPath && 
      f.name === file.name && 
      f.id !== fileId
    );
    
    if (fileExists) {
      return res.status(409).json({ error: 'A file with the same name already exists in the target directory' });
    }
    
    // 更新文件路徑
    files[fileIndex].path = targetPath;
    files[fileIndex].updated_at = Date.now();
    
    await writeDataFile(FILES_FILE, files);
    
    res.json({
      success: true,
      file: files[fileIndex],
      oldPath,
      newPath: targetPath
    });
  } catch (error) {
    console.error('Error moving file:', error);
    res.status(500).json({ error: error.message });
  }
});

// 重命名目錄
router.patch('/projects/:projectId/directories/:dirId', authenticate, async (req, res) => {
  try {
    const { projectId, dirId } = req.params;
    const { name } = req.body;
    
    if (!name) {
      return res.status(400).json({ error: 'New directory name is required' });
    }
    
    const directories = await readDataFile(DIRECTORIES_FILE);
    const files = await readDataFile(FILES_FILE);
    
    // 查找目錄
    const dirIndex = directories.findIndex(dir => dir.id === dirId && dir.project_id === projectId);
    if (dirIndex === -1) {
      return res.status(404).json({ error: 'Directory not found' });
    }
    
    const directory = directories[dirIndex];
    const oldPath = directory.path;
    const parentPath = directory.parent_path;
    
    // 檢查同一父目錄下是否已有同名目錄
    const dirExists = directories.some(d => 
      d.project_id === projectId && 
      d.parent_path === parentPath && 
      d.name === name && 
      d.id !== dirId
    );
    
    if (dirExists) {
      return res.status(409).json({ error: 'A directory with the same name already exists' });
    }
    
    // 計算新路徑
    const newPath = parentPath ? `${parentPath}/${name}` : name;
    
    // 更新目錄本身
    directories[dirIndex].name = name;
    directories[dirIndex].path = newPath;
    directories[dirIndex].updated_at = Date.now();
    
    // 更新所有子目錄和文件的路徑
    // 1. 更新子目錄
    for (let i = 0; i < directories.length; i++) {
      const dir = directories[i];
      if (dir.project_id === projectId && dir.path.startsWith(oldPath + '/')) {
        // 替換路徑前綴
        directories[i].path = newPath + dir.path.substring(oldPath.length);
        
        // 更新父路徑
        if (dir.parent_path === oldPath) {
          directories[i].parent_path = newPath;
        } else if (dir.parent_path.startsWith(oldPath + '/')) {
          directories[i].parent_path = newPath + dir.parent_path.substring(oldPath.length);
        }
        
        directories[i].updated_at = Date.now();
      }
    }
    
    // 2. 更新文件
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      if (file.project_id === projectId) {
        if (file.path === oldPath) {
          files[i].path = newPath;
          files[i].updated_at = Date.now();
        } else if (file.path.startsWith(oldPath + '/')) {
          files[i].path = newPath + file.path.substring(oldPath.length);
          files[i].updated_at = Date.now();
        }
      }
    }
    
    // 更新目錄信息
    const directoryInfo = await readDataFile(DIRECTORY_INFO_FILE, {});
    if (directoryInfo[projectId]) {
      const updatedInfo = {};
      
      // 複製並更新目錄信息
      Object.keys(directoryInfo[projectId]).forEach(key => {
        if (key === oldPath) {
          updatedInfo[newPath] = directoryInfo[projectId][key];
        } else if (key.startsWith(oldPath + '/')) {
          const newKey = newPath + key.substring(oldPath.length);
          updatedInfo[newKey] = directoryInfo[projectId][key];
        } else {
          updatedInfo[key] = directoryInfo[projectId][key];
        }
      });
      
      directoryInfo[projectId] = updatedInfo;
    }
    
    // 保存所有更改
    await Promise.all([
      writeDataFile(DIRECTORIES_FILE, directories),
      writeDataFile(FILES_FILE, files),
      writeDataFile(DIRECTORY_INFO_FILE, directoryInfo)
    ]);
    
    res.json({
      success: true,
      directory: directories[dirIndex],
      oldPath,
      newPath
    });
  } catch (error) {
    console.error('Error renaming directory:', error);
    res.status(500).json({ error: error.message });
  }
});

// 刪除目錄
router.delete('/projects/:projectId/directories/:dirId', authenticate, async (req, res) => {
  try {
    const { projectId, dirId } = req.params;
    const { recursive = false } = req.query;
    
    const directories = await readDataFile(DIRECTORIES_FILE);
    const files = await readDataFile(FILES_FILE);
    
    // 查找目錄
    const dirIndex = directories.findIndex(dir => dir.id === dirId && dir.project_id === projectId);
    if (dirIndex === -1) {
      return res.status(404).json({ error: 'Directory not found' });
    }
    
    const directory = directories[dirIndex];
    const dirPath = directory.path;
    
    // 檢查是否有子目錄或文件
    const hasSubdirectories = directories.some(dir => 
      dir.project_id === projectId && 
      (dir.parent_path === dirPath || dir.path.startsWith(dirPath + '/'))
    );
    
    const hasFiles = files.some(file => 
      file.project_id === projectId && 
      (file.path === dirPath || file.path.startsWith(dirPath + '/'))
    );
    
    // 如果有子項目但不允許遞歸刪除，則返回錯誤
    if ((hasSubdirectories || hasFiles) && !recursive) {
      return res.status(409).json({ 
        error: 'Directory is not empty. Use recursive=true to delete all contents',
        hasSubdirectories,
        hasFiles
      });
    }
    
    // 如果允許遞歸刪除，刪除所有子目錄和文件
    if (recursive) {
      // 1. 刪除子目錄
      const newDirectories = directories.filter(dir => {
        return !(dir.project_id === projectId && 
                (dir.id === dirId || dir.path.startsWith(dirPath + '/') || dir.parent_path === dirPath));
      });
      
      // 2. 刪除文件
      const newFiles = files.filter(file => {
        return !(file.project_id === projectId && 
                (file.path === dirPath || file.path.startsWith(dirPath + '/')));
      });
      
      // 3. 更新目錄信息
      const directoryInfo = await readDataFile(DIRECTORY_INFO_FILE, {});
      if (directoryInfo[projectId]) {
        const updatedInfo = {};
        
        Object.keys(directoryInfo[projectId]).forEach(key => {
          if (key !== dirPath && !key.startsWith(dirPath + '/')) {
            updatedInfo[key] = directoryInfo[projectId][key];
          }
        });
        
        directoryInfo[projectId] = updatedInfo;
      }
      
      // 保存所有更改
      await Promise.all([
        writeDataFile(DIRECTORIES_FILE, newDirectories),
        writeDataFile(FILES_FILE, newFiles),
        writeDataFile(DIRECTORY_INFO_FILE, directoryInfo)
      ]);
      
      return res.json({
        success: true,
        message: 'Directory and all contents deleted successfully'
      });
    }
    
    // 如果沒有子項目，直接刪除目錄
    const newDirectories = directories.filter(dir => !(dir.id === dirId && dir.project_id === projectId));
    await writeDataFile(DIRECTORIES_FILE, newDirectories);
    
    // 更新目錄信息
    const directoryInfo = await readDataFile(DIRECTORY_INFO_FILE, {});
    if (directoryInfo[projectId] && directoryInfo[projectId][dirPath]) {
      delete directoryInfo[projectId][dirPath];
      await writeDataFile(DIRECTORY_INFO_FILE, directoryInfo);
    }
    
    res.json({
      success: true,
      message: 'Directory deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting directory:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
