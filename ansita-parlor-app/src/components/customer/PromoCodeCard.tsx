import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Icon, Input, Text } from '@/components/ui';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import { useT } from '@/i18n';
import { offerService } from '@/services';
import { useTheme } from '@/theme';
import type { ID, ISODate, OfferQuote } from '@/types';
import { formatCurrency } from '@/utils/format';

/** Same normalisation as the server: no spaces, upper case. */
export const normalizeOfferCode = (code: string | null | undefined): string => (code ?? '').replace(/\s+/g, '').toUpperCase();

interface PromoQuoteOptions {
  serviceIds: readonly ID[];
  date: ISODate | null;
  /** Quote only while this is true (e.g. on the review step), so browsing earlier steps makes no calls. */
  enabled: boolean;
  /** Code to start with, e.g. from an offer's "Book with code". */
  initialCode?: string;
}

export interface PromoQuoteState {
  /** What's typed in the field. */
  input: string;
  setInput: (value: string) => void;
  /** The code being checked / applied (normalised); null when none was entered. */
  code: string | null;
  apply: () => void;
  clear: () => void;
  /** Puts a code in the field and applies it (navigation prefill). */
  adopt: (code: string) => void;
  /** True while the code is being checked against the current services and date. */
  checking: boolean;
  /** Why the entered code can't be used (server message). */
  error: string | null;
  /** The discount that will apply: the entered code when valid, otherwise the best automatic offer. */
  quote: OfferQuote | null;
  /** The code to send with the booking: only once the server accepted it for these services/date. */
  codeToSend: string | undefined;
  /** Any quote still loading; wait before booking so the shown total is the real one. */
  pending: boolean;
}

/**
 * Previews the offer for a booking with `POST /offers/quote`: the entered code, plus the best
 * automatic offer (shown when there's no valid code). Re-quotes when services or date change.
 */
export const usePromoQuote = ({ serviceIds, date, enabled, initialCode }: PromoQuoteOptions): PromoQuoteState => {
  const [input, setInput] = useState(initialCode ?? '');
  const [code, setCode] = useState<string | null>(normalizeOfferCode(initialCode) || null);
  const ready = enabled && date !== null && serviceIds.length > 0;
  const key = [ready ? date : null, serviceIds.join(',')];

  const codeQuote = useServiceQuery(
    async () => (ready && date && code ? offerService.quoteOffer({ code, serviceIds: [...serviceIds], date }) : null),
    [...key, code],
  );
  const autoQuote = useServiceQuery(
    // An automatic offer is a bonus: if the preview fails, the booking just shows no discount.
    async () => (ready && date ? offerService.quoteOffer({ serviceIds: [...serviceIds], date }).catch(() => null) : null),
    key,
  );

  const codeOk = code !== null && !codeQuote.loading && !codeQuote.error && Boolean(codeQuote.data?.offer);
  return {
    input,
    setInput,
    code,
    apply: () => setCode(normalizeOfferCode(input) || null),
    clear: () => {
      setInput('');
      setCode(null);
    },
    adopt: (next) => {
      setInput(next);
      setCode(normalizeOfferCode(next) || null);
    },
    checking: ready && code !== null && codeQuote.loading,
    error: ready && code !== null ? codeQuote.error : null,
    quote: codeOk ? (codeQuote.data ?? null) : (autoQuote.data ?? null),
    codeToSend: codeOk && code ? code : undefined,
    pending: ready && (autoQuote.loading || (code !== null && codeQuote.loading)),
  };
};

interface PromoCodeCardProps {
  state: PromoQuoteState;
}

/** "Promo code" field with Apply; shows the applied offer and saving, or the automatic offer. */
export const PromoCodeCard = ({ state }: PromoCodeCardProps) => {
  const { colors, spacing } = useTheme();
  const t = useT();
  const { quote } = state;
  const applied = state.codeToSend && quote?.offer ? quote : null;
  const automatic = !applied && quote?.offer && quote.automatic && quote.discount > 0 ? quote : null;
  const typed = normalizeOfferCode(state.input);

  return (
    <Card style={{ gap: spacing.sm }}>
      <Text variant="label" tone="secondary">
        {t('promo.label')}
      </Text>
      {applied?.offer ? (
        <View style={styles.row}>
          <Icon name="pricetag" size={18} color={colors.success} />
          <View style={styles.flex}>
            <Text variant="bodyMedium">{t('promo.applied', { title: applied.offer.title })}</Text>
            <Text variant="caption" tone="success">
              {state.codeToSend} · {t('promo.saving', { amount: formatCurrency(applied.discount) })}
            </Text>
          </View>
          <Button
            title={t('promo.remove')}
            size="sm"
            variant="ghost"
            accessibilityLabel={t('promo.removeA11y', { code: state.codeToSend ?? '' })}
            onPress={state.clear}
          />
        </View>
      ) : (
        <View style={styles.inputRow}>
          <Input
            placeholder={t('promo.placeholder')}
            value={state.input}
            onChangeText={state.setInput}
            leftIcon="pricetag-outline"
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={40}
            returnKeyType="done"
            onSubmitEditing={state.apply}
            error={state.error}
            helperText={state.checking ? t('promo.checking') : undefined}
            containerStyle={styles.flex}
          />
          <Button
            title={t('promo.apply')}
            variant="secondary"
            loading={state.checking}
            disabled={typed === '' || (typed === state.code && !state.error)}
            onPress={state.apply}
            style={styles.applyButton}
          />
        </View>
      )}
      {automatic?.offer ? (
        <View style={styles.row}>
          <Icon name="flash" size={16} color={colors.highlight} />
          <Text variant="caption" tone="secondary" style={styles.flex}>
            {t('promo.auto', { title: automatic.offer.title })} · −{formatCurrency(automatic.discount)}
          </Text>
        </View>
      ) : null}
    </Card>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  flex: { flex: 1 },
  // Lines the button up with the input box (not its helper/error text).
  applyButton: { minHeight: 50 },
});
