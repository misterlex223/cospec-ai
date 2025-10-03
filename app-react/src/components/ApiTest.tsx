import { useState, useEffect } from 'react';
import axios from 'axios';

export default function ApiTest() {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newOrgName, setNewOrgName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      const response = await axios.get('/api/organizations');
      console.log('Organizations response:', response.data);
      setOrganizations(response.data.organizations || []);
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
      const response = await axios.post('/api/organizations', {
        name: newOrgName,
        settings: {}
      });
      
      console.log('Created organization:', response.data);
      setOrganizations([...organizations, response.data]);
      setNewOrgName('');
      setError(null);
    } catch (err) {
      console.error('Error creating organization:', err);
      setError('Failed to create organization');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-4">API Test</h1>
      
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
      
      {loading ? (
        <div>Loading organizations...</div>
      ) : organizations.length === 0 ? (
        <div>No organizations found</div>
      ) : (
        <ul className="space-y-2">
          {organizations.map((org) => (
            <li key={org.id} className="p-2 border rounded">
              <div className="font-bold">{org.name}</div>
              <div className="text-sm text-gray-500">ID: {org.id}</div>
              <div className="text-sm text-gray-500">
                Created: {new Date(org.created_at).toLocaleString()}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
