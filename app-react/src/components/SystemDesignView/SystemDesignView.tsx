import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../../store';

interface SystemDesignViewProps {
  content: string;
  onUpdateContent: (newContent: string) => void;
}

export function SystemDesignView({ content, onUpdateContent }: SystemDesignViewProps) {
  const [activeTab, setActiveTab] = useState<'diagram' | 'components' | 'flow'>('diagram');
  const [newComponent, setNewComponent] = useState({ name: '', type: 'service', description: '' });
  const [newConnection, setNewConnection] = useState({ from: '', to: '', type: 'data-flow' });

  const currentFile = useSelector((state: RootState) => state.editor.filePath);

  // Check if this looks like a system design document
  const isSystemDesignFile = () => {
    if (!currentFile) return false;
    const lowerFile = currentFile.toLowerCase();

    // Check filename for system design indicators
    const fileNameIndicators = [
      'design', 'arch', 'system', 'architecture', 'sdd', 'system-design'
    ];
    const hasFileNameIndicator = fileNameIndicators.some(indicator =>
      lowerFile.includes(indicator)
    );

    // Check content for system design indicators
    const contentPattern = /(#\s*architecture|#\s*system\s*design|#\s*design|#\s*系統架構|#\s*架構|#\s*設計|\barchitecture\b|\bsystem\s+design\b|\b系統架構\b|\b架構設計\b)/i;
    const hasContentIndicator = contentPattern.test(content);

    return hasFileNameIndicator || hasContentIndicator;
  };

  // Only render if this is a system design file
  if (!isSystemDesignFile()) {
    return null;
  }

  // Extract components from content (supporting multiple formats)
  const extractComponents = () => {
    const components = [];

    // Format 1: ### Component: Name
    const format1Matches = [...content.matchAll(/###\s*Component:\s*(.*?)\r?\n(.*?)(?=\r?\n###\s*Component:|$)/gs)];
    for (const match of format1Matches) {
      const name = match[1]?.trim() || 'Unknown';
      let description = match[2]?.trim() || 'No description';

      // Extract type if specified in the description
      const typeMatch = description.match(/- Type: (.*?)\r?\n/i);
      const type = typeMatch ? typeMatch[1].trim() : 'service';

      // Clean up description by removing type and other metadata
      description = description
        .replace(/- Type: .*\r?\n?/i, '')
        .replace(/- Description: /i, '')
        .replace(/^\s*-\s*/gm, '') // Remove list item prefixes
        .trim();

      components.push({
        name,
        description: description || 'No description',
        type
      });
    }

    // Format 2: ## Component Name with type and description
    const format2Matches = [...content.matchAll(/##\s*(.*?)\r?\n- Type: (.*?)\r?\n- Description: (.*?)(?=\r?\n##\s*|$)/gs)];
    for (const match of format2Matches) {
      components.push({
        name: match[1]?.trim() || 'Unknown',
        type: match[2]?.trim() || 'service',
        description: match[3]?.trim() || 'No description'
      });
    }

    // Format 3: Simple list format with component indicators
    const format3Matches = [...content.matchAll(/-\s*\*\*Component:\s*(.*?)\*\*.*?\r?\n\s*- Type: (.*?)\r?\n\s*- Description: (.*?)(?=\r?\n-\s*\*\*Component:|$)/gs)];
    for (const match of format3Matches) {
      components.push({
        name: match[1]?.trim() || 'Unknown',
        type: match[2]?.trim() || 'service',
        description: match[3]?.trim() || 'No description'
      });
    }

    return components;
  };

  // Add a new component to the content
  const handleAddComponent = () => {
    if (newComponent.name.trim()) {
      const componentText = `\n### Component: ${newComponent.name}\n- Type: ${newComponent.type}\n- Description: ${newComponent.description || 'No description provided'}\n`;
      const updatedContent = content + componentText;
      onUpdateContent(updatedContent);
      setNewComponent({ name: '', type: 'service', description: '' });
    }
  };

  const components = extractComponents();

  return (
    <div className="system-design-view" style={{
      padding: '16px',
      border: '1px solid #e5e7eb',
      borderRadius: '4px',
      marginTop: '16px',
      backgroundColor: '#f9fafb'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h3 style={{ margin: 0 }}>System Design Tools</h3>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button
            onClick={() => setActiveTab('diagram')}
            style={{
              padding: '4px 8px',
              backgroundColor: activeTab === 'diagram' ? '#3b82f6' : '#e5e7eb',
              color: activeTab === 'diagram' ? 'white' : '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '4px 0 0 4px',
              cursor: 'pointer'
            }}
          >
            Diagram
          </button>
          <button
            onClick={() => setActiveTab('components')}
            style={{
              padding: '4px 8px',
              backgroundColor: activeTab === 'components' ? '#3b82f6' : '#e5e7eb',
              color: activeTab === 'components' ? 'white' : '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '0',
              cursor: 'pointer'
            }}
          >
            Components
          </button>
          <button
            onClick={() => setActiveTab('flow')}
            style={{
              padding: '4px 8px',
              backgroundColor: activeTab === 'flow' ? '#3b82f6' : '#e5e7eb',
              color: activeTab === 'flow' ? 'white' : '#374151',
              border: '1px solid #d1d5db',
              borderRadius: '0 4px 4px 0',
              cursor: 'pointer'
            }}
          >
            Flow
          </button>
        </div>
      </div>

      {activeTab === 'diagram' && (
        <div>
          <p style={{ marginBottom: '12px' }}>Describe your system architecture using the components below, or use the AI assistant for help.</p>
          <div style={{
            border: '1px dashed #d1d5db',
            borderRadius: '4px',
            padding: '16px',
            backgroundColor: 'white',
            minHeight: '100px',
            fontFamily: 'monospace',
            fontSize: '12px'
          }}>
            {/* Simple text-based representation of system architecture */}
            {components.length > 0 ? (
              <div>
                {components.map((comp, index) => (
                  <div key={index} style={{
                    padding: '8px',
                    margin: '4px 0',
                    backgroundColor: '#f3f4f6',
                    borderRadius: '4px',
                    border: '1px solid #e5e7eb'
                  }}>
                    <strong>{comp.name}</strong> ({comp.type})<br />
                    <small>{comp.description}</small>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ color: '#9ca3af', textAlign: 'center' }}>No components defined. Add components using the format: "### Component: [name]"</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'components' && (
        <div>
          <h4>Add New Component</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="Component Name"
              value={newComponent.name}
              onChange={(e) => setNewComponent({...newComponent, name: e.target.value})}
              style={{
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px'
              }}
            />
            <select
              value={newComponent.type}
              onChange={(e) => setNewComponent({...newComponent, type: e.target.value})}
              style={{
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px'
              }}
            >
              <option value="service">Service</option>
              <option value="database">Database</option>
              <option value="api">API</option>
              <option value="frontend">Frontend</option>
              <option value="external">External Service</option>
            </select>
            <textarea
              placeholder="Description"
              value={newComponent.description}
              onChange={(e) => setNewComponent({...newComponent, description: e.target.value})}
              style={{
                padding: '8px',
                border: '1px solid #d1d5db',
                borderRadius: '4px',
                minHeight: '60px'
              }}
            />
            <button
              onClick={handleAddComponent}
              style={{
                padding: '6px 12px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Add Component
            </button>
          </div>

          <h4>Existing Components</h4>
          {components.length > 0 ? (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {components.map((comp, index) => (
                <li key={index} style={{
                  padding: '8px',
                  marginBottom: '4px',
                  backgroundColor: 'white',
                  borderRadius: '4px',
                  border: '1px solid #e5e7eb'
                }}>
                  <strong>{comp.name}</strong> ({comp.type})<br />
                  <small>{comp.description}</small>
                </li>
              ))}
            </ul>
          ) : (
            <p>No components defined yet.</p>
          )}
        </div>
      )}

      {activeTab === 'flow' && (
        <div>
          <p>Define data flows and interactions between components.</p>
          <div style={{
            border: '1px dashed #d1d5db',
            borderRadius: '4px',
            padding: '16px',
            backgroundColor: 'white',
            minHeight: '100px'
          }}>
            <p style={{ color: '#9ca3af', textAlign: 'center' }}>Use the AI assistant to generate sequence diagrams and data flows from your descriptions.</p>
          </div>
        </div>
      )}
    </div>
  );
}