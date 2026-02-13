import { useEffect, memo, useCallback, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { setFileList, setLoading, refreshFileList } from '../../store/slices/filesSlice';
import { togglePathExpanded, expandPath } from '../../store/slices/uiSlice';
import { addNotification } from '../../store/slices/notificationsSlice';
import { Search, File, ChevronDown, ChevronRight, FolderOpen, FolderClosed } from 'lucide-react';
import type { RootState } from '../../store';
import { fileApi } from '../../services/api';
import webSocketService from '../../services/websocket';
import { cn } from '../../lib/utils';
import './FileTree.css';

interface TreeNode {
  name: string;
  type: 'file' | 'directory';
  path: string;
  children?: TreeNode[];
  exists?: boolean;
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
  depth: number;
}

const FileNode = memo(({ node, currentPath, expandedPaths, onFileClick, onDirectoryToggle, onDirectoryClick, depth }: FileNodeProps) => {
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const dispatch = useDispatch();

  const handleContextMenu = (e: React.MouseEvent) => {
    if (node.type === 'file' && node.name.endsWith('.md')) {
      e.preventDefault();
      setMenuPosition({ x: e.clientX, y: e.clientY });
      setShowContextMenu(true);
    }
  };

  const isExpanded = expandedPaths.has(node.path);
  const isSelected = currentPath === node.path;
  const isMissing = node.exists === false;

  return (
    <div className="file-tree-node">
      {node.type === 'directory' ? (
        <div className="file-tree-directory" style={{ paddingLeft: `${depth * 16}px` }}>
          <span
            className={cn('file-tree-chevron', isExpanded && 'expanded')}
            onClick={() => onDirectoryToggle(node.path)}
          >
            {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          </span>
          <span className="file-tree-folder-icon">
            {isExpanded ? <FolderOpen size={18} /> : <FolderClosed size={18} />}
          </span>
          <span
            className="file-tree-directory-name"
            onClick={() => onDirectoryClick ? onDirectoryClick(node.path) : onDirectoryToggle(node.path)}
            title={node.name}
          >
            {node.name}
          </span>
        </div>
      ) : (
        <div
          className={cn(
            'file-tree-file',
            isMissing && 'missing',
            isSelected && 'selected'
          )}
          style={{ paddingLeft: `${depth * 16 + 24}px` }}
          onClick={() => !isMissing && onFileClick(node.path)}
          onContextMenu={handleContextMenu}
          title={node.name}
        >
          <span className={cn('file-tree-file-icon', isMissing && 'missing')}>
            {isMissing ? <File className="text-amber-600" size={16} /> : <File className="text-slate-600" size={16} />}
          </span>
          <span className={cn('file-tree-file-name', isSelected && 'selected', isMissing && 'missing')} title={node.name}>
            {node.name}
          </span>
        </div>
      )}

      {showContextMenu && (
        <div
          className="file-tree-context-menu"
          style={{ left: menuPosition.x + 'px', top: menuPosition.y + 'px' }}
          onClick={(e) => {
            e.stopPropagation();
            setShowContextMenu(false);
          }}
        >
          <button
            className="file-tree-context-menu-item"
            onClick={() => {
              navigator.clipboard.writeText(node.path);
              dispatch(addNotification({
                type: 'success',
                message: `Copied ${node.name} path to clipboard`,
                title: 'Copy Path'
              }));
              setShowContextMenu(false);
            }}
          >
            <File size={14} />
            <span>Copy Path</span>
          </button>
        </div>
      )}
    </div>
  );
});

FileNode.displayName = 'FileNode';

interface TreeListProps {
  nodes: TreeNode[];
  currentPath: string | null;
  expandedPaths: Set<string>;
  onFileClick: (path: string) => void;
  onDirectoryToggle: (path: string) => void;
  onDirectoryClick?: (path: string) => void;
  depth: number;
}

const TreeList = memo(({ nodes, currentPath, expandedPaths, onFileClick, onDirectoryToggle, onDirectoryClick, depth }: TreeListProps) => {
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
            depth={depth}
          />
          {node.type === 'directory' && expandedPaths.has(node.path) && node.children && (
            <TreeList
              nodes={node.children}
              currentPath={currentPath}
              expandedPaths={expandedPaths}
              onFileClick={onFileClick}
              onDirectoryToggle={onDirectoryToggle}
              onDirectoryClick={onDirectoryClick}
              depth={depth + 1}
            />
          )}
        </li>
      ))}
    </ul>
  );
});

TreeList.displayName = 'TreeList';

type SearchInputProps = {
  value: string;
  onChange: (value: string) => void;
  onClear: () => void;
}

const SearchInput = memo(({ value, onChange, onClear }: SearchInputProps) => {
  return (
    <div className="file-tree-search">
      <Search size={16} className="file-tree-search-icon" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search files..."
        className="file-tree-search-input"
      />
      {value && (
        <button
          className="file-tree-search-clear"
          onClick={onClear}
          title="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  );
});

SearchInput.displayName = 'SearchInput';

export function FileTreeComponent({ className }: FileTreeProps) {
  const dispatch = useDispatch();
  const files = useSelector((state: RootState) => state.files.fileList);
  const loading = useSelector((state: RootState) => state.files.loading);
  const error = useSelector((state: RootState) => state.files.error);
  const refreshCounter = useSelector((state: RootState) => state.files.refreshCounter);
  const expandedPathsSet = useSelector((state: RootState) => new Set(state.ui.expandedPaths));
  const [treeData, setTreeData] = useState<TreeNode[]>([]);
  const navigate = useNavigate();
  const [lastUpdateTime, setLastUpdateTime] = useState(0);

  const [searchQuery, setSearchQuery] = useState('');
  const [isAllCollapsed, setIsAllCollapsed] = useState(false);

  const currentPath = window.location.pathname.startsWith('/edit/')
    ? window.location.pathname.substring(6)
    : null;

  useEffect(() => {
    if (!files || !Array.isArray(files)) {
      console.warn('Files is not an array:', files);
      return;
    }

    const buildTree = (fileList: typeof files): TreeNode[] => {
      const tree: TreeNode[] = [];
      const dirMap = new Map<string, TreeNode>();

      for (const file of fileList) {
        const parts = file.path.split('/');

        if (parts.length > 1) {
          let currentPath = '';
          for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            currentPath = currentPath ? `${currentPath}/${part}` : part;

            if (!dirMap.has(currentPath)) {
              const dirNode: TreeNode = {
                name: part,
                type: 'directory',
                path: currentPath,
                children: []
              };
              dirMap.set(currentPath, dirNode);

              const parentPath = currentPath.substring(0, currentPath.lastIndexOf('/'));
              if (parentPath && dirMap.has(parentPath)) {
                dirMap.get(parentPath)!.children!.push(dirNode);
              } else if (!parentPath) {
                tree.push(dirNode);
              }
            }
          }
        }
      }

      for (const file of fileList) {
        const parts = file.path.split('/');
        const fileName = parts[parts.length - 1];

        const fileNode: TreeNode = {
          name: fileName,
          type: 'file',
          path: file.path,
          exists: file.exists
        };

        if (parts.length > 1) {
          const parentPath = file.path.substring(0, file.path.lastIndexOf('/'));
          if (dirMap.has(parentPath)) {
            dirMap.get(parentPath)!.children!.push(fileNode);
          }
        } else {
          tree.push(fileNode);
        }
      }

      return tree;
    };

    const newTreeData = buildTree(files);
    setTreeData(newTreeData);
  }, [files]);

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

  const filteredTreeData = useMemo(() => {
    if (!searchQuery.trim()) return treeData;

    const filterNodes = (nodes: TreeNode[]): TreeNode[] => {
      const result: TreeNode[] = [];

      for (const node of nodes) {
        const matchesSearch = node.name.toLowerCase().includes(searchQuery.toLowerCase());

        if (matchesSearch) {
          result.push(node);
        } else if (node.type === 'directory' && node.children) {
          const filteredChildren = filterNodes(node.children);
          if (filteredChildren.length > 0) {
            result.push({ ...node, children: filteredChildren });
          }
        }
      }

      return result;
    };

    return filterNodes(treeData);
  }, [treeData, searchQuery]);

  const expandAll = useCallback(() => {
    const collectDirs = (nodes: TreeNode[], dirs: string[] = []): string[] => {
      for (const node of nodes) {
        if (node.type === 'directory') {
          dirs.push(node.path);
          if (node.children) {
            collectDirs(node.children, dirs);
          }
        }
      }
      return dirs;
    };

    const allDirs = collectDirs(treeData);
    for (const path of allDirs) {
      dispatch(expandPath(path));
    }
    setIsAllCollapsed(false);
  }, [dispatch, treeData]);

  const collapseAll = useCallback(() => {
    const collectDirs = (nodes: TreeNode[], dirs: string[] = []): string[] => {
      for (const node of nodes) {
        if (node.type === 'directory') {
          dirs.push(node.path);
          if (node.children) {
            collectDirs(node.children, dirs);
          }
        }
      }
      return dirs;
    };

    const allDirs = collectDirs(treeData);
    for (const path of allDirs) {
      dispatch(togglePathExpanded(path));
    }
    setIsAllCollapsed(true);
  }, [dispatch, treeData]);

  useEffect(() => {
    fetchFiles(files.length === 0);
  }, [refreshCounter, fetchFiles, files.length]);

  useEffect(() => {
    webSocketService.connect();

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

  const handleFileClick = (path: string) => {
    navigate(`/edit/${path}`);
  };

  const handleDirectoryClick = (path: string) => {
    navigate(`/edit/${path}`);
  };

  const handleDirectoryToggle = (path: string) => {
    dispatch(togglePathExpanded(path));
  };

  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
  };

  if (loading) {
    return <div className="file-tree-loading">Loading files...</div>;
  }

  if (error) {
    return <div className="file-tree-loading" style={{ color: 'red' }}>{error}</div>;
  }

  const displayData = searchQuery.trim() ? filteredTreeData : treeData;
  const hasResults = displayData.length > 0;

  return (
    <div className={cn("file-tree-container", className)}>
      <div className="file-tree-header">
        <div className="file-tree-header-left">
          <h2 className="file-tree-title">Files</h2>
          <div className="file-tree-actions">
            <SearchInput
              value={searchQuery}
              onChange={handleSearchChange}
              onClear={handleClearSearch}
            />
            <button
              className="file-tree-refresh-btn"
              onClick={refreshFiles}
              title="Refresh file list"
            >
              🔄
            </button>
            <button
              className={cn('file-tree-collapse-btn', isAllCollapsed && 'collapsed')}
              onClick={isAllCollapsed ? expandAll : collapseAll}
              title={isAllCollapsed ? 'Expand all' : 'Collapse all'}
            >
              {isAllCollapsed ? <FolderOpen size={16} /> : <FolderClosed size={16} />}
            </button>
          </div>
        </div>
      </div>

      {hasResults ? (
        <TreeList
          nodes={displayData}
          currentPath={currentPath}
          expandedPaths={expandedPathsSet}
          onFileClick={handleFileClick}
          onDirectoryToggle={handleDirectoryToggle}
          onDirectoryClick={handleDirectoryClick}
          depth={0}
        />
      ) : (
        <div className="file-tree-empty">
          {searchQuery.trim() ? (
            <>
              <Search size={32} className="text-muted-400 mb-4" />
              <p>No files found matching &quot;{searchQuery}&quot;</p>
            </>
          ) : (
            <>
              <File className="text-muted-400 mb-4" size={32} />
              <p>No files found</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export const FileTree = memo(FileTreeComponent);
