import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';
import type { Profile } from '../../types/profile';

interface ValidationError {
  field?: string;
  message: string;
}

interface ProfileEditorState {
  availableProfiles: string[];
  editingProfile: Profile | null;
  editingProfileName: string | null;
  activeProfileName: string | null; // Currently loaded profile on server
  isDirty: boolean;
  validationErrors: ValidationError[];
  savingState: 'idle' | 'saving' | 'success' | 'error';
  errorMessage: string | null;
  isLoading: boolean;
}

const initialState: ProfileEditorState = {
  availableProfiles: [],
  editingProfile: null,
  editingProfileName: null,
  activeProfileName: null,
  isDirty: false,
  validationErrors: [],
  savingState: 'idle',
  errorMessage: null,
  isLoading: false,
};

// Async thunks

// Fetch list of all available profiles
export const fetchAvailableProfiles = createAsyncThunk(
  'profileEditor/fetchAvailableProfiles',
  async () => {
    const response = await axios.get('/api/profiles');
    return response.data.profiles as string[];
  }
);

// Load a profile for editing (without activating it on server)
export const loadProfileForEditing = createAsyncThunk(
  'profileEditor/loadProfileForEditing',
  async (profileName: string) => {
    const response = await axios.get(`/api/profiles/${profileName}`);
    return { profile: response.data.profile as Profile, profileName };
  }
);

// Create a new profile
export const createProfile = createAsyncThunk(
  'profileEditor/createProfile',
  async ({ name, config }: { name: string; config: Profile }) => {
    const response = await axios.post('/api/profiles', { name, config });
    return { profile: response.data.profile as Profile, profileName: name };
  }
);

// Update an existing profile
export const updateProfile = createAsyncThunk(
  'profileEditor/updateProfile',
  async ({ name, config }: { name: string; config: Profile }) => {
    const response = await axios.put(`/api/profiles/${name}`, { config });
    return { profile: response.data.profile as Profile, profileName: name };
  }
);

// Delete a profile
export const deleteProfile = createAsyncThunk(
  'profileEditor/deleteProfile',
  async (profileName: string) => {
    await axios.delete(`/api/profiles/${profileName}`);
    return profileName;
  }
);

// Activate a profile (hot reload on server)
export const activateProfile = createAsyncThunk(
  'profileEditor/activateProfile',
  async (profileName: string) => {
    const response = await axios.post(`/api/profiles/${profileName}/load`);
    return { profile: response.data.profile as Profile, profileName };
  }
);

// Save prompt file
export const savePromptFile = createAsyncThunk(
  'profileEditor/savePromptFile',
  async ({ profileName, path, content }: { profileName: string; path: string; content: string }) => {
    await axios.post(`/api/profiles/${profileName}/prompts`, { path, content });
    return { path, content };
  }
);

// Load prompt file
export const loadPromptFile = createAsyncThunk(
  'profileEditor/loadPromptFile',
  async ({ profileName, path }: { profileName: string; path: string }) => {
    const response = await axios.get(`/api/profiles/${profileName}/prompts/${path}`);
    return { path, content: response.data.content as string };
  }
);

// Delete prompt file
export const deletePromptFile = createAsyncThunk(
  'profileEditor/deletePromptFile',
  async ({ profileName, path }: { profileName: string; path: string }) => {
    await axios.delete(`/api/profiles/${profileName}/prompts`, { data: { path } });
    return path;
  }
);

const profileEditorSlice = createSlice({
  name: 'profileEditor',
  initialState,
  reducers: {
    // Update editing profile in memory
    updateEditingProfile: (state, action: PayloadAction<Profile>) => {
      state.editingProfile = action.payload;
      state.isDirty = true;
      state.savingState = 'idle';
    },

    // Clear editing state
    clearEditingProfile: (state) => {
      state.editingProfile = null;
      state.editingProfileName = null;
      state.isDirty = false;
      state.validationErrors = [];
      state.savingState = 'idle';
      state.errorMessage = null;
    },

    // Set validation errors
    setValidationErrors: (state, action: PayloadAction<ValidationError[]>) => {
      state.validationErrors = action.payload;
    },

    // Clear validation errors
    clearValidationErrors: (state) => {
      state.validationErrors = [];
    },

    // Mark as saved
    markAsSaved: (state) => {
      state.isDirty = false;
      state.savingState = 'success';
    },

    // Set active profile name
    setActiveProfileName: (state, action: PayloadAction<string | null>) => {
      state.activeProfileName = action.payload;
    },
  },
  extraReducers: (builder) => {
    // Fetch available profiles
    builder
      .addCase(fetchAvailableProfiles.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchAvailableProfiles.fulfilled, (state, action) => {
        state.isLoading = false;
        state.availableProfiles = action.payload;
      })
      .addCase(fetchAvailableProfiles.rejected, (state, action) => {
        state.isLoading = false;
        state.errorMessage = action.error.message || 'Failed to fetch profiles';
      });

    // Load profile for editing
    builder
      .addCase(loadProfileForEditing.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(loadProfileForEditing.fulfilled, (state, action) => {
        state.isLoading = false;
        state.editingProfile = action.payload.profile;
        state.editingProfileName = action.payload.profileName;
        state.isDirty = false;
        state.validationErrors = [];
      })
      .addCase(loadProfileForEditing.rejected, (state, action) => {
        state.isLoading = false;
        state.errorMessage = action.error.message || 'Failed to load profile';
      });

    // Create profile
    builder
      .addCase(createProfile.pending, (state) => {
        state.savingState = 'saving';
      })
      .addCase(createProfile.fulfilled, (state, action) => {
        state.savingState = 'success';
        state.editingProfile = action.payload.profile;
        state.editingProfileName = action.payload.profileName;
        state.isDirty = false;
        state.availableProfiles.push(action.payload.profileName);
      })
      .addCase(createProfile.rejected, (state, action) => {
        state.savingState = 'error';
        state.errorMessage = action.error.message || 'Failed to create profile';
      });

    // Update profile
    builder
      .addCase(updateProfile.pending, (state) => {
        state.savingState = 'saving';
      })
      .addCase(updateProfile.fulfilled, (state, action) => {
        state.savingState = 'success';
        state.editingProfile = action.payload.profile;
        state.isDirty = false;
      })
      .addCase(updateProfile.rejected, (state, action) => {
        state.savingState = 'error';
        state.errorMessage = action.error.message || 'Failed to update profile';
      });

    // Delete profile
    builder
      .addCase(deleteProfile.fulfilled, (state, action) => {
        state.availableProfiles = state.availableProfiles.filter(
          (name) => name !== action.payload
        );
        // Clear editing state if deleted profile was being edited
        if (state.editingProfileName === action.payload) {
          state.editingProfile = null;
          state.editingProfileName = null;
          state.isDirty = false;
        }
      })
      .addCase(deleteProfile.rejected, (state, action) => {
        state.errorMessage = action.error.message || 'Failed to delete profile';
      });

    // Activate profile
    builder
      .addCase(activateProfile.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(activateProfile.fulfilled, (state, action) => {
        state.isLoading = false;
        state.activeProfileName = action.payload.profileName;
      })
      .addCase(activateProfile.rejected, (state, action) => {
        state.isLoading = false;
        state.errorMessage = action.error.message || 'Failed to activate profile';
      });

    // Save prompt file
    builder
      .addCase(savePromptFile.fulfilled, (state) => {
        state.savingState = 'success';
      })
      .addCase(savePromptFile.rejected, (state, action) => {
        state.savingState = 'error';
        state.errorMessage = action.error.message || 'Failed to save prompt file';
      });
  },
});

export const {
  updateEditingProfile,
  clearEditingProfile,
  setValidationErrors,
  clearValidationErrors,
  markAsSaved,
  setActiveProfileName,
} = profileEditorSlice.actions;

export default profileEditorSlice.reducer;
