import { configureStore } from '@reduxjs/toolkit';
import uiReducer from './slices/uiSlice';
import authReducer from './slices/authSlice';
import scholarshipReducer from './slices/scholarshipSlice';
import applicationReducer from './slices/applicationSlice';
import documentReducer from './slices/documentSlice';

export const store = configureStore({
  reducer: {
    ui: uiReducer,
    auth: authReducer,
    scholarships: scholarshipReducer,
    applications: applicationReducer,
    documents: documentReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});


export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
