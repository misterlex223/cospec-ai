import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import Vditor from 'vditor';
import 'vditor/dist/index.css';
import { useAuth } from '../auth/AuthContext';
import { ArrowLeft, Save, Clock, AlertCircle, Loader2, RefreshCw, FileText, MoreVertical } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Card, CardContent } from '../ui/card';
import Navigation from '../Navigation/Navigation';
import Breadcrumb from '../Breadcrumb/Breadcrumb';
import './FileEditor.css';

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
  status?: 'synced' | 'modified' | 'new';
}

interface Project {
  id: string;
  name: string;
  display_name?: string;
  description?: string;
  githubRepository?: string;
  githubBranch?: string;
  githubConnected?: boolean;
}

interface PathSegment {
  name: string;
  path: string;
  isLast: boolean;
}

interface PersonalSpace {
  id: string;
  name: string;
  userId: string;
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
  const [originalContent, setOriginalContent] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'auto-saving'>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);
  
  const vditorRef = useRef<any>(null);
  const editorRef = useRef<Vditor | null>(null);
  const saveTimeoutRef = useRef<number | null>(null);
  const fileMenuRef = useRef<HTMLDivElement>(null);
  const saveAttemptRef = useRef<Promise<void>>();
  
  // Get authentication token
  const { token, user } = useAuth();
  
  // Mock personal space for now
  const [personalSpace] = useState<PersonalSpace>({
    id: 'personal-1',
    name: user?.username ? `${user.username} 的個人空間` : '個人空間',
    userId: user?.id || '1'
  });

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
  
  // Close file menu when clicking outside
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
      
      const fileData = response.data;
      setFile(fileData);
      setOriginalContent(fileData.content);
      
      // Parse file path for breadcrumb navigation
      if (fileData.path) {
        const pathParts = fileData.path.split('/').filter(Boolean);
        const segments: PathSegment[] = [];
        
        // Add root directory
        segments.push({
          name: 'Root',
          path: '',
          isLast: pathParts.length === 0
        });
        
        // Add intermediate directories
        let currentPath = '';
        pathParts.forEach((part, index) => {
          if (index < pathParts.length - 1) { // Not the filename
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
      initEditor(fileData.content);
      
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
        height: 'calc(100vh - 280px)',
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
          // Setup auto-save and content change detection
          editorRef.current?.vditor.element.addEventListener('input', () => {
            if (saveTimeoutRef.current) {
              clearTimeout(saveTimeoutRef.current);
            }
            
            const currentContent = editorRef.current?.getValue() || '';
            setHasUnsavedChanges(currentContent !== originalContent);
            
            setSaveStatus('auto-saving');
            saveTimeoutRef.current = window.setTimeout(() => {
              saveFile(true);
            }, 2000); // Auto-save after 2 seconds of inactivity
          });
        }
      });
    }
  };

  // Save file with auto-save option
  const saveFile = async (isAutoSave = false) => {
    if (!editorRef.current || saveAttemptRef.current) return;
    
    const content = editorRef.current.getValue();
    if (content === originalContent) {
      setSaveStatus('idle');
      return;
    }
    
    setSaveStatus(isAutoSave ? 'auto-saving' : 'saving');
    setSaveError(null);
    
    try {
      saveAttemptRef.current = axios.put(`/api/projects/${projectId}/files/${fileId}`, {
        content
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      }).then(() => {});
      
      await saveAttemptRef.current;
      
      setOriginalContent(content);
      setHasUnsavedChanges(false);
      setLastSaved(new Date());
      setSaveStatus('saved');
      
      // Update file status
      if (file) {
        setFile({
          ...file,
          content,
          status: 'modified'
        });
      }
      
      // Clear status after delay
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    } catch (err) {
      console.error('Error saving file:', err);
      setSaveError('Failed to save file');
      setSaveStatus('idle');
    } finally {
      saveAttemptRef.current = undefined;
    }
  };

  // Manual save handler
  const handleManualSave = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveFile(false);
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleManualSave();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Git diff detection (simplified)
  const getChangedLines = useCallback(() => {
    if (!file || !originalContent) return [];
    
    const currentContent = editorRef.current?.getValue() || '';
    const originalLines = originalContent.split('\n');
    const currentLines = currentContent.split('\n');
    const changes = [];

    for (let i = 0; i < Math.max(originalLines.length, currentLines.length); i++) {
      const originalLine = originalLines[i] || '';
      const currentLine = currentLines[i] || '';
      
      if (originalLine !== currentLine) {
        if (originalLine === '') {
          changes.push({ line: i, type: 'added' });
        } else if (currentLine === '') {
          changes.push({ line: i, type: 'deleted' });
        } else {
          changes.push({ line: i, type: 'modified' });
        }
      }
    }
    
    return changes;
  }, [file, originalContent]);

  const changedLines = getChangedLines();

  // File menu handlers
  const handleRenameFile = () => {
    setShowFileMenu(false);
    // Implement rename functionality
    const newName = prompt('Enter new file name:', file?.name);
    if (newName && newName !== file?.name) {
      // Send rename request
      // ...
    }
  };
  
  const handleMoveFile = () => {
    setShowFileMenu(false);
    // Implement move file functionality
    // ...
  };
  
  const handleDeleteFile = () => {
    setShowFileMenu(false);
    // Implement delete file functionality
    const confirm = window.confirm(`Are you sure you want to delete ${file?.name}?`);
    if (confirm) {
      // Send delete request
      // ...
    }
  };
  
  // Return to file list
  const goToFileList = () => {
    navigate(`/projects/${projectId}`);
  };

  // Get save status badge
  const getSaveStatusBadge = () => {
    if (saveError) {
      return (
        <Badge variant="destructive" className="flex items-center space-x-1">
          <AlertCircle className="w-3 h-3" />
          <span>保存失敗</span>
        </Badge>
      );
    }

    switch (saveStatus) {
      case 'saving':
        return (
          <Badge variant="secondary" className="flex items-center space-x-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>保存中...</span>
          </Badge>
        );
      case 'auto-saving':
        return (
          <Badge variant="secondary" className="flex items-center space-x-1">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>自動保存中...</span>
          </Badge>
        );
      case 'saved':
        return (
          <Badge className="bg-green-100 text-green-800 flex items-center space-x-1">
            <Clock className="w-3 h-3" />
            <span>
              已保存於 {lastSaved?.toLocaleTimeString('zh-TW', { 
                hour: '2-digit', 
                minute: '2-digit' 
              })}
            </span>
          </Badge>
        );
      default:
        if (hasUnsavedChanges) {
          return (
            <Badge variant="outline" className="text-yellow-600 border-yellow-600">
              有未保存的更改
            </Badge>
          );
        }
        return null;
    }
  };

  // Breadcrumb items
  const breadcrumbItems = [
    { 
      label: personalSpace.name, 
      href: '/personal-space',
      onClick: () => navigate('/personal-space')
    },
    { 
      label: project?.name || 'Project', 
      href: `/projects/${projectId}`,
      onClick: () => navigate(`/projects/${projectId}`)
    },
    { label: file?.name || 'File' }
  ];

  if (loading && !file) {
    return (
      <div className="min-h-screen bg-secondary/30 flex flex-col">
        <Navigation user={user ? { name: user.username, email: user.email } : undefined} onLogout={() => {}} />
        
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-4" />
            <p className="text-muted-foreground">正在加載文件...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-secondary/30 flex flex-col">
      <Navigation user={user ? { name: user.username, email: user.email } : undefined} onLogout={() => {}} />
      
      <div className="max-w-7xl mx-auto px-6 py-8 flex-1 flex flex-col w-full">
        {/* Breadcrumb navigation */}
        <Breadcrumb items={breadcrumbItems} />
        
        {/* Global error state */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={() => fetchFile()}>
                <RefreshCw className="w-4 h-4 mr-1" />
                重試
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        {/* Editor top toolbar */}
        <Card className="mb-6">
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              {/* Left: Back button and file info */}
              <div className="flex items-center space-x-4">
                <Button variant="outline" size="sm" onClick={goToFileList}>
                  <ArrowLeft className="w-4 h-4 mr-1" />
                  返回到 {project?.name || 'Project'} 文件
                </Button>
                <div className="flex items-center space-x-3">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-muted-foreground" />
                    <h1 className="text-xl font-bold">{file?.name}</h1>
                  </div>
                  {file?.status && (
                    <Badge variant={file.status === 'synced' ? 'default' : 'secondary'}>
                      {file.status === 'synced' ? '已同步' : 
                       file.status === 'modified' ? '已修改' : '新建'}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Right: Save status and button */}
              <div className="flex items-center space-x-3">
                {getSaveStatusBadge()}
                
                <Button 
                  onClick={handleManualSave}
                  disabled={!hasUnsavedChanges || saveStatus === 'saving' || saveStatus === 'auto-saving'}
                  size="sm"
                >
                  <Save className="w-4 h-4 mr-1" />
                  保存
                </Button>
              </div>
            </div>

            {/* Save error message */}
            {saveError && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription className="flex items-center justify-between">
                  <span>{saveError}</span>
                  <Button variant="outline" size="sm" onClick={handleManualSave}>
                    重試保存
                  </Button>
                </AlertDescription>
              </Alert>
            )}

            {/* Git diff summary */}
            {changedLines.length > 0 && (
              <div className="mt-4 p-3 bg-muted rounded-md">
                <div className="flex items-center space-x-4 text-sm">
                  <span className="font-medium">Git 差異：</span>
                  <div className="flex items-center space-x-4">
                    {changedLines.filter(c => c.type === 'added').length > 0 && (
                      <span className="text-green-600">
                        +{changedLines.filter(c => c.type === 'added').length} 新增
                      </span>
                    )}
                    {changedLines.filter(c => c.type === 'modified').length > 0 && (
                      <span className="text-yellow-600">
                        ~{changedLines.filter(c => c.type === 'modified').length} 修改
                      </span>
                    )}
                    {changedLines.filter(c => c.type === 'deleted').length > 0 && (
                      <span className="text-red-600">
                        -{changedLines.filter(c => c.type === 'deleted').length} 刪除
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* CoSpec Editor */}
        <div className="flex-1 bg-white rounded-lg border shadow-sm overflow-hidden">
          <div ref={vditorRef} className="h-full"></div>
        </div>
      </div>
    </div>
  );
}
