/**
 * User & Profile Types for ScholarHub Canonical Student Architecture
 */

import {
  PersonalDetails,
  AcademicDetails,
  PreferencesDetails,
} from './registration';

export type UserRole = 'student' | 'admin' | 'reviewer';

export type EducationLevel =
  | 'high_school'
  | 'undergraduate'
  | 'postgraduate'
  | 'doctorate';

export interface UserSettings {
  notificationsEnabled: boolean;
  deadlineRemindersEnabled: boolean;
  emailAlertsEnabled: boolean;
  language: string;
}

/**
 * Canonical Student / User Profile Model
 * Unifies registration information with student profile state
 */
export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  name?: string;
  role?: UserRole;
  avatarUrl?: string;
  educationLevel: EducationLevel;
  major?: string;
  gpa?: number;
  country: string;
  isProfileComplete: boolean;
  isVerified?: boolean;
  personal: PersonalDetails;
  academic: AcademicDetails;
  preferences: PreferencesDetails;
  settings: UserSettings;
  createdAt: string;
  updatedAt: string;
}

export type StudentProfile = UserProfile;

export interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
