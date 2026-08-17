export * from './RootNavigator';
export * from './AuthNavigator';
export * from './StudentNavigator';
export * from '../types/navigation';

export const ROUTES = {
  // Root
  SPLASH: 'Splash',
  AUTH: 'Auth',
  STUDENT: 'Student',
  SHOWCASE: 'Showcase',
  FOUNDATION: 'Foundation',

  // Auth
  LOGIN: 'Login',
  REGISTER: 'Register',

  // Student
  DASHBOARD: 'Dashboard',
  SCHOLARSHIPS: 'Scholarships',
  APPLICATIONS: 'Applications',
  DOCUMENTS: 'Documents',
  NOTIFICATIONS: 'Notifications',
  PROFILE: 'Profile',
} as const;

export type RouteNames = (typeof ROUTES)[keyof typeof ROUTES];
