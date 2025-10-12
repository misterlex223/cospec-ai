import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { FileInfo } from '../../services/api';

export interface FilesState {
  fileList: FileInfo[];
  currentFile: string | null;
  loading: boolean;
  error: string | null;
  refreshCounter: number;
}

const initialState: FilesState = {
  fileList: [],
  currentFile: null,
  loading: false,
  error: null,
  refreshCounter: 0,
};

const filesSlice = createSlice({
  name: 'files',
  initialState,
  reducers: {
    setFileList: (state, action: PayloadAction<FileInfo[]>) => {
      // Ensure we're always setting an array, even if the payload is not an array
      if (Array.isArray(action.payload)) {
        state.fileList = action.payload;
      } else {
        console.warn('setFileList received non-array payload:', action.payload);
        state.fileList = [];
      }
    },
    setCurrentFile: (state, action: PayloadAction<string | null>) => {
      state.currentFile = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    refreshFileList: (state) => {
      state.refreshCounter += 1;
    },
    addFile: (state, action: PayloadAction<FileInfo>) => {
      state.fileList.push(action.payload);
    },
    updateFile: (state, action: PayloadAction<FileInfo>) => {
      const index = state.fileList.findIndex(file => file.path === action.payload.path);
      if (index !== -1) {
        state.fileList[index] = action.payload;
      }
    },
    removeFile: (state, action: PayloadAction<string>) => {
      state.fileList = state.fileList.filter(file => file.path !== action.payload);
    },
  },
});

export const {
  setFileList,
  setCurrentFile,
  setLoading,
  setError,
  refreshFileList,
  addFile,
  updateFile,
  removeFile,
} = filesSlice.actions;

export default filesSlice.reducer;