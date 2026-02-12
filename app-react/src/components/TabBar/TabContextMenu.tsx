/**
 * TabContextMenu Component - Right-click context menu for tabs
 */

import React, { useEffect, useRef } from 'react';
import { X, XCircle, Copy } from 'lucide-react';
import './TabContextMenu.css';

interface TabContextMenuProps {
  x: number;
  y: number;
  tabIndex: number;
  tabPath: string;
  onClose: () => void;
  onCloseTab: () => void;
  onCloseOtherTabs: () => void;
  onCloseAllTabs: () => void;
  onCopyPath: () => void;
}

const TabContextMenu: React.FC<TabContextMenuProps> = ({
  x,
  y,
  tabIndex,
  tabPath,
  onClose,
  onCloseTab,
  onCloseOtherTabs,
  onCloseAllTabs,
  onCopyPath
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  const handleItemClick = (action: () => void) => {
    action();
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="tab-context-menu"
      style={{
        position: 'fixed',
        left: `${x}px`,
        top: `${y}px`,
        zIndex: 9999
      }}
    >
      <div className="tab-context-menu-item" onClick={() => handleItemClick(onCloseTab)}>
        <X size={14} />
        <span>Close Tab</span>
        <span className="tab-context-menu-shortcut">Alt+W</span>
      </div>
      <div className="tab-context-menu-item" onClick={() => handleItemClick(onCloseOtherTabs)}>
        <XCircle size={14} />
        <span>Close Other Tabs</span>
      </div>
      <div className="tab-context-menu-separator" />
      <div className="tab-context-menu-item" onClick={() => handleItemClick(onCloseAllTabs)}>
        <XCircle size={14} />
        <span>Close All Tabs</span>
        <span className="tab-context-menu-shortcut">Alt+Shift+W</span>
      </div>
      <div className="tab-context-menu-separator" />
      <div className="tab-context-menu-item" onClick={() => handleItemClick(onCopyPath)}>
        <Copy size={14} />
        <span>Copy Path</span>
      </div>
      <div className="tab-context-menu-info">
        {tabPath}
      </div>
    </div>
  );
};

export default TabContextMenu;
