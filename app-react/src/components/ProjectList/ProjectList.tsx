import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../auth/AuthContext';
import { Plus, Github, RefreshCw, AlertCircle, Loader2, FolderPlus } from 'lucide-react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Input } from '../ui/input';
import Navigation from '../Navigation/Navigation';
import './ProjectList.css';

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

export default function ProjectList() {
  const { orgId } = useParams<{ orgId: string }>();
  const navigate = useNavigate();
  const { token, user } = useAuth();
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createProjectLoading, setCreateProjectLoading] = useState(false);
  const [createProjectError, setCreateProjectError] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [githubLoading, setGithubLoading] = useState(false);
  const [githubError, setGithubError] = useState<string | null>(null);
  
  // Mock personal space for now
  const [personalSpace] = useState<PersonalSpace>({
    id: 'personal-1',
    name: user?.username ? `${user.username} 的個人空間` : '個人空間',
    userId: user?.id || '1'
  });

  useEffect(() => {
    fetchProjects();
  }, [orgId]);

  const fetchProjects = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // For now, use mock data
      const mockProjects: Project[] = [
        {
          id: '1',
          name: '產品文檔',
          description: '產品相關的文檔和說明',
          createdAt: '2024-02-15',
          githubRepository: 'user/product-docs',
          githubBranch: 'main',
          githubConnected: true
        },
        {
          id: '2',
          name: 'API 指南',
          description: 'API 開發指南和參考',
          createdAt: '2024-03-01',
          githubConnected: false
        },
        {
          id: '3',
          name: '個人筆記',
          description: '日常學習和工作筆記',
          createdAt: '2024-01-20',
          githubConnected: false
        }
      ];
      
      setProjects(mockProjects);
      
      // Uncomment when API is ready
      /*
      const response = await axios.get(`/api/organizations/${orgId}/projects`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setProjects(response.data);
      */
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateProjectLoading(true);
    setCreateProjectError(null);
    
    try {
      // Validate project name
      if (newProjectName.length < 2) {
        throw new Error('專案名稱至少需要2個字符');
      }
      
      if (!/^[\w\s\u4e00-\u9fff-]+$/.test(newProjectName)) {
        throw new Error('專案名稱包含無效字符');
      }
      
      if (projects.some(project => project.name.toLowerCase() === newProjectName.toLowerCase())) {
        throw new Error('專案名稱已被使用');
      }
      
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const newProject: Project = {
        id: Date.now().toString(),
        name: newProjectName,
        description: '',
        createdAt: new Date().toLocaleDateString('zh-TW'),
        githubConnected: false
      };
      
      setProjects([...projects, newProject]);
      setNewProjectName('');
      setShowCreateForm(false);
      
      // Uncomment when API is ready
      /*
      const response = await axios.post(`/api/organizations/${orgId}/projects`, {
        name: newProjectName
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setProjects([...projects, response.data]);
      setNewProjectName('');
      setShowCreateForm(false);
      */
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : '創建專案失敗，請稍後再試';
      setCreateProjectError(errorMessage);
    } finally {
      setCreateProjectLoading(false);
    }
  };

  const handleSelectProject = (projectId: string) => {
    navigate(`/projects/${projectId}`);
  };

  const handleConnectGithub = async (projectId: string, repository: string, branch: string) => {
    setGithubLoading(true);
    setGithubError(null);
    
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Update project with GitHub connection
      setProjects(projects.map(p => 
        p.id === projectId 
          ? { 
              ...p, 
              githubRepository: repository,
              githubBranch: branch,
              githubConnected: true 
            }
          : p
      ));
      
      // Uncomment when API is ready
      /*
      await axios.post(`/api/projects/${projectId}/github`, {
        repository,
        branch
      }, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Refresh projects
      fetchProjects();
      */
    } catch (err) {
      console.error('Error connecting to GitHub:', err);
      setGithubError('Failed to connect to GitHub');
    } finally {
      setGithubLoading(false);
    }
  };

  const handleDisconnectGithub = async (projectId: string) => {
    setGithubLoading(true);
    setGithubError(null);
    
    try {
      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Update project to remove GitHub connection
      setProjects(projects.map(p => 
        p.id === projectId 
          ? { 
              ...p, 
              githubRepository: undefined,
              githubBranch: undefined,
              githubConnected: false 
            }
          : p
      ));
      
      // Uncomment when API is ready
      /*
      await axios.delete(`/api/projects/${projectId}/github`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      // Refresh projects
      fetchProjects();
      */
    } catch (err) {
      console.error('Error disconnecting from GitHub:', err);
      setGithubError('Failed to disconnect from GitHub');
    } finally {
      setGithubLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-secondary/30 flex flex-col">
      <Navigation user={user ? { name: user.username, email: user.email } : undefined} onLogout={() => {}} />
      
      <div className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">{personalSpace.name}</h1>
            <p className="text-muted-foreground mt-1">管理您的專案和文檔</p>
          </div>
          
          <Button onClick={() => setShowCreateForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            新建專案
          </Button>
        </div>
        
        {/* Error state */}
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
        
        {/* Create project form */}
        {showCreateForm && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>創建新專案</CardTitle>
              <CardDescription>輸入專案名稱開始創建</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateProject} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    placeholder="專案名稱"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    disabled={createProjectLoading}
                  />
                  {createProjectError && (
                    <p className="text-sm text-destructive">{createProjectError}</p>
                  )}
                </div>
                
                <div className="flex space-x-2">
                  <Button 
                    type="submit" 
                    disabled={createProjectLoading || !newProjectName.trim()}
                  >
                    {createProjectLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        創建中...
                      </>
                    ) : (
                      <>
                        <FolderPlus className="w-4 h-4 mr-2" />
                        創建專案
                      </>
                    )}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => {
                      setShowCreateForm(false);
                      setCreateProjectError(null);
                      setNewProjectName('');
                    }}
                    disabled={createProjectLoading}
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
            <span className="ml-2">正在加載專案...</span>
          </div>
        )}
        
        {/* Projects grid */}
        {!loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((project) => (
              <Card key={project.id} className="overflow-hidden">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xl">{project.name}</CardTitle>
                  <CardDescription className="line-clamp-2">
                    {project.description || '無描述'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pb-3">
                  <div className="flex items-center text-sm text-muted-foreground">
                    <span>創建於 {project.createdAt}</span>
                  </div>
                  {project.githubConnected && (
                    <div className="flex items-center mt-2">
                      <Badge variant="secondary" className="flex items-center space-x-1">
                        <Github className="w-3 h-3" />
                        <span>{project.githubRepository}</span>
                      </Badge>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="pt-0">
                  <Button 
                    variant="default" 
                    className="w-full"
                    onClick={() => handleSelectProject(project.id)}
                  >
                    打開專案
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
        
        {/* Empty state */}
        {!loading && projects.length === 0 && (
          <div className="text-center py-12">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
              <FolderPlus className="w-8 h-8 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">還沒有專案</h2>
            <p className="text-muted-foreground mb-6">創建您的第一個專案來開始使用</p>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              新建專案
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
