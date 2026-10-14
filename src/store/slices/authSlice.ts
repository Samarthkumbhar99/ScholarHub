import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import {
  AuthState,
  UserProfile,
  UserSettings,
  PersonalDetails,
  AcademicDetails,
  PreferencesDetails,
} from '../../types';
import { authService, LoginCredentials, ProviderRegisterPayload } from '../../services/authService';
import { profileService } from '../../services/profileService';
import { apiClient } from '../../services/api';
import { mapBackendProfileToFrontend } from '../../utils/adapters';

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

// ==============================================================================
// ASYNC THUNKS
// ==============================================================================

/**
 * Log in user (Student, Provider, or Admin) with email/password against FastAPI backend
 */
export const loginUserThunk = createAsyncThunk(
  'auth/loginUser',
  async (credentials: LoginCredentials, { rejectWithValue }) => {
    try {
      const loginRes = await authService.login(credentials);
      const token = loginRes.data.access_token;

      // Fetch user profile and me data
      const meRes = await authService.getMe();
      let profileData = {};
      try {
        const profileRes = await profileService.getCombinedProfile();
        profileData = profileRes.data || {};
      } catch {
        // Non-student accounts (Provider, Admin) do not require Student combined profile
      }

      const user = mapBackendProfileToFrontend(
        meRes.data.email,
        meRes.data.id,
        profileData,
        meRes.data.role,
        meRes.data.provider_profile
      );

      return { token, user };
    } catch (err: any) {
      return rejectWithValue(err.message || 'Login failed. Please check your credentials.');
    }
  }
);

/**
 * Register student account and initialize profiles
 */
export const registerUserThunk = createAsyncThunk(
  'auth/registerUser',
  async (
    payload: {
      email: string;
      password: string;
      personal?: PersonalDetails;
      academic?: AcademicDetails;
      preferences?: PreferencesDetails;
    },
    { rejectWithValue }
  ) => {
    try {
      // 1. Register account
      await authService.register({
        email: payload.email,
        password: payload.password,
      });

      // 2. Login to get token
      const loginRes = await authService.login({
        email: payload.email,
        password: payload.password,
      });
      const token = loginRes.data.access_token;
      const meRes = await authService.getMe();

      // 3. Save personal profile if provided
      if (payload.personal && payload.personal.firstName && payload.personal.lastName) {
        await profileService.updatePersonalProfile({
          first_name: payload.personal.firstName,
          last_name: payload.personal.lastName,
          date_of_birth: payload.personal.dateOfBirth || undefined,
          gender: payload.personal.gender || undefined,
          mobile: payload.personal.mobile || undefined,
          country: payload.academic?.country || 'India',
          state: payload.academic?.state || undefined,
          district: payload.academic?.district || undefined,
          city: payload.academic?.city || undefined,
        });
      }

      // 4. Save academic profile if provided
      if (payload.academic && (payload.academic.course || payload.academic.branch)) {
        await profileService.updateAcademicProfile({
          course: payload.academic.course || undefined,
          branch: payload.academic.branch || undefined,
          current_year: payload.academic.currentYear || undefined,
          university: payload.academic.university || undefined,
          college: payload.academic.college || undefined,
          cgpa: payload.academic.cgpa ? parseFloat(payload.academic.cgpa) : undefined,
          previous_percentage: payload.academic.previousPercentage
            ? parseFloat(payload.academic.previousPercentage)
            : undefined,
        });
      }

      // 5. Save preferences if provided
      if (payload.preferences && payload.preferences.reservationCategory) {
        let studyPref: 'INDIA' | 'ABROAD' | 'BOTH' | undefined = undefined;
        if (payload.preferences.studyPreference === 'India') studyPref = 'INDIA';
        else if (payload.preferences.studyPreference === 'Abroad') studyPref = 'ABROAD';
        else if (payload.preferences.studyPreference === 'Both') studyPref = 'BOTH';

        await profileService.updateFinancialPreferences({
          reservation_category: payload.preferences.reservationCategory || undefined,
          special_categories: payload.preferences.specialCategories || undefined,
          family_income: payload.preferences.familyIncome
            ? parseFloat(payload.preferences.familyIncome.replace(/,/g, ''))
            : undefined,
          study_preference: studyPref,
        });
      }

      // Fetch combined profile
      let profileData = {};
      try {
        const profileRes = await profileService.getCombinedProfile();
        profileData = profileRes.data || {};
      } catch {
        // Fallback for empty profile
      }

      const user = mapBackendProfileToFrontend(
        meRes.data.email,
        meRes.data.id,
        profileData,
        meRes.data.role,
        meRes.data.provider_profile
      );

      return { token, user };
    } catch (err: any) {
      return rejectWithValue(err.message || 'Registration failed.');
    }
  }
);

/**
 * Register provider account and initialize provider profile
 */
export const registerProviderThunk = createAsyncThunk(
  'auth/registerProvider',
  async (payload: ProviderRegisterPayload, { rejectWithValue }) => {
    try {
      // 1. Register provider account
      await authService.registerProvider(payload);

      // 2. Login to get token
      const loginRes = await authService.login({
        email: payload.email,
        password: payload.password,
      });
      const token = loginRes.data.access_token;
      const meRes = await authService.getMe();

      let profileData = {};
      try {
        const profileRes = await profileService.getCombinedProfile();
        profileData = profileRes.data || {};
      } catch {
        // Provider profiles do not have student combined profile data
      }

      const user = mapBackendProfileToFrontend(
        meRes.data.email,
        meRes.data.id,
        profileData,
        meRes.data.role,
        meRes.data.provider_profile
      );

      return { token, user };
    } catch (err: any) {
      return rejectWithValue(err.message || 'Provider registration failed.');
    }
  }
);

/**
 * Check and restore authenticated session on app launch
 */
export const restoreSessionThunk = createAsyncThunk(
  'auth/restoreSession',
  async (_, { rejectWithValue }) => {
    try {
      const token = apiClient.getAuthToken();
      if (!token) {
        return rejectWithValue('No active token');
      }

      const meRes = await authService.getMe();
      let profileData = {};
      try {
        const profileRes = await profileService.getCombinedProfile();
        profileData = profileRes.data || {};
      } catch {
        // Non-student accounts (Provider, Admin) do not require Student combined profile
      }

      const user = mapBackendProfileToFrontend(
        meRes.data.email,
        meRes.data.id,
        profileData,
        meRes.data.role,
        meRes.data.provider_profile
      );

      return { token, user };
    } catch (err: any) {
      apiClient.setAuthToken(null);
      return rejectWithValue(err.message || 'Session expired');
    }
  }
);

/**
 * Update personal profile section on backend
 */
export const updatePersonalProfileThunk = createAsyncThunk(
  'auth/updatePersonalProfile',
  async (personal: PersonalDetails, { getState, rejectWithValue }) => {
    try {
      await profileService.updatePersonalProfile({
        first_name: personal.firstName,
        last_name: personal.lastName,
        date_of_birth: personal.dateOfBirth || undefined,
        gender: personal.gender || undefined,
        mobile: personal.mobile || undefined,
      });

      return personal;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to update personal profile');
    }
  }
);

/**
 * Update academic profile section on backend
 */
export const updateAcademicProfileThunk = createAsyncThunk(
  'auth/updateAcademicProfile',
  async (academic: AcademicDetails, { rejectWithValue }) => {
    try {
      await profileService.updateAcademicProfile({
        course: academic.course || undefined,
        branch: academic.branch || undefined,
        current_year: academic.currentYear || undefined,
        university: academic.university || undefined,
        college: academic.college || undefined,
        cgpa: academic.cgpa ? parseFloat(academic.cgpa) : undefined,
        previous_percentage: academic.previousPercentage
          ? parseFloat(academic.previousPercentage)
          : undefined,
      });

      return academic;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to update academic profile');
    }
  }
);

/**
 * Update preferences profile section on backend
 */
export const updatePreferencesProfileThunk = createAsyncThunk(
  'auth/updatePreferencesProfile',
  async (preferences: PreferencesDetails, { rejectWithValue }) => {
    try {
      let studyPref: 'INDIA' | 'ABROAD' | 'BOTH' | undefined = undefined;
      if (preferences.studyPreference === 'India') studyPref = 'INDIA';
      else if (preferences.studyPreference === 'Abroad') studyPref = 'ABROAD';
      else if (preferences.studyPreference === 'Both') studyPref = 'BOTH';

      await profileService.updateFinancialPreferences({
        reservation_category: preferences.reservationCategory || undefined,
        special_categories: preferences.specialCategories || undefined,
        family_income: preferences.familyIncome
          ? parseFloat(preferences.familyIncome.replace(/,/g, ''))
          : undefined,
        study_preference: studyPref,
      });

      return preferences;
    } catch (err: any) {
      return rejectWithValue(err.message || 'Failed to update preferences');
    }
  }
);

export const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },
    setCredentials: (
      state,
      action: PayloadAction<{ user: UserProfile; token: string }>
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
      state.error = null;
      state.isLoading = false;
      apiClient.setAuthToken(action.payload.token);
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
      state.isLoading = false;
    },
    updatePersonalDetails: (state, action: PayloadAction<PersonalDetails>) => {
      if (state.user) {
        state.user.personal = { ...state.user.personal, ...action.payload };
        state.user.firstName = action.payload.firstName;
        state.user.lastName = action.payload.lastName;
        state.user.name = `${action.payload.firstName} ${action.payload.lastName}`.trim();
        state.user.email = action.payload.email;
        state.user.updatedAt = new Date().toISOString();
      }
    },
    updateAcademicDetails: (state, action: PayloadAction<AcademicDetails>) => {
      if (state.user) {
        state.user.academic = { ...state.user.academic, ...action.payload };
        state.user.major = action.payload.branch;
        state.user.country = action.payload.country;
        const numCgpa = parseFloat(action.payload.cgpa);
        if (!isNaN(numCgpa)) {
          state.user.gpa = numCgpa;
        }
        state.user.updatedAt = new Date().toISOString();
      }
    },
    updatePreferencesDetails: (
      state,
      action: PayloadAction<PreferencesDetails>
    ) => {
      if (state.user) {
        state.user.preferences = { ...state.user.preferences, ...action.payload };
        state.user.updatedAt = new Date().toISOString();
      }
    },
    updateSettings: (state, action: PayloadAction<Partial<UserSettings>>) => {
      if (state.user) {
        state.user.settings = { ...state.user.settings, ...action.payload };
        state.user.updatedAt = new Date().toISOString();
      }
    },
    updateFullProfile: (state, action: PayloadAction<Partial<UserProfile>>) => {
      if (state.user) {
        state.user = {
          ...state.user,
          ...action.payload,
          updatedAt: new Date().toISOString(),
        };
      }
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      state.isLoading = false;
      apiClient.setAuthToken(null);
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginUserThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginUserThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.error = null;
      })
      .addCase(loginUserThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = false;
        state.token = null;
        state.user = null;
        state.error = action.payload as string;
      });

    // Register
    builder
      .addCase(registerUserThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerUserThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.error = null;
      })
    // Register Provider
    builder
      .addCase(registerProviderThunk.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(registerProviderThunk.fulfilled, (state, action) => {
        state.isLoading = false;
        state.isAuthenticated = true;
        state.token = action.payload.token;
        state.user = action.payload.user;
        state.error = null;
      })
      .addCase(registerProviderThunk.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });

    // Restore Session
    builder
      .addCase(restoreSessionThunk.fulfilled, (state, action) => {
        state.isAuthenticated = true;
        state.token = action.payload.token;
        state.user = action.payload.user;
      })
      .addCase(restoreSessionThunk.rejected, (state) => {
        state.isAuthenticated = false;
        state.token = null;
        state.user = null;
      });

    // Update Personal
    builder.addCase(updatePersonalProfileThunk.fulfilled, (state, action) => {
      if (state.user) {
        state.user.personal = { ...state.user.personal, ...action.payload };
        state.user.firstName = action.payload.firstName;
        state.user.lastName = action.payload.lastName;
        state.user.name = `${action.payload.firstName} ${action.payload.lastName}`.trim();
        state.user.email = action.payload.email;
      }
    });

    // Update Academic
    builder.addCase(updateAcademicProfileThunk.fulfilled, (state, action) => {
      if (state.user) {
        state.user.academic = { ...state.user.academic, ...action.payload };
        state.user.major = action.payload.branch;
        const numCgpa = parseFloat(action.payload.cgpa);
        if (!isNaN(numCgpa)) state.user.gpa = numCgpa;
      }
    });

    // Update Preferences
    builder.addCase(updatePreferencesProfileThunk.fulfilled, (state, action) => {
      if (state.user) {
        state.user.preferences = { ...state.user.preferences, ...action.payload };
      }
    });
  },
});

export const {
  setLoading,
  setCredentials,
  setError,
  updatePersonalDetails,
  updateAcademicDetails,
  updatePreferencesDetails,
  updateSettings,
  updateFullProfile,
  logout,
} = authSlice.actions;

export default authSlice.reducer;
