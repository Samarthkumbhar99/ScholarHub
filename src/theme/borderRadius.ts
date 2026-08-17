/**
 * ScholarHub Design System Border Radius
 * Standardized corner curves for cards, buttons, badges, and inputs
 */
export const borderRadius = {
  none: 0,
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  '2xl': 20,
  '3xl': 24,
  '4xl': 32,
  full: 9999,

  // Semantic mappings
  button: {
    sm: 8,
    md: 12,
    lg: 16,
  },
  input: 12,
  card: 16,
  badge: 9999,
  modal: 24,
} as const;

export type BorderRadius = typeof borderRadius;
