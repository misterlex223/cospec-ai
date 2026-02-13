/**
 * DiffViewer Component
 *
 * Displays Git diff output with syntax highlighting
 */

import React, { useMemo } from 'react';
import type { DiffHunk, DiffLine } from '../../types/git';
import './DiffViewer.css';

export interface DiffViewerProps {
  hunks?: DiffHunk[];
  isLoading?: boolean;
  error?: string | null;
  pathA?: string;
  pathB?: string;
}

const DiffViewer: React.FC<DiffViewerProps> = ({
  hunks,
  isLoading = false,
  error = null,
  pathA,
  pathB,
}) => {
  const renderLine = (line: DiffLine, index: number) => {
    const lineClass = `diff-line diff-line-${line.type}`;
    
    return (
      <div key={index} className={lineClass}>
        <div className="diff-line-numbers">
          <span className="diff-line-old">{line.oldNumber ?? ''}</span>
          <span className="diff-line-new">{line.newNumber ?? ''}</span>
        </div>
        <div className="diff-line-content">
          <span className="diff-line-prefix">
            {line.type === 'added' && '+'}
            {line.type === 'removed' && '-'}
            {line.type === 'context' && ' '}
          </span>
          <span className="diff-line-text">{line.content}</span>
        </div>
      </div>
    );
  };

  const renderHunk = (hunk: DiffHunk, hunkIndex: number) => {
    return (
      <div key={hunkIndex} className="diff-hunk">
        <div className="diff-hunk-header">
          @@ -{hunk.oldStart},{hunk.oldCount} +{hunk.newStart},{hunk.newCount} @@
        </div>
        <div className="diff-hunk-lines">
          {hunk.lines.map((line, lineIndex) => renderLine(line, lineIndex))}
        </div>
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="diff-viewer diff-viewer-loading">
        <div className="diff-loading">Loading diff...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="diff-viewer diff-viewer-error">
        <div className="diff-error">{error}</div>
      </div>
    );
  }

  if (!hunks || hunks.length === 0) {
    return (
      <div className="diff-viewer diff-viewer-empty">
        <div className="diff-empty">
          {pathA || pathB ? 'No differences found' : 'Select files to compare'}
        </div>
      </div>
    );
  }

  return (
    <div className="diff-viewer">
      <div className="diff-header">
        <h3 className="diff-title">
          {pathA && pathB ? `${pathA} → ${pathB}` : 'Diff'}
        </h3>
      </div>
      <div className="diff-content">
        {hunks.map((hunk, hunkIndex) => renderHunk(hunk, hunkIndex))}
      </div>
    </div>
  );
};

export default DiffViewer;
