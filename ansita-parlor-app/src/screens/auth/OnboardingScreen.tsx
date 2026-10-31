import { useCallback, useRef, useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View, type ListRenderItem, type ListViewToken } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Button, Icon, Text, type IconName } from '@/components/ui';
import { useSettingsStore } from '@/store';
import { getToneColors, useTheme, type Tone } from '@/theme';

interface Slide {
  key: string;
  icon: IconName;
  accents: [IconName, IconName];
  tone: Tone;
  title: string;
  body: string;
}

const SLIDES: readonly Slide[] = [
  {
    key: 'book',
    icon: 'calendar',
    accents: ['cut-outline', 'color-palette-outline'],
    tone: 'primary',
    title: 'Beauty, booked in seconds',
    body: 'Pick a service, your favourite stylist and a time that suits you. No phone calls, no waiting.',
  },
  {
    key: 'reward',
    icon: 'gift',
    accents: ['star-outline', 'sparkles-outline'],
    tone: 'highlight',
    title: 'Rewards on every visit',
    body: 'Earn loyalty points with every booking and unlock festive offers made just for you.',
  },
];

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList<Slide>);

interface SlideViewProps {
  slide: Slide;
  index: number;
  width: number;
  scrollX: SharedValue<number>;
}

const SlideView = ({ slide, index, width, scrollX }: SlideViewProps) => {
  const { colors, spacing, shadows } = useTheme();
  const tone = getToneColors(colors, slide.tone);
  const range = [(index - 1) * width, index * width, (index + 1) * width];

  // Illustration drifts and scales with the swipe for a light parallax effect.
  const artStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.value, range, [0.3, 1, 0.3], Extrapolation.CLAMP),
    transform: [
      { scale: interpolate(scrollX.value, range, [0.75, 1, 0.75], Extrapolation.CLAMP) },
      { translateX: interpolate(scrollX.value, range, [width * 0.25, 0, -width * 0.25], Extrapolation.CLAMP) },
    ],
  }));
  const textStyle = useAnimatedStyle(() => ({
    opacity: interpolate(scrollX.value, range, [0, 1, 0], Extrapolation.CLAMP),
    transform: [{ translateY: interpolate(scrollX.value, range, [24, 0, 24], Extrapolation.CLAMP) }],
  }));

  return (
    <View style={[styles.slide, { width, paddingHorizontal: spacing.xxl, gap: spacing.huge }]}>
      <Animated.View style={[styles.art, artStyle]}>
        <View style={[styles.artOuter, { backgroundColor: tone.bg }]}>
          <View style={[styles.artInner, { backgroundColor: colors.surface }]}>
            <Icon name={slide.icon} size={64} color={tone.fg} />
          </View>
        </View>
        <View style={[styles.bubble, styles.bubbleTop, shadows.md, { backgroundColor: colors.surface }]}>
          <Icon name={slide.accents[0]} size={22} color={colors.primary} />
        </View>
        <View style={[styles.bubble, styles.bubbleBottom, shadows.md, { backgroundColor: colors.surface }]}>
          <Icon name={slide.accents[1]} size={22} color={colors.highlight} />
        </View>
      </Animated.View>
      <Animated.View style={[{ gap: spacing.md }, textStyle]}>
        <Text variant="h1" align="center">
          {slide.title}
        </Text>
        <Text variant="body" tone="secondary" align="center">
          {slide.body}
        </Text>
      </Animated.View>
    </View>
  );
};

const Dot = ({ index, width, scrollX }: { index: number; width: number; scrollX: SharedValue<number> }) => {
  const { colors } = useTheme();
  const range = [(index - 1) * width, index * width, (index + 1) * width];
  const style = useAnimatedStyle(() => ({
    width: interpolate(scrollX.value, range, [8, 24, 8], Extrapolation.CLAMP),
    opacity: interpolate(scrollX.value, range, [0.35, 1, 0.35], Extrapolation.CLAMP),
  }));
  return <Animated.View style={[styles.dot, { backgroundColor: colors.primary }, style]} />;
};

/** Three intro slides shown once per install. Finishing removes this screen and reveals Login. */
export const OnboardingScreen = () => {
  const { colors, spacing } = useTheme();
  const { width } = useWindowDimensions();
  const setHasSeenOnboarding = useSettingsStore((state) => state.setHasSeenOnboarding);
  const listRef = useRef<FlatList<Slide>>(null);
  const scrollX = useSharedValue(0);
  const [index, setIndex] = useState(0);
  const isLast = index === SLIDES.length - 1;

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.value = event.contentOffset.x;
  });

  // FlatList needs a stable callback; it only uses the (stable) state setter.
  const onViewableItemsChanged = useCallback(({ viewableItems }: { viewableItems: ListViewToken[] }) => {
    const first = viewableItems[0];
    if (first?.index !== undefined && first.index !== null) setIndex(first.index);
  }, []);

  const finish = (): void => setHasSeenOnboarding(true);
  const next = (): void => {
    if (isLast) finish();
    else listRef.current?.scrollToIndex({ index: index + 1, animated: true });
  };

  const renderItem: ListRenderItem<Slide> = ({ item, index: itemIndex }) => (
    <SlideView slide={item} index={itemIndex} width={width} scrollX={scrollX} />
  );

  return (
    <SafeAreaView style={[styles.root, { backgroundColor: colors.background }]} edges={['top', 'bottom']}>
      <View style={[styles.topBar, { paddingHorizontal: spacing.lg }]}>
        {isLast ? <View style={styles.skipPlaceholder} /> : <Button title="Skip" variant="ghost" size="sm" onPress={finish} />}
      </View>

      <AnimatedFlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onScroll={onScroll}
        scrollEventThrottle={16}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={{ itemVisiblePercentThreshold: 60 }}
        getItemLayout={(_, itemIndex) => ({ length: width, offset: width * itemIndex, index: itemIndex })}
      />

      <View style={{ padding: spacing.xxl, gap: spacing.xxl }}>
        <View style={styles.dots} accessibilityLabel={`Slide ${index + 1} of ${SLIDES.length}`}>
          {SLIDES.map((slide, dotIndex) => (
            <Dot key={slide.key} index={dotIndex} width={width} scrollX={scrollX} />
          ))}
        </View>
        <Button title={isLast ? 'Get started' : 'Next'} rightIcon={isLast ? 'sparkles' : 'arrow-forward'} size="lg" onPress={next} fullWidth />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1 },
  topBar: { height: 48, alignItems: 'flex-end', justifyContent: 'center' },
  skipPlaceholder: { height: 36 },
  slide: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  art: { width: 240, height: 240, alignItems: 'center', justifyContent: 'center' },
  artOuter: { width: 220, height: 220, borderRadius: 110, alignItems: 'center', justifyContent: 'center' },
  artInner: { width: 140, height: 140, borderRadius: 70, alignItems: 'center', justifyContent: 'center' },
  bubble: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bubbleTop: { top: 8, right: 6 },
  bubbleBottom: { bottom: 14, left: 2 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  dot: { height: 8, borderRadius: 4 },
});
