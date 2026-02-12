/**
 * TabBar Component - Horizontal tab bar for multi-document editing
 * Keyboard shortcuts: Alt+Left/Right (navigate), Alt+W (close), Alt+Shift+W (close all)
 */

import React, { useEffect, useCallback, useState } from 'react';
import { useAppSelector, useAppDispatch } from '../../store/hooks';
import { closeTab, switchTab, closeAllTabs, closeOtherTabs, type Tab } from '../../store/slices/tabsSlice';
import { X, ChevronLeft, ChevronRight, XCircle } from 'lucide-react';
import TabContextMenu from './TabContextMenu';
import './TabBar.css';

const TabBar: React.FC = () => {
  const dispatch = useAppDispatch();
  const { openTabs, activeTabIndex } = useAppSelector((state) => state.tabs);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; tabIndex: number } | null>(null);

  // Keyboard shortcuts (non-conflicting with browser)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt+Left: Previous tab
      if (e.altKey && e.key === 'ArrowLeft') {
        e.preventDefault();
        if (activeTabIndex > 0) {
          dispatch(switchTab(activeTabIndex - 1));
        }
      }
      // Alt+Right: Next tab
      else if (e.altKey && e.key === 'ArrowRight') {
        e.preventDefault();
        if (activeTabIndex < openTabs.length - 1) {
          dispatch(switchTab(activeTabIndex + 1));
        }
      }
      // Alt+W: Close active tab
      else if (e.altKey && e.key === 'w') {
        e.preventDefault();
        if (activeTabIndex >= 0) {
          dispatch(closeTab(activeTabIndex));
        }
      }
      // Alt+Shift+W: Close all tabs
      else if (e.altKey && e.shiftKey && e.key === 'W') {
        e.preventDefault();
        if (window.confirm('Close all tabs? Unsaved changes will be lost.')) {
          dispatch(closeAllTabs());
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [dispatch, activeTabIndex, openTabs.length]);

  const handleTabClick = (index: number) => {
    dispatch(switchTab(index));
  };

  const handleCloseTab = (e: React.MouseEvent, index: number) => {
    e.stopPropagation();
    dispatch(closeTab(index));
  };

  const handleMiddleClick = (e: React.MouseEvent, index: number) => {
    if (e.button === 1) {
      e.preventDefault();
      dispatch(closeTab(index));
    }
  };

  const handlePreviousTab = () => {
    if (activeTabIndex > 0) {
      dispatch(switchTab(activeTabIndex - 1));
    }
  };

  const handleNextTab = () => {
    if (activeTabIndex < openTabs.length - 1) {
      dispatch(switchTab(activeTabIndex + 1));
    }
  };

  const handleCloseActiveTab = () => {
    if (activeTabIndex >= 0) {
      dispatch(closeTab(activeTabIndex));
    }
  };

  const handleCloseOtherTabs = () => {
    if (activeTabIndex >= 0) {
      dispatch(closeOtherTabs(activeTabIndex));
    }
  };

  const handleCloseAllTabs = () => {
    if (window.confirm('Close all tabs? Unsaved changes will be lost.')) {
      dispatch(closeAllTabs());
    }
  };

  const getTabLabel = (tab: Tab) => {
    const parts = tab.filePath.split('/');
    const fileName = parts[parts.length - 1].replace('.md', '');
    return tab.isDirty ? `${fileName} *` : fileName;
  };

  const getTabTitle = (tab: Tab) => {
    return tab.filePath;
  };

  const handleTabContextMenu = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, tabIndex: index });
  };

  const handleCopyPath = (tabIndex: number) => {
    const tab = openTabs[tabIndex];
    if (tab) {
      navigator.clipboard.writeText(tab.filePath);
    }
  };

  if (openTabs.length === 0) {
    return null;
  }

  return (
    <div className="tab-bar">
      <div className="tab-bar-controls">
        <button
          className="tab-control-btn"
          onClick={handlePreviousTab}
          disabled={activeTabIndex <= 0}
          title="Previous tab (Alt+Left)"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          className="tab-control-btn"
          onClick={handleNextTab}
          disabled={activeTabIndex >= openTabs.length - 1}
          title="Next tab (Alt+Right)"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="tab-bar-scroll">
        {openTabs.map((tab, index) => (
          <div
            key={`${tab.filePath}-${index}`}
            className={`tab ${index === activeTabIndex ? 'tab-active' : ''}`}
            onClick={() => handleTabClick(index)}
            onMouseDown={(e) => handleMiddleClick(e, index)}
            onContextMenu={(e) => handleTabContextMenu(e, index)}
            title={getTabTitle(tab)}
          >
            <span className="tab-label">{getTabLabel(tab)}</span>
            <button
              className="tab-close"
              onClick={(e) => handleCloseTab(e, index)}
              aria-label="Close tab"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>

      <div className="tab-bar-actions">
        <button
          className="tab-action-btn"
          onClick={handleCloseActiveTab}
          disabled={activeTabIndex < 0}
          title="Close active tab (Alt+W)"
        >
          <X size={16} />
        </button>
        <button
          className="tab-action-btn"
          onClick={handleCloseOtherTabs}
          disabled={openTabs.length <= 1}
          title="Close other tabs"
        >
          <XCircle size={16} />
        </button>
        <div className="tab-bar-info">
          {openTabs.length}/10
        </div>
      </div>

      {contextMenu && (
        <TabContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          tabIndex={contextMenu.tabIndex}
          tabPath={openTabs[contextMenu.tabIndex]?.filePath || ''}
          onClose={() => setContextMenu(null)}
          onCloseTab={() => dispatch(closeTab(contextMenu.tabIndex))}
          onCloseOtherTabs={() => dispatch(closeOtherTabs(contextMenu.tabIndex))}
          onCloseAllTabs={handleCloseAllTabs}
          onCopyPath={() => handleCopyPath(contextMenu.tabIndex)}
        />
      )}
    </div>
  );
};

export default TabBar;
