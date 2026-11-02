import { Pressable, StyleSheet, View } from 'react-native';

import { Badge, Icon, Text, type IconName } from '@/components/ui';
import { useTheme } from '@/theme';
import type { PaymentMethod } from '@/types';

export const PAYMENT_METHOD_META: Record<PaymentMethod, { label: string; icon: IconName }> = {
  cash: { label: 'Cash', icon: 'cash-outline' },
  esewa: { label: 'eSewa', icon: 'wallet-outline' },
  khalti: { label: 'Khalti', icon: 'phone-portrait-outline' },
  fonepay: { label: 'Fonepay', icon: 'qr-code-outline' },
  card: { label: 'Card', icon: 'card-outline' },
  bank: { label: 'Bank transfer', icon: 'business-outline' },
};

/** Methods offered to customers. Labels only: no payment is taken in the app. */
export const CUSTOMER_PAYMENT_METHODS: readonly PaymentMethod[] = ['cash', 'esewa', 'khalti'];

interface PaymentMethodPickerProps {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}

export const PaymentMethodPicker = ({ value, onChange }: PaymentMethodPickerProps) => {
  const { colors, radius, spacing } = useTheme();

  return (
    <View style={{ gap: spacing.sm }}>
      <View style={styles.row}>
        {CUSTOMER_PAYMENT_METHODS.map((method) => {
          const selected = method === value;
          const meta = PAYMENT_METHOD_META[method];
          return (
            <Pressable
              key={method}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`Pay with ${meta.label}`}
              onPress={() => onChange(method)}
              style={[
                styles.option,
                {
                  borderRadius: radius.md,
                  borderColor: selected ? colors.primary : colors.border,
                  backgroundColor: selected ? colors.primarySoft : colors.surface,
                  padding: spacing.md,
                },
              ]}
            >
              <Icon name={meta.icon} size={22} color={selected ? colors.primaryDark : colors.textSecondary} />
              <Text variant="label" color={selected ? colors.primaryDark : colors.text}>
                {meta.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.note}>
        <Badge label="Info" tone="highlight" size="sm" />
        <Text variant="caption" tone="muted" style={styles.flex}>
          Pay at the parlour after your visit. No money is charged in the app.
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 10 },
  option: { flex: 1, alignItems: 'center', gap: 6, borderWidth: 1.5 },
  note: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
});
