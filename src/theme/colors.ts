/**
 * ScholarHub Design System Colors
 * Centralized, type-safe color palette for all ScholarHub components
 */
export const colors = {
  // Primary Brand Colors (Blue Scale)
  primary: {
    50: '#EFF6FF',
    100: '#DBEAFE',
    200: '#BFDBFE',
    300: '#93C5FD',
    400: '#60A5FA',
    500: '#2563EB',
    600: '#1D4ED8',
    700: '#1E40AF',
    800: '#1E3A8A',
    900: '#172554',
    DEFAULT: '#1D4ED8',
  },

  // Secondary Brand Colors (Emerald/Teal Scale)
  secondary: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#10B981',
    600: '#059669',
    700: '#047857',
    800: '#065F46',
    900: '#064E3B',
    DEFAULT: '#059669',
  },

  // Scholar Theme Accents
  scholar: {
    blue: '#1E40AF',
    navy: '#0F172A',
    gold: '#F59E0B',
    amber: '#D97706',
    teal: '#0D9488',
    slate: '#334155',
    light: '#F8FAFC',
    border: '#E2E8F0',
  },

  // Neutral / Grayscale
  neutral: {
    50: '#F8FAFC',
    100: '#F1F5F9',
    200: '#E2E8F0',
    300: '#CBD5E1',
    400: '#94A3B8',
    500: '#64748B',
    600: '#475569',
    700: '#334155',
    800: '#1E293B',
    900: '#0F172A',
  },

  // Status Colors
  status: {
    success: '#10B981',
    successLight: '#ECFDF5',
    warning: '#F59E0B',
    warningLight: '#FFFBEB',
    error: '#EF4444',
    errorLight: '#FEF2F2',
    info: '#3B82F6',
    infoLight: '#EFF6FF',
  },

  // Semantic Backgrounds
  background: {
    primary: '#FFFFFF',
    secondary: '#F8FAFC',
    surface: '#F1F5F9',
    card: '#FFFFFF',
    dark: '#0F172A',
    backdrop: 'rgba(15, 23, 42, 0.5)',
  },

  // Semantic Text
  text: {
    primary: '#0F172A',
    secondary: '#475569',
    muted: '#94A3B8',
    inverted: '#FFFFFF',
    accent: '#1D4ED8',
    error: '#EF4444',
    success: '#10B981',
  },

  // Semantic Borders
  border: {
    subtle: '#F1F5F9',
    default: '#E2E8F0',
    strong: '#CBD5E1',
    focus: '#2563EB',
    error: '#EF4444',
  },
} as const;

export type ColorPalette = typeof colors;
