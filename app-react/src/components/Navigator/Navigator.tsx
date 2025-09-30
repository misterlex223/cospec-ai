import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import './Navigator.css';

interface NavigatorProps {
  className?: string;
}

interface HistoryItem {
  path: string;
  name: string;
  timestamp: number;
}

type ViewMode = 'history' | 'alphabetical' | 'tree';

export function Navigator({ className }: NavigatorProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('history');
  const [currentIndex, setCurrentIndex] = useState(-1);

  // 當路徑變更時，更新歷史記錄
  useEffect(() => {
    const currentPath = location.pathname.replace('/edit/', '');
    
    // 如果是目錄路徑，不添加到歷史記錄
    if (currentPath.endsWith('/') || !currentPath.includes('.')) {
      return;
    }
    
    // 檢查是否已經存在於歷史記錄中
    const existingIndex = history.findIndex(item => item.path === currentPath);
    
    if (existingIndex !== -1) {
      // 如果已存在，更新時間戳並移到最前面
      const updatedHistory = [...history];
      const item = updatedHistory.splice(existingIndex, 1)[0];
      item.timestamp = Date.now();
      updatedHistory.unshift(item);
      setHistory(updatedHistory);
      setCurrentIndex(0);
    } else {
      // 如果不存在，添加新記錄
      const fileName = currentPath.split('/').pop() || currentPath;
      const newItem: HistoryItem = {
        path: currentPath,
        name: fileName,
        timestamp: Date.now()
      };
      setHistory([newItem, ...history]);
      setCurrentIndex(0);
    }
  }, [location.pathname]);

  // 導航到上一個文件
  const goBack = () => {
    if (currentIndex < history.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      navigate(`/edit/${history[nextIndex].path}`);
    }
  };

  // 導航到下一個文件
  const goForward = () => {
    if (currentIndex > 0) {
      const nextIndex = currentIndex - 1;
      setCurrentIndex(nextIndex);
      navigate(`/edit/${history[nextIndex].path}`);
    }
  };

  // 導航到指定文件
  const goToFile = (path: string) => {
    navigate(`/edit/${path}`);
    setIsDropdownOpen(false);
  };

  // 根據當前視圖模式獲取排序後的歷史記錄
  const getSortedHistory = () => {
    switch (viewMode) {
      case 'alphabetical':
        return [...history].sort((a, b) => a.name.localeCompare(b.name));
      case 'history':
        return history; // 已經按時間戳排序
      case 'tree':
        return history; // 樹狀結構在渲染時處理
      default:
        return history;
    }
  };

  // 將歷史記錄轉換為樹狀結構
  const getTreeStructure = () => {
    const tree: Record<string, HistoryItem[]> = {};
    
    history.forEach(item => {
      const pathParts = item.path.split('/');
      const dirPath = pathParts.length > 1 ? pathParts.slice(0, -1).join('/') : 'root';
      
      if (!tree[dirPath]) {
        tree[dirPath] = [];
      }
      
      tree[dirPath].push(item);
    });
    
    return tree;
  };

  // 渲染樹狀結構
  const renderTreeView = () => {
    const tree = getTreeStructure();
    
    return (
      <div className="navigator-tree">
        {Object.entries(tree).map(([dirPath, items]) => (
          <div key={dirPath} className="navigator-tree-group">
            <div className="navigator-tree-header">
              {dirPath === 'root' ? 'Root' : dirPath}
            </div>
            <div className="navigator-tree-items">
              {items.map(item => (
                <button
                  key={item.path}
                  className={cn(
                    "navigator-item",
                    location.pathname === `/edit/${item.path}` && "active"
                  )}
                  onClick={() => goToFile(item.path)}
                >
                  <span className="navigator-item-icon">📄</span>
                  <span className="navigator-item-name">{item.name}</span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  };

  // 渲染列表視圖（歷史或字母排序）
  const renderListView = () => {
    const sortedHistory = getSortedHistory();
    
    return (
      <div className="navigator-list">
        {sortedHistory.map(item => (
          <button
            key={item.path}
            className={cn(
              "navigator-item",
              location.pathname === `/edit/${item.path}` && "active"
            )}
            onClick={() => goToFile(item.path)}
          >
            <span className="navigator-item-icon">📄</span>
            <span className="navigator-item-name">{item.name}</span>
            {viewMode === 'history' && (
              <span className="navigator-item-time">
                {new Date(item.timestamp).toLocaleTimeString()}
              </span>
            )}
          </button>
        ))}
      </div>
    );
  };

  return (
    <div className={cn("navigator", className)}>
      <div className="navigator-controls">
        <button
          className={cn("navigator-button", currentIndex >= history.length - 1 && "disabled")}
          onClick={goBack}
          disabled={currentIndex >= history.length - 1}
          title="上一頁"
        >
          <span>←</span>
        </button>
        
        <div className="navigator-dropdown-container">
          <button
            className="navigator-dropdown-button"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            title="瀏覽歷史"
          >
            <span className="navigator-current">
              {history[currentIndex]?.name || "無歷史記錄"}
            </span>
            <span className="navigator-dropdown-arrow">▼</span>
          </button>
          
          {isDropdownOpen && (
            <div className="navigator-dropdown">
              <div className="navigator-tabs">
                <button
                  className={cn("navigator-tab", viewMode === 'history' && "active")}
                  onClick={() => setViewMode('history')}
                >
                  歷史紀錄
                </button>
                <button
                  className={cn("navigator-tab", viewMode === 'alphabetical' && "active")}
                  onClick={() => setViewMode('alphabetical')}
                >
                  字母排序
                </button>
                <button
                  className={cn("navigator-tab", viewMode === 'tree' && "active")}
                  onClick={() => setViewMode('tree')}
                >
                  路徑歸納
                </button>
              </div>
              
              <div className="navigator-content">
                {history.length === 0 ? (
                  <div className="navigator-empty">無瀏覽記錄</div>
                ) : viewMode === 'tree' ? (
                  renderTreeView()
                ) : (
                  renderListView()
                )}
              </div>
            </div>
          )}
        </div>
        
        <button
          className={cn("navigator-button", currentIndex <= 0 && "disabled")}
          onClick={goForward}
          disabled={currentIndex <= 0}
          title="下一頁"
        >
          <span>→</span>
        </button>
      </div>
    </div>
  );
}
