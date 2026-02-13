/**
 * DiffViewer tests
 */

import { render, screen } from '@testing-library/react';
import { DiffViewer } from '../index';
import type { DiffHunk } from '../../../types/git';

const mockHunks: DiffHunk[] = [
  {
    oldStart: 1,
    oldCount: 2,
    newStart: 1,
    newCount: 3,
    lines: [
      { type: 'context', content: 'function test() {', oldNumber: 1, newNumber: 1 },
      { type: 'removed', content: '  return old;', oldNumber: 2 },
      { type: 'added', content: '  return new;', newNumber: 2 },
      { type: 'added', content: '  const added = true;', newNumber: 3 }
    ]
  }
];

describe('DiffViewer', () => {
  it('should render diff hunks', () => {
    render(<DiffViewer hunks={mockHunks} pathA="old.txt" pathB="new.txt" />);
    expect(screen.getByText(/old.txt/)).toBeInTheDocument();
  });

  it('should show empty state when no hunks', () => {
    render(<DiffViewer hunks={[]} />);
    expect(screen.getByText(/No differences found/i)).toBeInTheDocument();
  });

  it('should show loading state', () => {
    render(<DiffViewer hunks={[]} isLoading={true} />);
    expect(screen.getByText(/Loading diff/i)).toBeInTheDocument();
  });

  it('should show error state', () => {
    render(<DiffViewer hunks={[]} error="Test error" />);
    expect(screen.getByText(/Test error/)).toBeInTheDocument();
  });
});
