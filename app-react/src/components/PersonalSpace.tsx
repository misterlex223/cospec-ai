import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from './auth/AuthContext';
import { Plus, Folder, Loader2, AlertCircle, RefreshCw, Github, GitBranch } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Badge } from './ui/badge';
import { Label } from './ui/label';
import Navigation from './Navigation/Navigation';
import { toast } from 'sonner';

interface Project {
  id: string;
  name: string;
  slug: string;
  role: string;
  created_at: number;
  updated_at: number;
  github_repo?: string;
  github_branch?: string;
  githubConnected?: boolean;
}

export default function PersonalSpace() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [creating, setCreating] = useState(false);
  
  // GitHub 連接相關狀態
  const [githubFormProject, setGithubFormProject] = useState<string | null>(null);
  const [githubRepository, setGithubRepository] = useState('');
  const [githubBranch, setGithubBranch] = useState('main');
  const [githubToken, setGithubToken] = useState('');
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubError, setGithubError] = useState<string | null>(null);
  const [githubFormErrors, setGithubFormErrors] = useState({
    repository: '',
    token: ''
  });
  
  // 獲取認證令牌和用戶資訊
  const { token, user, logout } = useAuth();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      setLoading(true);
      // 使用個人空間 ID 獲取項目列表
      const response = await axios.get(`/api/personal-space/projects`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setProjects(response.data.projects || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('無法加載專案列表');
      toast.error('無法加載專案列表');
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    if (!newProjectName.trim()) return;
    
    try {
      setCreating(true);
      const response = await axios.post(`/api/personal-space/projects`, {
        name: newProjectName,
        settings: {}
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setProjects([...projects, response.data]);
      setNewProjectName('');
      setError(null);
      toast.success('專案創建成功！');
    } catch (err) {
      console.error('Error creating project:', err);
      setError('創建專案失敗');
      toast.error('創建專案失敗');
    } finally {
      setCreating(false);
    }
  };
  
  // GitHub 表單驗證
  const validateGithubRepository = (repo: string) => {
    if (!repo.trim()) return '請輸入GitHub倉庫';
    if (!/^[\w\-\.]+\/[\w\-\.]+$/.test(repo)) return '倉庫格式應為：username/repository';
    return '';
  };

  const validateGithubToken = (token: string) => {
    if (!token.trim()) return '請輸入GitHub訪問令牌';
    if (token.length < 10) return '訪問令牌格式無效';
    return '';
  };
  
  // 連接 GitHub
  const handleConnectGithub = async () => {
    if (!githubFormProject) return;
    
    const repoError = validateGithubRepository(githubRepository);
    const tokenError = validateGithubToken(githubToken);
    
    setGithubFormErrors({
      repository: repoError,
      token: tokenError
    });

    if (repoError || tokenError || githubLoading) return;

    try {
      setGithubLoading(true);
      setGithubError(null);
      
      // 在實際 API 完成前使用模擬數據
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // 更新專案的 GitHub 連接狀態
      setProjects(projects.map(p => 
        p.id === githubFormProject 
          ? { 
              ...p, 
              github_repo: githubRepository,
              github_branch: githubBranch,
              githubConnected: true 
            }
          : p
      ));
      
      // 重置表單
      setGithubRepository('');
      setGithubBranch('main');
      setGithubToken('');
      setGithubFormProject(null);
      toast.success('GitHub 連接成功');
      
      // 實際 API 調用的代碼
      /*
      await axios.post(`/api/projects/${githubFormProject}/github`, {
        repository: githubRepository,
        branch: githubBranch,
        token: githubToken
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      fetchProjects();
      */
    } catch (err) {
      console.error('Error connecting to GitHub:', err);
      setGithubError('連接 GitHub 失敗');
      toast.error('連接 GitHub 失敗');
    } finally {
      setGithubLoading(false);
    }
  };
  
  // 斷開 GitHub 連接
  const handleDisconnectGithub = async (projectId: string) => {
    try {
      setGithubLoading(true);
      setGithubError(null);
      
      // 在實際 API 完成前使用模擬數據
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // 更新專案的 GitHub 連接狀態
      setProjects(projects.map(p => 
        p.id === projectId 
          ? { 
              ...p, 
              github_repo: undefined,
              github_branch: undefined,
              githubConnected: false 
            }
          : p
      ));
      
      toast.success('GitHub 連接已斷開');
      
      // 實際 API 調用的代碼
      /*
      await axios.delete(`/api/projects/${projectId}/github`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      fetchProjects();
      */
    } catch (err) {
      console.error('Error disconnecting from GitHub:', err);
      setGithubError('斷開 GitHub 連接失敗');
      toast.error('斷開 GitHub 連接失敗');
    } finally {
      setGithubLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30 flex flex-col">
      {/* 頂部導航欄 */}
      <Navigation user={user ? { name: user.username, email: user.email } : undefined} onLogout={() => logout()} />
      
      <div className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">{user?.username || '用戶'} 的個人空間</h1>
            <p className="text-muted-foreground mt-1">管理您的專案和文檔</p>
          </div>
          
          <Button onClick={() => setNewProjectName('新專案')}>
            <Plus className="w-4 h-4 mr-2" />
            新建專案
          </Button>
        </div>
        
        {/* 錯誤消息 */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="flex items-center justify-between">
              <span>{error}</span>
              <Button variant="outline" size="sm" onClick={fetchProjects}>
                <RefreshCw className="w-4 h-4 mr-1" />
                重試
              </Button>
            </AlertDescription>
          </Alert>
        )}
        
        {/* 創建專案表單 */}
        {newProjectName && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>創建新專案</CardTitle>
              <CardDescription>輸入專案名稱開始創建</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={(e) => { e.preventDefault(); createProject(); }} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="project-name">專案名稱</Label>
                  <Input
                    id="project-name"
                    placeholder="輸入專案名稱"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    disabled={creating}
                    autoFocus
                  />
                </div>
                
                <div className="flex space-x-2">
                  <Button 
                    type="submit" 
                    disabled={creating || !newProjectName.trim()}
                  >
                    {creating ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        創建中...
                      </>
                    ) : (
                      <>
                        <Folder className="w-4 h-4 mr-2" />
                        創建專案
                      </>
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setNewProjectName('')}
                    disabled={creating}
                  >
                    取消
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}
        
        {/* GitHub 連接表單 */}
        {githubFormProject && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Github className="w-5 h-5" />
                <span>連接 GitHub 到專案</span>
              </CardTitle>
              <CardDescription>輸入 GitHub 倉庫信息進行連接</CardDescription>
            </CardHeader>
            <CardContent>
              {githubError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{githubError}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="github-repo">GitHub 倉庫</Label>
                    <Input
                      id="github-repo"
                      placeholder="例如：username/repo"
                      value={githubRepository}
                      onChange={(e) => setGithubRepository(e.target.value)}
                      disabled={githubLoading}
                      className={githubFormErrors.repository ? 'border-destructive' : ''}
                    />
                    {githubFormErrors.repository && (
                      <p className="text-sm text-destructive">{githubFormErrors.repository}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="github-branch">分支</Label>
                    <Input
                      id="github-branch"
                      placeholder="main"
                      value={githubBranch}
                      onChange={(e) => setGithubBranch(e.target.value)}
                      disabled={githubLoading}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="github-token">GitHub 訪問令牌</Label>
                  <Input
                    id="github-token"
                    type="password"
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    value={githubToken}
                    onChange={(e) => setGithubToken(e.target.value)}
                    disabled={githubLoading}
                    className={githubFormErrors.token ? 'border-destructive' : ''}
                  />
                  {githubFormErrors.token && (
                    <p className="text-sm text-destructive">{githubFormErrors.token}</p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    需要有倉庫讀寫權限的個人訪問令牌
                  </p>
                </div>

                <div className="flex gap-3">
                  <Button 
                    onClick={handleConnectGithub}
                    disabled={githubLoading || !githubRepository || !githubToken}
                  >
                    {githubLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        連接中...
                      </>
                    ) : (
                      <>
                        <Github className="w-4 h-4 mr-2" />
                        連接
                      </>
                    )}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setGithubFormProject(null);
                      setGithubRepository('');
                      setGithubBranch('main');
                      setGithubToken('');
                      setGithubFormErrors({ repository: '', token: '' });
                    }}
                    disabled={githubLoading}
                  >
                    取消
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
        
        {/* 加載狀態 */}
        {loading && (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 text-primary animate-spin" />
            <span className="ml-2">正在加載專案...</span>
          </div>
        )}
        
        {/* 專案列表 */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card key={project.id} className="overflow-hidden hover-card">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl flex items-center space-x-2">
                    <span>{project.name}</span>
                    {project.githubConnected && (
                      <span title="已連接GitHub">
                        <Github className="w-4 h-4 text-green-600" />
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription className="line-clamp-2">
                    創建於 {new Date(project.created_at).toLocaleDateString('zh-TW')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-3">
                  {project.github_repo && (
                    <div className="flex items-center mt-2">
                      <Badge variant="secondary" className="flex items-center space-x-1">
                        <Github className="w-3 h-3 mr-1" />
                        <span>{project.github_repo}</span>
                        {project.github_branch && (
                          <>
                            <GitBranch className="w-3 h-3 ml-2 mr-1" />
                            <span>{project.github_branch}</span>
                          </>
                        )}
                      </Badge>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="pt-0 flex flex-col space-y-2">
                  <Button 
                    variant="default" 
                    className="w-full"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    打開專案
                  </Button>
                  
                  {/* GitHub 連接按鈕 */}
                  {project.githubConnected ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => handleDisconnectGithub(project.id)}
                    >
                      <Github className="w-3 h-3 mr-1" />
                      斷開 GitHub 連接
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={() => setGithubFormProject(project.id)}
                    >
                      <Github className="w-3 h-3 mr-1" />
                      連接 GitHub
                    </Button>
                  )}
                </CardFooter>
              </Card>
            ))}
            
            {/* 空狀態 */}
            {projects.length === 0 && (
              <div className="col-span-3 text-center py-12">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
                  <Folder className="w-8 h-8 text-primary" />
                </div>
                <h2 className="text-xl font-semibold mb-2">還沒有專案</h2>
                <p className="text-muted-foreground mb-6">創建您的第一個專案來開始使用</p>
                <Button onClick={() => setNewProjectName('新專案')}>
                  <Plus className="w-4 h-4 mr-2" />
                  新建專案
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
