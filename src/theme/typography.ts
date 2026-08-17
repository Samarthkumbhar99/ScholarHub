/**
 * ScholarHub Typography Scale & Sizing
 * Standardized font sizes, line heights, and weights for clean typography hierarchy
 */
export const typography = {
  fontSize: {
    '2xs': 10,
    xs: 12,
    sm: 14,
    base: 16,
    lg: 18,
    xl: 20,
    '2xl': 24,
    '3xl': 30,
    '4xl': 36,
    '5xl': 48,
  },
  fontWeight: {
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
    extrabold: '800' as const,
    black: '900' as const,
  },
  lineHeight: {
    tight: 1.25,
    snug: 1.375,
    normal: 1.5,
    relaxed: 1.625,
    loose: 2,
  },
  // Semantic typography presets
  presets: {
    h1: { fontSize: 30, fontWeight: '800' as const, lineHeight: 1.25 },
    h2: { fontSize: 24, fontWeight: '700' as const, lineHeight: 1.3 },
    h3: { fontSize: 20, fontWeight: '700' as const, lineHeight: 1.35 },
    h4: { fontSize: 18, fontWeight: '600' as const, lineHeight: 1.4 },
    bodyLg: { fontSize: 16, fontWeight: '400' as const, lineHeight: 1.5 },
    body: { fontSize: 14, fontWeight: '400' as const, lineHeight: 1.5 },
    bodySm: { fontSize: 12, fontWeight: '400' as const, lineHeight: 1.4 },
    caption: { fontSize: 11, fontWeight: '500' as const, lineHeight: 1.3 },
    button: { fontSize: 15, fontWeight: '600' as const, lineHeight: 1 },
  },
} as const;

export type Typography = typeof typography;
