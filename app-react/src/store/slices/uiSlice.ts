import { createSlice } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';

export interface UiState {
  sidebarWidth: number;
  graphPanelWidth: number;
  expandedPaths: string[];
  showFileInfo: boolean;
  darkMode: boolean;
}

const initialState: UiState = {
  sidebarWidth: 280,
  graphPanelWidth: 400,
  expandedPaths: [],
  showFileInfo: true,
  darkMode: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setSidebarWidth: (state, action: PayloadAction<number>) => {
      state.sidebarWidth = action.payload;
    },
    setGraphPanelWidth: (state, action: PayloadAction<number>) => {
      state.graphPanelWidth = action.payload;
    },
    togglePathExpanded: (state, action: PayloadAction<string>) => {
      if (state.expandedPaths.includes(action.payload)) {
        state.expandedPaths = state.expandedPaths.filter(path => path !== action.payload);
      } else {
        state.expandedPaths.push(action.payload);
      }
    },
    expandPath: (state, action: PayloadAction<string>) => {
      if (!state.expandedPaths.includes(action.payload)) {
        state.expandedPaths.push(action.payload);
      }
    },
    collapsePath: (state, action: PayloadAction<string>) => {
      state.expandedPaths = state.expandedPaths.filter(path => path !== action.payload);
    },
    setShowFileInfo: (state, action: PayloadAction<boolean>) => {
      state.showFileInfo = action.payload;
    },
    toggleDarkMode: (state) => {
      state.darkMode = !state.darkMode;
    },
  },
});

export const {
  setSidebarWidth,
  setGraphPanelWidth,
  togglePathExpanded,
  expandPath,
  collapsePath,
  setShowFileInfo,
  toggleDarkMode,
} = uiSlice.actions;

export default uiSlice.reducer;