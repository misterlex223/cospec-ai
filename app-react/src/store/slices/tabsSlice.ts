/**
 * Tabs Slice - Manages multiple open document tabs
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface Tab {
  filePath: string;
  content: string;
  isDirty: boolean;
  lastModified: number;
}

interface TabsState {
  openTabs: Tab[];
  activeTabIndex: number;
  maxTabs: number;
}

const initialState: TabsState = {
  openTabs: [],
  activeTabIndex: -1,
  maxTabs: 10
};

const tabsSlice = createSlice({
  name: 'tabs',
  initialState,
  reducers: {
    openTab: (state, action: PayloadAction<{ filePath: string; content: string; mode?: 'new' | 'replace' | 'smart' }>) => {
      const { filePath, content, mode = 'smart' } = action.payload;

      // Check if tab already exists
      const existingIndex = state.openTabs.findIndex(tab => tab.filePath === filePath);

      if (existingIndex !== -1) {
        // Tab exists, just activate it
        state.activeTabIndex = existingIndex;
        return;
      }

      // Create new tab
      const newTab: Tab = {
        filePath,
        content,
        isDirty: false,
        lastModified: Date.now()
      };

      // Handle different modes
      if (mode === 'replace' && state.activeTabIndex >= 0) {
        // Replace active tab
        state.openTabs[state.activeTabIndex] = newTab;
      } else {
        // Add new tab
        state.openTabs.push(newTab);
        state.activeTabIndex = state.openTabs.length - 1;

        // Enforce max tabs limit (LRU eviction)
        if (state.openTabs.length > state.maxTabs) {
          // Find least recently used tab (not the active one)
          let lruIndex = 0;
          let lruTime = state.openTabs[0].lastModified;

          for (let i = 1; i < state.openTabs.length; i++) {
            if (i !== state.activeTabIndex && state.openTabs[i].lastModified < lruTime) {
              lruIndex = i;
              lruTime = state.openTabs[i].lastModified;
            }
          }

          // Remove LRU tab
          state.openTabs.splice(lruIndex, 1);

          // Adjust active index if needed
          if (state.activeTabIndex > lruIndex) {
            state.activeTabIndex--;
          }
        }
      }
    },
    closeTab: (state, action: PayloadAction<number>) => {
      const index = action.payload;

      if (index < 0 || index >= state.openTabs.length) {
        return;
      }

      state.openTabs.splice(index, 1);

      // Adjust active tab index
      if (state.openTabs.length === 0) {
        state.activeTabIndex = -1;
      } else if (state.activeTabIndex >= state.openTabs.length) {
        state.activeTabIndex = state.openTabs.length - 1;
      } else if (state.activeTabIndex > index) {
        state.activeTabIndex--;
      }
    },
    closeTabByPath: (state, action: PayloadAction<string>) => {
      const index = state.openTabs.findIndex(tab => tab.filePath === action.payload);
      if (index !== -1) {
        tabsSlice.caseReducers.closeTab(state, { payload: index, type: 'tabs/closeTab' });
      }
    },
    switchTab: (state, action: PayloadAction<number>) => {
      const index = action.payload;
      if (index >= 0 && index < state.openTabs.length) {
        state.activeTabIndex = index;
        state.openTabs[index].lastModified = Date.now();
      }
    },
    updateTabContent: (state, action: PayloadAction<{ index: number; content: string }>) => {
      const { index, content } = action.payload;
      if (index >= 0 && index < state.openTabs.length) {
        state.openTabs[index].content = content;
        state.openTabs[index].isDirty = true;
        state.openTabs[index].lastModified = Date.now();
      }
    },
    markTabClean: (state, action: PayloadAction<number>) => {
      const index = action.payload;
      if (index >= 0 && index < state.openTabs.length) {
        state.openTabs[index].isDirty = false;
      }
    },
    reorderTabs: (state, action: PayloadAction<{ fromIndex: number; toIndex: number }>) => {
      const { fromIndex, toIndex } = action.payload;

      if (fromIndex < 0 || fromIndex >= state.openTabs.length ||
          toIndex < 0 || toIndex >= state.openTabs.length) {
        return;
      }

      const [movedTab] = state.openTabs.splice(fromIndex, 1);
      state.openTabs.splice(toIndex, 0, movedTab);

      // Update active index
      if (state.activeTabIndex === fromIndex) {
        state.activeTabIndex = toIndex;
      } else if (fromIndex < state.activeTabIndex && toIndex >= state.activeTabIndex) {
        state.activeTabIndex--;
      } else if (fromIndex > state.activeTabIndex && toIndex <= state.activeTabIndex) {
        state.activeTabIndex++;
      }
    },
    closeAllTabs: (state) => {
      state.openTabs = [];
      state.activeTabIndex = -1;
    },
    closeOtherTabs: (state, action: PayloadAction<number>) => {
      const index = action.payload;
      if (index >= 0 && index < state.openTabs.length) {
        state.openTabs = [state.openTabs[index]];
        state.activeTabIndex = 0;
      }
    }
  }
});

export const {
  openTab,
  closeTab,
  closeTabByPath,
  switchTab,
  updateTabContent,
  markTabClean,
  reorderTabs,
  closeAllTabs,
  closeOtherTabs
} = tabsSlice.actions;

export default tabsSlice.reducer;
