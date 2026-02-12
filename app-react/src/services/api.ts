import axios from 'axios';
import { addNotification } from '../store/slices/notificationsSlice';
import { store } from '../store';

const API_KEY = 'demo-api-key'; // In a real app, this would be securely stored

// Determine the API base URL based on environment
let baseURL = './api'; // Default to relative path for reverse proxy support

// In production/standalone mode (when served from the unified server), use relative path
if (import.meta.env.MODE === 'production') {
  // Use relative path to match the unified server where API is at /api
  baseURL = './api';
} else {
  // In development mode, use relative path (will be proxied by Vite)
  baseURL = '/api';
}

const api = axios.create({
  baseURL: baseURL,
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    config.headers.Authorization = `Bearer ${API_KEY}`;
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors and show notifications
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Extract error message from response
    let errorMessage = 'An unexpected error occurred';
    
    if (error.response && error.response.data && error.response.data.error) {
      errorMessage = error.response.data.error;
    } else if (error.message) {
      errorMessage = error.message;
    }
    
    // Dispatch error notification
    store.dispatch(addNotification({
      type: 'error',
      message: errorMessage,
      title: 'API Error'
    }));
    
    return Promise.reject(error);
  }
);

export interface FileInfo {
  path: string;
  content?: string;
  name?: string;
  exists?: boolean;
  profileMetadata?: {
    required: boolean;
    documentName: string;
    description: string;
    hasPrompt: boolean;
    hasCommand: boolean;
  };
}

export const fileApi = {
  // 獲取所有文件
  getAllFiles: async (): Promise<FileInfo[]> => {
    try {
      const response = await api.get('/files');
      // 確保返回的數據是陣列，如果不是則返回空陣列
      if (Array.isArray(response.data)) {
        return response.data;
      } else {
        console.warn('API response is not an array:', response.data);
        return [];
      }
    } catch (error) {
      console.error('Error fetching files:', error);
      throw error;
    }
  },
  
  // 刷新文件緩存
  refreshFileCache: async (): Promise<{success: boolean, fileCount: number}> => {
    try {
      const response = await api.post('/files/refresh');
      return response.data;
    } catch (error) {
      console.error('Error refreshing file cache:', error);
      throw error;
    }
  },

  // 獲取文件內容
  getFileContent: async (path: string): Promise<{ path: string; content: string }> => {
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

  // 保存文件內容
  saveFile: async (path: string, content: string): Promise<any> => {
    try {
      const response = await api.post(`/files/${encodeURIComponent(path)}`, { content });
      return response.data;
    } catch (error) {
      console.error(`Error saving file content for ${path}:`, error);
      throw error;
    }
  },

  // 創建新文件
  createFile: async (path: string, content: string = ''): Promise<any> => {
    try {
      const response = await api.put(`/files/${encodeURIComponent(path)}`, { content });
      return response.data;
    } catch (error) {
      console.error(`Error creating file ${path}:`, error);
      throw error;
    }
  },

  // 刪除文件
  deleteFile: async (path: string): Promise<any> => {
    try {
      const response = await api.delete(`/files/${encodeURIComponent(path)}`);
      return response.data;
    } catch (error) {
      console.error(`Error deleting file ${path}:`, error);
      throw error;
    }
  },

  // 重命名文件
  renameFile: async (oldPath: string, newPath: string): Promise<any> => {
    try {
      const response = await api.patch(`/files/${encodeURIComponent(oldPath)}`, { newPath });
      return response.data;
    } catch (error) {
      console.error(`Error renaming file from ${oldPath} to ${newPath}:`, error);
      throw error;
    }
  }
};

// Context sync API
export const contextApi = {
  // Get context configuration
  getConfig: async (): Promise<any> => {
    const response = await api.get('/context-config');
    return response.data;
  },

  // Sync file to context
  syncFile: async (path: string): Promise<any> => {
    const response = await api.post(`/files/${encodeURIComponent(path)}/sync-to-context`);
    return response.data;
  },

  // Unsync file from context
  unsyncFile: async (path: string): Promise<any> => {
    const response = await api.delete(`/files/${encodeURIComponent(path)}/sync-to-context`);
    return response.data;
  },

  // Get sync status
  getSyncStatus: async (path: string): Promise<any> => {
    const response = await api.get(`/files/${encodeURIComponent(path)}/sync-status`);
    return response.data;
  },
};

// Profile API
import type {
  ProfileResponse,
  PromptContentResponse,
  GenerationResponse,
  ProfileValidation,
} from '../types/profile';

/**
 * Fetch profile configuration
 */
export const fetchProfile = async (): Promise<ProfileResponse> => {
  const response = await api.get('/profile');
  return response.data;
};

/**
 * Fetch required files from profile
 */
export const fetchProfileFiles = async (): Promise<any> => {
  const response = await api.get('/profile/files');
  return response.data;
};

/**
 * Fetch prompt file content
 */
export const fetchPromptContent = async (filePath: string): Promise<PromptContentResponse> => {
  const response = await api.get(`/profile/prompt/${encodeURIComponent(filePath)}`);
  return response.data;
};

/**
 * Generate file using profile command
 */
export const generateFile = async (filePath: string): Promise<GenerationResponse> => {
  const response = await api.post(`/profile/generate/${encodeURIComponent(filePath)}`);
  return response.data;
};

/**
 * Validate profile configuration
 */
export const validateProfile = async (): Promise<ProfileValidation> => {
  const response = await api.get('/profile/validate');
  return response.data;
};

// Graph API
import type { Graph, GraphEdge } from '../store/slices/graphSlice';

export interface LinkInfo {
  filePath: string;
  outgoing: GraphEdge[];
  incoming: GraphEdge[];
  total: number;
}

export interface GraphValidation {
  valid: boolean;
  errors: Array<{
    message: string;
    code?: string;
    details?: any;
  }>;
  warnings: Array<{
    message: string;
    code?: string;
    details?: any;
  }>;
}

export const graphApi = {
  /**
   * Get full link graph
   */
  getGraph: async (): Promise<Graph> => {
    const response = await api.get('/graph');
    return response.data;
  },

  /**
   * Get links for specific file
   */
  getFileLinks: async (filePath: string): Promise<LinkInfo> => {
    const response = await api.get(`/graph/${encodeURIComponent(filePath)}`);
    return response.data;
  },

  /**
   * Add a link between files
   */
  addLink: async (from: string, to: string, type?: string, relationType?: string): Promise<{ success: boolean; edge: GraphEdge }> => {
    const response = await api.post('/graph/add', {
      from,
      to,
      type: type || 'wikilink',
      relationType
    });
    return response.data;
  },

  /**
   * Remove a link between files
   */
  removeLink: async (from: string, to: string, relationType?: string): Promise<{ success: boolean; removed: boolean }> => {
    const url = `/graph/${encodeURIComponent(from)}/${encodeURIComponent(to)}`;
    const params = relationType ? { relationType } : {};
    const response = await api.delete(url, { params });
    return response.data;
  },

  /**
   * Rebuild graph cache
   */
  rebuildGraph: async (): Promise<{ success: boolean; message: string }> => {
    const response = await api.post('/graph/rebuild');
    return response.data;
  },

  /**
   * Validate graph integrity
   */
  validateGraph: async (): Promise<GraphValidation> => {
    const response = await api.get('/graph/validate');
    return response.data;
  },

  /**
   * Export graph data
   */
  exportGraph: async (format: string = 'json'): Promise<Blob> => {
    const response = await api.get('/graph/export', {
      params: { format },
      responseType: 'blob'
    });
    return response.data;
  }
};
