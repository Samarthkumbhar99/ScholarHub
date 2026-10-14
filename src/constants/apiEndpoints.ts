import { Platform } from 'react-native';

/**
 * Get the base API URL depending on the runtime platform and environment variables.
 * - Android Emulator: 10.0.2.2 maps to host machine localhost
 * - iOS Simulator / Web: localhost maps to host machine
 * - Physical Device / Custom: Use EXPO_PUBLIC_API_URL environment variable
 */
const getBaseApiUrl = (): string => {
  if (process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }
  return Platform.select({
    android: 'http://10.0.2.2:8000/api/v1',
    default: 'http://localhost:8000/api/v1',
  });
};

/**
 * ScholarHub API Endpoint Constants
 * Matching FastAPI Backend v1 Router Schema
 */
export const API_ENDPOINTS = {
  BASE_URL: getBaseApiUrl(),

  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REGISTER_PROVIDER: '/auth/register-provider',
    ME: '/auth/me',
  },

  PROFILE: {
    ROOT: '/profile',
    PERSONAL: '/profile',
    ACADEMIC: '/profile/academic',
    PREFERENCES: '/profile/preferences',
    ME: '/profile/me',
  },

  SCHOLARSHIPS: {
    LIST: '/scholarships',
    DETAIL: (id: string) => `/scholarships/${id}`,
    REQUIREMENTS: (id: string) => `/scholarships/${id}/requirements`,
    MATCH: (id: string) => `/scholarships/${id}/match`,
    SAVE: (id: string) => `/scholarships/${id}/save`,
    SAVED_STATUS: (id: string) => `/scholarships/${id}/saved`,
    SAVED_LIST: '/scholarships/saved',
    COMPARE: (ids: string[]) => `/scholarships/compare?ids=${ids.join(',')}`,
    RECOMMENDATIONS: '/scholarships/recommendations',
    RECOMMENDED: '/scholarships/recommended',
  },

  APPLICATIONS: {
    LIST: '/applications',
    CREATE: '/applications',
    DETAIL: (id: string) => `/applications/${id}`,
    STATUS: (id: string) => `/applications/${id}/status`,
    DELETE: (id: string) => `/applications/${id}`,
  },

  DOCUMENTS: {
    LIST: '/documents',
    UPLOAD: '/documents',
    DETAIL: (id: string) => `/documents/${id}`,
    REPLACE: (id: string) => `/documents/${id}`,
    DELETE: (id: string) => `/documents/${id}`,
  },

  NOTIFICATIONS: {
    LIST: '/notifications',
    UNREAD_COUNT: '/notifications/unread-count',
    DETAIL: (id: string) => `/notifications/${id}`,
    READ: (id: string) => `/notifications/${id}/read`,
    READ_ALL: '/notifications/read-all',
    DELETE: (id: string) => `/notifications/${id}`,
    CREATE: '/notifications',
  },

  PROVIDER: {
    PROFILE: '/provider/profile',
    APPLY: '/provider/apply',
    SCHOLARSHIPS: '/provider/scholarships',
    SCHOLARSHIP_DETAIL: (id: string) => `/provider/scholarships/${id}`,
  },

  ADMIN: {
    DASHBOARD_STATS: '/admin/dashboard/stats',
    SCHOLARSHIPS: '/admin/scholarships',
    SCHOLARSHIP_DETAIL: (id: string) => `/admin/scholarships/${id}`,
    APPROVE: (id: string) => `/admin/scholarships/${id}/approve`,
    REJECT: (id: string) => `/admin/scholarships/${id}/reject`,
    UPDATE: (id: string) => `/admin/scholarships/${id}`,
    MODERATION_PENDING: '/admin/moderation/pending',
    COLLECTION_JOBS: '/admin/collection-jobs',
    COLLECTION_JOB_DETAIL: (id: string) => `/admin/collection-jobs/${id}`,
    SCHEDULER: '/admin/scheduler',
    SCHEDULER_TRIGGER: '/admin/scheduler/trigger',
    USERS: '/admin/users',
    USER_ROLE: (id: string) => `/admin/users/${id}/role`,
    PROVIDERS: '/admin/providers',
    PROVIDER_APPROVE: (id: string) => `/admin/providers/${id}/approve`,
  },
} as const;

export default API_ENDPOINTS;
