import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from './auth/AuthContext';
import { PlusIcon, FolderIcon } from 'lucide-react';

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
  const { token, user, personalOrganization, logout } = useAuth();

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
    } catch (err) {
      console.error('Error creating project:', err);
      setError('創建專案失敗');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 頂部導航欄 */}
      <div className="bg-white border-b px-4 py-2 flex justify-between items-center">
        <div className="flex items-center">
          <span className="font-bold text-xl text-blue-600">CoSpec Markdown</span>
        </div>
        <div className="flex items-center gap-4">
          {user && (
            <span className="text-sm text-gray-600">
              {user.username}
            </span>
          )}
          <button
            onClick={logout}
            className="bg-gray-200 text-gray-800 px-3 py-1 rounded hover:bg-gray-300"
          >
            登出
          </button>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* 用戶信息卡片 */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-8 flex items-center">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-500 text-2xl font-bold mr-4">
            {user?.username?.charAt(0).toUpperCase() || '?'}
          </div>
          <div>
            <h1 className="text-2xl font-bold">{user?.username || '用戶'} 的個人空間</h1>
            <p className="text-gray-500">
              帳戶創建於 {user?.created_at ? new Date(user.created_at).toLocaleDateString() : '未知日期'}
            </p>
          </div>
        </div>
        
        {/* 錯誤消息 */}
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {/* 專案管理區域 */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">我的專案</h2>
            <div className="flex gap-2">
              <input
                type="text"
                value={newProjectName}
                onChange={(e) => setNewProjectName(e.target.value)}
                placeholder="新專案名稱"
                className="px-3 py-2 border rounded"
              />
              <button
                onClick={createProject}
                disabled={creating || !newProjectName.trim()}
                className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-blue-300 flex items-center"
              >
                <PlusIcon className="h-4 w-4 mr-1" />
                {creating ? '創建中...' : '創建專案'}
              </button>
            </div>
          </div>
          
          {/* 專案列表 */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            </div>
          ) : projects.length === 0 ? (
            <div className="bg-white rounded-lg border p-12 text-center">
              <FolderIcon className="h-16 w-16 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500 mb-4">您還沒有任何專案</p>
              <p className="text-gray-500">創建一個新專案開始使用</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {projects.map(project => (
                <Link
                  key={project.id}
                  to={`/projects/${project.id}`}
                  className="bg-white rounded-lg border p-6 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start">
                    <FolderIcon className="h-8 w-8 text-blue-500 mr-3 flex-shrink-0" />
                    <div>
                      <h3 className="text-lg font-semibold mb-1">{project.name}</h3>
                      <div className="text-sm text-gray-500 mb-2">
                        創建於 {new Date(project.created_at).toLocaleDateString()}
                      </div>
                      {project.github_repo && (
                        <div className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded inline-block">
                          GitHub: {project.github_repo}
                        </div>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
