import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { isRequirementsFile, extractRequirements } from '../../utils/requirementsTracker';

interface RequirementsViewProps {
  content: string;
  onUpdateContent: (newContent: string) => void;
}

export function RequirementsView({ content, onUpdateContent }: RequirementsViewProps) {
  const [requirements, setRequirements] = useState<any[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [newRequirement, setNewRequirement] = useState({ id: '', title: '', description: '' });

  const currentFile = useSelector((state: RootState) => state.editor.filePath);

  useEffect(() => {
    if (content) {
      const extracted = extractRequirements(content);
      setRequirements(extracted);
    }
  }, [content]);

  const handleStatusChange = (reqId: string, newStatus: string) => {
    const updatedContent = content.replace(
      new RegExp(`(${reqId}[^\\n]*?)(status:|狀態:|\\[\\s*\\w+\\s*\\]|\\([\\s*\\w+\\s*\\])?)`, 'gi'),
      `$1status: ${newStatus}`
    );
    onUpdateContent(updatedContent);
  };

  const handleAddRequirement = () => {
    if (newRequirement.title.trim()) {
      const newReqId = `REQ-${Date.now()}`;
      const newReqText = `\n### ${newReqId}: ${newRequirement.title}\n\n${newRequirement.description || '待補充描述'}\n\nstatus: draft\n`;
      const updatedContent = content + newReqText;
      onUpdateContent(updatedContent);
      setNewRequirement({ id: '', title: '', description: '' });
      setIsEditing(false);
    }
  };

  const visibleRequirements = filterStatus === 'all'
    ? requirements
    : requirements.filter(req => req.status === filterStatus);

  if (!isRequirementsFile(currentFile || '', content)) {
    return null;
  }

  return (
    <div className="requirements-view" style={{
      padding: '16px',
      border: '1px solid #e5e7eb',
      borderRadius: '4px',
      marginTop: '16px',
      backgroundColor: '#f9fafb'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0 }}>Requirements Tracker</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={{ padding: '4px 8px', borderRadius: '4px', border: '1px solid #d1d5db' }}
          >
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="review">Review</option>
            <option value="approved">Approved</option>
            <option value="implemented">Implemented</option>
            <option value="rejected">Rejected</option>
          </select>
          <button
            onClick={() => setIsEditing(!isEditing)}
            style={{
              padding: '4px 8px',
              backgroundColor: '#3b82f6',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            {isEditing ? 'Cancel' : 'Add Req'}
          </button>
        </div>
      </div>

      {isEditing && (
        <div style={{ marginBottom: '16px', padding: '12px', backgroundColor: 'white', borderRadius: '4px' }}>
          <h4>Add New Requirement</h4>
          <input
            type="text"
            placeholder="Requirement Title"
            value={newRequirement.title}
            onChange={(e) => setNewRequirement({...newRequirement, title: e.target.value})}
            style={{
              width: '100%',
              padding: '8px',
              marginBottom: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px'
            }}
          />
          <textarea
            placeholder="Requirement Description"
            value={newRequirement.description}
            onChange={(e) => setNewRequirement({...newRequirement, description: e.target.value})}
            style={{
              width: '100%',
              padding: '8px',
              marginBottom: '8px',
              border: '1px solid #d1d5db',
              borderRadius: '4px',
              minHeight: '60px'
            }}
          />
          <button
            onClick={handleAddRequirement}
            style={{
              padding: '6px 12px',
              backgroundColor: '#10b981',
              color: 'white',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Add Requirement
          </button>
        </div>
      )}

      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {visibleRequirements.length === 0 ? (
          <p style={{ textAlign: 'center', color: '#6b7280' }}>No requirements found. Add requirements using the format: "REQ-123: Requirement Title"</p>
        ) : (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {visibleRequirements.map((req, index) => (
              <li
                key={index}
                style={{
                  padding: '8px',
                  marginBottom: '8px',
                  backgroundColor: 'white',
                  borderRadius: '4px',
                  border: '1px solid #e5e7eb'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div>
                    <strong>{req.id}:</strong> {req.title}
                    <p style={{ margin: '4px 0', color: '#4b5563' }}>{req.description}</p>
                  </div>
                  <select
                    value={req.status}
                    onChange={(e) => handleStatusChange(req.id, e.target.value)}
                    style={{
                      padding: '2px 6px',
                      borderRadius: '4px',
                      border: '1px solid #d1d5db'
                    }}
                  >
                    <option value="draft">Draft</option>
                    <option value="review">Review</option>
                    <option value="approved">Approved</option>
                    <option value="implemented">Implemented</option>
                    <option value="rejected">Rejected</option>
                  </select>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}