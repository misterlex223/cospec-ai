import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from './auth/AuthContext';
import { FolderIcon, FileIcon, ChevronRightIcon, FolderPlusIcon, FilePlusIcon, MoreHorizontalIcon, TrashIcon, EditIcon, MoveIcon } from 'lucide-react';

interface File {
  id: string;
  name: string;
  path: string;
  size: number;
  git_status?: string;
  created_at: number;
  updated_at: number;
  display_name?: string;
  is_directory?: boolean;
}

interface Project {
  id: string;
  name: string;
  organization_id: string;
  organization_name: string;
  github_repo?: string;
  github_branch?: string;
}

export default function ProjectFiles() {
  const { projectId, directoryPath } = useParams<{ projectId: string, directoryPath?: string }>();
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [newDirName, setNewDirName] = useState('');
  const [creating, setCreating] = useState(false);
  const [creatingDir, setCreatingDir] = useState(false);
  const [currentPath, setCurrentPath] = useState('');
  const [pathSegments, setPathSegments] = useState<{name: string, path: string}[]>([]);
  const [githubConnecting, setGithubConnecting] = useState(false);
  const [githubRepo, setGithubRepo] = useState('');
  const [githubBranch, setGithubBranch] = useState('main');
  const [githubToken, setGithubToken] = useState('');
  const [pulling, setPulling] = useState(false);
  const [pushing, setPushing] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [directoryInfo, setDirectoryInfo] = useState<{[key: string]: string}>({});
  const [showFileMenu, setShowFileMenu] = useState<string | null>(null);
  const [showDirMenu, setShowDirMenu] = useState<string | null>(null);
  const [renamingDir, setRenamingDir] = useState<string | null>(null);
  const [movingFile, setMovingFile] = useState<File | null>(null);
  const [targetPath, setTargetPath] = useState('');
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [availableDirs, setAvailableDirs] = useState<{id: string, name: string, path: string}[]>([]);
  
  // Refs for click outside detection
  const fileMenuRef = useRef<HTMLDivElement>(null);
  const dirMenuRef = useRef<HTMLDivElement>(null);
  
  // 獲取認證令牌
  const { token } = useAuth();

  useEffect(() => {
    if (projectId) {
      fetchProject();
      
      // 設置當前路徑
      const path = directoryPath || '';
      setCurrentPath(path);
      
      // 解析路徑段
      const segments = [];
      segments.push({ name: 'Root', path: '' });
      
      if (path) {
        const parts = path.split('/').filter(Boolean);
        let currentPath = '';
        
        parts.forEach(part => {
          currentPath += '/' + part;
          segments.push({
            name: part,
            path: currentPath
          });
        });
      }
      
      setPathSegments(segments);
      fetchFiles(path);
      fetchDirectoryInfo(path);
      fetchAllDirectories(); // 獲取所有目錄用於移動文件
    }
  }, [projectId, directoryPath]);
  
  // 點擊外部關閉菜單
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (fileMenuRef.current && !fileMenuRef.current.contains(event.target as Node)) {
        setShowFileMenu(null);
      }
      if (dirMenuRef.current && !dirMenuRef.current.contains(event.target as Node)) {
        setShowDirMenu(null);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const fetchProject = async () => {
    try {
      const response = await axios.get(`/api/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setProject(response.data);
      if (response.data.github_repo) {
        setGithubRepo(response.data.github_repo);
        setGithubBranch(response.data.github_branch || 'main');
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching project:', err);
      setError('Failed to load project');
    }
  };

  const fetchFiles = async (path: string = '') => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/projects/${projectId}/files`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: {
          path: path
        }
      });
      setFiles(response.data.files || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching files:', err);
      setError('Failed to load files');
    } finally {
      setLoading(false);
    }
  };
  
  // 獲取所有目錄，用於移動文件
  const fetchAllDirectories = async () => {
    try {
      // 這個API需要在後端實現，這裡先使用現有的files API模擬
      const response = await axios.get(`/api/projects/${projectId}/files`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: {
          path: '',
          recursive: true // 假設後端支持遞歸獲取所有文件和目錄
        }
      });
      
      // 過濾出所有目錄
      const dirs = response.data.files?.filter((f: File) => f.is_directory) || [];
      
      // 添加根目錄
      const allDirs = [
        { id: 'root', name: 'Root', path: '' },
        ...dirs.map((dir: any) => ({
          id: dir.id,
          name: dir.name,
          path: dir.path
        }))
      ];
      
      setAvailableDirs(allDirs);
    } catch (err) {
      console.error('Error fetching all directories:', err);
      // 不設置錯誤，因為這是可選功能
    }
  };
  
  const fetchDirectoryInfo = async (path: string = '') => {
    try {
      const response = await axios.get(`/api/projects/${projectId}/directory-info`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: {
          path: path
        }
      });
      
      if (response.data && response.data.info) {
        setDirectoryInfo(response.data.info);
      } else {
        setDirectoryInfo({});
      }
    } catch (err) {
      console.error('Error fetching directory info:', err);
      // 不設置錯誤，因為目錄信息是可選的
      setDirectoryInfo({});
    }
  };

  const createFile = async () => {
    if (!newFileName.trim()) return;
    
    try {
      setCreating(true);
      const response = await axios.post(`/api/projects/${projectId}/files`, {
        name: newFileName,
        path: currentPath,
        content: `# ${newFileName}\n\nNew file created on ${new Date().toLocaleDateString()}`
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setFiles([...files, response.data]);
      setNewFileName('');
      setError(null);
      
      // Navigate to the new file
      navigate(`/projects/${projectId}/files/${response.data.id}`);
    } catch (err) {
      console.error('Error creating file:', err);
      setError('Failed to create file');
    } finally {
      setCreating(false);
    }
  };
  
  const createDirectory = async () => {
    if (!newDirName.trim()) return;
    
    try {
      setCreatingDir(true);
      await axios.post(`/api/projects/${projectId}/directories`, {
        name: newDirName,
        path: currentPath
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // 重新加載文件列表
      await fetchFiles(currentPath);
      setNewDirName('');
      setError(null);
    } catch (err) {
      console.error('Error creating directory:', err);
      setError('Failed to create directory');
    } finally {
      setCreatingDir(false);
    }
  };
  
  const navigateToDirectory = (dirPath: string) => {
    navigate(`/projects/${projectId}/directory${dirPath}`);
  };
  
  // 重命名目錄
  const renameDirectory = async (dirId: string, newName: string) => {
    if (!newName.trim()) return;
    
    try {
      await axios.patch(`/api/projects/${projectId}/directories/${dirId}`, {
        name: newName
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // 重新加載文件列表
      await fetchFiles(currentPath);
      setRenamingDir(null);
      setNewDirName('');
      setError(null);
    } catch (err) {
      console.error('Error renaming directory:', err);
      setError('Failed to rename directory');
    }
  };
  
  // 刪除目錄
  const deleteDirectory = async (dirId: string) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this directory? All contents will be lost.');
    if (!confirmDelete) return;
    
    try {
      await axios.delete(`/api/projects/${projectId}/directories/${dirId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        },
        params: {
          recursive: true // 遞歸刪除所有內容
        }
      });
      
      // 重新加載文件列表
      await fetchFiles(currentPath);
      setError(null);
    } catch (err) {
      console.error('Error deleting directory:', err);
      setError('Failed to delete directory');
    }
  };
  
  // 移動文件
  const moveFile = async () => {
    if (!movingFile || targetPath === undefined) return;
    
    try {
      await axios.patch(`/api/projects/${projectId}/files/${movingFile.id}/move`, {
        targetPath: targetPath
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // 重新加載文件列表
      await fetchFiles(currentPath);
      setShowMoveModal(false);
      setMovingFile(null);
      setTargetPath('');
      setError(null);
    } catch (err) {
      console.error('Error moving file:', err);
      setError('Failed to move file');
    }
  };
  
  // 目前未使用，但將在目錄信息編輯功能中使用
  // const saveDirectoryInfo = async () => {
  //   try {
  //     await axios.post(`/api/projects/${projectId}/directory-info`, {
  //       path: currentPath,
  //       info: directoryInfo
  //     }, {
  //       headers: {
  //         'Authorization': `Bearer ${token}`
  //       }
  //     });
  //     
  //     // 重新加載文件列表以更新顯示名稱
  //     await fetchFiles(currentPath);
  //   } catch (err) {
  //     console.error('Error saving directory info:', err);
  //     setError('Failed to save directory information');
  //   }
  // };

  const connectGitHub = async () => {
    if (!githubRepo.trim() || !githubToken.trim()) return;
    
    try {
      setGithubConnecting(true);
      await axios.post(`/api/projects/${projectId}/github/connect`, {
        github_repo: githubRepo,
        github_branch: githubBranch,
        github_access_token: githubToken
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Refresh project data
      await fetchProject();
      setError(null);
    } catch (err) {
      console.error('Error connecting GitHub:', err);
      setError('Failed to connect GitHub repository');
    } finally {
      setGithubConnecting(false);
    }
  };

  const pullFromGitHub = async () => {
    try {
      setPulling(true);
      await axios.post(`/api/projects/${projectId}/github/pull`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Refresh files
      await fetchFiles();
      setError(null);
    } catch (err) {
      console.error('Error pulling from GitHub:', err);
      setError('Failed to pull from GitHub');
    } finally {
      setPulling(false);
    }
  };

  const pushToGitHub = async () => {
    if (!commitMessage.trim() || selectedFiles.length === 0) return;
    
    try {
      setPushing(true);
      await axios.post(`/api/projects/${projectId}/github/push`, {
        commit_message: commitMessage,
        files: selectedFiles
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Refresh files
      await fetchFiles();
      setCommitMessage('');
      setSelectedFiles([]);
      setError(null);
    } catch (err) {
      console.error('Error pushing to GitHub:', err);
      setError('Failed to push to GitHub');
    } finally {
      setPushing(false);
    }
  };

  const toggleFileSelection = (fileId: string) => {
    if (selectedFiles.includes(fileId)) {
      setSelectedFiles(selectedFiles.filter(id => id !== fileId));
    } else {
      setSelectedFiles([...selectedFiles, fileId]);
    }
  };

  if (loading && files.length === 0) {
    return <div className="p-4">Loading files...</div>;
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        {project?.organization_id && (
          <Link to={`/organizations/${project.organization_id}`} className="text-blue-500 hover:underline">
            ← Back to {project.organization_name || 'Organization'} Projects
          </Link>
        )}
      </div>
      
      <h1 className="text-2xl font-bold mb-1">
        {project ? project.name : 'Project'} Files
      </h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      {/* 麵包屑導航 */}
      <div className="bg-gray-50 px-4 py-2 mb-4 flex items-center text-sm">
        <Link to="/personal-space" className="text-blue-500 hover:underline">個人空間</Link>
        <ChevronRightIcon className="h-4 w-4 mx-1 text-gray-400" />
        <Link to="/projects" className="text-blue-500 hover:underline">專案</Link>
        <ChevronRightIcon className="h-4 w-4 mx-1 text-gray-400" />
        <span className="text-gray-600">{project?.name || '專案'}</span>
        
        {pathSegments.length > 1 && pathSegments.map((segment, index) => (
          index > 0 && (
            <React.Fragment key={index}>
              <ChevronRightIcon className="h-4 w-4 mx-1 text-gray-400" />
              <Link 
                to={`/projects/${projectId}/directory${segment.path}`}
                className="text-blue-500 hover:underline"
              >
                {directoryInfo[segment.name] || segment.name}
              </Link>
            </React.Fragment>
          )
        ))}
      </div>
      
      <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <h2 className="text-lg font-semibold mb-2 flex items-center">
            <FilePlusIcon className="h-5 w-5 mr-1" />
            創建新文件
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={newFileName}
              onChange={(e) => setNewFileName(e.target.value)}
              placeholder="文件名稱 (e.g., document.md)"
              className="flex-1 px-3 py-2 border rounded"
            />
            <button
              onClick={createFile}
              disabled={creating || !newFileName.trim()}
              className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-blue-300"
            >
              {creating ? '創建中...' : '創建'}
            </button>
          </div>
        </div>
        
        <div>
          <h2 className="text-lg font-semibold mb-2 flex items-center">
            <FolderPlusIcon className="h-5 w-5 mr-1" />
            創建新目錄
          </h2>
          <div className="flex gap-2">
            <input
              type="text"
              value={newDirName}
              onChange={(e) => setNewDirName(e.target.value)}
              placeholder="目錄名稱"
              className="flex-1 px-3 py-2 border rounded"
            />
            <button
              onClick={createDirectory}
              disabled={creatingDir || !newDirName.trim()}
              className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-blue-300"
            >
              {creatingDir ? '創建中...' : '創建'}
            </button>
          </div>
        </div>
        
        {project?.github_repo ? (
          <div>
            <h2 className="text-lg font-semibold mb-2">GitHub Integration</h2>
            <div className="text-sm mb-2">
              Connected to: {project.github_repo}:{project.github_branch || 'main'}
            </div>
            <div className="flex gap-2">
              <button
                onClick={pullFromGitHub}
                disabled={pulling}
                className="bg-green-500 text-white px-4 py-2 rounded disabled:bg-green-300"
              >
                {pulling ? 'Pulling...' : 'Pull'}
              </button>
              <button
                onClick={() => document.getElementById('push-modal')?.classList.remove('hidden')}
                className="bg-purple-500 text-white px-4 py-2 rounded"
              >
                Push
              </button>
            </div>
          </div>
        ) : (
          <div>
            <h2 className="text-lg font-semibold mb-2">Connect GitHub Repository</h2>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                value={githubRepo}
                onChange={(e) => setGithubRepo(e.target.value)}
                placeholder="GitHub repo (e.g., username/repo)"
                className="px-3 py-2 border rounded"
              />
              <div className="flex gap-2">
                <input
                  type="text"
                  value={githubBranch}
                  onChange={(e) => setGithubBranch(e.target.value)}
                  placeholder="Branch (default: main)"
                  className="flex-1 px-3 py-2 border rounded"
                />
                <input
                  type="password"
                  value={githubToken}
                  onChange={(e) => setGithubToken(e.target.value)}
                  placeholder="GitHub token"
                  className="flex-1 px-3 py-2 border rounded"
                />
              </div>
              <button
                onClick={connectGitHub}
                disabled={githubConnecting || !githubRepo.trim() || !githubToken.trim()}
                className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-blue-300"
              >
                {githubConnecting ? 'Connecting...' : 'Connect'}
              </button>
            </div>
          </div>
        )}
      </div>
      
      {files.length === 0 ? (
        <div className="text-gray-500 text-center p-8">此目錄為空。創建一個新文件或目錄開始使用。</div>
      ) : (
        <div className="border rounded overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {project?.github_repo && (
                  <th className="w-12 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedFiles(files.map(file => file.id));
                        } else {
                          setSelectedFiles([]);
                        }
                      }}
                      checked={selectedFiles.length === files.length && files.length > 0}
                      className="h-4 w-4"
                    />
                  </th>
                )}
                <th className="w-8 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  類型
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  名稱
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  顯示名稱
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  大小
                </th>
                {project?.github_repo && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    狀態
                  </th>
                )}
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  更新時間
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {files.map(file => (
                <tr key={file.id} className="hover:bg-gray-50">
                  {project?.github_repo && (
                    <td className="px-4 py-3 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedFiles.includes(file.id)}
                        onChange={() => toggleFileSelection(file.id)}
                        className="h-4 w-4"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 whitespace-nowrap">
                    {file.is_directory ? (
                      <FolderIcon className="h-5 w-5 text-yellow-500" />
                    ) : (
                      <FileIcon className="h-5 w-5 text-blue-500" />
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap relative">
                    <div className="flex items-center">
                      {file.is_directory ? (
                        renamingDir === file.id ? (
                          <form 
                            onSubmit={(e) => {
                              e.preventDefault();
                              renameDirectory(file.id, newDirName);
                            }}
                            className="flex items-center"
                          >
                            <input
                              type="text"
                              value={newDirName}
                              onChange={(e) => setNewDirName(e.target.value)}
                              className="px-2 py-1 border rounded w-40"
                              autoFocus
                            />
                            <button type="submit" className="ml-2 text-green-500 text-sm">Save</button>
                            <button 
                              type="button" 
                              onClick={() => {
                                setRenamingDir(null);
                                setNewDirName('');
                              }}
                              className="ml-2 text-red-500 text-sm"
                            >
                              Cancel
                            </button>
                          </form>
                        ) : (
                          <>
                            <a
                              onClick={() => navigateToDirectory(`${currentPath}/${file.name}`)}
                              className="text-blue-500 hover:underline cursor-pointer"
                            >
                              {file.name}
                            </a>
                            <button 
                              onClick={() => setShowDirMenu(file.id)}
                              className="ml-2 text-gray-400 hover:text-gray-600"
                            >
                              <MoreHorizontalIcon className="h-4 w-4" />
                            </button>
                            {showDirMenu === file.id && (
                              <div 
                                ref={dirMenuRef}
                                className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10"
                                style={{ top: '100%' }}
                              >
                                <div className="py-1">
                                  <button
                                    onClick={() => {
                                      setRenamingDir(file.id);
                                      setNewDirName(file.name);
                                      setShowDirMenu(null);
                                    }}
                                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                  >
                                    <EditIcon className="h-4 w-4 mr-2" />
                                    Rename
                                  </button>
                                  <button
                                    onClick={() => {
                                      deleteDirectory(file.id);
                                      setShowDirMenu(null);
                                    }}
                                    className="flex items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-100 w-full text-left"
                                  >
                                    <TrashIcon className="h-4 w-4 mr-2" />
                                    Delete
                                  </button>
                                </div>
                              </div>
                            )}
                          </>
                        )
                      ) : (
                        <>
                          <Link
                            to={`/projects/${projectId}/files/${file.id}`}
                            className="text-blue-500 hover:underline"
                          >
                            {file.name}
                          </Link>
                          <button 
                            onClick={() => setShowFileMenu(file.id)}
                            className="ml-2 text-gray-400 hover:text-gray-600"
                          >
                            <MoreHorizontalIcon className="h-4 w-4" />
                          </button>
                          {showFileMenu === file.id && (
                            <div 
                              ref={fileMenuRef}
                              className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10"
                              style={{ top: '100%' }}
                            >
                              <div className="py-1">
                                <button
                                  onClick={() => {
                                    setMovingFile(file);
                                    setShowMoveModal(true);
                                    setShowFileMenu(null);
                                  }}
                                  className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 w-full text-left"
                                >
                                  <MoveIcon className="h-4 w-4 mr-2" />
                                  Move
                                </button>
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {file.display_name || '-'}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {file.is_directory ? '-' : `${file.size} bytes`}
                  </td>
                  {project?.github_repo && (
                    <td className="px-4 py-3 whitespace-nowrap text-sm">
                      {file.git_status === 'synced' ? (
                        <span className="text-green-500">已同步</span>
                      ) : file.git_status === 'modified' ? (
                        <span className="text-yellow-500">已修改</span>
                      ) : file.git_status === 'new' ? (
                        <span className="text-blue-500">新建</span>
                      ) : (
                        <span className="text-gray-500">-</span>
                      )}
                    </td>
                  )}
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {new Date(file.updated_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Push Modal */}
      <div id="push-modal" className="hidden fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded max-w-md w-full">
          <h2 className="text-xl font-bold mb-4">Push to GitHub</h2>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Commit Message
            </label>
            <textarea
              value={commitMessage}
              onChange={(e) => setCommitMessage(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              rows={3}
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Selected Files ({selectedFiles.length})
            </label>
            <div className="max-h-40 overflow-y-auto border rounded p-2">
              {selectedFiles.length === 0 ? (
                <div className="text-gray-500">No files selected</div>
              ) : (
                <ul className="text-sm">
                  {selectedFiles.map(fileId => {
                    const file = files.find(f => f.id === fileId);
                    return (
                      <li key={fileId} className="py-1">
                        {file?.name || fileId}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => document.getElementById('push-modal')?.classList.add('hidden')}
              className="px-4 py-2 border rounded"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                pushToGitHub();
                document.getElementById('push-modal')?.classList.add('hidden');
              }}
              disabled={pushing || !commitMessage.trim() || selectedFiles.length === 0}
              className="bg-purple-500 text-white px-4 py-2 rounded disabled:bg-purple-300"
            >
              {pushing ? 'Pushing...' : 'Push'}
            </button>
          </div>
        </div>
      </div>
      
      {/* Move File Modal */}
      {showMoveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Move File</h2>
            <div className="mb-4">
              <p className="text-sm mb-2">Moving: <span className="font-semibold">{movingFile?.name}</span></p>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Select Destination Directory
              </label>
              <select
                value={targetPath}
                onChange={(e) => setTargetPath(e.target.value)}
                className="w-full px-3 py-2 border rounded"
              >
                {availableDirs.map(dir => (
                  <option key={dir.id} value={dir.path}>
                    {dir.path ? dir.path : 'Root'}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowMoveModal(false);
                  setMovingFile(null);
                  setTargetPath('');
                }}
                className="px-4 py-2 border rounded"
              >
                Cancel
              </button>
              <button
                onClick={moveFile}
                className="bg-blue-500 text-white px-4 py-2 rounded"
              >
                Move
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
