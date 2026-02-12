/**
 * FileTree Component - Pure CSS Version
 *
 * This is an example implementation using pure CSS classes from FileTree.css
 * instead of Tailwind utility classes. This approach provides:
 * - Better CSS isolation
 * - Easier maintenance
 * - Better performance (no runtime class computation)
 * - Cleaner JSX markup
 *
 * To use this version:
 * 1. Backup current FileTree.tsx
 * 2. Rename this file to FileTree.tsx
 * 3. Test thoroughly
 */

import React, { useEffect, memo, useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setFileList, setLoading, refreshFileList } from '../../store/slices/filesSlice';
import { togglePathExpanded, expandPath } from '../../store/slices/uiSlice';
import { addNotification } from '../../store/slices/notificationsSlice';
import { syncFileToContext, unsyncFileFromContext, fetchSyncStatus } from '../../store/slices/contextSlice';
import { generateFile } from '../../store/slices/profileSlice';
import { openTab } from '../../store/slices/tabsSlice';
import { fileApi, type FileInfo } from '../../services/api';
import { cn } from '../../lib/utils';
import { Button } from '../ui/button';
import { webSocketService, connectWebSocket } from '../../services/websocket';
import type { RootState } from '../../store';
import type { AppDispatch } from '../../store';
import './FileTree.css';

interface TreeNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  children?: TreeNode[];
  exists?: boolean;
  profileMetadata?: {
    required: boolean;
    documentName: string;
    description: string;
    hasPrompt: boolean;
    hasCommand: boolean;
  };
}

interface FileTreeProps {
  className?: string;
}

interface FileNodeProps {
  node: TreeNode;
  currentPath: string | null;
  expandedPaths: Set<string>;
  onFileClick: (path: string) => void;
  onDirectoryToggle: (path: string) => void;
  onDirectoryClick?: (path: string) => void;
}

const FileNode = memo(({ node, currentPath, expandedPaths, onFileClick, onDirectoryToggle, onDirectoryClick }: FileNodeProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const syncStatus = useSelector((state: RootState) => state.context.syncStatuses[node.path]);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });

  const handleContextMenu = (e: React.MouseEvent) => {
    if (node.type === 'file' && node.name.endsWith('.md')) {
      e.preventDefault();
      setMenuPosition({ x: e.clientX, y: e.clientY });
      setShowContextMenu(true);
    }
  };

  const handleSyncToContext = async () => {
    try {
      await dispatch(syncFileToContext(node.path)).unwrap();
      dispatch(addNotification({
        type: 'success',
        message: `Synced ${node.name} to context`,
        title: 'Context Sync'
      }));
    } catch (error: any) {
      dispatch(addNotification({
        type: 'error',
        message: error.message || 'Failed to sync file',
        title: 'Sync Error'
      }));
    }
    setShowContextMenu(false);
  };

  const handleUnsyncFromContext = async () => {
    try {
      await dispatch(unsyncFileFromContext(node.path)).unwrap();
      dispatch(addNotification({
        type: 'success',
        message: `Removed ${node.name} from context`,
        title: 'Context Sync'
      }));
    } catch (error: any) {
      dispatch(addNotification({
        type: 'error',
        message: error.message || 'Failed to unsync file',
        title: 'Sync Error'
      }));
    }
    setShowContextMenu(false);
  };

  const handleGenerateFile = async () => {
    try {
      dispatch(addNotification({
        type: 'info',
        message: `Generating ${node.name}...`,
        title: 'File Generation'
      }));
      await dispatch(generateFile(node.path)).unwrap();
      dispatch(addNotification({
        type: 'success',
        message: `Started generation for ${node.name}`,
        title: 'Generation Started'
      }));
      setTimeout(() => {
        dispatch(refreshFileList());
      }, 2000);
    } catch (error: any) {
      dispatch(addNotification({
        type: 'error',
        message: error.message || 'Failed to generate file',
        title: 'Generation Error'
      }));
    }
    setShowContextMenu(false);
  };

  const handleOpenInNewTab = async () => {
    try {
      const response = await fileApi.getFileContent(node.path);
      dispatch(openTab({
        filePath: node.path,
        content: response.content,
        mode: 'new'
      }));
    } catch (error: any) {
      dispatch(addNotification({
        type: 'error',
        message: error.message || 'Failed to open file',
        title: 'Open Error'
      }));
    }
    setShowContextMenu(false);
  };

  useEffect(() => {
    const handleClick = () => setShowContextMenu(false);
    if (showContextMenu) {
      document.addEventListener('click', handleClick);
      return () => document.removeEventListener('click', handleClick);
    }
  }, [showContextMenu]);

  const getSyncIcon = () => {
    if (!syncStatus || syncStatus.status === 'not-synced') return null;
    switch (syncStatus.status) {
      case 'synced': return '✓';
      case 'syncing': return '⟳';
      case 'error': return '✗';
      case 'auto-eligible': return '●';
      default: return null;
    }
  };

  const getSyncStatusClass = () => {
    if (!syncStatus) return '';
    switch (syncStatus.status) {
      case 'synced': return 'synced';
      case 'syncing': return 'syncing';
      case 'error': return 'error';
      case 'auto-eligible': return 'auto-eligible';
      default: return '';
    }
  };

  if (node.type === 'directory') {
    const isExpanded = expandedPaths.has(node.path);
    return (
      <div className="group">
        <div className="file-tree-directory">
          <span
            className={cn('file-tree-chevron', isExpanded && 'expanded')}
            onClick={() => onDirectoryToggle(node.path)}
          >
            ▶
          </span>
          <span className="file-tree-folder-icon">
            📁
          </span>
          <span
            className="file-tree-directory-name"
            onClick={() => onDirectoryClick ? onDirectoryClick(node.path) : onDirectoryToggle(node.path)}
          >
            {node.name}
          </span>
        </div>
        {isExpanded && node.children && (
          <div className="file-tree-children">
            <TreeList
              nodes={node.children}
              currentPath={currentPath}
              expandedPaths={expandedPaths}
              onFileClick={onFileClick}
              onDirectoryToggle={onDirectoryToggle}
              onDirectoryClick={onDirectoryClick}
            />
          </div>
        )}
      </div>
    );
  } else {
    const isMissing = node.exists === false;
    const isRequired = node.profileMetadata?.required;
    const isSelected = currentPath === node.path;

    return (
      <>
        <div
          className={cn(
            'file-tree-file',
            isMissing && 'missing',
            isSelected && 'selected'
          )}
          onClick={() => !isMissing && onFileClick(node.path)}
          onContextMenu={handleContextMenu}
          title={isRequired ? `Required by profile: ${node.profileMetadata?.documentName}\n${node.profileMetadata?.description}` : undefined}
        >
          <span className={cn('file-tree-file-icon', isMissing ? 'missing' : 'normal')}>
            {isMissing ? '⚠️' : '📄'}
          </span>
          <span className={cn(
            'file-tree-file-name',
            isSelected && 'selected',
            isMissing && 'missing'
          )}>
            {node.name}
          </span>
          <div className="file-tree-badges">
            {isMissing && (
              <span className="file-tree-badge missing">
                Missing
              </span>
            )}
            {isRequired && !isMissing && (
              <span className="file-tree-badge required">
                Required
              </span>
            )}
            {getSyncIcon() && (
              <span className={cn('file-tree-sync-icon', getSyncStatusClass())}>
                {getSyncIcon()}
              </span>
            )}
          </div>
        </div>
        {showContextMenu && (
          <div
            className="file-tree-context-menu"
            style={{ left: `${menuPosition.x}px`, top: `${menuPosition.y}px` }}
          >
            {!isMissing && (
              <>
                <button
                  className="file-tree-context-menu-item"
                  onClick={handleOpenInNewTab}
                >
                  <span>📑</span>
                  <span>Open in New Tab</span>
                </button>
                <div className="file-tree-context-menu-divider"></div>
              </>
            )}

            {isRequired && node.profileMetadata?.hasCommand && (
              <>
                <button
                  className="file-tree-context-menu-item"
                  onClick={handleGenerateFile}
                >
                  <span>⚡</span>
                  <span>{isMissing ? 'Generate from Profile' : 'Regenerate'}</span>
                </button>
                <div className="file-tree-context-menu-divider"></div>
              </>
            )}

            {syncStatus?.status === 'synced' ? (
              <button
                className="file-tree-context-menu-item"
                onClick={handleUnsyncFromContext}
              >
                <span>✗</span>
                <span>Remove from Context</span>
              </button>
            ) : (
              <button
                className="file-tree-context-menu-item"
                onClick={handleSyncToContext}
              >
                <span>☁</span>
                <span>Sync to Context</span>
              </button>
            )}
          </div>
        )}
      </>
    );
  }
});

interface TreeListProps {
  nodes: TreeNode[];
  currentPath: string | null;
  expandedPaths: Set<string>;
  onFileClick: (path: string) => void;
  onDirectoryToggle: (path: string) => void;
  onDirectoryClick?: (path: string) => void;
}

const TreeList = memo(({ nodes, currentPath, expandedPaths, onFileClick, onDirectoryToggle, onDirectoryClick }: TreeListProps) => {
  return (
    <ul className="file-tree-list">
      {nodes.map((node) => (
        <li key={node.path}>
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

function FileTreeComponent({ className }: FileTreeProps) {
  const dispatch = useDispatch();
  const files = useSelector((state: RootState) => state.files.fileList);
  const loading = useSelector((state: RootState) => state.files.loading);
  const error = useSelector((state: RootState) => state.files.error);
  const refreshCounter = useSelector((state: RootState) => state.files.refreshCounter);
  const expandedPathsSet = useSelector((state: RootState) => new Set(state.ui.expandedPaths));
  const [treeData, setTreeData] = React.useState<TreeNode[]>([]);
  const navigate = useNavigate();
  const [lastUpdateTime, setLastUpdateTime] = useState(0);

  const currentPath = window.location.pathname.startsWith('/edit/')
    ? window.location.pathname.substring(6)
    : null;

  const fetchFiles = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) {
        dispatch(setLoading(true));
      }

      const fileList = await fileApi.getAllFiles();
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

  const refreshFiles = useCallback(async () => {
    try {
      dispatch(setLoading(true));
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

  useEffect(() => {
    fetchFiles(files.length === 0);
  }, [refreshCounter, fetchFiles, files.length]);

  useEffect(() => {
    connectWebSocket();

    const handleFileAdded = (data: any) => {
      console.log('File added via WebSocket:', data);
      fetchFiles(false);
    };

    const handleFileChanged = (data: any) => {
      console.log('File changed via WebSocket:', data);
    };

    const handleFileDeleted = (data: any) => {
      console.log('File deleted via WebSocket:', data);
      fetchFiles(false);
    };

    webSocketService.addEventListener('FILE_ADDED', handleFileAdded);
    webSocketService.addEventListener('FILE_CHANGED', handleFileChanged);
    webSocketService.addEventListener('FILE_DELETED', handleFileDeleted);

    const handleConnection = (data: any) => {
      if (data.status === 'connected') {
        console.log('WebSocket connected, fetching files...');
        fetchFiles(false);
      }
    };

    webSocketService.addEventListener('connection', handleConnection);

    const pollInterval = 60000;
    const interval = setInterval(() => {
      if (webSocketService.isConnected()) {
        return;
      }

      const now = Date.now();
      const timeSinceLastUpdate = now - lastUpdateTime;

      if (lastUpdateTime > 0 && timeSinceLastUpdate < 5000) {
        console.log('Skipping poll, last update was too recent');
        return;
      }

      console.log('WebSocket not connected, using polling as fallback');
      fetchFiles(false);
    }, pollInterval);

    return () => {
      clearInterval(interval);
      webSocketService.removeEventListener('FILE_ADDED', handleFileAdded);
      webSocketService.removeEventListener('FILE_CHANGED', handleFileChanged);
      webSocketService.removeEventListener('FILE_DELETED', handleFileDeleted);
      webSocketService.removeEventListener('connection', handleConnection);
    };
  }, [fetchFiles, lastUpdateTime]);

  useEffect(() => {
    if (currentPath) {
      const isDirectory = currentPath.endsWith('/') || !currentPath.includes('.');
      const pathToExpand = isDirectory ? currentPath : currentPath.substring(0, currentPath.lastIndexOf('/'));
      const pathParts = pathToExpand.split('/');
      let currentDirPath = '';

      for (let i = 0; i < pathParts.length; i++) {
        if (pathParts[i]) {
          currentDirPath = currentDirPath
            ? `${currentDirPath}/${pathParts[i]}`
            : pathParts[i];
          dispatch(expandPath(currentDirPath));
        }
      }
    }
  }, [currentPath, dispatch]);

  useEffect(() => {
    const buildTree = (files: FileInfo[]) => {
      const root: TreeNode[] = [];
      const directoryMap: Record<string, TreeNode> = {};

      if (!files || !Array.isArray(files)) {
        console.warn('Files is not an array:', files);
        return root;
      }

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

      files.forEach(file => {
        const pathParts = file.path.split('/');
        const fileName = pathParts[pathParts.length - 1];
        const parentPath = pathParts.slice(0, -1).join('/');

        const fileNode: TreeNode = {
          name: fileName,
          type: 'file',
          path: file.path,
          exists: file.exists !== undefined ? file.exists : true,
          profileMetadata: file.profileMetadata,
        };

        if (parentPath && directoryMap[parentPath]) {
          directoryMap[parentPath].children = directoryMap[parentPath].children || [];
          directoryMap[parentPath].children?.push(fileNode);
        } else {
          root.push(fileNode);
        }
      });

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

  const handleFileClick = (path: string) => {
    navigate(`/edit/${path}`);
  };

  const handleDirectoryClick = (path: string) => {
    const dirPath = path.endsWith('/') ? path : `${path}/`;
    navigate(`/edit/${dirPath}`);
  };

  const handleDirectoryToggle = (path: string) => {
    dispatch(togglePathExpanded(path));
  };

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
    return <div className="file-tree-loading">Loading files...</div>;
  }

  if (error) {
    return <div className="file-tree-loading" style={{ color: 'red' }}>{error}</div>;
  }

  return (
    <div className={cn("file-tree-container", className)}>
      <div className="file-tree-header">
        <h2 className="file-tree-title">Files</h2>
        <div className="file-tree-actions">
          <button
            className="file-tree-refresh-btn"
            onClick={refreshFiles}
            title="Refresh file list"
          >
            🔄
          </button>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={() => {
              let fileName = prompt('Enter new file name:') || '';
              if (fileName) {
                if (!fileName.toLowerCase().endsWith('.md')) {
                  fileName = `${fileName}.md`;
                }

                fileApi.createFile(fileName, '# New File\n\nStart writing here...')
                  .then(() => {
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
        <div className="file-tree-empty">No files found</div>
      )}
    </div>
  );
}

export const FileTree = React.memo(FileTreeComponent);
