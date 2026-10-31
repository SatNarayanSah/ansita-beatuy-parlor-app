import { memo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, StatusPill, Text } from '@/components/ui';
import { firstName, serviceNames } from '@/hooks/useCatalog';
import { useTheme } from '@/theme';
import type { Appointment, Customer, ID, Service, Staff } from '@/types';
import { formatTime12 } from '@/utils/date';
import { formatCurrency } from '@/utils/format';
import { sameDataProps } from '@/utils/memo';

interface AdminAppointmentRowProps {
  appointment: Appointment;
  customer: Customer | undefined;
  services: ReadonlyMap<ID, Service>;
  staff: ReadonlyMap<ID, Staff>;
  onPress: () => void;
  /** Inline "Confirm" for pending approvals. */
  onConfirm?: () => void;
  confirming?: boolean;
  showDate?: string;
}

/** Compact booking row: time, customer, services, stylist, status. */
const AdminAppointmentRowBase = ({ appointment, customer, services, staff, onPress, onConfirm, confirming, showDate }: AdminAppointmentRowProps) => {
  const { colors, radius, spacing } = useTheme();
  const status = colors.status[appointment.status];

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${formatTime12(appointment.startTime)}, ${customer?.name ?? 'Customer'}, ${serviceNames(appointment.serviceIds, services)}, ${appointment.status}`}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, gap: spacing.md, borderLeftColor: status.fg },
        pressed && styles.pressed,
      ]}
    >
      <View style={styles.time}>
        {showDate ? (
          <Text variant="caption" tone="muted">
            {showDate}
          </Text>
        ) : null}
        <Text variant="label">{formatTime12(appointment.startTime)}</Text>
        <Text variant="caption" tone="muted">
          {formatTime12(appointment.endTime)}
        </Text>
      </View>
      <View style={styles.body}>
        <Text variant="bodyMedium" numberOfLines={1}>
          {customer?.name ?? 'Customer'}
        </Text>
        <Text variant="caption" tone="secondary" numberOfLines={1}>
          {serviceNames(appointment.serviceIds, services)}
        </Text>
        <Text variant="caption" tone="muted">
          {firstName(staff.get(appointment.staffId)?.name)} · {formatCurrency(appointment.totalPrice)}
        </Text>
      </View>
      {onConfirm ? (
        <Button title="Confirm" size="sm" loading={confirming} onPress={onConfirm} />
      ) : (
        <StatusPill kind="appointment" status={appointment.status} size="sm" />
      )}
    </Pressable>
  );
};

export const AdminAppointmentRow = memo(AdminAppointmentRowBase, sameDataProps);

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderLeftWidth: 4 },
  pressed: { opacity: 0.85 },
  time: { width: 64 },
  body: { flex: 1, gap: 1 },
});
