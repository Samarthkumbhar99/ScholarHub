/**
 * ScholarHub Navigation Structure
 * Central route name constants and types
 */
export const ROUTES = {
  FOUNDATION: 'Foundation',
  SPLASH: 'Splash',
  AUTH: 'Auth',
  REGISTRATION: 'Registration',
  DASHBOARD: 'Dashboard',
  SCHOLARSHIPS: 'Scholarships',
  SCHOLARSHIP_DETAIL: 'ScholarshipDetail',
  APPLICATIONS: 'Applications',
  DOCUMENTS: 'Documents',
  NOTIFICATIONS: 'Notifications',
  STUDY_ABROAD: 'StudyAbroad',
  PROFILE: 'Profile',
} as const;

export type RouteNames = (typeof ROUTES)[keyof typeof ROUTES];

export * from '../types/navigation';
