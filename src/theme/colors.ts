/**
 * ScholarHub Design System Colors
 * Consistent color palette matching mobile UI specifications
 */
export const colors = {
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
  secondary: {
    50: '#ECFDF5',
    100: '#D1FAE5',
    200: '#A7F3D0',
    300: '#6EE7B7',
    400: '#34D399',
    500: '#10B981',
    600: '#059669',
    700: '#047857',
    DEFAULT: '#059669',
  },
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
  status: {
    success: '#10B981',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
  },
  background: {
    light: '#FFFFFF',
    surface: '#F8FAFC',
    card: '#FFFFFF',
  },
  text: {
    primary: '#0F172A',
    secondary: '#475569',
    muted: '#94A3B8',
    inverted: '#FFFFFF',
  },
} as const;

export type ColorPalette = typeof colors;
