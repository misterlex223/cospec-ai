/**
 * Agent Redux Slice
 *
 * Manages agent execution state, history, statistics, and conversations
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import type { AgentExecution, AgentStats, AgentState } from '../../types/agent';
import type { AgentType, AgentSuggestion, Conversation, ChatMessage } from '../../services/api';

// Extended state for chat functionality
export interface ExtendedAgentState extends AgentState {
  agentTypes: AgentType[];
  currentSuggestions: AgentSuggestion[];
  conversations: Conversation[];
  currentConversation: Conversation | null;
  chatMessages: ChatMessage[];
  isStreamingChat: boolean;
}

const initialState: ExtendedAgentState = {
  executions: [],
  currentExecution: null,
  stats: null,
  isPanelOpen: false,
  filter: {},
  isLoading: false,
  errorMessage: null,
  // New state
  agentTypes: [],
  currentSuggestions: [],
  conversations: [],
  currentConversation: null,
  chatMessages: [],
  isStreamingChat: false,
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

// New async thunks for chat functionality
export const fetchAgentTypes = createAsyncThunk(
  'agent/fetchTypes',
  async () => {
    const response = await axios.get('/api/agent/types');
    return response.data.types as AgentType[];
  }
);

export const fetchAgentSuggestions = createAsyncThunk(
  'agent/fetchSuggestions',
  async (filePath?: string) => {
    const params = filePath ? { file: filePath } : {};
    const response = await axios.get('/api/agent/suggestions', { params });
    return response.data.suggestions as AgentSuggestion[];
  }
);

export const sendAgentChat = createAsyncThunk(
  'agent/sendChat',
  async (params: { message: string; contextFiles?: string[]; agentType?: string; conversationId?: string }) => {
    const response = await axios.post('/api/agent/chat', params);
    return response.data;
  }
);

export const fetchConversations = createAsyncThunk(
  'agent/fetchConversations',
  async () => {
    const response = await axios.get('/api/agent/conversations');
    return response.data.conversations as Conversation[];
  }
);

export const deleteConversation = createAsyncThunk(
  'agent/deleteConversation',
  async (id: string) => {
    await axios.delete(`/api/agent/conversations/${id}`);
    return id;
  }
);

export const createConversation = createAsyncThunk(
  'agent/createConversation',
  async (params: { userId?: string; agentType?: string; title?: string; firstMessage?: string }) => {
    const response = await axios.post('/api/agent/conversations', params);
    return response.data;
  }
);

// Agent Git operations
export const agentGitStatus = createAsyncThunk(
  'agent/gitStatus',
  async (repoPath?: string) => {
    const response = await axios.post('/api/agent/git/status', { repoPath });
    return response.data;
  }
);

export const agentGitLog = createAsyncThunk(
  'agent/gitLog',
  async (params: { repoPath?: string; limit?: number; offset?: number }) => {
    const response = await axios.post('/api/agent/git/log', params);
    return response.data;
  }
);

export const agentGitDiff = createAsyncThunk(
  'agent/gitDiff',
  async (params: { repoPath?: string; pathA?: string; pathB?: string }) => {
    const response = await axios.post('/api/agent/git/diff', params);
    return response.data;
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
    setFilter: (state, action: PayloadAction<Partial<ExtendedAgentState['filter']>>) => {
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
    // New reducers for chat functionality
    setAgentTypes: (state, action: PayloadAction<AgentType[]>) => {
      state.agentTypes = action.payload;
    },
    setSuggestions: (state, action: PayloadAction<AgentSuggestion[]>) => {
      state.currentSuggestions = action.payload;
    },
    setCurrentConversation: (state, action: PayloadAction<Conversation | null>) => {
      state.currentConversation = action.payload;
      state.chatMessages = action.payload?.messages || [];
    },
    addChatMessage: (state, action: PayloadAction<ChatMessage>) => {
      state.chatMessages.push(action.payload);
    },
    appendToLastMessage: (state, action: PayloadAction<string>) => {
      const lastMessage = state.chatMessages[state.chatMessages.length - 1];
      if (lastMessage && lastMessage.role === 'assistant') {
        lastMessage.content += action.payload;
      }
    },
    setStreamingChat: (state, action: PayloadAction<boolean>) => {
      state.isStreamingChat = action.payload;
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

    // Fetch single execution
    builder
      .addCase(fetchAgentExecution.fulfilled, (state, action) => {
        const idx = state.executions.findIndex(e => e.id === action.payload.id);
        if (idx !== -1) {
          state.executions[idx] = action.payload;
        }
        state.currentExecution = action.payload;
      });

    // Execute agent
    builder
      .addCase(executeAgent.pending, (state) => {
        state.isLoading = true;
        state.errorMessage = null;
      })
      .addCase(executeAgent.fulfilled, (state) => {
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

    // Fetch agent types
    builder
      .addCase(fetchAgentTypes.fulfilled, (state, action) => {
        state.agentTypes = action.payload;
      });

    // Fetch suggestions
    builder
      .addCase(fetchAgentSuggestions.fulfilled, (state, action) => {
        state.currentSuggestions = action.payload;
      });

    // Send chat
    builder
      .addCase(sendAgentChat.pending, (state) => {
        state.isStreamingChat = true;
        state.errorMessage = null;
      })
      .addCase(sendAgentChat.fulfilled, (state) => {
        state.isStreamingChat = false;
      })
      .addCase(sendAgentChat.rejected, (state, action) => {
        state.isStreamingChat = false;
        state.errorMessage = action.error.message || 'Failed to send chat message';
      });

    // Fetch conversations
    builder
      .addCase(fetchConversations.fulfilled, (state, action) => {
        state.conversations = action.payload;
      });

    // Delete conversation
    builder
      .addCase(deleteConversation.fulfilled, (state, action) => {
        state.conversations = state.conversations.filter(c => c.id !== action.payload);
        if (state.currentConversation?.id === action.payload) {
          state.currentConversation = null;
          state.chatMessages = [];
        }
      });

    // Create conversation
    builder
      .addCase(createConversation.fulfilled, (state, action) => {
        const newConversation = action.payload;
        state.conversations.unshift(newConversation);
        state.currentConversation = newConversation;
        state.chatMessages = newConversation.messages || [];
      });

    // Agent Git Status
    builder
      .addCase(agentGitStatus.pending, (state) => {
        state.isLoading = true;
        state.errorMessage = null;
      })
      .addCase(agentGitStatus.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(agentGitStatus.rejected, (state, action) => {
        state.isLoading = false;
        state.errorMessage = action.error.message || 'Failed to get git status';
      });

    // Agent Git Log
    builder
      .addCase(agentGitLog.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(agentGitLog.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(agentGitLog.rejected, (state, action) => {
        state.isLoading = false;
        state.errorMessage = action.error.message || 'Failed to get git log';
      });

    // Agent Git Diff
    builder
      .addCase(agentGitDiff.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(agentGitDiff.fulfilled, (state) => {
        state.isLoading = false;
      })
      .addCase(agentGitDiff.rejected, (state, action) => {
        state.isLoading = false;
        state.errorMessage = action.error.message || 'Failed to get git diff';
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
  setAgentTypes,
  setSuggestions,
  setCurrentConversation,
  addChatMessage,
  appendToLastMessage,
  setStreamingChat,
} = agentSlice.actions;

export default agentSlice.reducer;
