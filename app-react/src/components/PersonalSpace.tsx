import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from './auth/AuthContext';
import { Plus, Folder, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
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
}

export default function PersonalSpace() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [creating, setCreating] = useState(false);
  
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
                  <CardTitle className="text-xl">{project.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    創建於 {new Date(project.created_at).toLocaleDateString('zh-TW')}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-3">
                  {project.github_repo && (
                    <div className="flex items-center mt-2">
                      <Badge variant="secondary" className="flex items-center space-x-1">
                        <span>GitHub: {project.github_repo}</span>
                      </Badge>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="pt-0">
                  <Button 
                    variant="default" 
                    className="w-full"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    打開專案
                  </Button>
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
