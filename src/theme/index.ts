import { colors } from './colors';
import { spacing } from './spacing';
import { borderRadius } from './borderRadius';
import { typography } from './typography';

export * from './colors';
export * from './spacing';
export * from './borderRadius';
export * from './typography';

/**
 * Unified ScholarHub Theme object
 */
export const theme = {
  colors,
  spacing,
  borderRadius,
  typography,
} as const;

export type Theme = typeof theme;
