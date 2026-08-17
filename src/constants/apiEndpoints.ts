/**
 * API Endpoint Constants
 */
export const API_ENDPOINTS = {
  BASE_URL: 'https://api.scholarhub.io/v1',
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    FORGOT_PASSWORD: '/auth/forgot-password',
    REFRESH_TOKEN: '/auth/refresh',
  },
  SCHOLARSHIPS: {
    LIST: '/scholarships',
    DETAIL: (id: string) => `/scholarships/${id}`,
    RECOMMENDED: '/scholarships/recommended',
    CATEGORIES: '/scholarships/categories',
  },
  APPLICATIONS: {
    LIST: '/applications',
    SUBMIT: '/applications/submit',
    STATUS: (id: string) => `/applications/${id}/status`,
  },
  DOCUMENTS: {
    UPLOAD: '/documents/upload',
    LIST: '/documents',
  },
  USER: {
    PROFILE: '/user/profile',
    UPDATE_PROFILE: '/user/profile/update',
    PREFERENCES: '/user/preferences',
  },
} as const;
