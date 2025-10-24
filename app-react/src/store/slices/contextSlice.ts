import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { contextApi } from '../../services/api';

interface SyncStatus {
  status: 'not-synced' | 'auto-eligible' | 'synced' | 'syncing' | 'error';
  memoryId?: string;
  lastSync?: string;
  error?: string;
}

interface ContextConfig {
  enabled: boolean;
  healthy: boolean;
  projectId?: string;
  syncedFiles?: Array<{
    filePath: string;
    memoryId: string;
    lastSync: string;
    status: string;
  }>;
}

interface ContextState {
  syncStatuses: Record<string, SyncStatus>;
  config: ContextConfig | null;
  isLoading: boolean;
  error: string | null;
}

const initialState: ContextState = {
  syncStatuses: {},
  config: null,
  isLoading: false,
  error: null,
};

// Async thunks
export const fetchContextConfig = createAsyncThunk(
  'context/fetchConfig',
  async () => {
    const config = await contextApi.getConfig();
    return config;
  }
);

export const syncFileToContext = createAsyncThunk(
  'context/syncFile',
  async (filePath: string) => {
    const result = await contextApi.syncFile(filePath);
    return { filePath, ...result };
  }
);

export const unsyncFileFromContext = createAsyncThunk(
  'context/unsyncFile',
  async (filePath: string) => {
    const result = await contextApi.unsyncFile(filePath);
    return { filePath, ...result };
  }
);

export const fetchSyncStatus = createAsyncThunk(
  'context/fetchStatus',
  async (filePath: string) => {
    const status = await contextApi.getSyncStatus(filePath);
    return { filePath, ...status };
  }
);

const contextSlice = createSlice({
  name: 'context',
  initialState,
  reducers: {
    setSyncStatus: (state, action: PayloadAction<{ filePath: string; status: SyncStatus }>) => {
      state.syncStatuses[action.payload.filePath] = action.payload.status;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch config
      .addCase(fetchContextConfig.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchContextConfig.fulfilled, (state, action) => {
        state.isLoading = false;
        state.config = action.payload;
        // Update sync statuses from config
        if (action.payload.syncedFiles) {
          action.payload.syncedFiles.forEach((file) => {
            state.syncStatuses[file.filePath] = {
              status: file.status as SyncStatus['status'],
              memoryId: file.memoryId,
              lastSync: file.lastSync,
            };
          });
        }
      })
      .addCase(fetchContextConfig.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch context config';
      })
      // Sync file
      .addCase(syncFileToContext.pending, (state, action) => {
        state.syncStatuses[action.meta.arg] = { status: 'syncing' };
        state.error = null;
      })
      .addCase(syncFileToContext.fulfilled, (state, action) => {
        if (action.payload.success) {
          state.syncStatuses[action.payload.filePath] = {
            status: 'synced',
            memoryId: action.payload.memoryId,
            lastSync: new Date().toISOString(),
          };
        } else {
          state.syncStatuses[action.payload.filePath] = {
            status: 'error',
            error: action.payload.error || 'Sync failed',
          };
        }
      })
      .addCase(syncFileToContext.rejected, (state, action) => {
        state.syncStatuses[action.meta.arg] = {
          status: 'error',
          error: action.error.message || 'Sync failed',
        };
        state.error = action.error.message || 'Failed to sync file';
      })
      // Unsync file
      .addCase(unsyncFileFromContext.pending, (state) => {
        state.error = null;
      })
      .addCase(unsyncFileFromContext.fulfilled, (state, action) => {
        if (action.payload.success) {
          state.syncStatuses[action.payload.filePath] = { status: 'not-synced' };
        }
      })
      .addCase(unsyncFileFromContext.rejected, (state, action) => {
        state.error = action.error.message || 'Failed to unsync file';
      })
      // Fetch status
      .addCase(fetchSyncStatus.fulfilled, (state, action) => {
        state.syncStatuses[action.payload.filePath] = {
          status: action.payload.status,
          memoryId: action.payload.memoryId,
          lastSync: action.payload.lastSync,
          error: action.payload.error,
        };
      });
  },
});

export const { setSyncStatus, clearError } = contextSlice.actions;
export default contextSlice.reducer;
