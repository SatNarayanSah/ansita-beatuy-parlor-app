import { useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, useWindowDimensions, View, type ListRenderItem } from 'react-native';

import { Icon, Text } from '@/components/ui';
import { useTheme, type ThemeColors } from '@/theme';
import type { Offer } from '@/types';
import { formatShortDate } from '@/utils/date';
import { formatCurrency } from '@/utils/format';

const AUTO_ADVANCE_MS = 4500;

const discountLabel = (offer: Offer): string =>
  offer.discountType === 'percent' ? `${offer.discountValue}% OFF` : `${formatCurrency(offer.discountValue)} OFF`;

/** Banner colours cycle through the brand palette. */
const bannerColors = (colors: ThemeColors, index: number): { bg: string; fg: string; accent: string } => {
  const palette = [
    { bg: colors.primary, fg: colors.onPrimary, accent: colors.highlightSoft },
    { bg: colors.accent, fg: colors.onAccent, accent: colors.highlight },
    { bg: colors.primaryDark, fg: colors.onPrimary, accent: colors.highlightSoft },
  ];
  return palette[index % palette.length] ?? palette[0]!;
};

interface OfferCarouselProps {
  offers: readonly Offer[];
  onPressOffer?: (offer: Offer) => void;
}

/** Auto-advancing promo banners. Pauses while the user is swiping. */
export const OfferCarousel = ({ offers, onPressOffer }: OfferCarouselProps) => {
  const { colors, radius, spacing, screenPadding } = useTheme();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<Offer>>(null);
  const [index, setIndex] = useState(0);
  const [dragging, setDragging] = useState(false);
  const itemWidth = width - screenPadding * 2;

  useEffect(() => {
    if (offers.length < 2 || dragging) return undefined;
    const timer = setInterval(() => {
      setIndex((current) => {
        const next = (current + 1) % offers.length;
        listRef.current?.scrollToOffset({ offset: next * itemWidth, animated: true });
        return next;
      });
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [offers.length, dragging, itemWidth]);

  const renderItem: ListRenderItem<Offer> = ({ item, index: itemIndex }) => {
    const palette = bannerColors(colors, itemIndex);
    return (
      <Pressable
        onPress={() => onPressOffer?.(item)}
        accessibilityRole="button"
        accessibilityLabel={`${item.title}. ${discountLabel(item)}`}
        style={[styles.banner, { width: itemWidth, backgroundColor: palette.bg, borderRadius: radius.xl, padding: spacing.xl }]}
      >
        <View style={styles.bannerText}>
          <Text variant="overline" color={palette.accent}>
            {discountLabel(item)}
          </Text>
          <Text variant="h2" color={palette.fg} numberOfLines={1}>
            {item.title}
          </Text>
          <Text variant="caption" color={palette.fg} numberOfLines={2} style={styles.dim}>
            {item.description}
          </Text>
          <Text variant="caption" color={palette.fg} style={styles.dim}>
            {item.code ? `Code ${item.code} · ` : ''}Till {formatShortDate(item.validTo)}
          </Text>
        </View>
        <View style={[styles.bubble, { backgroundColor: palette.fg }]}>
          <Icon name="gift" size={26} color={palette.bg} />
        </View>
      </Pressable>
    );
  };

  if (offers.length === 0) return null;

  return (
    <View style={{ gap: spacing.sm }}>
      <FlatList
        ref={listRef}
        data={offers}
        keyExtractor={(item) => item.id}
        renderItem={renderItem}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        getItemLayout={(_, i) => ({ length: itemWidth, offset: itemWidth * i, index: i })}
        onScrollBeginDrag={() => setDragging(true)}
        onMomentumScrollEnd={(event) => {
          setDragging(false);
          setIndex(Math.round(event.nativeEvent.contentOffset.x / itemWidth));
        }}
      />
      <View style={styles.dots}>
        {offers.map((offer, dotIndex) => (
          <View
            key={offer.id}
            style={[styles.dot, { backgroundColor: dotIndex === index ? colors.primary : colors.borderStrong, width: dotIndex === index ? 18 : 6 }]}
          />
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: { flexDirection: 'row', alignItems: 'center', minHeight: 140, gap: 12 },
  bannerText: { flex: 1, gap: 4 },
  dim: { opacity: 0.9 },
  bubble: { width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot: { height: 6, borderRadius: 3 },
});
