import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  AuthState,
  UserProfile,
  UserSettings,
  PersonalDetails,
  AcademicDetails,
  PreferencesDetails,
} from '../../types';

export const initialMockProfile: UserProfile = {
  id: 'usr_student_01',
  email: 'rahul.sharma@university.edu',
  firstName: 'Rahul',
  lastName: 'Sharma',
  name: 'Rahul Sharma',
  role: 'student',
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  educationLevel: 'undergraduate',
  major: 'Computer Science',
  gpa: 8.7,
  country: 'India',
  isProfileComplete: true,
  isVerified: true,
  personal: {
    firstName: 'Rahul',
    lastName: 'Sharma',
    dateOfBirth: '2004-05-14',
    gender: 'Male',
    email: 'rahul.sharma@university.edu',
    mobile: '9876543210',
  },
  academic: {
    country: 'India',
    state: 'Maharashtra',
    district: 'Pune',
    city: 'Pune',
    course: 'B.Tech',
    branch: 'Computer Science',
    currentYear: '3rd Year',
    university: 'Savitribai Phule Pune University',
    college: 'College of Engineering Pune (COEP)',
    cgpa: '8.70',
    previousPercentage: '88.5',
  },
  preferences: {
    reservationCategory: 'OBC',
    specialCategories: ['None'],
    familyIncome: '450000',
    studyPreference: 'Both',
  },
  settings: {
    notificationsEnabled: true,
    deadlineRemindersEnabled: true,
    emailAlertsEnabled: true,
    language: 'English (US)',
  },
  createdAt: '2026-07-01T10:00:00.000Z',
  updatedAt: '2026-08-20T12:00:00.000Z',
};

const initialState: AuthState = {
  user: initialMockProfile,
  token: 'mock-jwt-authenticated-token',
  isAuthenticated: true,
  isLoading: false,
  error: null,
};

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
    resetProfile: (state) => {
      state.user = initialMockProfile;
      state.isAuthenticated = true;
      state.token = 'mock-jwt-authenticated-token';
    },
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      state.isLoading = false;
    },
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
  resetProfile,
  logout,
} = authSlice.actions;

export default authSlice.reducer;
