import { useState, useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from './auth/AuthContext';

interface Project {
  id: string;
  name: string;
  slug: string;
  role: string;
  created_at: number;
  github_repo?: string;
  github_branch?: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
}

export default function ProjectList() {
  const { orgId } = useParams<{ orgId: string }>();
  const [projects, setProjects] = useState<Project[]>([]);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newProjectName, setNewProjectName] = useState('');
  const [creating, setCreating] = useState(false);
  
  // 獲取認證令牌
  const { token } = useAuth();

  useEffect(() => {
    if (orgId) {
      fetchOrganization();
      fetchProjects();
    }
  }, [orgId]);

  const fetchOrganization = async () => {
    try {
      const response = await axios.get(`/api/organizations/${orgId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setOrganization(response.data);
      setError(null);
    } catch (err) {
      console.error('Error fetching organization:', err);
      setError('Failed to load organization');
    }
  };

  const fetchProjects = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/organizations/${orgId}/projects`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      setProjects(response.data.projects || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const createProject = async () => {
    if (!newProjectName.trim()) return;
    
    try {
      setCreating(true);
      const response = await axios.post(`/api/organizations/${orgId}/projects`, {
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
      setError('Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  if (loading && projects.length === 0) {
    return <div className="p-4">Loading projects...</div>;
  }

  return (
    <div className="p-4">
      <div className="mb-4">
        <Link to="/organizations" className="text-blue-500 hover:underline">
          ← Back to Organizations
        </Link>
      </div>
      
      <h1 className="text-2xl font-bold mb-1">
        {organization ? organization.name : 'Organization'} Projects
      </h1>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={newProjectName}
            onChange={(e) => setNewProjectName(e.target.value)}
            placeholder="New project name"
            className="flex-1 px-3 py-2 border rounded"
          />
          <button
            onClick={createProject}
            disabled={creating || !newProjectName.trim()}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-blue-300"
          >
            {creating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
      
      {projects.length === 0 ? (
        <div className="text-gray-500">No projects found. Create one to get started.</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map(project => (
            <Link
              key={project.id}
              to={`/projects/${project.id}`}
              className="block p-4 border rounded hover:bg-gray-50"
            >
              <h2 className="text-xl font-semibold">{project.name}</h2>
              <div className="text-sm text-gray-500">Role: {project.role}</div>
              {project.github_repo && (
                <div className="text-sm text-gray-500">
                  GitHub: {project.github_repo}:{project.github_branch || 'main'}
                </div>
              )}
              <div className="text-sm text-gray-500">
                Created: {new Date(project.created_at).toLocaleDateString()}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
