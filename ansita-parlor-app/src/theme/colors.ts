import type { AppointmentStatus } from '@/types';

/** Raw brand palette. Components use the semantic tokens in `ThemeColors`. */
export const palette = {
  rose50: '#FDF3F6',
  rose100: '#F8E1E8',
  rose200: '#EFBFCD',
  rose300: '#E58FAA',
  rose500: '#C2577A',
  rose700: '#9C3D5E',
  rose900: '#3F2430',
  plum100: '#EFE3EC',
  plum300: '#C79BC0',
  plum700: '#5A2D52',
  plum900: '#35222F',
  gold100: '#F7EDD8',
  gold300: '#E0BC6E',
  gold500: '#C49A45',
  gold900: '#3A2F1C',
  ivory: '#FBF8F3',
  ivoryDeep: '#F4EDE6',
  charcoal: '#2B2528',
  white: '#FFFFFF',
  black: '#000000',
} as const;

export interface StatusColor {
  fg: string;
  bg: string;
}

export interface ThemeColors {
  primary: string;
  primaryDark: string;
  primarySoft: string;
  primaryMuted: string;
  onPrimary: string;

  accent: string;
  accentSoft: string;
  onAccent: string;

  /** Gold for icons and decoration (3:1 on surfaces). */
  highlight: string;
  /** Gold dark enough for text (4.5:1 on surfaces and highlightSoft). */
  highlightText: string;
  highlightSoft: string;

  background: string;
  surface: string;
  surfaceAlt: string;
  surfaceRaised: string;
  border: string;
  borderStrong: string;
  overlay: string;

  text: string;
  textSecondary: string;
  textMuted: string;
  textInverse: string;

  success: string;
  successSoft: string;
  warning: string;
  warningSoft: string;
  danger: string;
  dangerSoft: string;
  info: string;
  infoSoft: string;
  neutral: string;
  neutralSoft: string;

  skeleton: string;
  skeletonHighlight: string;
  shadow: string;

  /** Foreground/background pair for each appointment status. */
  status: Record<AppointmentStatus, StatusColor>;
  /** Soft backgrounds for initials avatars, picked by name hash. */
  avatar: readonly string[];
}

/**
 * Light text/fill tokens are tuned to WCAG AA (4.5:1) against the surfaces they
 * sit on. The brand rose (palette.rose500) is kept for the logo and icons.
 */
export const lightColors: ThemeColors = {
  primary: '#A44A67',
  primaryDark: '#84374F',
  primarySoft: palette.rose100,
  primaryMuted: palette.rose200,
  onPrimary: palette.white,

  accent: palette.plum700,
  accentSoft: palette.plum100,
  onAccent: palette.white,

  highlight: '#B08B3E',
  highlightText: '#84682F',
  highlightSoft: palette.gold100,

  background: palette.ivory,
  surface: palette.white,
  surfaceAlt: palette.ivoryDeep,
  surfaceRaised: palette.white,
  border: '#ECE3DD',
  borderStrong: '#D9CCC4',
  overlay: 'rgba(43, 37, 40, 0.48)',

  text: palette.charcoal,
  textSecondary: '#5C5357',
  textMuted: '#726A6E',
  textInverse: palette.white,

  success: '#287B55',
  successSoft: '#E3F3EA',
  warning: '#966319',
  warningSoft: '#FBF0DA',
  danger: '#B93F36',
  dangerSoft: '#FBE4E1',
  info: '#3768B5',
  infoSoft: '#E3ECF8',
  neutral: '#6B6166',
  neutralSoft: '#EFEAE7',

  skeleton: '#F0E9E4',
  skeletonHighlight: '#E6DCD5',
  shadow: palette.plum900,

  status: {
    pending: { fg: '#966319', bg: '#FBF0DA' },
    confirmed: { fg: '#3768B5', bg: '#E3ECF8' },
    completed: { fg: '#287B55', bg: '#E3F3EA' },
    cancelled: { fg: '#B93F36', bg: '#FBE4E1' },
    no_show: { fg: '#6B6166', bg: '#EFEAE7' },
  },
  avatar: ['#F8E1E8', '#EFE3EC', '#F7EDD8', '#E3F3EA', '#E3ECF8', '#F4E4DA'],
};

export const darkColors: ThemeColors = {
  primary: palette.rose300,
  primaryDark: palette.rose200,
  primarySoft: palette.rose900,
  primaryMuted: '#6B3A4D',
  onPrimary: '#2A1520',

  accent: palette.plum300,
  accentSoft: palette.plum900,
  onAccent: '#24131F',

  highlight: palette.gold300,
  highlightText: palette.gold300,
  highlightSoft: palette.gold900,

  background: '#161114',
  surface: '#201A1D',
  surfaceAlt: '#2A2226',
  surfaceRaised: '#2C2428',
  border: '#3A3035',
  borderStrong: '#4E4248',
  overlay: 'rgba(0, 0, 0, 0.6)',

  text: '#F4ECEF',
  textSecondary: '#C2B5BB',
  textMuted: '#94888D',
  textInverse: palette.charcoal,

  success: '#5CC28F',
  successSoft: '#1D3128',
  warning: '#E3A94F',
  warningSoft: '#3A2D18',
  danger: '#F07A70',
  dangerSoft: '#3D1F1D',
  info: '#7FA6E8',
  infoSoft: '#1D2A3E',
  neutral: '#B3A7AC',
  neutralSoft: '#2F282B',

  skeleton: '#2A2226',
  skeletonHighlight: '#3A3035',
  shadow: palette.black,

  status: {
    pending: { fg: '#E3A94F', bg: '#3A2D18' },
    confirmed: { fg: '#7FA6E8', bg: '#1D2A3E' },
    completed: { fg: '#5CC28F', bg: '#1D3128' },
    cancelled: { fg: '#F07A70', bg: '#3D1F1D' },
    no_show: { fg: '#B3A7AC', bg: '#2F282B' },
  },
  avatar: ['#4A2A37', '#3E2A3A', '#43361F', '#22392E', '#22304A', '#45322A'],
};
