import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface EditorState {
  content: string;
  filePath: string | null;
  loading: boolean;
  error: string | null;
  isDirty: boolean;
}

const initialState: EditorState = {
  content: '',
  filePath: null,
  loading: false,
  error: null,
  isDirty: false,
};

const editorSlice = createSlice({
  name: 'editor',
  initialState,
  reducers: {
    setContent: (state, action: PayloadAction<string>) => {
      state.content = action.payload;
      state.isDirty = true;
    },
    setFilePath: (state, action: PayloadAction<string | null>) => {
      state.filePath = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    resetDirty: (state) => {
      state.isDirty = false;
    },
    setEditorInitialized: (state) => {
      // This is just an example action if needed
      // We're accessing state here to avoid the unused variable error
      console.log('Editor initialized', state);
    },
  },
});

export const {
  setContent,
  setFilePath,
  setLoading,
  setError,
  resetDirty,
} = editorSlice.actions;

export default editorSlice.reducer;