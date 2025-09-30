import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fileApi, type FileInfo } from '../../services/api';
import { cn } from '../../lib/utils';

// 擴展 FileInfo 類型以包含名稱屬性
interface DirectoryItem extends FileInfo {
  name: string;
}

interface DirectoryViewerProps {
  directoryPath: string;
  className?: string;
}

/**
 * 目錄瀏覽器組件
 * 用於顯示目錄內容，並提供導航功能
 */
export function DirectoryViewer({ directoryPath, className }: DirectoryViewerProps) {
  const [files, setFiles] = useState<DirectoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<{name: string, path: string}[]>([]);
  const navigate = useNavigate();

  // 載入目錄內容
  useEffect(() => {
    const fetchDirectoryContents = async () => {
      setLoading(true);
      setError(null);

      try {
        // 獲取所有文件
        const allFiles = await fileApi.getAllFiles();
        
        // 過濾出當前目錄下的文件和子目錄
        // 移除結尾的斜線以進行比較
        const normalizedDirPath = directoryPath.endsWith('/') 
          ? directoryPath.slice(0, -1) 
          : directoryPath;

        // 過濾出直接子項目（不包含更深層次的文件）
        const directChildren = allFiles.filter(file => {
          const filePath = file.path;
          const relativePath = filePath.startsWith(normalizedDirPath) 
            ? filePath.substring(normalizedDirPath.length + 1) 
            : filePath;
          
          // 只包含直接子項目（不包含子目錄中的文件）
          return relativePath && !relativePath.includes('/');
        });

        // 找出子目錄（通過檢查路徑前綴）
        const childDirs = new Set<string>();
        allFiles.forEach(file => {
          if (file.path.startsWith(normalizedDirPath + '/')) {
            const remainingPath = file.path.substring(normalizedDirPath.length + 1);
            const firstDir = remainingPath.split('/')[0];
            if (firstDir) {
              childDirs.add(firstDir);
            }
          }
        });

        // 合併文件和目錄
        const dirItems: DirectoryItem[] = Array.from(childDirs).map(dir => ({
          path: `${normalizedDirPath}/${dir}`,
          name: dir
        }));

        // 將文件轉換為 DirectoryItem
        const fileItems: DirectoryItem[] = directChildren.map(file => ({
          ...file,
          name: file.path.split('/').pop() || file.path
        }));

        // 合併並排序（目錄在前，文件在後）
        const sortedItems = [
          ...dirItems.sort((a, b) => a.name.localeCompare(b.name)),
          ...fileItems.sort((a, b) => a.name.localeCompare(b.name))
        ];

        setFiles(sortedItems);

        // 生成麵包屑導航
        const pathParts = normalizedDirPath.split('/').filter(Boolean);
        const crumbs = pathParts.map((part, index) => {
          const path = pathParts.slice(0, index + 1).join('/');
          return {
            name: part,
            path
          };
        });
        
        setBreadcrumbs([{ name: 'Root', path: '' }, ...crumbs]);
        
        setLoading(false);
      } catch (err) {
        setError(`Failed to load directory contents: ${err instanceof Error ? err.message : String(err)}`);
        setLoading(false);
      }
    };

    fetchDirectoryContents();
  }, [directoryPath]);

  // 處理文件點擊
  const handleItemClick = (path: string, isDirectory: boolean) => {
    if (isDirectory) {
      // 如果是目錄，導航到該目錄
      navigate(`/edit/${path}/`);
    } else {
      // 如果是文件，打開該文件
      navigate(`/edit/${path}`);
    }
  };

  // 判斷項目是否為目錄
  const isDirectory = (item: DirectoryItem) => {
    // 檢查是否為已知的目錄項目
    return !item.path.includes('.');
  };

  return (
    <div className={cn("p-6", className)}>
      {/* 麵包屑導航 */}
      <div className="mb-6 flex items-center flex-wrap">
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={crumb.path}>
            {index > 0 && <span className="mx-2 text-gray-400">/</span>}
            <button
              className="text-blue-500 hover:underline"
              onClick={() => navigate(`/edit/${crumb.path}`)}
            >
              {crumb.name}
            </button>
          </React.Fragment>
        ))}
      </div>

      <h1 className="text-2xl font-bold mb-6">
        {directoryPath ? `Directory: ${directoryPath.split('/').filter(Boolean).pop() || directoryPath}` : 'Root Directory'}
      </h1>

      {loading ? (
        <div className="text-center py-8">Loading directory contents...</div>
      ) : error ? (
        <div className="text-red-500 py-4">{error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {files.length === 0 ? (
            <div className="col-span-full text-gray-500 py-8 text-center">
              This directory is empty.
            </div>
          ) : (
            files.map((item) => {
              const itemIsDirectory = isDirectory(item);
              return (
                <div
                  key={item.path}
                  className="border rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition-colors"
                  onClick={() => handleItemClick(item.path, itemIsDirectory)}
                >
                  <div className="flex items-center">
                    <span className="mr-3 text-xl">
                      {itemIsDirectory ? '📁' : '📄'}
                    </span>
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-gray-500">
                        {itemIsDirectory ? 'Directory' : 'File'}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
