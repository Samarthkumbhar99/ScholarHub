import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface UIState {
  themeMode: 'light' | 'dark' | 'system';
  isGlobalLoading: boolean;
  globalNotification: {
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
  } | null;
  foundationStatus: {
    isReady: boolean;
    modulesVerified: {
      typeScript: boolean;
      nativeWind: boolean;
      reduxToolkit: boolean;
      architecture: boolean;
    };
  };
}

const initialState: UIState = {
  themeMode: 'system',
  isGlobalLoading: false,
  globalNotification: null,
  foundationStatus: {
    isReady: true,
    modulesVerified: {
      typeScript: true,
      nativeWind: true,
      reduxToolkit: true,
      architecture: true,
    },
  },
};

export const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setThemeMode: (state, action: PayloadAction<'light' | 'dark' | 'system'>) => {
      state.themeMode = action.payload;
    },
    setGlobalLoading: (state, action: PayloadAction<boolean>) => {
      state.isGlobalLoading = action.payload;
    },
    showNotification: (
      state,
      action: PayloadAction<{ message: string; type: 'info' | 'success' | 'warning' | 'error' }>
    ) => {
      state.globalNotification = action.payload;
    },
    clearNotification: (state) => {
      state.globalNotification = null;
    },
  },
});

export const { setThemeMode, setGlobalLoading, showNotification, clearNotification } =
  uiSlice.actions;

export default uiSlice.reducer;
