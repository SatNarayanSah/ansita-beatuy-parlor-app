import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { BrandLogo, BrandWordmark } from '@/components/brand/BrandLogo';
import { useTheme } from '@/theme';

/** The intro always plays at least this long, so it never flashes. */
const MIN_DURATION_MS = 1600;

interface SplashScreenProps {
  /** Brand fonts are loaded; the logo animation starts then. */
  fontsReady: boolean;
  /** Fonts and persisted stores are loaded; the splash may fade out. */
  appReady: boolean;
  onFinish: () => void;
  /** Called once this view is laid out, to hand over from the native splash. */
  onFirstFrame?: () => void;
}

/**
 * Animated brand intro drawn over the app while it loads: the logo springs in,
 * a halo pulses behind it, then the wordmark rises. Fades out once the app is ready.
 */
export const SplashScreen = ({ fontsReady, appReady, onFinish, onFirstFrame }: SplashScreenProps) => {
  const { colors } = useTheme();
  const [minTimeElapsed, setMinTimeElapsed] = useState(false);

  const logo = useSharedValue(0);
  const halo = useSharedValue(0);
  const words = useSharedValue(0);
  const exit = useSharedValue(1);

  useEffect(() => {
    if (!fontsReady) return undefined;
    logo.value = withSpring(1, { damping: 11, stiffness: 120 });
    halo.value = withDelay(250, withRepeat(withSequence(withTiming(1, { duration: 1100 }), withTiming(0.6, { duration: 900 })), -1, true));
    words.value = withDelay(450, withTiming(1, { duration: 500, easing: Easing.out(Easing.cubic) }));
    const timer = setTimeout(() => setMinTimeElapsed(true), MIN_DURATION_MS);
    return () => clearTimeout(timer);
  }, [fontsReady, logo, halo, words]);

  useEffect(() => {
    if (!appReady || !minTimeElapsed) return;
    exit.value = withTiming(0, { duration: 380, easing: Easing.in(Easing.quad) }, (finished) => {
      if (finished) scheduleOnRN(onFinish);
    });
  }, [appReady, minTimeElapsed, exit, onFinish]);

  const rootStyle = useAnimatedStyle(() => ({ opacity: exit.value }));
  const logoStyle = useAnimatedStyle(() => ({
    opacity: Math.min(1, logo.value * 1.5),
    transform: [{ scale: 0.6 + logo.value * 0.4 }, { rotate: `${(1 - logo.value) * -25}deg` }],
  }));
  const haloStyle = useAnimatedStyle(() => ({ opacity: halo.value * 0.55, transform: [{ scale: 0.8 + halo.value * 0.45 }] }));
  const wordsStyle = useAnimatedStyle(() => ({ opacity: words.value, transform: [{ translateY: (1 - words.value) * 14 }] }));

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, styles.root, { backgroundColor: colors.background }, rootStyle]}
      accessibilityLabel="Loading Ansita"
      onLayout={onFirstFrame}
    >
      {fontsReady ? (
        <View style={styles.center}>
          <View style={styles.logoArea}>
            <Animated.View style={[styles.halo, { backgroundColor: colors.primarySoft }, haloStyle]} />
            <Animated.View style={logoStyle}>
              <BrandLogo size={104} />
            </Animated.View>
          </View>
          <Animated.View style={wordsStyle}>
            <BrandWordmark />
          </Animated.View>
        </View>
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  root: { alignItems: 'center', justifyContent: 'center', zIndex: 10 },
  center: { alignItems: 'center', gap: 28 },
  logoArea: { width: 200, height: 200, alignItems: 'center', justifyContent: 'center' },
  halo: { position: 'absolute', width: 200, height: 200, borderRadius: 100 },
});
