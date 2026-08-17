/**
 * Global Application Constants
 */
export const APP_CONFIG = {
  APP_NAME: 'ScholarHub',
  TAGLINE: 'Smart Scholarship Discovery & Management Platform',
  VERSION: '1.0.0',
  PLATFORM_TARGET: 'student-mobile',
  STATUS: 'Foundation Ready',
} as const;

export const STORAGE_KEYS = {
  AUTH_TOKEN: 'scholarhub_auth_token',
  USER_PROFILE: 'scholarhub_user_profile',
  THEME_MODE: 'scholarhub_theme_mode',
} as const;
