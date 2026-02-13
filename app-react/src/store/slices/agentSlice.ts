/**
 * Agent Redux Slice
 *
 * Manages agent execution state, history, and statistics
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import type { AgentExecution, AgentStats, AgentState } from '../../types/agent';

const initialState: AgentState = {
  executions: [],
  currentExecution: null,
  stats: null,
  isPanelOpen: false,
  filter: {},
  isLoading: false,
  errorMessage: null,
};

// Async thunks
export const fetchAgentHistory = createAsyncThunk(
  'agent/fetchHistory',
  async (params: { limit?: number; offset?: number; agentType?: string; status?: string } = {}) => {
    const response = await axios.get('/api/agent/history', { params });
    return {
      executions: response.data.executions as AgentExecution[],
      stats: response.data.stats as AgentStats
    };
  }
);

export const fetchAgentExecution = createAsyncThunk(
  'agent/fetchExecution',
  async (id: string) => {
    const response = await axios.get(`/api/agent/history/${id}`);
    return response.data as AgentExecution;
  }
);

export const executeAgent = createAsyncThunk(
  'agent/execute',
  async (params: { agentType: string; targetFiles: string[]; customPrompt?: string }) => {
    const response = await axios.post('/api/agent/execute', params);
    return response.data; // { executionId, status }
  }
);

export const deleteAgentExecution = createAsyncThunk(
  'agent/deleteExecution',
  async (id: string) => {
    await axios.delete(`/api/agent/history/${id}`);
    return id;
  }
);

const agentSlice = createSlice({
  name: 'agent',
  initialState,
  reducers: {
    togglePanel: (state) => {
      state.isPanelOpen = !state.isPanelOpen;
    },
    openPanel: (state) => {
      state.isPanelOpen = true;
    },
    closePanel: (state) => {
      state.isPanelOpen = false;
    },
    setFilter: (state, action: PayloadAction<Partial<AgentState['filter']>>) => {
      state.filter = { ...state.filter, ...action.payload };
    },
    clearFilter: (state) => {
      state.filter = {};
    },
    addExecution: (state, action: PayloadAction<AgentExecution>) => {
      state.executions.unshift(action.payload);
      state.currentExecution = action.payload;
    },
    updateExecution: (state, action: PayloadAction<Partial<AgentExecution> & { id: string }>) => {
      const index = state.executions.findIndex(e => e.id === action.payload.id);
      if (index !== -1) {
        state.executions[index] = { ...state.executions[index], ...action.payload };
      }
      if (state.currentExecution?.id === action.payload.id) {
        state.currentExecution = { ...state.currentExecution, ...action.payload };
      }
    },
    setCurrentExecution: (state, action: PayloadAction<AgentExecution | null>) => {
      state.currentExecution = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch history
    builder
      .addCase(fetchAgentHistory.pending, (state) => {
        state.isLoading = true;
        state.errorMessage = null;
      })
      .addCase(fetchAgentHistory.fulfilled, (state, action) => {
        state.isLoading = false;
        state.executions = action.payload.executions;
        state.stats = action.payload.stats;
      })
      .addCase(fetchAgentHistory.rejected, (state, action) => {
        state.isLoading = false;
        state.errorMessage = action.error.message || 'Failed to fetch history';
      });

    // Execute agent
    builder
      .addCase(executeAgent.pending, (state) => {
        state.isLoading = true;
        state.errorMessage = null;
      })
      .addCase(executeAgent.fulfilled, (state, action) => {
        state.isLoading = false;
        // Execution will be added via WebSocket event
      })
      .addCase(executeAgent.rejected, (state, action) => {
        state.isLoading = false;
        state.errorMessage = action.error.message || 'Failed to execute agent';
      });

    // Delete execution
    builder
      .addCase(deleteAgentExecution.fulfilled, (state, action) => {
        state.executions = state.executions.filter(e => e.id !== action.payload);
      });
  },
});

export const {
  togglePanel,
  openPanel,
  closePanel,
  setFilter,
  clearFilter,
  addExecution,
  updateExecution,
  setCurrentExecution,
} = agentSlice.actions;

export default agentSlice.reducer;
