/**
 * Compact 2-point spacing scale. The small steps (xxs-md) carry most of the
 * layout; the large steps are kept tight so screens stay dense.
 */
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 14,
  xl: 16,
  xxl: 18,
  xxxl: 24,
  huge: 32,
} as const;

/** Rounded, soft corners (12-20 for surfaces). */
export const radius = {
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  pill: 999,
} as const;

/** Standard horizontal padding for screen content. */
export const screenPadding = spacing.md;

/** Minimum touch target (Android/iOS accessibility guidelines). */
export const minTouchSize = 44;

/** Bottom padding that keeps the last scroll item clear of a FAB or sticky footer overlay. */
export const overlayClearance = 88;

export type SpacingKey = keyof typeof spacing;
