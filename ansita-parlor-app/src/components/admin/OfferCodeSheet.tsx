import { useState } from 'react';
import { View } from 'react-native';

import { normalizeOfferCode } from '@/components/customer/PromoCodeCard';
import { BottomSheet, Button, Input, Text } from '@/components/ui';
import { useT } from '@/i18n';
import { useTheme } from '@/theme';
import { formatCurrency } from '@/utils/format';

interface OfferCodeSheetProps {
  visible: boolean;
  /** e.g. "Haircut · Today at 3:00 PM". */
  subtitle?: string;
  /** The offer on the bill now, which the code replaces. */
  current?: { title: string; discount: number } | null;
  loading?: boolean;
  /** Why the server refused the code. */
  error?: string | null;
  onSubmit: (code: string) => void;
  onClose: () => void;
}

/** Desk: type a promo code to put on an existing booking. The server checks it and explains refusals. */
export const OfferCodeSheet = ({ visible, subtitle, current, loading = false, error, onSubmit, onClose }: OfferCodeSheetProps) => {
  const { spacing } = useTheme();
  const t = useT();
  const [code, setCode] = useState('');
  // Start empty each time the sheet opens.
  const [wasVisible, setWasVisible] = useState(visible);
  if (visible !== wasVisible) {
    setWasVisible(visible);
    if (visible) setCode('');
  }

  const normalized = normalizeOfferCode(code);
  const submit = (): void => {
    if (normalized) onSubmit(normalized);
  };

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={t('admin.offer.sheetTitle')}
      subtitle={subtitle}
      footer={
        <Button title={t('admin.offer.submit')} leftIcon="pricetag-outline" loading={loading} disabled={!normalized} onPress={submit} fullWidth />
      }
    >
      <View style={{ gap: spacing.lg }}>
        <Text variant="bodySmall" tone="secondary">
          {current && current.discount > 0
            ? t('admin.offer.replaces', { title: current.title, amount: formatCurrency(current.discount) })
            : t('admin.offer.sheetHint')}
        </Text>
        <Input
          label={t('promo.label')}
          placeholder={t('promo.placeholder')}
          value={code}
          onChangeText={setCode}
          leftIcon="pricetag-outline"
          autoCapitalize="characters"
          autoCorrect={false}
          maxLength={40}
          returnKeyType="done"
          onSubmitEditing={submit}
        />
        {error ? (
          <Text variant="bodySmall" tone="danger" accessibilityLiveRegion="polite">
            {error}
          </Text>
        ) : null}
      </View>
    </BottomSheet>
  );
};
