/**
 * GitHistory tests
 */

import { render, screen } from '@testing-library/react';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { GitHistory } from '../index';
import gitReducer from '../../../store/slices/gitSlice';

const mockStore = configureStore({
  reducer: {
    git: gitReducer
  },
  preloadedState: {
    git: {
      status: null,
      commits: [
        {
          hash: 'abc123',
          author: 'Test User',
          date: '2024-01-01T00:00:00Z',
          message: 'Test commit',
          files: ['test.md']
        }
      ],
      branches: [],
      currentBranch: null,
      isLoading: false,
      errorMessage: null,
      stagedFiles: [],
      selectedCommit: null,
      diffView: null
    }
  }
});

describe('GitHistory', () => {
  it('should render commit list', () => {
    render(
      <Provider store={mockStore}>
        <GitHistory limit={10} />
      </Provider>
    );
    expect(screen.getByText('Test commit')).toBeInTheDocument();
  });

  it('should show empty state when no commits', () => {
    const emptyStore = configureStore({
      reducer: { git: gitReducer },
      preloadedState: {
        git: {
          status: null,
          commits: [],
          branches: [],
          currentBranch: null,
          isLoading: false,
          errorMessage: null,
          stagedFiles: [],
          selectedCommit: null,
          diffView: null
        }
      }
    });

    render(
      <Provider store={emptyStore}>
        <GitHistory limit={10} />
      </Provider>
    );
    expect(screen.getByText(/No commits yet/i)).toBeInTheDocument();
  });
});
