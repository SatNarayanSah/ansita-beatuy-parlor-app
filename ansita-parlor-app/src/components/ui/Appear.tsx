import type { ReactNode } from 'react';
import type { StyleProp, ViewStyle } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

/** Only the first screenful staggers; later rows appear without extra delay. */
const MAX_STAGGERED = 8;
const STEP_MS = 40;

interface AppearProps {
  /** Position in the list, for the stagger. */
  index?: number;
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
}

/**
 * Fades and lifts list rows in, staggered. Reanimated layout animations follow
 * the OS "reduce motion" setting by default, so this is skipped when it's on.
 */
export const Appear = ({ index = 0, children, style }: AppearProps) => (
  <Animated.View entering={FadeInDown.delay(Math.min(index, MAX_STAGGERED) * STEP_MS).duration(260)} style={style}>
    {children}
  </Animated.View>
);
