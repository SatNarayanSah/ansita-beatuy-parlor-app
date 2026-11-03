import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useEffect, useRef, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View, type ListRenderItem } from 'react-native';

import { BottomSheet, Button, Icon, Text } from '@/components/ui';
import { useCategoryMap } from '@/hooks/useCatalog';
import { useT, type Translate } from '@/i18n';
import { palette, useTheme } from '@/theme';
import type { Appointment, ID, ISODate, Offer } from '@/types';
import { formatDisplayDate, formatShortDate, parseISODate, todayISO } from '@/utils/date';
import { formatCurrency } from '@/utils/format';

import { isWebImage } from './ServiceCards';

const AUTO_ADVANCE_MS = 5000;
const CARD_GAP = 12;
/** How much of the next banner peeks in, hinting that the row scrolls. */
const PEEK = 28;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Fixed brand gradients (not theme tokens) so white text stays readable in light and dark mode.
 * Each pairs a rose/plum fill with the gold used for the discount badge.
 */
const GRADIENTS: readonly (readonly [string, string])[] = [
  [palette.rose500, palette.plum700],
  [palette.plum700, palette.rose700],
  [palette.rose700, palette.plum900],
];

// ---------- Labels ----------

/** "20% OFF" / "Rs. 500 OFF". */
export const offerDiscountLabel = (t: Translate, offer: Offer): string =>
  offer.discountType === 'percent'
    ? t('offers.percentOff', { value: offer.discountValue })
    : t('offers.flatOff', { amount: formatCurrency(offer.discountValue) });

/** "Up to Rs. 500" for capped percentage offers. */
export const offerCapLabel = (t: Translate, offer: Offer): string | null =>
  offer.discountType === 'percent' && offer.maxDiscount ? t('offers.upTo', { amount: formatCurrency(offer.maxDiscount) }) : null;

/** "Ends today" / "Ends in 3 days" within a week, otherwise "Valid till 5 Dec". */
export const offerValidityLabel = (t: Translate, offer: Offer, today: ISODate = todayISO()): string => {
  const days = Math.round((parseISODate(offer.validTo).getTime() - parseISODate(today).getTime()) / DAY_MS);
  if (days <= 0) return t('offers.endsToday');
  if (days === 1) return t('offers.endsTomorrow');
  if (days <= 7) return t('offers.endsInDays', { count: days });
  return t('offers.validTill', { date: formatShortDate(offer.validTo) });
};

/** Bill line for the offer on a booking: "Offer · Hair week" or "Offer · Pedi 20 (PEDI20)". */
export const appointmentOfferLabel = (t: Translate, appointment: Pick<Appointment, 'offerTitle' | 'offerCode'>): string =>
  appointment.offerCode
    ? t('bill.offerWithCode', { title: appointment.offerTitle ?? appointment.offerCode, code: appointment.offerCode })
    : t('bill.offer', { title: appointment.offerTitle ?? '' });

/** Live offers that apply to a category (offers with no categories apply to everything). */
export const offersForCategory = (offers: readonly Offer[], categoryId: ID, today: ISODate = todayISO()): Offer[] =>
  offers.filter(
    (offer) =>
      offer.isActive &&
      offer.validFrom <= today &&
      offer.validTo >= today &&
      (offer.categoryIds.length === 0 || offer.categoryIds.includes(categoryId)),
  );

// ---------- Card ----------

interface OfferCardProps {
  offer: Offer;
  /** Picks the brand gradient. */
  index?: number;
  width?: number;
  /** Minimum height of the gradient-only card (offers without an image). */
  height?: number;
  /** Fill the parent's height (carousel cells), so cards of mixed heights line up. */
  stretch?: boolean;
  onPress?: () => void;
}

/** Poster images are designed at 16:9. */
const POSTER_RATIO = 16 / 9;

const ValidityPill = ({ label }: { label: string }) => {
  const { radius } = useTheme();
  return (
    <View style={[styles.pill, { borderRadius: radius.pill }]}>
      <Icon name="time-outline" size={12} color={palette.white} />
      <Text variant="caption" color={palette.white} numberOfLines={1}>
        {label}
      </Text>
    </View>
  );
};

interface OfferDetailsProps {
  offer: Offer;
  validity: string;
  /** Gradient-only cards show "Ends in..." here; poster cards show it on the image and the date here. */
  onPoster: boolean;
}

/** Discount badge, title, description, code, minimum spend and validity in white, for a brand-gradient panel. */
const OfferDetails = ({ offer, validity, onPoster }: OfferDetailsProps) => {
  const { radius, spacing } = useTheme();
  const t = useT();
  const cap = offerCapLabel(t, offer);
  return (
    <View style={[styles.content, { padding: spacing.lg, gap: spacing.sm }]}>
      <View style={styles.topRow}>
        <View style={styles.discountWrap}>
          <View style={[styles.discount, { borderRadius: radius.md }]}>
            <Text variant="h3" color={palette.plum900} numberOfLines={1}>
              {offerDiscountLabel(t, offer)}
            </Text>
          </View>
          {cap ? (
            <Text variant="caption" color={palette.white} style={styles.dim} numberOfLines={1}>
              {cap}
            </Text>
          ) : null}
        </View>
        {onPoster ? null : <ValidityPill label={validity} />}
      </View>

      {onPoster ? null : <View style={styles.flex} />}

      <View style={styles.texts}>
        <Text variant="h2" color={palette.white} numberOfLines={2}>
          {offer.title}
        </Text>
        {offer.description ? (
          <Text variant="caption" color={palette.white} numberOfLines={2} style={styles.dim}>
            {offer.description}
          </Text>
        ) : null}
      </View>

      <View style={styles.bottomRow}>
        {offer.code ? (
          <View style={[styles.code, { borderRadius: radius.sm }]}>
            <Icon name="pricetag" size={12} color={palette.white} />
            <Text variant="caption" color={palette.white} style={styles.dim}>
              {t('offers.code')}
            </Text>
            <Text variant="label" color={palette.white} style={styles.codeText} numberOfLines={1}>
              {offer.code}
            </Text>
          </View>
        ) : (
          <View style={styles.inline}>
            <Icon name="flash" size={12} color={palette.gold300} />
            <Text variant="caption" color={palette.white} numberOfLines={1}>
              {t('offers.auto')}
            </Text>
          </View>
        )}
        {offer.minSpend > 0 ? (
          <Text variant="caption" color={palette.white} style={styles.dim} numberOfLines={1}>
            {t('offers.minSpend', { amount: formatCurrency(offer.minSpend) })}
          </Text>
        ) : null}
      </View>

      {onPoster ? (
        <View style={styles.inline}>
          <Icon name="calendar-outline" size={12} color={palette.white} />
          <Text variant="caption" color={palette.white} style={styles.dim} numberOfLines={1}>
            {t('offers.validTill', { date: formatShortDate(offer.validTo) })}
          </Text>
        </View>
      ) : null}
    </View>
  );
};

/**
 * Promo card. With an image it's a poster: the artwork shown whole at 16:9 (never cropped or
 * covered, since posters carry their own text and logo) above a brand panel with the details.
 * Without an image it's a gradient banner.
 */
const OfferCardBase = ({ offer, index = 0, width, height = 196, stretch = false, onPress }: OfferCardProps) => {
  const { radius, spacing } = useTheme();
  const t = useT();
  const cap = offerCapLabel(t, offer);
  const validity = offerValidityLabel(t, offer);
  const image = isWebImage(offer.image) ? offer.image : null;
  const gradient = GRADIENTS[index % GRADIENTS.length] ?? GRADIENTS[0]!;

  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={[offer.title, offerDiscountLabel(t, offer), cap, offer.code ? `${t('offers.code')} ${offer.code}` : null, validity]
        .filter(Boolean)
        .join('. ')}
      style={({ pressed }) => [
        styles.card,
        { width, borderRadius: radius.xl },
        image ? null : { minHeight: height },
        stretch && styles.flex,
        pressed && styles.pressed,
      ]}
    >
      {image ? (
        <>
          <View style={[styles.poster, { aspectRatio: POSTER_RATIO }]}>
            {/* A blurred, dimmed copy fills the frame behind posters that aren't exactly 16:9. */}
            <Image source={{ uri: image }} style={StyleSheet.absoluteFill} contentFit="cover" blurRadius={24} cachePolicy="disk" recyclingKey={`${offer.id}-bg`} accessible={false} />
            <View style={[StyleSheet.absoluteFill, styles.posterDim]} />
            <Image source={{ uri: image }} style={StyleSheet.absoluteFill} contentFit="contain" transition={200} cachePolicy="disk" recyclingKey={offer.id} accessibilityIgnoresInvertColors />
            <View style={[styles.cornerChip, { top: spacing.sm, right: spacing.sm }]}>
              <ValidityPill label={validity} />
            </View>
          </View>
          <View style={styles.panel}>
            <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
            <OfferDetails offer={offer} validity={validity} onPoster />
          </View>
        </>
      ) : (
        <>
          <LinearGradient colors={gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
          {/* Soft decorative rings and a large faded gift, so the fallback still feels designed. */}
          <View style={[styles.ring, styles.ringLarge]} />
          <View style={[styles.ring, styles.ringSmall]} />
          <View style={styles.giftMark} pointerEvents="none">
            <Icon name="gift" size={92} color="rgba(255, 255, 255, 0.14)" />
          </View>
          <OfferDetails offer={offer} validity={validity} onPoster={false} />
        </>
      )}
    </Pressable>
  );
};

export const OfferCard = memo(OfferCardBase);

// ---------- Carousel ----------

interface OfferCarouselProps {
  offers: readonly Offer[];
  onPressOffer?: (offer: Offer) => void;
}

/** Snap-scrolling promo banners with the next one peeking in. Auto-advances until the user swipes. */
export const OfferCarousel = ({ offers, onPressOffer }: OfferCarouselProps) => {
  const { colors, spacing, screenPadding } = useTheme();
  const listRef = useRef<FlatList<Offer>>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [index, setIndex] = useState(0);
  const [touched, setTouched] = useState(false);
  const itemWidth = offers.length > 1 ? containerWidth - PEEK : containerWidth;
  const interval = itemWidth + CARD_GAP;

  useEffect(() => {
    // Once the customer has swiped, they're in control.
    if (offers.length < 2 || touched || itemWidth <= 0) return undefined;
    const timer = setInterval(() => {
      setIndex((current) => {
        const next = (current + 1) % offers.length;
        listRef.current?.scrollToOffset({ offset: next * interval, animated: true });
        return next;
      });
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(timer);
  }, [offers.length, touched, itemWidth, interval]);

  if (offers.length === 0) return null;

  const renderItem: ListRenderItem<Offer> = ({ item, index: itemIndex }) => (
    <OfferCard offer={item} index={itemIndex} width={itemWidth} stretch onPress={onPressOffer ? () => onPressOffer(item) : undefined} />
  );

  return (
    <View style={{ gap: spacing.sm }} onLayout={(event) => setContainerWidth(Math.round(event.nativeEvent.layout.width))}>
      {itemWidth > 0 ? (
        <FlatList
          ref={listRef}
          data={offers as Offer[]}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          horizontal
          showsHorizontalScrollIndicator={false}
          // Bleed to the screen edges so the peeking card isn't clipped by the page padding.
          style={{ marginHorizontal: -screenPadding }}
          contentContainerStyle={{ paddingHorizontal: screenPadding }}
          ItemSeparatorComponent={Separator}
          snapToInterval={interval}
          snapToAlignment="start"
          decelerationRate="fast"
          disableIntervalMomentum
          getItemLayout={(_, i) => ({ length: interval, offset: interval * i, index: i })}
          initialNumToRender={3}
          windowSize={5}
          onScrollBeginDrag={() => setTouched(true)}
          onMomentumScrollEnd={(event) => {
            const next = Math.round(event.nativeEvent.contentOffset.x / interval);
            setIndex(Math.max(0, Math.min(offers.length - 1, next)));
          }}
        />
      ) : (
        <View style={styles.placeholder} />
      )}
      {offers.length > 1 ? (
        <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
          {offers.map((offer, dotIndex) => (
            <View
              key={offer.id}
              style={[styles.dot, { backgroundColor: dotIndex === index ? colors.primary : colors.borderStrong, width: dotIndex === index ? 18 : 6 }]}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
};

const Separator = () => <View style={{ width: CARD_GAP }} />;

// ---------- Detail sheet ----------

interface OfferDetailSheetProps {
  offer: Offer | null;
  onClose: () => void;
  /** Main action: start a booking (with the offer's code filled in, when it has one). */
  onBook?: (offer: Offer) => void;
}

/** Tapped offer: the banner, which services it covers, the dates and its terms. */
export const OfferDetailSheet = ({ offer, onClose, onBook }: OfferDetailSheetProps) => {
  const { colors, spacing } = useTheme();
  const t = useT();
  const categories = useCategoryMap();
  // Keeps the content while the sheet animates closed.
  const [shown, setShown] = useState(offer);
  if (offer && offer !== shown) setShown(offer);

  const scope = shown
    ? shown.categoryIds.length === 0
      ? t('offers.allServices')
      : shown.categoryIds.map((id) => categories.get(id)?.name).filter(Boolean).join(' · ')
    : '';

  return (
    <BottomSheet
      visible={offer !== null}
      onClose={onClose}
      title={shown?.title}
      footer={
        shown && onBook ? (
          <Button
            title={shown.code ? t('offers.useCode', { code: shown.code }) : t('offers.bookNow')}
            leftIcon={shown.code ? 'pricetag-outline' : undefined}
            rightIcon="arrow-forward"
            onPress={() => onBook(shown)}
            style={styles.flex}
            fullWidth
          />
        ) : undefined
      }
    >
      {shown ? (
        <View style={{ gap: spacing.lg }}>
          <OfferCard offer={shown} height={176} />
          <View style={{ gap: spacing.sm }}>
            <InfoRow icon="sparkles-outline" text={scope} />
            <InfoRow icon="calendar-outline" text={`${formatDisplayDate(shown.validFrom)} - ${formatDisplayDate(shown.validTo)}`} />
            <InfoRow icon={shown.code ? 'pricetag-outline' : 'flash-outline'} text={shown.code ? t('offers.quoteCode') : t('offers.autoHint')} />
          </View>
          {shown.terms.length > 0 ? (
            <View style={{ gap: spacing.xs }}>
              <Text variant="label">{t('offers.terms')}</Text>
              {shown.terms.map((term) => (
                <View key={term} style={styles.term}>
                  <View style={[styles.bullet, { backgroundColor: colors.textMuted }]} />
                  <Text variant="caption" tone="secondary" style={styles.flex}>
                    {term}
                  </Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>
      ) : null}
    </BottomSheet>
  );
};

const InfoRow = ({ icon, text }: { icon: 'sparkles-outline' | 'calendar-outline' | 'pricetag-outline' | 'flash-outline'; text: string }) => {
  const { colors } = useTheme();
  return (
    <View style={styles.infoRow}>
      <Icon name={icon} size={16} color={colors.primary} />
      <Text variant="bodySmall" tone="secondary" style={styles.flex}>
        {text}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  card: { overflow: 'hidden' },
  pressed: { opacity: 0.92 },
  content: { flex: 1 },
  flex: { flex: 1 },
  topRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 },
  discountWrap: { gap: 2, flexShrink: 1 },
  discount: { alignSelf: 'flex-start', backgroundColor: palette.gold300, paddingHorizontal: 10, paddingVertical: 2 },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: 'rgba(0, 0, 0, 0.32)' },
  texts: { gap: 2 },
  dim: { opacity: 0.9 },
  bottomRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  code: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.8)',
    backgroundColor: 'rgba(255, 255, 255, 0.14)',
    flexShrink: 1,
  },
  codeText: { letterSpacing: 1 },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ring: { position: 'absolute', borderRadius: 999, borderWidth: 18, borderColor: 'rgba(255, 255, 255, 0.07)' },
  ringLarge: { width: 220, height: 220, right: -70, top: -90 },
  ringSmall: { width: 120, height: 120, left: -50, bottom: -60 },
  giftMark: { position: 'absolute', right: 14, bottom: 34, transform: [{ rotate: '-12deg' }] },
  placeholder: { height: 196 },
  poster: { width: '100%', overflow: 'hidden', backgroundColor: palette.plum900 },
  posterDim: { backgroundColor: 'rgba(0, 0, 0, 0.35)' },
  cornerChip: { position: 'absolute' },
  panel: { flexGrow: 1, overflow: 'hidden' },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 5 },
  dot: { height: 6, borderRadius: 3 },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  term: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  bullet: { width: 4, height: 4, borderRadius: 2, marginTop: 7 },
});
