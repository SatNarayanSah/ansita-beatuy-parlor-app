import { useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

/** Subtle "press in" scale animation for tappable surfaces. */
export const usePressScale = (pressedScale = 0.97) => {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const onPressIn = (): void => {
    scale.set(withTiming(pressedScale, { duration: 90 }));
  };
  const onPressOut = (): void => {
    scale.set(withSpring(1, { damping: 14, stiffness: 260 }));
  };

  return { animatedStyle, onPressIn, onPressOut };
};
