import React, { useState, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { FileTree } from '../components/FileTree/FileTree';
import { MarkdownEditor } from '../components/MarkdownEditor/MarkdownEditor';

export function EditorPage() {
  const { path } = useParams<{ path?: string }>();
  const [sidebarWidth, setSidebarWidth] = useState(280);
  // 添加刷新計數器狀態，用於強制重新渲染 FileTree 組件
  const [refreshKey, setRefreshKey] = useState(0);
  const decodedPath = path ? decodeURIComponent(path) : undefined;
  
  // 刷新文件列表
  const refreshFileTree = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  const startResize = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    
    const doDrag = (e: MouseEvent) => {
      const newWidth = Math.max(200, Math.min(500, startWidth + e.clientX - startX));
      setSidebarWidth(newWidth);
      document.documentElement.style.setProperty('--sidebar-width', `${newWidth}px`);
    };
    
    const stopDrag = () => {
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
    };
    
    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
  };

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <div 
        className="h-full border-r border-border overflow-y-auto flex flex-col"
        style={{ width: `${sidebarWidth}px` }}
      >
        <div className="p-2 flex justify-between items-center border-b">
          <h2 className="text-lg font-semibold">Files</h2>
          <button 
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
            onClick={refreshFileTree}
            title="Refresh file list"
          >
            🔄 {/* 刷新圖標 */}
          </button>
        </div>
        <div className="flex-1 overflow-y-auto">
          <FileTree key={refreshKey} />
        </div>
      </div>
      
      {/* Resize handle */}
      <div 
        className="w-1 bg-border hover:bg-primary cursor-col-resize"
        onMouseDown={startResize}
      />
      
      {/* Main content */}
      <div className="flex-1 h-full overflow-hidden flex flex-col">
        <div className="flex-1 overflow-auto">
          {decodedPath ? (
            <MarkdownEditor filePath={decodedPath} />
          ) : (
            <div className="h-full flex items-center justify-center">
              <div className="text-center">
                <h3 className="text-xl font-semibold mb-2">Welcome to Vditor Markdown Editor</h3>
                <p className="text-muted-foreground">Select a file from the sidebar or create a new one.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
