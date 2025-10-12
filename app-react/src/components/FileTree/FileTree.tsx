import React, { useEffect, memo, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setFileList, setLoading, refreshFileList } from '../../store/slices/filesSlice';
import { togglePathExpanded, expandPath } from '../../store/slices/uiSlice';
import { addNotification } from '../../store/slices/notificationsSlice';
import { fileApi, type FileInfo } from '../../services/api';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { webSocketService, connectWebSocket } from '../../services/websocket';
import type { RootState } from '../../store';

interface TreeNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  children?: TreeNode[];
}

interface FileTreeProps {
  className?: string;
}

/**
 * 文件樹組件
 * @see /docs/solved_issues.md#21-文件樹展開狀態保持
 * @see /docs/solved_issues.md#22-文件樹展開閃爍問題
 * @see /docs/requirements.md#31-側邊欄目錄樹
 */
function FileTreeComponent({ className }: FileTreeProps) {
  const dispatch = useDispatch();
  const files = useSelector((state: RootState) => state.files.fileList);
  const loading = useSelector((state: RootState) => state.files.loading);
  const error = useSelector((state: RootState) => state.files.error);
  const refreshCounter = useSelector((state: RootState) => state.files.refreshCounter);
  const expandedPathsSet = useSelector((state: RootState) => new Set(state.ui.expandedPaths));
  const [treeData, setTreeData] = React.useState<TreeNode[]>([]);
  const navigate = useNavigate();
  /**
   * 從 URL 中獲取當前文件路徑
   * @see /docs/solved_issues.md#21-文件樹展開狀態保持
   */
  // 從 URL 獲取目前路徑，不需要 decodeURIComponent
  const currentPath = window.location.pathname.startsWith('/edit/') 
    ? window.location.pathname.substring(6) 
    : null;

  // 添加一個狀態追蹤上次更新的時間
  const [lastUpdateTime, setLastUpdateTime] = useState(0);
  
  // 將抓取文件列表的邏輯提取為一個函數
  const fetchFiles = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) {
        dispatch(setLoading(true));
      }
      
      const fileList = await fileApi.getAllFiles();
      
      // 比較文件列表是否有變化，只有變化時才更新
      const hasChanged = JSON.stringify(fileList) !== JSON.stringify(files);
      if (hasChanged) {
        dispatch(setFileList(fileList));
        setLastUpdateTime(Date.now());
      }
      
      dispatch(setLoading(false));
    } catch (err) {
      dispatch(addNotification({
        type: 'error',
        message: 'Failed to fetch files',
        title: 'Load Error'
      }));
      dispatch(setLoading(false));
      console.error('Error fetching files:', err);
    }
  }, [dispatch, files]);

  // 手動刷新文件列表
  const refreshFiles = useCallback(async () => {
    try {
      dispatch(setLoading(true));
      // 使用新增的緩存刷新端點
      await fileApi.refreshFileCache();
      await fetchFiles(false);
    } catch (err) {
      console.error('Error refreshing files:', err);
      dispatch(addNotification({
        type: 'error',
        message: 'Failed to refresh files',
        title: 'Refresh Error'
      }));
      dispatch(setLoading(false));
    }
  }, [dispatch, fetchFiles]);

  // 初始加載和刷新計數器變化時加載文件
  useEffect(() => {
    fetchFiles(files.length === 0);
  }, [refreshCounter, fetchFiles, files.length]);

  // 使用 WebSocket 進行即時更新
  useEffect(() => {
    // 連接 WebSocket
    connectWebSocket();
    
    // 監聽文件更新事件
    const handleFileAdded = (data: any) => {
      console.log('File added via WebSocket:', data);
      fetchFiles(false);
    };
    
    const handleFileChanged = (data: any) => {
      console.log('File changed via WebSocket:', data);
      // 文件內容變更不需要重新加載文件列表
    };
    
    const handleFileDeleted = (data: any) => {
      console.log('File deleted via WebSocket:', data);
      fetchFiles(false);
    };
    
    // 註冊事件監聽器
    webSocketService.addEventListener('FILE_ADDED', handleFileAdded);
    webSocketService.addEventListener('FILE_CHANGED', handleFileChanged);
    webSocketService.addEventListener('FILE_DELETED', handleFileDeleted);
    
    // 監聽連接狀態
    const handleConnection = (data: any) => {
      if (data.status === 'connected') {
        console.log('WebSocket connected, fetching files...');
        fetchFiles(false);
      }
    };
    
    webSocketService.addEventListener('connection', handleConnection);
    
    // 作為備用，仍然保留一個輪詢機制，但間隔更長
    const pollInterval = 60000; // 60 秒
    
    const interval = setInterval(() => {
      // 如果 WebSocket 連接正常，則不需要輪詢
      if (webSocketService.isConnected()) {
        return;
      }
      
      // 檢查距離上次更新的時間
      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateTime;
      
      // 如果距離上次更新不足 5 秒，則跳過此次輪詢
      if (lastUpdateTime > 0 && timeSinceLastUpdate < 5000) {
        console.log('Skipping poll, last update was too recent');
        return;
      }
      
      console.log('WebSocket not connected, using polling as fallback');
      fetchFiles(false);
    }, pollInterval);
    
    // 清理函數
    return () => {
      clearInterval(interval);
      webSocketService.removeEventListener('FILE_ADDED', handleFileAdded);
      webSocketService.removeEventListener('FILE_CHANGED', handleFileChanged);
      webSocketService.removeEventListener('FILE_DELETED', handleFileDeleted);
      webSocketService.removeEventListener('connection', handleConnection);
    };
  }, [fetchFiles, lastUpdateTime]);

  /**
   * 當前文件路徑變化時，自動展開包含該文件的所有目錄
   * @see /docs/solved_issues.md#21-文件樹展開狀態保持
   * @see /docs/requirements.md#316-自動展開包含當前文件的目錄
   */
  useEffect(() => {
    if (currentPath) {
      // 判斷是否為目錄路徑
      const isDirectory = currentPath.endsWith('/') || !currentPath.includes('.');
      
      // 如果是目錄路徑，展開自身；如果是文件路徑，展開父目錄
      const pathToExpand = isDirectory ? currentPath : currentPath.substring(0, currentPath.lastIndexOf('/'));
      const pathParts = pathToExpand.split('/');
      let currentDirPath = '';
      
      // 展開所有父目錄
      for (let i = 0; i < pathParts.length; i++) {
        if (pathParts[i]) { // 確保不是空字串
          currentDirPath = currentDirPath 
            ? `${currentDirPath}/${pathParts[i]}` 
            : pathParts[i];
          dispatch(expandPath(currentDirPath));
        }
      }
    }
  }, [currentPath, dispatch]);

  useEffect(() => {
    // 構建樹狀結構
    const buildTree = (files: FileInfo[]) => {
      const root: TreeNode[] = [];
      const directoryMap: Record<string, TreeNode> = {};

      // 驗證 files 是有效的陣列
      if (!files || !Array.isArray(files)) {
        console.warn('Files is not an array:', files);
        return root;
      }

      // 先創建所有目錄
      files.forEach(file => {
        const pathParts = file.path.split('/');
        let currentPath = '';
        for (let i = 0; i < pathParts.length - 1; i++) {
          const part = pathParts[i];
          const parentPath = currentPath;
          currentPath = currentPath ? `${currentPath}/${part}` : part;

          if (!directoryMap[currentPath]) {
            const newDir: TreeNode = {
              name: part,
              children: [],
              type: 'directory',
              path: currentPath,
            };
            directoryMap[currentPath] = newDir;

            if (parentPath) {
              directoryMap[parentPath].children = directoryMap[parentPath].children || [];
              directoryMap[parentPath].children?.push(newDir);
            } else {
              root.push(newDir);
            }
          }
        }
      });

      // 將文件放入對應的目錄
      files.forEach(file => {
        const pathParts = file.path.split('/');
        const fileName = pathParts[pathParts.length - 1];
        const parentPath = pathParts.slice(0, -1).join('/');

        const fileNode: TreeNode = {
          name: fileName,
          type: 'file',
          path: file.path,
        };

        if (parentPath && directoryMap[parentPath]) {
          directoryMap[parentPath].children = directoryMap[parentPath].children || [];
          directoryMap[parentPath].children?.push(fileNode);
        } else {
          root.push(fileNode);
        }
      });

      // 排序，讓目錄顯示在文件前面
      const sortNodes = (nodes: TreeNode[]) => {
        nodes.sort((a, b) => {
          if (a.type === 'directory' && b.type === 'file') return -1;
          if (a.type === 'file' && b.type === 'directory') return 1;
          return a.name.localeCompare(b.name);
        });
        nodes.forEach(node => {
          if (node.type === 'directory' && node.children) {
            sortNodes(node.children);
          }
        });
      };

      sortNodes(root);
      return root;
    };

    setTreeData(buildTree(files));
  }, [files]);

  // 移除不需要的代碼

  const handleFileClick = (path: string) => {
    // 使用未編碼的路徑
    navigate(`/edit/${path}`);
  };
  
  // 處理目錄點擊
  const handleDirectoryClick = (path: string) => {
    // 確保目錄路徑以 / 結尾
    const dirPath = path.endsWith('/') ? path : `${path}/`;
    navigate(`/edit/${dirPath}`);
  };

  /**
   * 處理目錄展開/折疊
   * @see /docs/solved_issues.md#22-文件樹展開閃爍問題
   * @see /docs/requirements.md#312-文件夾展開折疊功能
   * @see /docs/requirements.md#315-展開狀態持久化
   */
  const handleDirectoryToggle = (path: string) => {
    dispatch(togglePathExpanded(path));
  };

/**
 * 檔案節點組件 - 使用 memo 避免不必要的重新渲染
 */
interface FileNodeProps {
  node: TreeNode;
  currentPath: string | null;
  expandedPaths: Set<string>;
  onFileClick: (path: string) => void;
  onDirectoryToggle: (path: string) => void;
  onDirectoryClick?: (path: string) => void; // 添加目錄點擊處理函數
}

const FileNode = memo(({ node, currentPath, expandedPaths, onFileClick, onDirectoryToggle, onDirectoryClick }: FileNodeProps) => {
  if (node.type === 'directory') {
    return (
      <div className="group">
        <div 
          className="flex items-center cursor-pointer p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
        >
          <span 
            className="mr-2 cursor-pointer"
            onClick={() => onDirectoryToggle(node.path)}
          >
            {expandedPaths.has(node.path) ? '📂' : '📁'}
          </span>
          <span 
            className="flex-1 cursor-pointer"
            onClick={() => onDirectoryClick ? onDirectoryClick(node.path) : onDirectoryToggle(node.path)}
          >
            {node.name}
          </span>
        </div>
        {expandedPaths.has(node.path) && node.children && (
          <div className="ml-2">
            <TreeList 
              nodes={node.children} 
              currentPath={currentPath} 
              expandedPaths={expandedPaths} 
              onFileClick={onFileClick} 
              onDirectoryToggle={onDirectoryToggle} 
            />
          </div>
        )}
      </div>
    );
  } else {
    return (
      <div 
        className={`flex items-center cursor-pointer p-1 rounded ${currentPath === node.path ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
        onClick={() => onFileClick(node.path)}
      >
        <span className="mr-2">📄</span>
        <span className={currentPath === node.path ? 'font-semibold' : ''}>{node.name}</span>
        {currentPath === node.path && <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">• 當前</span>}
      </div>
    );
  }
});

/**
 * 樹列表組件 - 使用 memo 避免不必要的重新渲染
 */
interface TreeListProps {
  nodes: TreeNode[];
  currentPath: string | null;
  expandedPaths: Set<string>;
  onFileClick: (path: string) => void;
  onDirectoryToggle: (path: string) => void;
  onDirectoryClick?: (path: string) => void; // 添加目錄點擊處理函數
}

const TreeList = memo(({ nodes, currentPath, expandedPaths, onFileClick, onDirectoryToggle, onDirectoryClick }: TreeListProps) => {
  return (
    <ul className="pl-4">
      {nodes.map((node) => (
        <li key={node.path} className="py-1">
          <FileNode 
            node={node} 
            currentPath={currentPath} 
            expandedPaths={expandedPaths} 
            onFileClick={onFileClick} 
            onDirectoryToggle={onDirectoryToggle}
            onDirectoryClick={onDirectoryClick}
          />
        </li>
      ))}
    </ul>
  );
});

/**
 * 渲染文件樹
 * @see /docs/solved_issues.md#22-文件樹展開閃爍問題
 * @see /docs/requirements.md#311-顯示目錄結構
 */
const renderTree = (nodes: TreeNode[], currentPath: string | null, expandedPaths: Set<string>, handleFileClick: (path: string) => void, handleDirectoryToggle: (path: string) => void, handleDirectoryClick: (path: string) => void) => {
  return (
    <TreeList 
      nodes={nodes} 
      currentPath={currentPath} 
      expandedPaths={expandedPaths} 
      onFileClick={handleFileClick} 
      onDirectoryToggle={handleDirectoryToggle}
      onDirectoryClick={handleDirectoryClick}
    />
  );
};

  if (loading) {
    return <div className="p-4">Loading files...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  // 移除此處的 useMemo，避免 Hooks 順序錯誤

  return (
    <div className={cn("p-4", className)}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Files</h2>
        <div className="flex gap-2">
          <button
            className="px-2 py-1 rounded text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600"
            onClick={refreshFiles}
            title="Refresh file list"
          >
            🔄
          </button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // prompt 返回的可能是 null，所以需要確保它是字符串
              let fileName = prompt('Enter new file name:') || '';
              if (fileName) {
                // 確保文件名以 .md 結尾
                if (!fileName.toLowerCase().endsWith('.md')) {
                  fileName = `${fileName}.md`;
                }
                
                fileApi.createFile(fileName, '# New File\n\nStart writing here...')
                  .then(() => {
                    // 刷新文件列表，然後導航到新文件
                    dispatch(refreshFileList());
                    dispatch(addNotification({
                      type: 'success',
                      message: `File ${fileName} created successfully`,
                      title: 'Success'
                    }));
                    navigate(`/edit/${encodeURIComponent(fileName)}`);
                  })
                  .catch(err => {
                    console.error('Error creating file:', err);
                    // Error is handled by the API interceptor
                  });
              }
            }}
          >
            New File
          </Button>
        </div>
      </div>
      {treeData.length > 0 ? (
        renderTree(treeData, currentPath, expandedPathsSet, handleFileClick, handleDirectoryToggle, handleDirectoryClick)
      ) : (
        <div className="text-gray-500">No files found</div>
      )}
    </div>
  );
}

// 使用 React.memo 包裝組件，避免不必要的重新渲染
export const FileTree = React.memo(FileTreeComponent);
