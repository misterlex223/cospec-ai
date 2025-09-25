import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fileApi, type FileInfo } from '../../services/api';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';

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
export function FileTree({ className }: FileTreeProps) {
  const [files, setFiles] = useState<FileInfo[]>([]);
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // 存儲展開的目錄路徑
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());
  // 添加刷新計數器，用於觸發文件列表重新加載
  const [refreshCounter, setRefreshCounter] = useState(0);
  const navigate = useNavigate();
  /**
   * 從 URL 中獲取當前文件路徑
   * @see /docs/solved_issues.md#21-文件樹展開狀態保持
   */
  const currentPath = window.location.pathname.startsWith('/edit/') 
    ? decodeURIComponent(window.location.pathname.substring(6)) 
    : null;

  useEffect(() => {
    const fetchFiles = async () => {
      try {
        setLoading(true);
        const fileList = await fileApi.getAllFiles();
        setFiles(fileList);
        setLoading(false);
      } catch (err) {
        setError('Failed to fetch files');
        setLoading(false);
        console.error('Error fetching files:', err);
      }
    };

    fetchFiles();

    // 設置定期輪詢
    const interval = setInterval(fetchFiles, 5000);
    return () => clearInterval(interval);
  }, [refreshCounter]); // 添加 refreshCounter 作為依賴項，當它變化時重新獲取文件列表

  /**
   * 當前文件路徑變化時，自動展開包含該文件的所有目錄
   * @see /docs/solved_issues.md#21-文件樹展開狀態保持
   * @see /docs/requirements.md#316-自動展開包含當前文件的目錄
   */
  useEffect(() => {
    if (currentPath) {
      // 將文件路徑拆分為目錄路徑
      const pathParts = currentPath.split('/');
      let currentDirPath = '';
      
      // 展開所有父目錄
      setExpandedPaths(prevPaths => {
        const newPaths = new Set(prevPaths);
        for (let i = 0; i < pathParts.length - 1; i++) {
          currentDirPath = currentDirPath 
            ? `${currentDirPath}/${pathParts[i]}` 
            : pathParts[i];
          newPaths.add(currentDirPath);
        }
        return newPaths;
      });
    }
  }, [currentPath]);

  useEffect(() => {
    // 構建樹狀結構
    const buildTree = (files: FileInfo[]) => {
      const root: TreeNode[] = [];
      const directoryMap: Record<string, TreeNode> = {};

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
    navigate(`/edit/${encodeURIComponent(path)}`);
  };

  /**
   * 處理目錄展開/折疊
   * @see /docs/solved_issues.md#22-文件樹展開閃爍問題
   * @see /docs/requirements.md#312-文件夾展開折疊功能
   * @see /docs/requirements.md#315-展開狀態持久化
   */
  const handleDirectoryToggle = (path: string) => {
    setExpandedPaths(prevPaths => {
      const newPaths = new Set(prevPaths);
      if (newPaths.has(path)) {
        newPaths.delete(path);
      } else {
        newPaths.add(path);
      }
      return newPaths;
    });
  };

  /**
   * 渲染文件樹
   * @see /docs/solved_issues.md#22-文件樹展開閃爍問題
   * @see /docs/requirements.md#311-顯示目錄結構
   */
  const renderTree = (nodes: TreeNode[]) => {
    return (
      <ul className="pl-4">
        {nodes.map((node, index) => (
          <li key={index} className="py-1">
            {node.type === 'directory' ? (
              <div className="group">
                <div 
                  className="flex items-center cursor-pointer p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded"
                  onClick={() => handleDirectoryToggle(node.path)}
                >
                  <span className="mr-2">
                    {expandedPaths.has(node.path) ? '📂' : '📁'}
                  </span>
                  <span>{node.name}</span>
                </div>
                {expandedPaths.has(node.path) && node.children && (
                  <div className="ml-2">
                    {renderTree(node.children)}
                  </div>
                )}
              </div>
            ) : (
              <div 
                className={`flex items-center cursor-pointer p-1 rounded ${currentPath === node.path ? 'bg-blue-100 dark:bg-blue-900' : 'hover:bg-gray-100 dark:hover:bg-gray-800'}`}
                onClick={() => handleFileClick(node.path)}
              >
                <span className="mr-2">📄</span>
                <span className={currentPath === node.path ? 'font-semibold' : ''}>{node.name}</span>
                {currentPath === node.path && <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">• 當前</span>}
              </div>
            )}
          </li>
        ))}
      </ul>
    );
  };

  if (loading) {
    return <div className="p-4">Loading files...</div>;
  }

  if (error) {
    return <div className="p-4 text-red-500">{error}</div>;
  }

  return (
    <div className={cn("p-4", className)}>
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">Files</h2>
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
                  setRefreshCounter(prev => prev + 1);
                  navigate(`/edit/${encodeURIComponent(fileName)}`);
                })
                .catch(err => {
                  console.error('Error creating file:', err);
                  alert('Failed to create file');
                });
            }
          }}
        >
          New File
        </Button>
      </div>
      {treeData.length > 0 ? (
        renderTree(treeData)
      ) : (
        <div className="text-gray-500">No files found</div>
      )}
    </div>
  );
}
