/**
 * User & Profile Types for ScholarHub
 */
export type UserRole = 'student' | 'admin' | 'reviewer';

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
  name?: string;
  role?: UserRole;
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
