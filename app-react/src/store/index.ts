import { configureStore } from '@reduxjs/toolkit';
import filesReducer from './slices/filesSlice';
import uiReducer from './slices/uiSlice';
import editorReducer from './slices/editorSlice';
import notificationsReducer from './slices/notificationsSlice';
import contextReducer from './slices/contextSlice';
import profileReducer from './slices/profileSlice';
import profileEditorReducer from './slices/profileEditorSlice';

export const store = configureStore({
  reducer: {
    files: filesReducer,
    ui: uiReducer,
    editor: editorReducer,
    notifications: notificationsReducer,
    context: contextReducer,
    profile: profileReducer,
    profileEditor: profileEditorReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;