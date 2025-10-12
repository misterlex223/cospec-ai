import React, { useState, useCallback, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setSidebarWidth } from '../store/slices/uiSlice';
import { FileTree } from '../components/FileTree/FileTree';
import { MarkdownEditor } from '../components/MarkdownEditor/MarkdownEditor';
import { DirectoryViewer } from '../components/DirectoryViewer/DirectoryViewer';
import { Navigator } from '../components/Navigator/Navigator';
import type { RootState } from '../store';

export function EditorPage() {
  // 使用 useLocation 來獲取完整的 URL 路徑
  const location = useLocation();
  const dispatch = useDispatch();
  
  // 從 Redux store 獲取 sidebarWidth
  const sidebarWidth = useSelector((state: RootState) => state.ui.sidebarWidth);
  
  // 添加刷新計數器狀態，用於強制重新渲染 FileTree 組件
  const [refreshKey, setRefreshKey] = useState(0);
  
  // 從 URL 獲取文件路徑（使用未編碼的路徑）
  const getPathFromUrl = (): string | undefined => {
    // 從 location.pathname 中提取路徑
    // 例如 /edit/docs/specs/sfs.md -> docs/specs/sfs.md
    const match = location.pathname.match(/^\/edit\/(.+)$/);
    return match ? match[1] : undefined;
  };
  
  const filePath = getPathFromUrl();
  
  // 判斷是否為目錄（如果路徑以 / 結尾或沒有副檔名）
  const isDirectory = filePath ? (filePath.endsWith('/') || !filePath.includes('.')) : false;
  
  // 在組件加載時設置 CSS 變量
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', `${sidebarWidth}px`);
  }, [sidebarWidth]);
  
  // 刷新文件列表
  const refreshFileTree = useCallback(() => {
    setRefreshKey(prev => prev + 1);
  }, []);

  // 簡化的拖曳調整功能，確保它能正常工作
  const startResize = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    console.log('Resize started'); // 打印日誌以確認事件觸發
    
    // 記錄起始位置和寬度
    const startX = e.clientX;
    const startWidth = sidebarWidth;
    
    // 直接設置游標樣式，不依賴於 CSS 類
    document.body.style.cursor = 'col-resize';
    
    // 拖曳過程中的處理函數
    const doDrag = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      moveEvent.stopPropagation();
      
      // 計算新寬度，設置最小和最大限制
      const newWidth = Math.max(200, Math.min(600, startWidth + moveEvent.clientX - startX));
      
      // 直接設置寬度，不依賴於 CSS 變數
      const sidebarElement = document.querySelector('.border-r.border-border');
      if (sidebarElement) {
        (sidebarElement as HTMLElement).style.width = `${newWidth}px`;
      }
      
      // 更新 Redux store
      dispatch(setSidebarWidth(newWidth));
      
      // 儲存到 localStorage
      try {
        localStorage.setItem('sidebarWidth', newWidth.toString());
      } catch (err) {
        console.error('Failed to save sidebar width to localStorage:', err);
      }
    };
    
    // 停止拖曳的處理函數
    const stopDrag = () => {
      console.log('Resize ended'); // 打印日誌以確認事件結束
      
      // 移除事件監聽器
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
      
      // 恢復正常游標
      document.body.style.cursor = '';
    };
    
    // 添加事件監聽器
    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'row', width: '100%', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar - 使用直接的內聯樣式確保水平布局 */}
      <div 
        style={{ 
          height: '100%', 
          width: `${sidebarWidth}px`, 
          minWidth: '200px', 
          maxWidth: '600px',
          borderRight: '1px solid #e2e8f0',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column'
        }}
      >
        <div style={{ padding: '0.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0' }}>
          <h2 style={{ fontSize: '1.125rem', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
            <img src="/logo.svg" alt="CoSpec AI" style={{ width: '24px', height: '24px', marginRight: '0.5rem' }} />
            CoSpec AI
          </h2>
          <button
            style={{ padding: '0.25rem', borderRadius: '0.25rem', cursor: 'pointer' }}
            onClick={refreshFileTree}
            title="Refresh file list"
          >
            🔄 {/* 刷新圖標 */}
          </button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <FileTree key={refreshKey} />
        </div>
      </div>
      
      {/* 可拖曳的分隔線 - 使用直接的內聯樣式設定寬度 */}
      <div 
        className="bg-gray-300 hover:bg-blue-400 relative flex items-center justify-center"
        style={{ 
          cursor: 'col-resize',
          width: '8px', /* 直接設定寬度為 8px */
          minWidth: '8px', /* 確保最小寬度 */
          maxWidth: '8px', /* 確保最大寬度 */
          height: '100%',
          boxShadow: '0 0 4px rgba(0, 0, 0, 0.2)',
          zIndex: 10
        }}
        title="拖曳調整寬度" /* 添加提示文字 */
        onMouseDown={startResize}
      >
        {/* 更明顯的視覺指示 */}
        <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ width: '2px', height: '32px', backgroundColor: '#4b5563' }}></div>
            <div style={{ width: '2px', height: '32px', backgroundColor: '#4b5563' }}></div>
          </div>
        </div>
      </div>
      
      {/* Main content */}
      <div style={{ flex: 1, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {/* 只在非目錄模式下顯示 Navigator */}
        {filePath && !isDirectory && (
          <div style={{ position: 'relative', zIndex: 1600 }}>
            <Navigator />
          </div>
        )}

        <div style={{ flex: 1, overflow: 'auto' }}>
          {filePath ? (
            isDirectory ? (
              // 如果是目錄，顯示目錄瀏覽器
              <DirectoryViewer directoryPath={filePath} />
            ) : (
              // 如果是文件，顯示 Markdown 編輯器
              <MarkdownEditor filePath={filePath} />
            )
          ) : (
            <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ textAlign: 'center' }}>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Welcome to Vditor Markdown Editor</h3>
                <p style={{ color: '#6b7280' }}>Select a file from the sidebar or create a new one.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
