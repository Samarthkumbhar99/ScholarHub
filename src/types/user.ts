/**
 * User & Profile Types
 */
export type UserRole = 'student' | 'admin';

export type EducationLevel =
  | 'high_school'
  | 'undergraduate'
  | 'postgraduate'
  | 'doctorate';

export interface UserProfile {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl?: string;
  educationLevel: EducationLevel;
  major?: string;
  gpa?: number;
  country: string;
  isProfileComplete: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: UserProfile | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}
