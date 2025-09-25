// 功能項目: 2.1.2 建立文件索引
import { defineStore } from 'pinia';
import { fileApi } from '../utils/api';

export const useFileStore = defineStore('file', {
  state: () => ({
    files: [],
    currentFile: null,
    isLoading: false,
    error: null,
  }),
  
  getters: {
    fileTree: (state) => {
      // 功能項目: 3.1.1 顯示目錄結構
      const buildTree = (files) => {
        const root = { name: 'root', children: [], type: 'directory', path: '' };
        const directoryMap = { '': root };

        // 先創建所有目錄
        files.forEach(file => {
          const pathParts = file.path.split('/');
          let currentPath = '';
          for (let i = 0; i < pathParts.length - 1; i++) {
            const part = pathParts[i];
            const parentPath = currentPath;
            currentPath = currentPath ? `${currentPath}/${part}` : part;

            if (!directoryMap[currentPath]) {
              const newDir = {
                name: part,
                children: [],
                type: 'directory',
                path: currentPath,
              };
              directoryMap[currentPath] = newDir;
              directoryMap[parentPath].children.push(newDir);
            }
          }
        });

        // 將文件放入對應的目錄
        files.forEach(file => {
          const pathParts = file.path.split('/');
          const fileName = pathParts[pathParts.length - 1];
          const parentPath = pathParts.slice(0, -1).join('/');
          
          const fileNode = {
            name: fileName,
            type: 'file',
            path: file.path,
            content: file.content,
          };

          if (directoryMap[parentPath]) {
            directoryMap[parentPath].children.push(fileNode);
          } else {
            // 如果文件在根目錄
            root.children.push(fileNode);
          }
        });

        // 排序，讓目錄顯示在文件前面
        const sortNodes = (nodes) => {
          nodes.sort((a, b) => {
            if (a.type === 'directory' && b.type === 'file') return -1;
            if (a.type === 'file' && b.type === 'directory') return 1;
            return a.name.localeCompare(b.name);
          });
          nodes.forEach(node => {
            if (node.type === 'directory') {
              sortNodes(node.children);
            }
          });
        };

        sortNodes(root.children);

        return root.children;
      };
      
      return buildTree(state.files);
    }
  },
  
  actions: {
    // 功能項目: 2.1.1 遞迴掃描指定目錄下所有 Markdown 文件
    async fetchFiles() {
      this.isLoading = true;
      this.error = null;
      
      try {
        const files = await fileApi.getAllFiles();
        this.files = files;
      } catch (error) {
        this.error = error.message || 'Failed to fetch files';
        console.error('Error fetching files:', error);
      } finally {
        this.isLoading = false;
      }
    },
    
    // 功能項目: 2.2.1 讀取文件內容
    async fetchFileContent(path) {
      console.log('fetchFileContent called with path:', path);
      this.isLoading = true;
      this.error = null;
      
      try {
        console.log('Sending API request to get file content for path:', path);
        const response = await fileApi.getFileContent(path);
        console.log('Received response:', response);
        
        const fileIndex = this.files.findIndex(file => file.path === path);
        
        if (fileIndex !== -1) {
          this.files[fileIndex].content = response.content;
        } else {
          this.files.push({
            path,
            content: response.content
          });
        }
        
        this.currentFile = {
          path,
          content: response.content
        };
        
        console.log('File content loaded successfully for path:', path);
        return response.content;
      } catch (error) {
        this.error = error.message || 'Failed to fetch file content';
        console.error('Error fetching file content:', error);
        return null;
      } finally {
        this.isLoading = false;
      }
    },
    
    // 功能項目: 2.2.2 保存文件內容
    async saveFile(path, content) {
      this.isLoading = true;
      this.error = null;
      
      try {
        await fileApi.saveFile(path, content);
        
        const fileIndex = this.files.findIndex(file => file.path === path);
        if (fileIndex !== -1) {
          this.files[fileIndex].content = content;
        } else {
          this.files.push({
            path,
            content
          });
        }
        
        if (this.currentFile && this.currentFile.path === path) {
          this.currentFile.content = content;
        }
      } catch (error) {
        this.error = error.message || 'Failed to save file';
        console.error('Error saving file:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },
    
    // 功能項目: 2.2.3 創建新文件
    async createFile(path, content = '') {
      this.isLoading = true;
      this.error = null;
      
      try {
        await fileApi.createFile(path, content);
        
        this.files.push({
          path,
          content
        });
        
        this.currentFile = {
          path,
          content
        };
        
        await this.fetchFiles(); // 重新獲取文件列表以更新樹狀結構
      } catch (error) {
        this.error = error.message || 'Failed to create file';
        console.error('Error creating file:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },
    
    // 功能項目: 2.2.4 刪除文件
    async deleteFile(path) {
      this.isLoading = true;
      this.error = null;
      
      try {
        await fileApi.deleteFile(path);
        
        this.files = this.files.filter(file => file.path !== path);
        
        if (this.currentFile && this.currentFile.path === path) {
          this.currentFile = null;
        }
        
        await this.fetchFiles(); // 重新獲取文件列表以更新樹狀結構
      } catch (error) {
        this.error = error.message || 'Failed to delete file';
        console.error('Error deleting file:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },
    
    // 功能項目: 2.2.5 重命名文件
    async renameFile(oldPath, newPath) {
      this.isLoading = true;
      this.error = null;
      
      try {
        await fileApi.renameFile(oldPath, newPath);
        
        const fileIndex = this.files.findIndex(file => file.path === oldPath);
        if (fileIndex !== -1) {
          const content = this.files[fileIndex].content;
          this.files.splice(fileIndex, 1);
          this.files.push({
            path: newPath,
            content
          });
        }
        
        if (this.currentFile && this.currentFile.path === oldPath) {
          this.currentFile.path = newPath;
        }
        
        await this.fetchFiles(); // 重新獲取文件列表以更新樹狀結構
      } catch (error) {
        this.error = error.message || 'Failed to rename file';
        console.error('Error renaming file:', error);
        throw error;
      } finally {
        this.isLoading = false;
      }
    },
    
    // 功能項目: 2.1.3 監控文件變更
    startFileWatcher() {
      // 在實際應用中，這裡可能會使用 WebSocket 或輪詢來監控文件變更
      // 為了簡化，我們這裡使用輪詢
      setInterval(async () => {
        await this.fetchFiles();
      }, 5000); // 每5秒檢查一次
    }
  }
});
