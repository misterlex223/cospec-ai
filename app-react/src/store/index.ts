import { configureStore } from '@reduxjs/toolkit';
import filesReducer from './slices/filesSlice';
import uiReducer from './slices/uiSlice';
import editorReducer from './slices/editorSlice';
import notificationsReducer from './slices/notificationsSlice';

export const store = configureStore({
  reducer: {
    files: filesReducer,
    ui: uiReducer,
    editor: editorReducer,
    notifications: notificationsReducer,
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