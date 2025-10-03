import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Vditor from 'vditor';
import 'vditor/dist/index.css';
import { useAuth } from './auth/AuthContext';
import { FolderIcon, FileIcon, ChevronRightIcon, ArrowLeftIcon, SaveIcon, MoreVerticalIcon } from 'lucide-react';

interface File {
  id: string;
  name: string;
  path: string;
  content: string;
  size: number;
  git_status?: string;
  created_at: number;
  updated_at: number;
  display_name?: string;
}

interface Project {
  id: string;
  name: string;
  display_name?: string;
}

interface PathSegment {
  name: string;
  path: string;
  isLast: boolean;
}

export default function FileEditor() {
  const { projectId, fileId } = useParams<{ projectId: string, fileId: string }>();
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [pathSegments, setPathSegments] = useState<PathSegment[]>([]);
  const [showFileMenu, setShowFileMenu] = useState(false);
  const vditorRef = useRef<any>(null);
  const editorRef = useRef<Vditor | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const fileMenuRef = useRef<HTMLDivElement>(null);
  
  // 獲取認證令牌
  const { token, user } = useAuth();

  useEffect(() => {
    if (projectId && fileId) {
      fetchProject();
      fetchFile();
    }
    
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      if (editorRef.current) {
        editorRef.current.destroy();
      }
    };
  }, [projectId, fileId]);
  
  // 點擊外部關閉文件菜單
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (fileMenuRef.current && !fileMenuRef.current.contains(event.target as Node)) {
        setShowFileMenu(false);
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
      setError(null);
    } catch (err) {
      console.error('Error fetching project:', err);
      setError('Failed to load project');
    }
  };

  const fetchFile = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/projects/${projectId}/files/${fileId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setFile(response.data);
      
      // 解析文件路徑為麵包屑導航段
      if (response.data.path) {
        const pathParts = response.data.path.split('/').filter(Boolean);
        const segments: PathSegment[] = [];
        
        // 添加根目錄
        segments.push({
          name: 'Root',
          path: '',
          isLast: pathParts.length === 0
        });
        
        // 添加中間目錄
        let currentPath = '';
        pathParts.forEach((part, index) => {
          if (index < pathParts.length - 1) { // 不是文件名
            currentPath += '/' + part;
            segments.push({
              name: part,
              path: currentPath,
              isLast: false
            });
          }
        });
        
        setPathSegments(segments);
      }
      
      // Initialize editor after getting file content
      initEditor(response.data.content);
      
      setError(null);
    } catch (err) {
      console.error('Error fetching file:', err);
      setError('Failed to load file');
    } finally {
      setLoading(false);
    }
  };

  const initEditor = (content: string) => {
    if (vditorRef.current) {
      if (editorRef.current) {
        editorRef.current.destroy();
      }
      
      editorRef.current = new Vditor(vditorRef.current, {
        height: 'calc(100vh - 200px)',
        mode: 'ir',
        value: content,
        theme: 'classic',
        cache: {
          enable: false
        },
        toolbar: [
          'headings', 'bold', 'italic', 'strike', 'line', 'quote', 'list', 'ordered-list', 
          'check', 'code', 'inline-code', 'link', 'table', 'undo', 'redo', 'outline', 'fullscreen'
        ],
        outline: {
          enable: true,
          position: 'right'
        },
        counter: {
          enable: true,
          type: 'markdown'
        },
        preview: {
          delay: 500,
          mode: 'both',
          hljs: {
            style: 'github',
            lineNumber: true
          }
        },
        after: () => {
          // Setup auto-save
          editorRef.current?.vditor.element.addEventListener('input', () => {
            if (saveTimeoutRef.current) {
              clearTimeout(saveTimeoutRef.current);
            }
            
            setSaving(true);
            saveTimeoutRef.current = window.setTimeout(() => {
              saveFile();
            }, 2000); // Auto-save after 2 seconds of inactivity
          });
        }
      });
    }
  };

  const saveFile = async () => {
    if (!editorRef.current) return;
    
    const content = editorRef.current.getValue();
    
    try {
      setSaving(true);
      await axios.put(`/api/projects/${projectId}/files/${fileId}`, {
        content
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setLastSaved(new Date());
      setError(null);
    } catch (err) {
      console.error('Error saving file:', err);
      setError('Failed to save file');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !file) {
    return <div className="p-4">Loading file...</div>;
  }

  // 處理文件菜單操作
  const handleRenameFile = () => {
    setShowFileMenu(false);
    // 實現重命名功能
    const newName = prompt('Enter new file name:', file?.name);
    if (newName && newName !== file?.name) {
      // 發送重命名請求
      // ...
    }
  };
  
  const handleMoveFile = () => {
    setShowFileMenu(false);
    // 實現移動文件功能
    // ...
  };
  
  const handleDeleteFile = () => {
    setShowFileMenu(false);
    // 實現刪除文件功能
    const confirm = window.confirm(`Are you sure you want to delete ${file?.name}?`);
    if (confirm) {
      // 發送刪除請求
      // ...
    }
  };
  
  // 返回到文件列表
  const goToFileList = () => {
    navigate(`/projects/${projectId}`);
  };

  return (
    <div className="flex flex-col h-screen">
      {/* 頂部導航欄 */}
      <div className="bg-white border-b px-4 py-2 flex justify-between items-center">
        <div className="flex items-center">
          <span className="font-bold text-xl text-blue-600">CoSpec Markdown</span>
        </div>
        <div className="flex items-center gap-2">
          {user && (
            <span className="text-sm text-gray-600">
              {user.username}
            </span>
          )}
        </div>
      </div>
      
      {/* 麵包屑導航 */}
      <div className="bg-gray-50 px-4 py-2 flex items-center text-sm">
        <Link to="/personal-space" className="text-blue-500 hover:underline">個人空間</Link>
        <ChevronRightIcon className="h-4 w-4 mx-1 text-gray-400" />
        <Link to="/projects" className="text-blue-500 hover:underline">專案</Link>
        <ChevronRightIcon className="h-4 w-4 mx-1 text-gray-400" />
        <Link to={`/projects/${projectId}`} className="text-blue-500 hover:underline">
          {project?.name || 'Project'}
        </Link>
        
        {pathSegments.map((segment, index) => (
          <React.Fragment key={index}>
            <ChevronRightIcon className="h-4 w-4 mx-1 text-gray-400" />
            {segment.isLast ? (
              <span className="text-gray-600">{segment.name}</span>
            ) : (
              <Link 
                to={`/projects/${projectId}/directory${segment.path}`}
                className="text-blue-500 hover:underline"
              >
                {segment.name}
              </Link>
            )}
          </React.Fragment>
        ))}
        
        <ChevronRightIcon className="h-4 w-4 mx-1 text-gray-400" />
        <span className="text-gray-600">{file?.name || 'File'}</span>
      </div>
      
      {/* 編輯器頂部工具欄 */}
      <div className="bg-white border-b px-4 py-2 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <button 
            onClick={goToFileList}
            className="flex items-center text-blue-500 hover:underline"
          >
            <ArrowLeftIcon className="h-4 w-4 mr-1" />
            返回到文件列表
          </button>
          <span className="text-gray-400 mx-2">|</span>
          <span className="text-gray-600">{file?.path}/{file?.name}</span>
        </div>
        
        <div className="flex items-center gap-3">
          {saving && (
            <span className="text-yellow-500 text-sm">保存中...</span>
          )}
          {lastSaved && !saving && (
            <span className="text-green-500 text-sm">
              已保存於 {lastSaved.toLocaleTimeString()}
            </span>
          )}
          <button
            onClick={saveFile}
            disabled={saving || !editorRef.current}
            className="flex items-center bg-blue-500 text-white px-3 py-1 rounded disabled:bg-blue-300"
          >
            <SaveIcon className="h-4 w-4 mr-1" />
            保存
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setShowFileMenu(!showFileMenu)}
              className="p-1 rounded hover:bg-gray-100"
            >
              <MoreVerticalIcon className="h-5 w-5 text-gray-600" />
            </button>
            
            {showFileMenu && (
              <div 
                ref={fileMenuRef}
                className="absolute right-0 mt-1 w-48 bg-white border rounded shadow-lg z-10"
              >
                <button 
                  onClick={handleRenameFile}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  重命名
                </button>
                <button 
                  onClick={handleMoveFile}
                  className="w-full text-left px-4 py-2 hover:bg-gray-100"
                >
                  移動到其他目錄
                </button>
                <button 
                  onClick={handleDeleteFile}
                  className="w-full text-left px-4 py-2 text-red-500 hover:bg-gray-100"
                >
                  刪除
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* 錯誤消息 */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 m-4 rounded">
          {error}
        </div>
      )}
      
      {/* 加載狀態 */}
      {loading && (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
          <span className="ml-2">正在加載文件...</span>
        </div>
      )}
      
      {/* 編輯器 */}
      <div className="flex-grow overflow-hidden">
        <div className="h-full border rounded m-4">
          <div ref={vditorRef} className="h-full"></div>
        </div>
      </div>
    </div>
  );
}
