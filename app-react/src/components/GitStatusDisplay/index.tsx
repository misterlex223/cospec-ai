/**
 * GitStatusDisplay Component
 *
 * Compact Git status indicator for the editor toolbar
 */

import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import type { RootState } from '../../store';
import { fetchStatus } from '../../store/slices/gitSlice';
import './GitStatusDisplay.css';

export interface GitStatusDisplayProps {
  className?: string;
}

const GitStatusDisplay: React.FC<GitStatusDisplayProps> = ({ className = '' }) => {
  const dispatch = useDispatch();
  const { status, isLoading } = useSelector((state: RootState) => state.git);

  useEffect(() => {
    dispatch(fetchStatus() as any);
  }, [dispatch]);

  const getFileCount = () => {
    if (!status?.results) return 0;
    return status.results.filter(r => r.type === 'file').length;
  };

  const getModifiedCount = () => {
    if (!status?.results) return 0;
    return status.results.filter(r => (r as any).status === 'M').length;
  };

  const getAddedCount = () => {
    if (!status?.results) return 0;
    return status.results.filter(r => (r as any).status === 'A').length;
  };

  const getUntrackedCount = () => {
    if (!status?.results) return 0;
    return status.results.filter(r => (r as any).status === '??').length;
  };

  const fileCount = getFileCount();
  const modifiedCount = getModifiedCount();
  const addedCount = getAddedCount();
  const untrackedCount = getUntrackedCount();

  if (isLoading) {
    return (
      <div className={`git-status-display ${className}`}>
        <span className="git-status-loading">○</span>
      </div>
    );
  }

  if (fileCount === 0) {
    return (
      <div className={`git-status-display ${className}`}>
        <span className="git-status-clean" title="No changes">✓</span>
      </div>
    );
  }

  return (
    <div className={`git-status-display ${className}`} title={`${fileCount} file(s) changed`}>
      {modifiedCount > 0 && (
        <span className="git-status-badge modified" title={`${modifiedCount} modified`}>
          ✏️ {modifiedCount}
        </span>
      )}
      {addedCount > 0 && (
        <span className="git-status-badge added" title={`${addedCount} added`}>
          ➕ {addedCount}
        </span>
      )}
      {untrackedCount > 0 && (
        <span className="git-status-badge untracked" title={`${untrackedCount} untracked`}>
          ❓ {untrackedCount}
        </span>
      )}
    </div>
  );
};

export default GitStatusDisplay;
