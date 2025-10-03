import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';

interface Organization {
  id: string;
  name: string;
  slug: string;
  role: string;
  created_at: number;
  settings?: {
    isPersonal?: boolean;
    owner?: string;
    [key: string]: any;
  };
}

export default function OrganizationList() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newOrgName, setNewOrgName] = useState('');
  const [creating, setCreating] = useState(false);
  
  // 使用認證上下文
  const { token, personalOrganization, user, logout } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      // 使用 fetch API 並添加認證令牌
      const response = await fetch('/api/auth/me/organizations', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Organizations response:', data);
      setOrganizations(data.organizations || []);
      setError(null);
    } catch (err) {
      console.error('Error fetching organizations:', err);
      setError('Failed to load organizations');
    } finally {
      setLoading(false);
    }
  };

  const createOrganization = async () => {
    if (!newOrgName.trim()) return;
    
    try {
      setCreating(true);
      // 使用 fetch API 並添加認證令牌
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name: newOrgName,
          settings: {}
        })
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Created organization:', data);
      setOrganizations([...organizations, data]);
      setNewOrgName('');
      setError(null);
    } catch (err) {
      console.error('Error creating organization:', err);
      setError('Failed to create organization');
    } finally {
      setCreating(false);
    }
  };

  if (loading && organizations.length === 0) {
    return <div className="p-4">Loading organizations...</div>;
  }

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Your Organizations</h1>
        <div className="flex items-center gap-4">
          {user && (
            <span className="text-sm text-gray-600">
              Logged in as <strong>{user.username}</strong>
            </span>
          )}
          <button
            onClick={() => logout(navigate)}
            className="bg-gray-200 text-gray-800 px-3 py-1 rounded hover:bg-gray-300"
          >
            Logout
          </button>
        </div>
      </div>
      
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}
      
      <div className="mb-6">
        <div className="flex gap-2">
          <input
            type="text"
            value={newOrgName}
            onChange={(e) => setNewOrgName(e.target.value)}
            placeholder="New organization name"
            className="flex-1 px-3 py-2 border rounded"
          />
          <button
            onClick={createOrganization}
            disabled={creating || !newOrgName.trim()}
            className="bg-blue-500 text-white px-4 py-2 rounded disabled:bg-blue-300"
          >
            {creating ? 'Creating...' : 'Create'}
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
        {/* 個人空間 */}
        {personalOrganization && (
          <Link
            key={personalOrganization.id}
            to={`/organizations/${personalOrganization.id}`}
            className="block p-4 border-2 border-indigo-500 rounded hover:bg-indigo-50"
          >
            <h2 className="text-xl font-semibold">{personalOrganization.name}</h2>
            <div className="text-sm text-indigo-600">Personal Space</div>
            <div className="text-sm text-gray-500">
              Created: {new Date(personalOrganization.created_at).toLocaleDateString()}
            </div>
          </Link>
        )}
        
        {/* 其他組織 */}
        {organizations
          .filter(org => !org.settings?.isPersonal)
          .map(org => (
            <Link
              key={org.id}
              to={`/organizations/${org.id}`}
              className="block p-4 border rounded hover:bg-gray-50"
            >
              <h2 className="text-xl font-semibold">{org.name}</h2>
              <div className="text-sm text-gray-500">Role: {org.role}</div>
              <div className="text-sm text-gray-500">
                Created: {new Date(org.created_at).toLocaleDateString()}
              </div>
            </Link>
          ))}
          
        {organizations.length === 0 && !personalOrganization && (
          <div className="text-gray-500 col-span-3 text-center p-4">
            No organizations found. Create one to get started.
          </div>
        )}
      </div>
    </div>
  );
}
