import type { BottomTabNavigationOptions } from '@react-navigation/bottom-tabs';

import type { Theme } from '@/theme';

/** Shared header styling for tab screens: flat, theme background, brand font. */
export const tabScreenOptions = ({ colors, fontFamily }: Theme): BottomTabNavigationOptions => ({
  headerShadowVisible: false,
  headerStyle: { backgroundColor: colors.background },
  headerTitleStyle: { fontFamily: fontFamily.headingSemibold, fontSize: 20, color: colors.text },
  headerTitleAlign: 'left',
  sceneStyle: { backgroundColor: colors.background },
  animation: 'shift',
});
