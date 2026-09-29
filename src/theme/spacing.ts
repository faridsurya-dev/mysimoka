export const spacing = {
  2: 2,
  4: 4,
  6: 6,
  8: 8,
  10: 10,
  12: 12,
  14: 14,
  16: 16,
  20: 20,
  24: 24,
  28: 28,
  32: 32,
  40: 40,
  48: 48,
  56: 56,
  64: 64,
} as const;

/** Layout constants shared across screens. */
export const layout = {
  /** Horizontal page gutter. */
  screenPaddingX: 20,
  /** Minimum touch target (WCAG / platform HIG). */
  minTouchTarget: 44,
  /** Standard control height (buttons, inputs). */
  controlHeight: 52,
  /** Max content width on wide screens (web / tablet). */
  maxContentWidth: 560,
} as const;
