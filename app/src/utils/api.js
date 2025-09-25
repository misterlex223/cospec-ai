// 功能項目: 2.2.1 讀取文件內容
import axios from 'axios';

// 設定 API 基礎 URL
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// 創建 axios 實例
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 功能項目: 4.2.3 網絡錯誤處理
// 請求攔截器
api.interceptors.request.use(
  config => {
    // 可以在這裡添加認證令牌等
    return config;
  },
  error => {
    console.error('Request error:', error);
    return Promise.reject(error);
  }
);

// 響應攔截器
api.interceptors.response.use(
  response => {
    return response;
  },
  error => {
    // 功能項目: 4.2.1 文件讀寫錯誤處理
    console.error('Response error:', error);
    
    // 處理特定錯誤
    if (error.response) {
      // 服務器回應錯誤
      switch (error.response.status) {
        case 404:
          console.error('Resource not found');
          break;
        case 403:
          console.error('Permission denied');
          break;
        case 500:
          console.error('Server error');
          break;
        default:
          console.error(`Error: ${error.response.status}`);
      }
    } else if (error.request) {
      // 請求發送但沒有收到回應
      console.error('No response received from server');
    } else {
      // 請求設置出錯
      console.error('Request configuration error');
    }
    
    return Promise.reject(error);
  }
);

// API 方法
export const fileApi = {
  // 功能項目: 2.1.1 遞迴掃描指定目錄下所有 Markdown 文件
  getAllFiles: async () => {
    try {
      const response = await api.get('/files');
      return response.data;
    } catch (error) {
      console.error('Error fetching files:', error);
      throw error;
    }
  },
  
  // 功能項目: 2.2.1 讀取文件內容
  getFileContent: async (path) => {
    try {
      console.log('API: getFileContent called with path:', path);
      const encodedPath = encodeURIComponent(path);
      console.log('API: Encoded path:', encodedPath);
      const url = `/files/${encodedPath}`;
      console.log('API: Full request URL:', url);
      
      const response = await api.get(url);
      console.log('API: Response received:', response);
      return response.data;
    } catch (error) {
      console.error(`API: Error fetching file content for ${path}:`, error);
      throw error;
    }
  },
  
  // 功能項目: 2.2.2 保存文件內容
  saveFile: async (path, content) => {
    try {
      const response = await api.post(`/files/${encodeURIComponent(path)}`, { content });
      return response.data;
    } catch (error) {
      console.error(`Error saving file ${path}:`, error);
      throw error;
    }
  },
  
  // 功能項目: 2.2.3 創建新文件
  createFile: async (path, content = '') => {
    try {
      const response = await api.put(`/files/${encodeURIComponent(path)}`, { content });
      return response.data;
    } catch (error) {
      console.error(`Error creating file ${path}:`, error);
      throw error;
    }
  },
  
  // 功能項目: 2.2.4 刪除文件
  deleteFile: async (path) => {
    try {
      const response = await api.delete(`/files/${encodeURIComponent(path)}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting file ${path}:`, error);
      throw error;
    }
  },
  
  // 功能項目: 2.2.5 重命名文件
  renameFile: async (oldPath, newPath) => {
    try {
      const response = await api.patch(`/files/${encodeURIComponent(oldPath)}`, { newPath });
      return response.data;
    } catch (error) {
      console.error(`Error renaming file from ${oldPath} to ${newPath}:`, error);
      throw error;
    }
  }
};

export default api;
