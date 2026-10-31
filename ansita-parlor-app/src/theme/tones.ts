import type { ThemeColors } from './colors';

/** Semantic colour roles shared by Badge, StatCard, EmptyState, Toast, etc. */
export type Tone = 'neutral' | 'primary' | 'accent' | 'highlight' | 'success' | 'warning' | 'danger' | 'info';

export interface ToneColors {
  /** Strong colour for text/icons on a soft background, or a solid fill. */
  fg: string;
  /** Soft tinted background. */
  bg: string;
  /** Text colour on a solid `fg` fill. */
  on: string;
}

export const getToneColors = (colors: ThemeColors, tone: Tone): ToneColors => {
  switch (tone) {
    case 'primary':
      return { fg: colors.primary, bg: colors.primarySoft, on: colors.onPrimary };
    case 'accent':
      return { fg: colors.accent, bg: colors.accentSoft, on: colors.onAccent };
    case 'highlight':
      return { fg: colors.highlight, bg: colors.highlightSoft, on: colors.textInverse };
    case 'success':
      return { fg: colors.success, bg: colors.successSoft, on: colors.textInverse };
    case 'warning':
      return { fg: colors.warning, bg: colors.warningSoft, on: colors.textInverse };
    case 'danger':
      return { fg: colors.danger, bg: colors.dangerSoft, on: colors.textInverse };
    case 'info':
      return { fg: colors.info, bg: colors.infoSoft, on: colors.textInverse };
    case 'neutral':
      return { fg: colors.neutral, bg: colors.neutralSoft, on: colors.textInverse };
  }
};
