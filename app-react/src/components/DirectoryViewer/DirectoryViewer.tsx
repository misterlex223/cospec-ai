import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fileApi, type FileInfo } from '../../services/api';
import { cn } from '../../lib/utils';

// 導入圖標元件
// 如果您的專案中有更好的圖標庫，可以替換這裡的 emoji
import './DirectoryViewer.css';

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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid'); // 添加視圖模式狀態
  const [previewItem, setPreviewItem] = useState<DirectoryItem | null>(null); // 預覽文件
  const [previewContent, setPreviewContent] = useState<string>(''); // 預覽內容
  const [previewLoading, setPreviewLoading] = useState(false); // 預覽加載狀態
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
  const handleItemClick = (path: string, isDirectory: boolean, item: DirectoryItem) => {
    if (isDirectory) {
      // 如果是目錄，導航到該目錄
      navigate(`/edit/${path}/`);
    } else {
      // 判斷文件類型
      const fileExtension = item.name.includes('.') ? item.name.split('.').pop()?.toLowerCase() : null;
      
      // 如果是圖片或 Markdown 文件，先預覽
      if (fileExtension && ['jpg', 'jpeg', 'png', 'gif', 'md'].includes(fileExtension)) {
        handlePreview(item);
      } else {
        // 其他文件直接打開
        navigate(`/edit/${path}`);
      }
    }
  };
  
  // 處理文件預覽
  const handlePreview = async (item: DirectoryItem) => {
    setPreviewItem(item);
    setPreviewLoading(true);
    
    try {
      // 判斷文件類型
      const fileExtension = item.name.includes('.') ? item.name.split('.').pop()?.toLowerCase() : null;
      
      // 如果是 Markdown 文件，讀取內容
      if (fileExtension === 'md') {
        const response = await fileApi.getFileContent(item.path);
        setPreviewContent(response.content || '');
      }
      
      setPreviewLoading(false);
    } catch (err) {
      console.error('Error loading preview:', err);
      setPreviewLoading(false);
    }
  };
  
  // 關閉預覽
  const closePreview = () => {
    setPreviewItem(null);
    setPreviewContent('');
  };

  // 判斷項目是否為目錄
  const isDirectory = (item: DirectoryItem) => {
    // 檢查是否為已知的目錄項目
    return !item.path.includes('.');
  };

  return (
    <div className={cn("p-6 directory-viewer", className)}>
      {/* 麵包屑導航 - 改進設計 */}
      <div className="breadcrumbs-container mb-6 bg-gray-50 dark:bg-gray-800 rounded-lg p-3 shadow-sm">
        <div className="flex items-center flex-wrap">
          {breadcrumbs.map((crumb, index) => (
            <React.Fragment key={crumb.path}>
              {index > 0 && <span className="mx-2 text-gray-400 breadcrumb-separator">/</span>}
              <button
                className={`breadcrumb-item px-2 py-1 rounded-md transition-all ${index === breadcrumbs.length - 1 
                  ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 font-medium' 
                  : 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-gray-700'}`}
                onClick={() => navigate(`/edit/${crumb.path}`)}
              >
                {index === 0 ? (
                  <>
                    <span className="inline-block mr-1">🏠</span> {/* 家圖標 */}
                    {crumb.name}
                  </>
                ) : (
                  crumb.name
                )}
              </button>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 目錄標題 */}
      <div className="directory-header flex items-center justify-between mb-6 border-b pb-4">
        <h1 className="text-2xl font-bold flex items-center">
          <span className="directory-icon mr-3 text-yellow-500">📁</span>
          {directoryPath ? directoryPath.split('/').filter(Boolean).pop() || directoryPath : 'Root Directory'}
        </h1>
        <div className="directory-stats bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full text-sm">
          {files.length} {files.length === 1 ? 'item' : 'items'}
        </div>
      </div>

      {loading ? (
        <div className="loading-container flex justify-center items-center py-16">
          <div className="loading-spinner">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            <div className="mt-4 text-gray-600 dark:text-gray-400">Loading directory contents...</div>
          </div>
        </div>
      ) : error ? (
        <div className="error-container bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 my-6">
          <div className="flex items-center">
            <span className="text-red-500 text-xl mr-3">⚠️</span>
            <div className="text-red-600 dark:text-red-400">{error}</div>
          </div>
        </div>
      ) : (
        <>
          {/* 視圖切換 */}
          <div className="view-toggle flex justify-end mb-4">
            <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-1 inline-flex">
              <button 
                className={`px-3 py-1 rounded-md ${viewMode === 'grid' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                title="Grid view"
                onClick={() => setViewMode('grid')}
                aria-label="Grid view"
              >
                <span>🔍</span>
              </button>
              <button 
                className={`px-3 py-1 rounded-md ${viewMode === 'list' ? 'bg-white dark:bg-gray-700 shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
                title="List view"
                onClick={() => setViewMode('list')}
                aria-label="List view"
              >
                <span>📃</span>
              </button>
            </div>
          </div>
          
          {/* 文件列表 */}
          <div className="directory-content">
            {files.length === 0 ? (
              <div className="empty-directory bg-gray-50 dark:bg-gray-800 rounded-lg p-8 text-center">
                <div className="empty-icon text-4xl mb-3">📂</div>
                <h3 className="text-lg font-medium mb-2">This directory is empty</h3>
                <p className="text-gray-500 dark:text-gray-400">No files or folders found in this location.</p>
              </div>
            ) : viewMode === 'grid' ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {files.map((item) => {
                  const itemIsDirectory = isDirectory(item);
                  const fileExtension = !itemIsDirectory && item.name.includes('.') 
                    ? item.name.split('.').pop()?.toLowerCase() 
                    : null;
                  
                  // 根據文件類型設置顏色和圖標
                  let iconClass = '';
                  let icon = itemIsDirectory ? '📁' : '📄';
                  
                  // 為不同文件類型設置圖標
                  if (!itemIsDirectory && fileExtension) {
                    switch(fileExtension) {
                      case 'md':
                        icon = '📑'; // 文檔圖標
                        iconClass = 'text-blue-500';
                        break;
                      case 'pdf':
                        icon = '📕'; // PDF圖標
                        iconClass = 'text-red-500';
                        break;
                      case 'jpg':
                      case 'jpeg':
                      case 'png':
                      case 'gif':
                        icon = '🖼'; // 圖片圖標
                        iconClass = 'text-green-500';
                        break;
                      case 'js':
                      case 'ts':
                      case 'jsx':
                      case 'tsx':
                        icon = '💻'; // 代碼圖標
                        iconClass = 'text-yellow-500';
                        break;
                    }
                  }
                  
                  return (
                    <div
                      key={item.path}
                      className="directory-item bg-white dark:bg-gray-800 rounded-lg shadow-sm hover:shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden transition-all duration-200 transform hover:-translate-y-1"
                      onClick={() => handleItemClick(item.path, itemIsDirectory, item)}
                    >
                      <div className="p-4">
                        <div className="flex items-start">
                          <div className={`item-icon flex-shrink-0 w-10 h-10 flex items-center justify-center rounded-lg mr-3 ${itemIsDirectory ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                            <span className={`text-xl ${iconClass}`}>{icon}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="font-medium text-gray-900 dark:text-gray-100 truncate" title={item.name}>
                              {item.name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                              {itemIsDirectory ? (
                                <span className="flex items-center">
                                  <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                                  Directory
                                </span>
                              ) : (
                                <span className="flex items-center">
                                  <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                                  {fileExtension ? fileExtension.toUpperCase() : 'File'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="list-view bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
                {/* 列表視圖標題列 */}
                <div className="list-header grid grid-cols-12 gap-2 px-4 py-3 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 text-sm font-medium text-gray-500 dark:text-gray-400">
                  <div className="col-span-7 sm:col-span-6 flex items-center">
                    <span className="ml-2">Name</span>
                  </div>
                  <div className="col-span-3 sm:col-span-4 hidden sm:flex items-center">Type</div>
                  <div className="col-span-2 flex items-center justify-end">Action</div>
                </div>
                
                {/* 列表項目 */}
                <div className="list-items">
                  {files.map((item, index) => {
                    const itemIsDirectory = isDirectory(item);
                    const fileExtension = !itemIsDirectory && item.name.includes('.') 
                      ? item.name.split('.').pop()?.toLowerCase() 
                      : null;
                    
                    // 根據文件類型設置圖標
                    let iconClass = '';
                    let icon = itemIsDirectory ? '📁' : '📄';
                    
                    // 為不同文件類型設置圖標
                    if (!itemIsDirectory && fileExtension) {
                      switch(fileExtension) {
                        case 'md':
                          icon = '📑'; // 文檔圖標
                          iconClass = 'text-blue-500';
                          break;
                        case 'pdf':
                          icon = '📕'; // PDF圖標
                          iconClass = 'text-red-500';
                          break;
                        case 'jpg':
                        case 'jpeg':
                        case 'png':
                        case 'gif':
                          icon = '🖼'; // 圖片圖標
                          iconClass = 'text-green-500';
                          break;
                        case 'js':
                        case 'ts':
                        case 'jsx':
                        case 'tsx':
                          icon = '💻'; // 代碼圖標
                          iconClass = 'text-yellow-500';
                          break;
                      }
                    }
                    
                    return (
                      <div 
                        key={item.path}
                        className={`list-item grid grid-cols-12 gap-2 px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 transition-colors ${index % 2 === 0 ? 'bg-white dark:bg-gray-800' : 'bg-gray-50/50 dark:bg-gray-800/50'}`}
                        onClick={() => handleItemClick(item.path, itemIsDirectory, item)}
                      >
                        <div className="col-span-7 sm:col-span-6 flex items-center min-w-0">
                          <div className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded mr-3 ${itemIsDirectory ? 'bg-blue-100 dark:bg-blue-900/30' : 'bg-gray-100 dark:bg-gray-700'}`}>
                            <span className={`text-lg ${iconClass}`}>{icon}</span>
                          </div>
                          <div className="truncate font-medium" title={item.name}>{item.name}</div>
                        </div>
                        <div className="col-span-3 sm:col-span-4 hidden sm:flex items-center text-sm text-gray-500 dark:text-gray-400">
                          {itemIsDirectory ? (
                            <span className="flex items-center">
                              <span className="w-2 h-2 rounded-full bg-blue-500 mr-2"></span>
                              Directory
                            </span>
                          ) : (
                            <span className="flex items-center">
                              <span className="w-2 h-2 rounded-full bg-green-500 mr-2"></span>
                              {fileExtension ? fileExtension.toUpperCase() : 'File'}
                            </span>
                          )}
                        </div>
                        <div className="col-span-2 flex items-center justify-end">
                          <button 
                            className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                            onClick={(e) => {
                              e.stopPropagation(); // 阻止事件冒泡
                              handleItemClick(item.path, itemIsDirectory, item);
                            }}
                            aria-label={`Open ${itemIsDirectory ? 'directory' : 'file'}`}
                          >
                            <span className="text-gray-500 dark:text-gray-400">→</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
          
          {/* 文件預覽模態視窗 */}
          {previewItem && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
                {/* 模態視窗標題 */}
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                  <h3 className="text-lg font-medium flex items-center">
                    <span className="mr-2">
                      {previewItem.name.endsWith('.md') ? '📑' : '🖼'}
                    </span>
                    {previewItem.name}
                  </h3>
                  <div className="flex items-center gap-2">
                    <button 
                      className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={() => navigate(`/edit/${previewItem.path}`)}
                      title="Open in editor"
                    >
                      <span>✏️</span>
                    </button>
                    <button 
                      className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                      onClick={closePreview}
                      title="Close preview"
                    >
                      <span>✖</span>
                    </button>
                  </div>
                </div>
                
                {/* 預覽內容 */}
                <div className="flex-1 overflow-auto p-4">
                  {previewLoading ? (
                    <div className="flex justify-center items-center h-full">
                      <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
                    </div>
                  ) : previewItem.name.match(/\.(jpe?g|png|gif)$/i) ? (
                    <div className="flex justify-center">
                      <img 
                        src={`/api/files/${previewItem.path}`} 
                        alt={previewItem.name} 
                        className="max-h-[70vh] object-contain" 
                      />
                    </div>
                  ) : previewItem.name.endsWith('.md') ? (
                    <div className="prose dark:prose-invert max-w-none">
                      <div className="markdown-preview">
                        {previewContent.split('\n').map((line, i) => {
                          // 簡單的 Markdown 渲染
                          if (line.startsWith('# ')) {
                            return <h1 key={i}>{line.substring(2)}</h1>;
                          } else if (line.startsWith('## ')) {
                            return <h2 key={i}>{line.substring(3)}</h2>;
                          } else if (line.startsWith('### ')) {
                            return <h3 key={i}>{line.substring(4)}</h3>;
                          } else if (line.startsWith('- ')) {
                            return <li key={i}>{line.substring(2)}</li>;
                          } else if (line.trim() === '') {
                            return <br key={i} />;
                          } else {
                            return <p key={i}>{line}</p>;
                          }
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      Preview not available for this file type
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
