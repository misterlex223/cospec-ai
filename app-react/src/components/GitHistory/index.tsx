/**
 * GitHistory Component
 *
 * Displays commit history and branch information
 */

import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { fetchLog, fetchBranches, setSelectedCommit } from '../../store/slices/gitSlice';
import type { GitCommit } from '../../types/git';
import './GitHistory.css';

export interface GitHistoryProps {
  onCommitSelect?: (commit: GitCommit) => void;
  selectedCommitId?: string | null;
}

const GitHistory: React.FC<GitHistoryProps> = ({
  onCommitSelect,
  selectedCommitId,
}) => {
  const dispatch = useDispatch();
  const { commits, branches, currentBranch, isLoading } = useSelector(
    (state: RootState) => state.git
  );
  const [expandedCommit, setExpandedCommit] = useState<string | null>(null);

  useEffect(() => {
    dispatch(fetchLog() as any);
    dispatch(fetchBranches() as any);
  }, [dispatch]);

  const handleCommitClick = (commit: GitCommit) => {
    if (expandedCommit === commit.hash) {
      setExpandedCommit(null);
    } else {
      setExpandedCommit(commit.hash);
    }
    onCommitSelect?.(commit);
    dispatch(setSelectedCommit(commit.hash));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <div className="git-history">
      <div className="git-history-header">
        <h3 className="git-history-title">Commit History</h3>
        <div className="git-history-branch">
          <span className="branch-label">Branch:</span>
          <span className="branch-name">{currentBranch || 'main'}</span>
        </div>
      </div>

      <div className="git-history-content">
        {isLoading ? (
          <div className="git-history-loading">Loading...</div>
        ) : commits.length === 0 ? (
          <div className="git-history-empty">No commits yet</div>
        ) : (
          <div className="git-history-list">
            {commits.map((commit) => (
              <div
                key={commit.hash}
                className={`git-history-commit ${
                  selectedCommitId === commit.hash ? 'selected' : ''
                } ${expandedCommit === commit.hash ? 'expanded' : ''}`}
                onClick={() => handleCommitClick(commit)}
              >
                <div className="commit-header">
                  <div className="commit-hash">{commit.hash}</div>
                  <div className="commit-author">{commit.author}</div>
                  <div className="commit-date">{formatDate(commit.date)}</div>
                </div>
                <div className="commit-message">{commit.message}</div>
                {expandedCommit === commit.hash && commit.files && (
                  <div className="commit-files">
                    <div className="commit-files-title">Changed files:</div>
                    <ul className="commit-files-list">
                      {commit.files.map((file, index) => (
                        <li key={index} className="commit-file">
                          {file}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {branches.length > 0 && (
        <div className="git-history-branches">
          <div className="branches-title">Branches</div>
          <div className="branches-list">
            {branches.map((branch) => (
              <div
                key={branch.name}
                className={`branch-item ${branch.isCurrent ? 'current' : ''}`}
              >
                <span className="branch-icon">
                  {branch.isCurrent ? '●' : '○'}
                </span>
                <span className="branch-name">{branch.name}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default GitHistory;
