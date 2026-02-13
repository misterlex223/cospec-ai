/**
 * GitPanel Component
 *
 * Main Git panel combining status, history, and diff views
 */

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../store';
import {
  fetchStatus,
  fetchDiff,
  stageFiles,
  commitChanges,
  setSelectedCommit,
} from '../../store/slices/gitSlice';
import type { GitFileChange, GitCommit } from '../../types/git';
import GitHistory from '../GitHistory';
import DiffViewer from '../DiffViewer';
import './GitPanel.css';

export interface GitPanelProps {
  className?: string;
}

const GitPanel: React.FC<GitPanelProps> = ({ className = '' }) => {
  const dispatch = useDispatch();
  const {
    status,
    isLoading,
    errorMessage,
    selectedCommit,
    diffView,
  } = useSelector((state: RootState) => state.git);
  
  const [activeTab, setActiveTab] = useState<'status' | 'history' | 'diff'>('status');
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [commitMessage, setCommitMessage] = useState('');

  useEffect(() => {
    dispatch(fetchStatus() as any);
  }, [dispatch]);

  const handleFileToggle = (path: string) => {
    const newSelected = new Set(selectedFiles);
    if (newSelected.has(path)) {
      newSelected.delete(path);
    } else {
      newSelected.add(path);
    }
    setSelectedFiles(newSelected);
  };

  const handleStageAll = () => {
    if (status?.results) {
      const allFiles = status.results
        .filter(r => r.type === 'file')
        .map(r => (r as any).path);
      dispatch(stageFiles(allFiles) as any);
    }
  };

  const handleCommit = () => {
    if (commitMessage.trim() && selectedFiles.size > 0) {
      dispatch(commitChanges(commitMessage) as any);
      setCommitMessage('');
      setSelectedFiles(new Set());
    }
  };

  const handleCommitSelect = (commit: GitCommit) => {
    dispatch(fetchDiff({ pathB: commit.hash }) as any);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'A': return '➕';
      case 'M': return '✏️';
      case 'D': return '❌';
      case 'R': return '📝';
      case '??': return '❓';
      case '!!': return '🚫';
      default: return '📄';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'A': return 'Added';
      case 'M': return 'Modified';
      case 'D': return 'Deleted';
      case 'R': return 'Renamed';
      case '??': return 'Untracked';
      case '!!': return 'Ignored';
      default: return status;
    }
  };

  return (
    <div className={`git-panel ${className}`}>
      <div className="git-panel-tabs">
        <button
          className={`git-tab ${activeTab === 'status' ? 'active' : ''}`}
          onClick={() => setActiveTab('status')}
        >
          Status
        </button>
        <button
          className={`git-tab ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          History
        </button>
        <button
          className={`git-tab ${activeTab === 'diff' ? 'active' : ''}`}
          onClick={() => setActiveTab('diff')}
        >
          Diff
        </button>
      </div>

      <div className="git-panel-content">
        {errorMessage && (
          <div className="git-error">{errorMessage}</div>
        )}

        {activeTab === 'status' && (
          <div className="git-status-view">
            {isLoading ? (
              <div className="git-loading">Loading...</div>
            ) : status?.results && status.results.length > 0 ? (
              <>
                <div className="git-actions">
                  <button
                    className="git-action-btn"
                    onClick={handleStageAll}
                    disabled={isLoading}
                  >
                    Stage All
                  </button>
                  <button
                    className="git-action-btn primary"
                    onClick={handleCommit}
                    disabled={selectedFiles.size === 0 || !commitMessage.trim() || isLoading}
                  >
                    Commit ({selectedFiles.size})
                  </button>
                </div>

                <div className="git-commit-input">
                  <input
                    type="text"
                    placeholder="Commit message..."
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    disabled={isLoading}
                  />
                </div>

                <div className="git-file-list">
                  {status.results.map((result, index) => {
                    if (result.type === 'rename') {
                      return (
                        <div key={index} className="git-file-item rename">
                          <span className="git-file-icon">📝</span>
                          <span className="git-file-paths">
                            {result.oldPath} → {result.newPath}
                          </span>
                        </div>
                      );
                    }
                    
                    return (
                      <div
                        key={index}
                        className={`git-file-item ${selectedFiles.has(result.path) ? 'selected' : ''}`}
                        onClick={() => handleFileToggle(result.path)}
                      >
                        <input
                          type="checkbox"
                          checked={selectedFiles.has(result.path)}
                          onChange={() => handleFileToggle(result.path)}
                          className="git-file-checkbox"
                        />
                        <span className="git-file-icon">{getStatusIcon(result.status)}</span>
                        <span className="git-file-path">{result.path}</span>
                        <span className="git-file-status">{getStatusLabel(result.status)}</span>
                      </div>
                    );
                  })}
                </div>
              </>
            ) : (
              <div className="git-empty">No changes detected</div>
            )}
          </div>
        )}

        {activeTab === 'history' && (
          <GitHistory
            onCommitSelect={handleCommitSelect}
            selectedCommitId={selectedCommit}
          />
        )}

        {activeTab === 'diff' && (
          <DiffViewer
            hunks={diffView ? undefined : []}
            pathA={diffView?.pathA}
            pathB={diffView?.pathB}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
};

export default GitPanel;
