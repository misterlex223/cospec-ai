import { useState } from 'react';
import type { Folder, Document } from '../../types/profile';
import { ChevronDown, ChevronUp, Trash2, FolderOpen, Plus } from 'lucide-react';
import DocumentList from './DocumentList';

interface FolderListProps {
  folders: Folder[];
  onUpdate: (index: number, folder: Folder) => void;
  onDelete: (index: number) => void;
  profileName: string;
}

/**
 * FolderList - Displays and allows editing of folders in a profile
 */
function FolderList({ folders, onUpdate, onDelete, profileName }: FolderListProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  const handleAddDocument = (folderIndex: number) => {
    const folder = folders[folderIndex];
    const newDoc: Document = {
      name: 'New Document',
      path: `${folder.path}new-doc.md`,
      description: '',
    };
    onUpdate(folderIndex, {
      ...folder,
      documents: [...(folder.documents || []), newDoc],
    });
  };

  const handleUpdateDocument = (folderIndex: number, docIndex: number, doc: Document) => {
    const folder = folders[folderIndex];
    const documents = [...(folder.documents || [])];
    documents[docIndex] = doc;
    onUpdate(folderIndex, { ...folder, documents });
  };

  const handleDeleteDocument = (folderIndex: number, docIndex: number) => {
    const folder = folders[folderIndex];
    const documents = [...(folder.documents || [])];
    documents.splice(docIndex, 1);
    onUpdate(folderIndex, { ...folder, documents });
  };

  if (folders.length === 0) {
    return (
      <div className="pe-empty-state">
        <div className="pe-empty-state-description">
          No folders defined. Click "Add Folder" to create one.
        </div>
      </div>
    );
  }

  return (
    <div className="pe-gap-md" style={{display: 'flex', flexDirection: 'column'}}>
      {folders.map((folder, index) => (
        <div key={index} className="pe-collapsible">
          {/* Header */}
          <div
            className="pe-collapsible-header"
            onClick={() => toggleExpand(index)}
          >
            <div className="pe-collapsible-header-content">
              <FolderOpen size={20} className="pe-collapsible-header-icon" />
              <div className="pe-collapsible-header-text">
                <div className="pe-collapsible-header-title">{folder.name}</div>
                <div className="pe-collapsible-header-subtitle">{folder.path}</div>
              </div>
            </div>
            <div className="pe-flex pe-items-center pe-gap-sm">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(index);
                }}
                className="pe-btn pe-btn-danger pe-btn-icon"
                title="Delete folder"
              >
                <Trash2 size={18} />
              </button>
              {expandedIndex === index ? (
                <ChevronUp size={20} />
              ) : (
                <ChevronDown size={20} />
              )}
            </div>
          </div>

          {/* Details */}
          {expandedIndex === index && (
            <div className="pe-collapsible-body">
              <div className="pe-form-group">
                <label className="pe-label">
                  Folder Name *
                </label>
                <input
                  type="text"
                  value={folder.name}
                  onChange={(e) => onUpdate(index, { ...folder, name: e.target.value })}
                  className="pe-input"
                />
              </div>

              <div className="pe-form-group">
                <label className="pe-label">
                  Folder Path *
                </label>
                <input
                  type="text"
                  value={folder.path}
                  onChange={(e) => onUpdate(index, { ...folder, path: e.target.value })}
                  placeholder="e.g., requirements/"
                  className="pe-input"
                />
                <span className="pe-input-help">
                  Path relative to markdown directory (should end with /)
                </span>
              </div>

              <div className="pe-form-group">
                <label className="pe-label">
                  Description
                </label>
                <textarea
                  value={folder.description || ''}
                  onChange={(e) => onUpdate(index, { ...folder, description: e.target.value })}
                  placeholder="Purpose of this folder"
                  rows={2}
                  className="pe-textarea"
                />
              </div>

              <div className="pe-form-group">
                <label className="pe-label">
                  Document Type
                </label>
                <input
                  type="text"
                  value={folder.documentType || ''}
                  onChange={(e) => onUpdate(index, { ...folder, documentType: e.target.value })}
                  placeholder="e.g., requirement, spec, test"
                  className="pe-input"
                />
              </div>

              {/* Folder Documents */}
              <div className="pe-form-group" style={{borderTop: '1px solid var(--pe-border)', paddingTop: 'var(--pe-space-lg)', marginTop: 'var(--pe-space-lg)'}}>
                <div className="pe-flex pe-items-center pe-justify-between" style={{marginBottom: 'var(--pe-space-md)'}}>
                  <h4 className="pe-label" style={{margin: 0}}>Documents in Folder</h4>
                  <button
                    onClick={() => handleAddDocument(index)}
                    className="pe-btn pe-btn-primary pe-btn-sm"
                  >
                    <Plus size={16} />
                    Add Document
                  </button>
                </div>
                <DocumentList
                  documents={folder.documents || []}
                  onUpdate={(docIndex, doc) => handleUpdateDocument(index, docIndex, doc)}
                  onDelete={(docIndex) => handleDeleteDocument(index, docIndex)}
                  profileName={profileName}
                />
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default FolderList;
