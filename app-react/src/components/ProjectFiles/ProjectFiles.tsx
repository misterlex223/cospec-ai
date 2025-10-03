import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';
import { 
  Plus, RefreshCw, AlertCircle, Loader2, FileText, 
  ArrowLeft, Check, Github, Download, Upload, MoreHorizontal 
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Input } from '../ui/input';
import Navigation from '../Navigation/Navigation';
import Breadcrumb from '../Breadcrumb/Breadcrumb';
import './ProjectFiles.css';

interface File {
  id: string;
  name: string;
  size: string;
  status?: 'synced' | 'modified' | 'new';
  updatedAt: string;
  selected?: boolean;
  content: string;
}

interface Project {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  githubRepository?: string;
  githubBranch?: string;
  githubConnected?: boolean;
}

interface PersonalSpace {
  id: string;
  name: string;
  userId: string;
}

export default function ProjectFiles() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  
  const [files, setFiles] = useState<File[]>([]);
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createFileLoading, setCreateFileLoading] = useState(false);
  const [createFileError, setCreateFileError] = useState<string | null>(null);
  const [newFileName, setNewFileName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubError, setGithubError] = useState<string | null>(null);
  const [selectedCount, setSelectedCount] = useState(0);
  const [allSelected, setAllSelected] = useState(false);
  const [commitMessage, setCommitMessage] = useState('');
  const [showCommitForm, setShowCommitForm] = useState(false);
  
  // Mock personal space for now
  const [personalSpace] = useState<PersonalSpace>({
    id: 'personal-1',
    name: user?.username ? `${user.username} 的個人空間` : '個人空間',
    userId: user?.id || '1'
  });

  useEffect(() => {
    if (projectId) {
      fetchProject();
      fetchFiles();
    }
  }, [projectId]);

  useEffect(() => {
    // Update selected count when files change
    const count = files.filter(file => file.selected).length;
    setSelectedCount(count);
    setAllSelected(count > 0 && count === files.length);
  }, [files]);

  const fetchProject = async () => {
    try {
      // Mock project data for now
      const mockProject: Project = {
        id: projectId || '1',
        name: '產品文檔',
        description: '產品相關的文檔和說明',
        createdAt: '2024-02-15',
        githubRepository: 'user/product-docs',
        githubBranch: 'main',
        githubConnected: true
      };
      
      setProject(mockProject);
      
      // Uncomment when API is ready
      /*
      const response = await axios.get(`/api/projects/${projectId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setProject(response.data);
      */
    } catch (err) {
      console.error('Error fetching project:', err);
      setError('Failed to load project');
    }
  };

  const fetchFiles = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // Mock file data for now
      const mockFiles: File[] = [
        {
          id: '1',
          name: 'README.md',
          size: '2.1 KB',
          status: 'synced',
          updatedAt: '2 小時前',
          content: '# 項目介紹\n\n這是一個示例項目。\n\n## 功能\n\n- 功能 1\n- 功能 2\n- 功能 3'
        },
        {
          id: '2',
          name: '安裝指南.md',
          size: '1.5 KB',
          status: 'modified',
          updatedAt: '1 天前',
          content: '# 安裝指南\n\n## 系統要求\n\n- Node.js 18+\n- npm 或 yarn\n\n## 安裝步驟\n\n1. 克隆存儲庫\n2. 安裝依賴\n3. 啟動服務'
        },
        {
          id: '3',
          name: '更新日志.md',
          size: '3.2 KB',
          status: 'new',
          updatedAt: '3 小時前',
          content: '# 更新日志\n\n## v1.0.0\n\n- 初始版本發布\n- 添加基本功能'
        }
      ];
      
      setFiles(mockFiles);
      
      // Uncomment when API is ready
      /*
      const response = await axios.get(`/api/projects/${projectId}/files`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setFiles(response.data);
      */
    } catch (err) {
      console.error('Error fetching files:', err);
      setError('Failed to load files');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateFile = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateFileLoading(true);
    setCreateFileError(null);
    
    try {
      // Validate file name
      if (!newFileName) {
        throw new Error('文件名稱不能為空');
      }
      
      if (!/^[\w\s\u4e00-\u9fff.-]+$/.test(newFileName)) {
        throw new Error('文件名稱包含無效字符');
      }
      
      // Add .md extension if not provided
      let fileName = newFileName;
      if (!fileName.toLowerCase().endsWith('.md')) {
        fileName += '.md';
      }
      
      if (files.some(file => file.name.toLowerCase() === fileName.toLowerCase())) {
        throw new Error('文件名稱已存在');
      }
      
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 800));
      
      const newFile: File = {
        id: Date.now().toString(),
        name: fileName,
        size: '0 B',
        status: 'new',
        updatedAt: '剛剛',
        content: `# ${fileName.replace('.md', '')}\n\n開始編寫您的內容...`
      };
      
      setFiles([...files, newFile]);
      setNewFileName('');
      setShowCreateForm(false);
      
      // Navigate to editor for new file
      navigate(`/projects/${projectId}/files/${newFile.id}`);
      
      // Uncomment when API is ready
      /*
      const response = await axios.post(`/api/projects/${projectId}/files`, {
        name: fileName
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setFiles([...files, response.data]);
      setNewFileName('');
      setShowCreateForm(false);
      
      // Navigate to editor for new file
      navigate(`/projects/${projectId}/files/${response.data.id}`);
      */
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '創建文件失敗，請稍後再試';
      setCreateFileError(errorMessage);
    } finally {
      setCreateFileLoading(false);
    }
  };

  const handleSelectFile = (fileId: string) => {
    navigate(`/projects/${projectId}/files/${fileId}`);
  };

  const handleToggleFileSelection = (fileId: string) => {
    setFiles(files.map(f => 
      f.id === fileId ? { ...f, selected: !f.selected } : f
    ));
  };

  const handleToggleAllFileSelection = (selected: boolean) => {
    setFiles(files.map(f => ({ ...f, selected })));
  };

  const handlePushToGithub = async () => {
    if (!commitMessage.trim()) {
      setGithubError('請輸入提交訊息');
      return;
    }
    
    const selectedFileIds = files.filter(f => f.selected).map(f => f.id);
    if (selectedFileIds.length === 0) {
      setGithubError('請選擇至少一個文件');
      return;
    }
    
    setGithubLoading(true);
    setGithubError(null);
    
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Update file statuses to synced
      setFiles(files.map(f => 
        selectedFileIds.includes(f.id) 
          ? { ...f, status: 'synced' as const, selected: false }
          : { ...f, selected: false }
      ));
      
      setCommitMessage('');
      setShowCommitForm(false);
      
      // Uncomment when API is ready
      /*
      await axios.post(`/api/projects/${projectId}/github/push`, {
        files: selectedFileIds,
        message: commitMessage
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Refresh files
      fetchFiles();
      */
    } catch (err) {
      console.error('Error pushing to GitHub:', err);
      setGithubError('Failed to push to GitHub');
    } finally {
      setGithubLoading(false);
    }
  };

  const handlePullFromGithub = async () => {
    setGithubLoading(true);
    setGithubError(null);
    
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update all file statuses to synced
      setFiles(files.map(f => ({ ...f, status: 'synced' as const })));
      
      // Uncomment when API is ready
      /*
      await axios.post(`/api/projects/${projectId}/github/pull`, {}, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Refresh files
      fetchFiles();
      */
    } catch (err) {
      console.error('Error pulling from GitHub:', err);
      setGithubError('Failed to pull from GitHub');
    } finally {
      setGithubLoading(false);
    }
  };

  const goToProjects = () => {
    navigate('/personal-space');
  };

  // Breadcrumb items
  const breadcrumbItems = [
    { 
      label: personalSpace.name, 
      href: '/personal-space',
      onClick: () => navigate('/personal-space')
    },
    { label: project?.name || 'Project' }
  ];

  return (
    <div className="min-h-screen bg-secondary/30 flex flex-col">
      <Navigation user={user ? { name: user.username, email: user.email } : undefined} onLogout={() => {}} />
      
      <div className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full">
        {/* Breadcrumb navigation */}
        <Breadcrumb items={breadcrumbItems} />
        
        <div className="flex justify-between items-center mb-6 mt-2">
          <div className="flex items-center">
            <Button variant="outline" size="sm" onClick={goToProjects} className="mr-4">
              <ArrowLeft className="w-4 h-4 mr-1" />
              返回專案列表
            </Button>
            <h1 className="text-2xl font-bold">{project?.name || 'Project'}</h1>
          </div>
          
          <div className="flex space-x-2">
            {project?.githubConnected && (
              <>
                <Button variant="outline" size="sm" onClick={handlePullFromGithub} disabled={githubLoading}>
                  <Download className="w-4 h-4 mr-1" />
                  從 GitHub 拉取
                </Button>
                
                {selectedCount > 0 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setShowCommitForm(true)}
                    disabled={githubLoading}
                  >
                    <Upload className="w-4 h-4 mr-1" />
                    推送到 GitHub ({selectedCount})
                  </Button>
                )}
              </>
            )}
            
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="w-4 h-4 mr-1" />
              新建文件
            </Button>
          </div>
        </div>
        
        {/* GitHub repository info */}
        {project?.githubConnected && (
          <div className="flex items-center mb-6 bg-muted p-3 rounded-md">
            <Github className="w-4 h-4 mr-2 text-muted-foreground" />
            <span className="text-sm text-muted-foreground">
              已連接到 GitHub: <span className="font-medium">{project.githubRepository}</span> ({project.githubBranch || 'main'})
            </span>
          </div>
        )}
        
        {/* Error state */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={fetchFiles}>
                <RefreshCw className="w-4 h-4 mr-1" />
                重試
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        {/* GitHub error */}
        {githubError && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{githubError}</AlertDescription>
          </Alert>
        )}
        
        {/* Create file form */}
        {showCreateForm && (
          <Card className="mb-6">
            <CardContent className="py-4">
              <form onSubmit={handleCreateFile} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    placeholder="文件名稱 (例如: README.md)"
                    value={newFileName}
                    onChange={(e) => setNewFileName(e.target.value)}
                    disabled={createFileLoading}
                  />
                  {createFileError && (
                    <p className="text-sm text-destructive">{createFileError}</p>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  <Button 
                    type="submit" 
                    disabled={createFileLoading || !newFileName.trim()}
                  >
                    {createFileLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        創建中...
                      </>
                    ) : (
                      <>
                        <FileText className="w-4 h-4 mr-2" />
                        創建文件
                      </>
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setShowCreateForm(false);
                      setCreateFileError(null);
                      setNewFileName('');
                    }}
                    disabled={createFileLoading}
                  >
                    取消
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
        
        {/* GitHub commit form */}
        {showCommitForm && (
          <Card className="mb-6">
            <CardContent className="py-4">
              <form onSubmit={(e) => { e.preventDefault(); handlePushToGithub(); }} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    placeholder="提交訊息"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    disabled={githubLoading}
                  />
                </div>
                
                <div className="flex space-x-2">
                  <Button 
                    type="submit" 
                    disabled={githubLoading || !commitMessage.trim()}
                  >
                    {githubLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        推送中...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        推送 {selectedCount} 個文件
                      </>
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setShowCommitForm(false);
                      setCommitMessage('');
                    }}
                    disabled={githubLoading}
                  >
                    取消
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
        
        {/* Loading state */}
        {loading && (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="ml-2">正在加載文件...</span>
          </div>
        )}
        
        {/* Files table */}
        {!loading && files.length > 0 && (
          <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="w-10 px-4 py-3 text-left">
                      <div className="flex items-center">
                        <input 
                          type="checkbox" 
                          checked={allSelected}
                          onChange={(e) => handleToggleAllFileSelection(e.target.checked)}
                          className="rounded border-gray-300 text-primary focus:ring-primary"
                        />
                      </div>
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">名稱</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">狀態</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">大小</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">更新時間</th>
                    <th className="w-10 px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file) => (
                    <tr 
                      key={file.id} 
                      className="border-t hover:bg-muted/30 cursor-pointer"
                      onClick={(e) => {
                        // Don't navigate if clicking on checkbox
                        if ((e.target as HTMLElement).closest('input[type="checkbox"]')) {
                          return;
                        }
                        handleSelectFile(file.id);
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                          <input 
                            type="checkbox" 
                            checked={!!file.selected}
                            onChange={() => handleToggleFileSelection(file.id)}
                            className="rounded border-gray-300 text-primary focus:ring-primary"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center">
                          <FileText className="w-5 h-5 text-muted-foreground mr-2" />
                          <span>{file.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {file.status && (
                          <Badge variant={file.status === 'synced' ? 'default' : file.status === 'modified' ? 'secondary' : 'outline'}>
                            {file.status === 'synced' ? '已同步' : 
                             file.status === 'modified' ? '已修改' : '新建'}
                          </Badge>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{file.size}</td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{file.updatedAt}</td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
        
        {/* Empty state */}
        {!loading && files.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <FileText className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">還沒有文件</h2>
            <p className="text-muted-foreground mb-6">創建您的第一個文件來開始使用</p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              新建文件
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
