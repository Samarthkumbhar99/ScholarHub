/**
 * ScholarHub Design System Spacing Scale
 * Standardized spacing values across layouts, paddings, and margins
 */
export const spacing = {
  // Numeric Scale (in points/pixels)
  0: 0,
  0.5: 2,
  1: 4,
  1.5: 6,
  2: 8,
  2.5: 10,
  3: 12,
  3.5: 14,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  9: 36,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
  20: 80,
  24: 96,

  // Semantic Layout Spacing
  layout: {
    screenPaddingHorizontal: 16,
    screenPaddingVertical: 16,
    screenPaddingBottom: 32,
    cardPadding: 16,
    cardPaddingCompact: 12,
    cardPaddingSpacious: 20,
    sectionGap: 24,
    itemGap: 12,
    inputPadding: 12,
    buttonPaddingSm: 8,
    buttonPaddingMd: 12,
    buttonPaddingLg: 16,
  },
} as const;

export type Spacing = typeof spacing;
