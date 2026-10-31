import type { StyleProp, ViewStyle } from 'react-native';

import { useThemeMode, type ThemeMode } from '@/theme';

import { SegmentedControl, type SegmentOption } from './SegmentedControl';

const OPTIONS: readonly SegmentOption<ThemeMode>[] = [
  { value: 'light', label: 'Light', icon: 'sunny-outline' },
  { value: 'dark', label: 'Dark', icon: 'moon-outline' },
  { value: 'system', label: 'System', icon: 'phone-portrait-outline' },
];

/** Light / Dark / System switch for the appearance setting. The choice is persisted. */
export const ThemeModeSelector = ({ style }: { style?: StyleProp<ViewStyle> }) => {
  const { mode, setMode } = useThemeMode();
  return <SegmentedControl options={OPTIONS} value={mode} onChange={setMode} style={style} />;
};
