import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
});

export interface FileInfo {
  path: string;
  content?: string;
}

export const fileApi = {
  // 獲取所有文件
  getAllFiles: async (): Promise<FileInfo[]> => {
    try {
      const response = await api.get('/files');
      return response.data;
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
