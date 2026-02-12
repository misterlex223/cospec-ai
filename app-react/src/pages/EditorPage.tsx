import React, { useState, useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setSidebarWidth, setGraphPanelWidth } from '../store/slices/uiSlice';
import { openTab, switchTab, updateTabContent, markTabClean } from '../store/slices/tabsSlice';
import { setGraph } from '../store/slices/graphSlice';
import { FileTree } from '../components/FileTree/FileTree';
import { MarkdownEditor } from '../components/MarkdownEditor/MarkdownEditor';
import { DirectoryViewer } from '../components/DirectoryViewer/DirectoryViewer';
import { Navigator } from '../components/Navigator/Navigator';
import TabBar from '../components/TabBar/TabBar';
import GraphView from '../components/GraphView/GraphView';
import { fileApi, graphApi } from '../services/api';
import webSocketService from '../services/websocket';
import type { RootState } from '../store';

export function EditorPage() {
  // 使用 useLocation 來獲取完整的 URL 路徑
  const location = useLocation();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // 從 Redux store 獲取 sidebarWidth 和 graphPanelWidth
  const sidebarWidth = useSelector((state: RootState) => state.ui.sidebarWidth);
  const graphPanelWidth = useSelector((state: RootState) => state.ui.graphPanelWidth);
  const { openTabs, activeTabIndex } = useSelector((state: RootState) => state.tabs);

  // 添加刷新計數器狀態，用於強制重新渲染 FileTree 組件
  const [refreshKey, setRefreshKey] = useState(0);
  const [showGraph, setShowGraph] = useState(false);
  const [graphFullscreen, setGraphFullscreen] = useState(false);
  const [showFileTree, setShowFileTree] = useState(true);

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

  // 在組件加載時設置 CSS 變量和從 localStorage 加載寬度
  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', `${sidebarWidth}px`);

    // Load graph panel width from localStorage
    try {
      const savedGraphWidth = localStorage.getItem('graphPanelWidth');
      if (savedGraphWidth) {
        const width = parseInt(savedGraphWidth, 10);
        if (!isNaN(width) && width >= 300 && width <= 800) {
          dispatch(setGraphPanelWidth(width));
        }
      }
    } catch (err) {
      console.error('Failed to load graph panel width from localStorage:', err);
    }
  }, [sidebarWidth, dispatch]);

  // WebSocket listeners for graph updates
  useEffect(() => {
    const handleGraphUpdate = (data: any) => {
      console.log('[GraphUpdate] Received:', data);
      // Reload graph when updates occur
      graphApi.getGraph().then(graph => {
        dispatch(setGraph(graph));
      }).catch(err => {
        console.error('[GraphUpdate] Failed to reload graph:', err);
      });
    };

    webSocketService.addEventListener('LINK_GRAPH_UPDATED', handleGraphUpdate);
    webSocketService.addEventListener('link-graph-updated', handleGraphUpdate);

    return () => {
      webSocketService.removeEventListener('LINK_GRAPH_UPDATED', handleGraphUpdate);
      webSocketService.removeEventListener('link-graph-updated', handleGraphUpdate);
    };
  }, [dispatch]);

  // Load file content when tab is opened
  useEffect(() => {
    const loadTabContent = async (tabIndex: number) => {
      const tab = openTabs[tabIndex];
      if (!tab || tab.content) return; // Already has content

      try {
        const response = await fileApi.getFileContent(tab.filePath);
        dispatch(updateTabContent({ index: tabIndex, content: response.content }));
      } catch (err) {
        console.error(`[TabContent] Failed to load ${tab.filePath}:`, err);
      }
    };

    if (activeTabIndex >= 0) {
      loadTabContent(activeTabIndex);
    }
  }, [activeTabIndex, openTabs, dispatch]);

  // Keyboard shortcut for graph toggle
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.altKey && e.key === 'g') {
        e.preventDefault();
        if (showGraph && !graphFullscreen) {
          setGraphFullscreen(true);
        } else if (graphFullscreen) {
          setGraphFullscreen(false);
        } else {
          setShowGraph(!showGraph);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showGraph, graphFullscreen]);

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

  // 圖表面板調整大小功能
  const startGraphResize = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    console.log('Graph resize started');

    const startX = e.clientX;
    const startWidth = graphPanelWidth;

    document.body.style.cursor = 'col-resize';

    const doDrag = (moveEvent: MouseEvent) => {
      moveEvent.preventDefault();
      moveEvent.stopPropagation();

      // 計算新寬度（向左拖動增加寬度，向右拖動減少寬度）
      const newWidth = Math.max(300, Math.min(800, startWidth - (moveEvent.clientX - startX)));

      // 更新 Redux store
      dispatch(setGraphPanelWidth(newWidth));

      // 儲存到 localStorage
      try {
        localStorage.setItem('graphPanelWidth', newWidth.toString());
      } catch (err) {
        console.error('Failed to save graph panel width to localStorage:', err);
      }
    };

    const stopDrag = () => {
      console.log('Graph resize ended');
      document.removeEventListener('mousemove', doDrag);
      document.removeEventListener('mouseup', stopDrag);
      document.body.style.cursor = '';
    };

    document.addEventListener('mousemove', doDrag);
    document.addEventListener('mouseup', stopDrag);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'row', width: '100%', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar - 使用直接的內聯樣式確保水平布局 */}
      {showFileTree && (
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
      )}

      {/* 可拖曳的分隔線 - 使用直接的內聯樣式設定寬度 */}
      {showFileTree && (
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
        {/* Container for visual indicators and toggle button */}
        <div style={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
          {/* Visual indicators at top */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '40%' }}>
            <div style={{ width: '2px', height: '32px', backgroundColor: '#4b5563' }}></div>
            <div style={{ width: '2px', height: '32px', backgroundColor: '#4b5563' }}></div>
          </div>

          {/* Toggle button at bottom */}
          <button
            onClick={() => setShowFileTree(false)}
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: '#4a9eff',
              color: 'white',
              border: 'none',
              borderRadius: '50%',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '16px',
              fontWeight: 'bold',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.3)',
              transition: 'background-color 0.2s ease',
              marginBottom: '10px'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a8eef'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4a9eff'}
            title="Hide File Tree"
          >
            ‹
          </button>
        </div>
      </div>
      )}

      {/* Main content */}
      <div style={{ flex: 1, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'row' }}>
        {/* Editor area */}
        <div style={{ flex: 1, height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
          {/* TabBar */}
          <TabBar />

          {/* 只在非目錄模式下顯示 Navigator */}
          {filePath && !isDirectory && (
            <Navigator />
          )}

          <div style={{ flex: 1, overflow: 'auto' }}>
            {activeTabIndex >= 0 && openTabs[activeTabIndex] ? (
              <MarkdownEditor filePath={openTabs[activeTabIndex].filePath} />
            ) : filePath ? (
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
                  <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>Welcome to CoSpec AI</h3>
                  <p style={{ color: '#6b7280' }}>Select a file from the sidebar or create a new one.</p>
                  <button
                    onClick={() => setShowGraph(!showGraph)}
                    style={{
                      marginTop: '1rem',
                      padding: '0.5rem 1rem',
                      backgroundColor: '#4a9eff',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    {showGraph ? 'Hide' : 'Show'} Document Graph
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Graph panel */}
        {showGraph && !graphFullscreen && (
          <>
            <div
              className="bg-gray-300 hover:bg-blue-400 relative flex items-center justify-center"
              style={{
                cursor: 'col-resize',
                width: '8px',
                minWidth: '8px',
                maxWidth: '8px',
                height: '100%',
                boxShadow: '0 0 4px rgba(0, 0, 0, 0.2)',
                zIndex: 10
              }}
              title="拖曳調整圖表面板寬度"
              onMouseDown={startGraphResize}
            >
              <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ width: '2px', height: '32px', backgroundColor: '#4b5563' }}></div>
                  <div style={{ width: '2px', height: '32px', backgroundColor: '#4b5563' }}></div>
                </div>
              </div>
            </div>
            <div style={{ width: `${graphPanelWidth}px`, height: '100%', minWidth: '300px', maxWidth: '800px' }}>
              <GraphView
                isFullscreen={false}
                onToggleFullscreen={() => setGraphFullscreen(true)}
              />
            </div>
          </>
        )}

        {/* Fullscreen graph */}
        {graphFullscreen && (
          <GraphView
            isFullscreen={true}
            onToggleFullscreen={() => setGraphFullscreen(false)}
          />
        )}
      </div>

      {/* Graph panel toggle button - fixed at right edge */}
      {!graphFullscreen && (
        <button
          onClick={() => setShowGraph(!showGraph)}
          style={{
            position: 'fixed',
            right: showGraph ? `${graphPanelWidth + 8}px` : '0px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '24px',
            height: '80px',
            backgroundColor: '#4a9eff',
            color: 'white',
            border: 'none',
            borderRadius: showGraph ? '6px 0 0 6px' : '6px 0 0 6px',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
            boxShadow: '-2px 0 8px rgba(0, 0, 0, 0.2)',
            zIndex: 1000,
            transition: 'right 0.3s ease, background-color 0.2s ease',
            padding: '8px 4px',
            writingMode: 'vertical-rl',
            textOrientation: 'mixed'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a8eef'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4a9eff'}
          title={showGraph ? 'Hide Graph (Alt+G)' : 'Show Graph (Alt+G)'}
        >
          <span style={{ fontSize: '10px', letterSpacing: '1px' }}>GRAPH</span>
        </button>
      )}

      {/* File Tree toggle button - fixed at left edge when hidden */}
      {!showFileTree && (
        <button
          onClick={() => setShowFileTree(true)}
          style={{
            position: 'fixed',
            left: '0px',
            top: '50%',
            transform: 'translateY(-50%)',
            width: '24px',
            height: '80px',
            backgroundColor: '#4a9eff',
            color: 'white',
            border: 'none',
            borderRadius: '0 6px 6px 0',
            cursor: 'pointer',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '4px',
            fontSize: '12px',
            fontWeight: 'bold',
            boxShadow: '2px 0 8px rgba(0, 0, 0, 0.2)',
            zIndex: 1000,
            transition: 'background-color 0.2s ease',
            padding: '8px 4px',
            writingMode: 'vertical-rl',
            textOrientation: 'mixed'
          }}
          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#3a8eef'}
          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#4a9eff'}
          title="Show File Tree"
        >
          <span style={{ fontSize: '10px', letterSpacing: '1px' }}>FILES</span>
        </button>
      )}
    </div>
  );
}
