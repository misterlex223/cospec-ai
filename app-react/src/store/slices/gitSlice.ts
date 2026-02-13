/**
 * Git Redux Slice
 *
 * State management for Git operations
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type {
  GitStatusResult,
  GitCommit,
  GitBranch,
  GitState as GitStateType,
} from '../../types/git';
import * as gitApi from '../../services/git';

export interface GitState extends GitStateType {
  stagedFiles: string[];
  selectedCommit: string | null;
  diffView: { pathA?: string; pathB?: string } | null;
}

const initialState: GitState = {
  status: null,
  commits: [],
  branches: [],
  currentBranch: null,
  isLoading: false,
  errorMessage: null,
  stagedFiles: [],
  selectedCommit: null,
  diffView: null,
};

// Async thunks
export const fetchStatus = createAsyncThunk(
  'git/fetchStatus',
  async () => {
    return await gitApi.getStatus();
  }
);

export const fetchLog = createAsyncThunk(
  'git/fetchLog',
  async ({ limit = 20, offset = 0 }: { limit?: number; offset?: number } = {}) => {
    return await gitApi.getLog(limit, offset);
  }
);

export const fetchCommit = createAsyncThunk(
  'git/fetchCommit',
  async (id: string) => {
    return await gitApi.getCommit(id);
  }
);

export const fetchBranches = createAsyncThunk(
  'git/fetchBranches',
  async () => {
    return await gitApi.getBranches();
  }
);

export const fetchDiff = createAsyncThunk(
  'git/fetchDiff',
  async ({ pathA, pathB }: { pathA?: string; pathB?: string }) => {
    return await gitApi.getDiff(pathA, pathB);
  }
);

export const stageFiles = createAsyncThunk(
  'git/stageFiles',
  async (files: string[]) => {
    const result = await gitApi.stageFiles(files);
    return { result, files };
  }
);

export const commitChanges = createAsyncThunk(
  'git/commitChanges',
  async (message: string) => {
    return await gitApi.commitFiles(message);
  }
);

const gitSlice = createSlice({
  name: 'git',
  initialState,
  reducers: {
    setStatus: (state, action: PayloadAction<GitStatusResult | null>) => {
      state.status = action.payload;
    },
    setCommits: (state, action: PayloadAction<GitCommit[]>) => {
      state.commits = action.payload;
    },
    setBranches: (state, action: PayloadAction<GitBranch[]>) => {
      state.branches = action.payload;
    },
    setCurrentBranch: (state, action: PayloadAction<string | null>) => {
      state.currentBranch = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.errorMessage = action.payload;
    },
    refreshStatus: (state) => {
      state.isLoading = true;
    },
    toggleStageFile: (state, action: PayloadAction<string>) => {
      const index = state.stagedFiles.indexOf(action.payload);
      if (index > -1) {
        state.stagedFiles.splice(index, 1);
      } else {
        state.stagedFiles.push(action.payload);
      }
    },
    clearStagedFiles: (state) => {
      state.stagedFiles = [];
    },
    setSelectedCommit: (state, action: PayloadAction<string | null>) => {
      state.selectedCommit = action.payload;
    },
    setDiffView: (state, action: PayloadAction<{ pathA?: string; pathB?: string } | null>) => {
      state.diffView = action.payload;
    },
  },
  extraReducers: (builder) => {
    // fetchStatus
    builder.addCase(fetchStatus.pending, (state) => {
      state.isLoading = true;
      state.errorMessage = null;
    });
    builder.addCase(fetchStatus.fulfilled, (state, action) => {
      state.isLoading = false;
      state.status = action.payload;
    });
    builder.addCase(fetchStatus.rejected, (state, action) => {
      state.isLoading = false;
      state.errorMessage = action.error.message || 'Failed to fetch git status';
    });

    // fetchLog
    builder.addCase(fetchLog.pending, (state) => {
      state.isLoading = true;
      state.errorMessage = null;
    });
    builder.addCase(fetchLog.fulfilled, (state, action) => {
      state.isLoading = false;
      state.commits = action.payload.commits;
    });
    builder.addCase(fetchLog.rejected, (state, action) => {
      state.isLoading = false;
      state.errorMessage = action.error.message || 'Failed to fetch commit history';
    });

    // fetchCommit
    builder.addCase(fetchCommit.fulfilled, (state, action) => {
      if (action.payload.success && action.payload.commit) {
        const existingIndex = state.commits.findIndex(c => c.hash === action.payload.commit.hash);
        if (existingIndex > -1) {
          state.commits[existingIndex] = action.payload.commit;
        } else {
          state.commits.unshift(action.payload.commit);
        }
      }
    });

    // fetchBranches
    builder.addCase(fetchBranches.fulfilled, (state, action) => {
      if (action.payload.success) {
        state.branches = action.payload.branches;
        state.currentBranch = action.payload.current;
      }
    });

    // fetchDiff
    builder.addCase(fetchDiff.pending, (state) => {
      state.isLoading = true;
      state.errorMessage = null;
    });
    builder.addCase(fetchDiff.fulfilled, (state, action) => {
      state.isLoading = false;
    });
    builder.addCase(fetchDiff.rejected, (state, action) => {
      state.isLoading = false;
      state.errorMessage = action.error.message || 'Failed to fetch diff';
    });

    // stageFiles
    builder.addCase(stageFiles.fulfilled, (state) => {
      // Clear staged files after successful staging
      state.stagedFiles = [];
    });

    // commitChanges
    builder.addCase(commitChanges.pending, (state) => {
      state.isLoading = true;
      state.errorMessage = null;
    });
    builder.addCase(commitChanges.fulfilled, (state) => {
      state.isLoading = false;
      state.stagedFiles = [];
    });
    builder.addCase(commitChanges.rejected, (state, action) => {
      state.isLoading = false;
      state.errorMessage = action.error.message || 'Failed to commit changes';
    });
  },
});

export const {
  setStatus,
  setCommits,
  setBranches,
  setCurrentBranch,
  setLoading,
  setError,
  refreshStatus,
  toggleStageFile,
  clearStagedFiles,
  setSelectedCommit,
  setDiffView,
} = gitSlice.actions;

export default gitSlice.reducer;
