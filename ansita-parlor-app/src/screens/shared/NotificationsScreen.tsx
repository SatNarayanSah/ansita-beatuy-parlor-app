import { memo, useLayoutEffect, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Icon, ListScreen, SectionHeader, SkeletonListItem, Text, useToast, type IconName } from '@/components/ui';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import { useT } from '@/i18n';
import type { RootStackScreenProps } from '@/navigation/types';
import { getErrorMessage, notificationService } from '@/services';
import { selectCurrentUser, useAuthStore, useNotificationStore } from '@/store';
import { getToneColors, useTheme, type Tone } from '@/theme';
import type { Notification, NotificationType } from '@/types';
import { formatTimeAgo } from '@/utils/date';
import { sameDataProps } from '@/utils/memo';

type Props = RootStackScreenProps<'Notifications'>;

const TYPE_META: Record<NotificationType, { icon: IconName; tone: Tone }> = {
  appointment_booked: { icon: 'calendar-outline', tone: 'primary' },
  appointment_confirmed: { icon: 'checkmark-circle-outline', tone: 'success' },
  appointment_cancelled: { icon: 'close-circle-outline', tone: 'danger' },
  appointment_reminder: { icon: 'alarm-outline', tone: 'warning' },
  enrollment: { icon: 'school-outline', tone: 'accent' },
  payment: { icon: 'wallet-outline', tone: 'success' },
  promotion: { icon: 'gift-outline', tone: 'highlight' },
  system: { icon: 'sparkles-outline', tone: 'info' },
};

type Row = { kind: 'header'; key: string; title: string } | { kind: 'item'; key: string; notification: Notification };

const NotificationRowBase = ({ notification, onPress }: { notification: Notification; onPress: () => void }) => {
  const { colors, radius, spacing } = useTheme();
  const meta = TYPE_META[notification.type];
  const tone = getToneColors(colors, meta.tone);
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${notification.isRead ? '' : 'Unread. '}${notification.title}. ${notification.message}`}
      style={({ pressed }) => [
        styles.row,
        {
          borderRadius: radius.lg,
          padding: spacing.md,
          gap: spacing.md,
          backgroundColor: notification.isRead ? colors.surface : colors.primarySoft,
        },
        pressed && styles.pressed,
      ]}
    >
      <View style={[styles.icon, { backgroundColor: tone.bg }]}>
        <Icon name={meta.icon} size={20} color={tone.fg} />
      </View>
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text variant={notification.isRead ? 'bodyMedium' : 'h4'} style={styles.flex} numberOfLines={1}>
            {notification.title}
          </Text>
          {notification.isRead ? null : <View style={[styles.unreadDot, { backgroundColor: colors.primary }]} />}
        </View>
        <Text variant="bodySmall" tone="secondary" numberOfLines={3}>
          {notification.message}
        </Text>
        <Text variant="caption" tone="muted">
          {formatTimeAgo(notification.createdAt)}
        </Text>
      </View>
    </Pressable>
  );
};

const NotificationRow = memo(NotificationRowBase, sameDataProps);

/** Booking updates, reminders and offers. Tapping one marks it read and opens the related screen. */
export const NotificationsScreen = ({ navigation }: Props) => {
  const { spacing } = useTheme();
  const t = useT();
  const toast = useToast();
  const user = useAuthStore(selectCurrentUser);
  const query = useServiceQuery(() => notificationService.listMine(), [user?.id], { refetchOn: [useNotificationStore] });
  const unread = query.data?.filter((n) => !n.isRead).length ?? 0;

  useLayoutEffect(() => {
    navigation.setOptions({
      title: t('notifications.title'),
      headerRight: () =>
        unread > 0 ? (
          <Button
            title={t('notifications.markAllRead')}
            variant="ghost"
            size="sm"
            onPress={() => {
              notificationService.markAllAsRead().catch((error: unknown) => toast.error(getErrorMessage(error)));
            }}
          />
        ) : null,
    });
  }, [navigation, unread, t, toast]);

  // "New" / "Earlier" headings are rows in the flat, virtualised list.
  const rows = useMemo<Row[]>(() => {
    const list = query.data ?? [];
    const fresh = list.filter((n) => !n.isRead);
    const earlier = list.filter((n) => n.isRead);
    return [
      ...(fresh.length ? [{ kind: 'header' as const, key: 'h-new', title: 'New' }] : []),
      ...fresh.map((notification) => ({ kind: 'item' as const, key: notification.id, notification })),
      ...(earlier.length ? [{ kind: 'header' as const, key: 'h-earlier', title: 'Earlier' }] : []),
      ...earlier.map((notification) => ({ kind: 'item' as const, key: notification.id, notification })),
    ];
  }, [query.data]);

  const open = (notification: Notification): void => {
    if (!notification.isRead) void notificationService.markAsRead(notification.id).catch(() => undefined);
    const link = notification.link;
    if (!link) return;
    if (user?.role === 'admin') {
      switch (link.kind) {
        case 'appointment':
          navigation.navigate('AppointmentDetail', { appointmentId: link.id });
          return;
        case 'enrollment':
          navigation.navigate('EnrollmentDetail', { enrollmentId: link.id });
          return;
        case 'customer':
          navigation.navigate('CustomerDetail', { customerId: link.id });
          return;
        case 'course':
          navigation.navigate('CourseManage', { courseId: link.id });
          return;
        case 'offer':
          return;
      }
    }
    switch (link.kind) {
      case 'appointment':
        navigation.navigate('CustomerTabs', { screen: 'MyAppointments' });
        return;
      case 'offer':
        navigation.navigate('CustomerTabs', { screen: 'Home' });
        return;
      // Courses are managed by the parlour; customers have no course screens.
      case 'enrollment':
      case 'course':
      case 'customer':
        return;
    }
  };

  const renderItem = (row: Row) =>
    row.kind === 'header' ? <SectionHeader title={row.title} compact /> : <NotificationRow notification={row.notification} onPress={() => open(row.notification)} />;

  return (
    <ListScreen
      query={query}
      items={rows}
      keyExtractor={(row) => row.key}
      renderItem={renderItem}
      skeleton={
        <View style={{ gap: spacing.md }}>
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonListItem key={i} />
          ))}
        </View>
      }
      empty={{ icon: 'notifications-off-outline', title: "You're all caught up", message: 'Booking updates, reminders and offers will appear here.' }}
    />
  );
};

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  pressed: { opacity: 0.85 },
  icon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, gap: 3 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  unreadDot: { width: 8, height: 8, borderRadius: 4 },
});
