import { configureStore } from '@reduxjs/toolkit';
import uiReducer from './slices/uiSlice';
import authReducer from './slices/authSlice';
import scholarshipReducer from './slices/scholarshipSlice';

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    auth: authReducer,
    scholarships: scholarshipReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
