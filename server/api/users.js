// API 處理程序：用戶認證和管理
const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');
const crypto = require('crypto');

const router = express.Router();

// 數據存儲路徑
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '../data');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const ORGANIZATIONS_FILE = path.join(DATA_DIR, 'organizations.json');

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

// 初始化用戶數據文件
async function initializeUsersFile() {
  await ensureDataDir();
  
  // 檢查並初始化用戶文件
  try {
    await fs.access(USERS_FILE);
  } catch (error) {
    await writeDataFile(USERS_FILE, []);
    console.log('Created users data file');
  }
}

// 初始化用戶數據文件
initializeUsersFile();

// 密碼加密函數
function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const hash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return { hash, salt };
}

// 密碼驗證函數
function verifyPassword(password, hash, salt) {
  const verifyHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha512').toString('hex');
  return hash === verifyHash;
}

// 創建個人組織
async function createPersonalOrganization(userId, username) {
  const organizations = await readDataFile(ORGANIZATIONS_FILE, []);
  
  const personalOrg = {
    id: uuidv4(),
    name: "Personal Space",
    slug: `${username.toLowerCase()}-personal`,
    settings: {
      isPersonal: true,
      owner: userId
    },
    role: 'owner',
    created_at: Date.now(),
    updated_at: Date.now()
  };
  
  organizations.push(personalOrg);
  await writeDataFile(ORGANIZATIONS_FILE, organizations);
  
  return personalOrg;
}

// 註冊新用戶
router.post('/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'Username, email, and password are required' });
    }
    
    const users = await readDataFile(USERS_FILE);
    
    // 檢查用戶名或電子郵件是否已存在
    if (users.some(user => user.username === username || user.email === email)) {
      return res.status(409).json({ error: 'Username or email already exists' });
    }
    
    // 加密密碼
    const { hash, salt } = hashPassword(password);
    
    // 創建新用戶
    const newUser = {
      id: uuidv4(),
      username,
      email,
      password_hash: hash,
      password_salt: salt,
      created_at: Date.now(),
      updated_at: Date.now()
    };
    
    users.push(newUser);
    await writeDataFile(USERS_FILE, users);
    
    // 為新用戶創建個人組織
    const personalOrg = await createPersonalOrganization(newUser.id, username);
    
    // 返回用戶信息（不包含密碼相關字段）
    const { password_hash, password_salt, ...userInfo } = newUser;
    
    res.status(201).json({
      user: userInfo,
      personalOrganization: personalOrg,
      token: generateToken(newUser.id)
    });
  } catch (error) {
    console.error('Error registering user:', error);
    res.status(500).json({ error: error.message });
  }
});

// 用戶登入
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }
    
    const users = await readDataFile(USERS_FILE);
    
    // 查找用戶
    const user = users.find(user => user.email === email);
    
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // 驗證密碼
    if (!verifyPassword(password, user.password_hash, user.password_salt)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }
    
    // 查找用戶的個人組織
    const organizations = await readDataFile(ORGANIZATIONS_FILE);
    const personalOrg = organizations.find(org => 
      org.settings && org.settings.isPersonal && org.settings.owner === user.id
    );
    
    // 返回用戶信息（不包含密碼相關字段）
    const { password_hash, password_salt, ...userInfo } = user;
    
    res.json({
      user: userInfo,
      personalOrganization: personalOrg,
      token: generateToken(user.id)
    });
  } catch (error) {
    console.error('Error logging in:', error);
    res.status(500).json({ error: error.message });
  }
});

// 生成JWT令牌
function generateToken(userId) {
  // 簡單實現，實際應使用JWT庫
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + (60 * 60 * 24) // 24小時過期
  };
  
  const headerBase64 = Buffer.from(JSON.stringify(header)).toString('base64').replace(/=/g, '');
  const payloadBase64 = Buffer.from(JSON.stringify(payload)).toString('base64').replace(/=/g, '');
  
  // 使用簡單的密鑰，實際應使用環境變量存儲
  const secret = 'vditor-secret-key';
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${headerBase64}.${payloadBase64}`)
    .digest('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
  
  return `${headerBase64}.${payloadBase64}.${signature}`;
}

// 驗證JWT令牌
function verifyToken(token) {
  try {
    const [headerBase64, payloadBase64, signature] = token.split('.');
    
    // 使用相同的密鑰
    const secret = 'vditor-secret-key';
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(`${headerBase64}.${payloadBase64}`)
      .digest('base64')
      .replace(/=/g, '')
      .replace(/\+/g, '-')
      .replace(/\//g, '_');
    
    if (signature !== expectedSignature) {
      return null;
    }
    
    const payload = JSON.parse(Buffer.from(payloadBase64, 'base64').toString());
    
    // 檢查令牌是否過期
    if (payload.exp < Math.floor(Date.now() / 1000)) {
      return null;
    }
    
    return payload;
  } catch (error) {
    return null;
  }
}

// 驗證用戶身份的中間件
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  
  const token = authHeader.split(' ')[1];
  const payload = verifyToken(token);
  
  if (!payload) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  
  req.userId = payload.sub;
  next();
}

// 獲取當前用戶信息
router.get('/me', authenticate, async (req, res) => {
  try {
    const users = await readDataFile(USERS_FILE);
    const user = users.find(user => user.id === req.userId);
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // 查找用戶的個人組織
    const organizations = await readDataFile(ORGANIZATIONS_FILE);
    const personalOrg = organizations.find(org => 
      org.settings && org.settings.isPersonal && org.settings.owner === user.id
    );
    
    // 返回用戶信息（不包含密碼相關字段）
    const { password_hash, password_salt, ...userInfo } = user;
    
    res.json({
      user: userInfo,
      personalOrganization: personalOrg
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: error.message });
  }
});

// 更新用戶信息
router.put('/me', authenticate, async (req, res) => {
  try {
    const { username, email, currentPassword, newPassword } = req.body;
    
    const users = await readDataFile(USERS_FILE);
    const userIndex = users.findIndex(user => user.id === req.userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = users[userIndex];
    
    // 如果要更改密碼，需要驗證當前密碼
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ error: 'Current password is required to set new password' });
      }
      
      if (!verifyPassword(currentPassword, user.password_hash, user.password_salt)) {
        return res.status(401).json({ error: 'Current password is incorrect' });
      }
      
      // 更新密碼
      const { hash, salt } = hashPassword(newPassword);
      user.password_hash = hash;
      user.password_salt = salt;
    }
    
    // 更新其他用戶信息
    if (username) user.username = username;
    if (email) user.email = email;
    
    user.updated_at = Date.now();
    
    await writeDataFile(USERS_FILE, users);
    
    // 返回更新後的用戶信息（不包含密碼相關字段）
    const { password_hash, password_salt, ...userInfo } = user;
    
    res.json({ user: userInfo });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: error.message });
  }
});

// 獲取用戶的組織
router.get('/me/organizations', authenticate, async (req, res) => {
  try {
    const organizations = await readDataFile(ORGANIZATIONS_FILE);
    
    // 查找用戶擁有的或有權限的組織
    const userOrgs = organizations.filter(org => 
      (org.settings && org.settings.owner === req.userId) || 
      (org.members && org.members.some(member => member.id === req.userId))
    );
    
    res.json({ organizations: userOrgs });
  } catch (error) {
    console.error('Error fetching user organizations:', error);
    res.status(500).json({ error: error.message });
  }
});

module.exports = {
  router,
  authenticate
};
