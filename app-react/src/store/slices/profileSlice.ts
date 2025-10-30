import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import type {
  Profile,
  ProfileResponse,
  PromptContentResponse,
  GenerationState,
  GenerationOutputEvent,
  GenerationCompleteEvent,
} from '../../types/profile';
import * as api from '../../services/api';

/**
 * Profile state shape
 */
interface ProfileState {
  /** Loaded profile configuration */
  profile: Profile | null;
  /** Profile name */
  profileName: string | null;
  /** Profile directory path */
  profilePath: string | null;
  /** Whether profile is loading */
  isLoading: boolean;
  /** Error message if profile loading failed */
  error: string | null;
  /** Generation state per file path */
  generationStates: Record<string, GenerationState>;
  /** Prompt content cache */
  promptCache: Record<string, string>;
}

const initialState: ProfileState = {
  profile: null,
  profileName: null,
  profilePath: null,
  isLoading: false,
  error: null,
  generationStates: {},
  promptCache: {},
};

/**
 * Fetch profile configuration from server
 */
export const fetchProfile = createAsyncThunk(
  'profile/fetchProfile',
  async () => {
    const response = await api.fetchProfile();
    return response;
  }
);

/**
 * Fetch prompt file content
 */
export const fetchPromptContent = createAsyncThunk(
  'profile/fetchPromptContent',
  async (filePath: string) => {
    const response = await api.fetchPromptContent(filePath);
    return { filePath, content: response.content };
  }
);

/**
 * Generate file using profile command
 */
export const generateFile = createAsyncThunk(
  'profile/generateFile',
  async (filePath: string, { rejectWithValue }) => {
    try {
      const response = await api.generateFile(filePath);
      return { filePath, success: response.success };
    } catch (error: any) {
      return rejectWithValue(error.response?.data?.error || error.message);
    }
  }
);

const profileSlice = createSlice({
  name: 'profile',
  initialState,
  reducers: {
    /**
     * Handle generation output from WebSocket
     */
    addGenerationOutput: (state, action: PayloadAction<GenerationOutputEvent>) => {
      const { path, output, isError } = action.payload;

      if (!state.generationStates[path]) {
        state.generationStates[path] = {
          isGenerating: true,
          output: [],
          success: null,
          error: null,
        };
      }

      state.generationStates[path].output.push(output);

      if (isError && !state.generationStates[path].error) {
        state.generationStates[path].error = output;
      }
    },

    /**
     * Handle generation completion from WebSocket
     */
    setGenerationComplete: (state, action: PayloadAction<GenerationCompleteEvent>) => {
      const { path, success, output, error } = action.payload;

      if (state.generationStates[path]) {
        state.generationStates[path].isGenerating = false;
        state.generationStates[path].success = success;

        if (output) {
          state.generationStates[path].output.push(output);
        }

        if (error) {
          state.generationStates[path].error = error;
        }
      }
    },

    /**
     * Clear generation state for a file
     */
    clearGenerationState: (state, action: PayloadAction<string>) => {
      delete state.generationStates[action.payload];
    },

    /**
     * Clear all generation states
     */
    clearAllGenerationStates: (state) => {
      state.generationStates = {};
    },

    /**
     * Reset profile state
     */
    resetProfile: (state) => {
      state.profile = null;
      state.profileName = null;
      state.profilePath = null;
      state.error = null;
      state.generationStates = {};
      state.promptCache = {};
    },
  },
  extraReducers: (builder) => {
    // Fetch profile
    builder.addCase(fetchProfile.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchProfile.fulfilled, (state, action: PayloadAction<ProfileResponse>) => {
      state.isLoading = false;
      state.profile = action.payload.profile;
      state.profileName = action.payload.profileName || null;
      state.profilePath = action.payload.profilePath || null;
    });
    builder.addCase(fetchProfile.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.error.message || 'Failed to fetch profile';
    });

    // Fetch prompt content
    builder.addCase(fetchPromptContent.fulfilled, (state, action) => {
      const { filePath, content } = action.payload;
      state.promptCache[filePath] = content;
    });

    // Generate file
    builder.addCase(generateFile.pending, (state, action) => {
      const filePath = action.meta.arg;
      state.generationStates[filePath] = {
        isGenerating: true,
        output: [],
        success: null,
        error: null,
      };
    });
    builder.addCase(generateFile.fulfilled, (state, action) => {
      // Generation started successfully, actual completion will come from WebSocket
      const { filePath } = action.payload;
      if (state.generationStates[filePath]) {
        // Keep isGenerating true until WebSocket confirms completion
      }
    });
    builder.addCase(generateFile.rejected, (state, action) => {
      const filePath = action.meta.arg;
      if (state.generationStates[filePath]) {
        state.generationStates[filePath].isGenerating = false;
        state.generationStates[filePath].success = false;
        state.generationStates[filePath].error = action.payload as string || 'Generation failed';
      }
    });
  },
});

export const {
  addGenerationOutput,
  setGenerationComplete,
  clearGenerationState,
  clearAllGenerationStates,
  resetProfile,
} = profileSlice.actions;

export default profileSlice.reducer;
