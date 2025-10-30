import { useState } from 'react';
import type { Document } from '../../types/profile';
import { ChevronDown, ChevronUp, Trash2, FileText } from 'lucide-react';
import PromptFileManager from './PromptFileManager';

interface DocumentListProps {
  documents: Document[];
  onUpdate: (index: number, doc: Document) => void;
  onDelete: (index: number) => void;
  profileName: string;
}

/**
 * DocumentList - Displays and allows editing of documents in a profile
 */
function DocumentList({ documents, onUpdate, onDelete, profileName }: DocumentListProps) {
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const toggleExpand = (index: number) => {
    setExpandedIndex(expandedIndex === index ? null : index);
  };

  if (documents.length === 0) {
    return (
      <div className="pe-empty-state">
        <div className="pe-empty-state-description">
          No documents defined. Click "Add Document" to create one.
        </div>
      </div>
    );
  }

  return (
    <div className="pe-gap-md" style={{display: 'flex', flexDirection: 'column'}}>
      {documents.map((doc, index) => (
        <div key={index} className="pe-collapsible">
          {/* Header */}
          <div
            className="pe-collapsible-header"
            onClick={() => toggleExpand(index)}
          >
            <div className="pe-collapsible-header-content">
              <FileText size={20} className="pe-collapsible-header-icon" />
              <div className="pe-collapsible-header-text">
                <div className="pe-collapsible-header-title">{doc.name}</div>
                <div className="pe-collapsible-header-subtitle">{doc.path}</div>
              </div>
            </div>
            <div className="pe-flex pe-items-center pe-gap-sm">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(index);
                }}
                className="pe-btn pe-btn-danger pe-btn-icon"
                title="Delete document"
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
                <label className="pe-label">Document Name *</label>
                <input
                  type="text"
                  value={doc.name}
                  onChange={(e) => onUpdate(index, { ...doc, name: e.target.value })}
                  className="pe-input"
                />
              </div>

              <div className="pe-form-group">
                <label className="pe-label">File Path *</label>
                <input
                  type="text"
                  value={doc.path}
                  onChange={(e) => onUpdate(index, { ...doc, path: e.target.value })}
                  placeholder="e.g., SPEC.md or docs/api-spec.md"
                  className="pe-input"
                />
                <span className="pe-input-help">
                  Path relative to markdown directory
                </span>
              </div>

              <div className="pe-form-group">
                <label className="pe-label">Description</label>
                <textarea
                  value={doc.description || ''}
                  onChange={(e) => onUpdate(index, { ...doc, description: e.target.value })}
                  placeholder="Purpose of this document"
                  rows={2}
                  className="pe-textarea"
                />
              </div>

              <div className="pe-form-group">
                <label className="pe-label">Prompt File</label>
                <input
                  type="text"
                  value={doc.promptFile || ''}
                  onChange={(e) => onUpdate(index, { ...doc, promptFile: e.target.value })}
                  placeholder="e.g., prompts/api-spec.md"
                  className="pe-input"
                />
                <span className="pe-input-help">
                  Path relative to profile directory
                </span>
              </div>

              {doc.promptFile && (
                <PromptFileManager
                  profileName={profileName}
                  promptPath={doc.promptFile}
                />
              )}

              <div className="pe-form-group">
                <label className="pe-label">Prompt Text</label>
                <textarea
                  value={doc.promptText || ''}
                  onChange={(e) => onUpdate(index, { ...doc, promptText: e.target.value })}
                  placeholder="Additional context for generation"
                  rows={2}
                  className="pe-textarea"
                />
              </div>

              <div className="pe-form-group">
                <label className="pe-label">Generation Command</label>
                <textarea
                  value={doc.command || ''}
                  onChange={(e) => onUpdate(index, { ...doc, command: e.target.value })}
                  placeholder="e.g., kai agent execute --prompt-file {promptFile} --output {filePath}"
                  rows={2}
                  className="pe-textarea pe-font-mono"
                />
                <span className="pe-input-help">
                  Variables: {'{filePath}'}, {'{promptFile}'}, {'{promptText}'}
                </span>
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default DocumentList;
