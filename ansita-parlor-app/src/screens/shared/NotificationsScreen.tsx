import { useLayoutEffect, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Button, Icon, QueryState, Screen, SectionHeader, SkeletonListItem, Text, useToast, type IconName } from '@/components/ui';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import { useT } from '@/i18n';
import type { RootStackScreenProps } from '@/navigation/types';
import { getErrorMessage, notificationService } from '@/services';
import { selectCurrentUser, useAuthStore, useNotificationStore } from '@/store';
import { getToneColors, useTheme, type Tone } from '@/theme';
import type { Notification, NotificationType } from '@/types';
import { formatTimeAgo } from '@/utils/date';

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

const NotificationRow = ({ notification, onPress }: { notification: Notification; onPress: () => void }) => {
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

  const groups = useMemo(() => {
    const list = query.data ?? [];
    return [
      { key: 'new', title: 'New', items: list.filter((n) => !n.isRead) },
      { key: 'earlier', title: 'Earlier', items: list.filter((n) => n.isRead) },
    ].filter((group) => group.items.length > 0);
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
      case 'enrollment':
        navigation.navigate('CustomerTabs', { screen: 'Courses', params: { view: 'mine' } });
        return;
      case 'course':
        navigation.navigate('CourseDetail', { courseId: link.id });
        return;
      case 'offer':
        navigation.navigate('CustomerTabs', { screen: 'Home' });
        return;
      case 'customer':
        return;
    }
  };

  return (
    <Screen refreshing={query.refreshing} onRefresh={() => void query.refetch()}>
      <QueryState
        query={query}
        skeleton={
          <View style={{ gap: spacing.md }}>
            {Array.from({ length: 6 }, (_, i) => (
              <SkeletonListItem key={i} />
            ))}
          </View>
        }
        isEmpty={(list) => list.length === 0}
        empty={{ icon: 'notifications-off-outline', title: "You're all caught up", message: 'Booking updates, reminders and offers will appear here.' }}
      >
        {() => (
          <View style={{ gap: spacing.lg }}>
            {groups.map((group) => (
              <View key={group.key} style={{ gap: spacing.sm }}>
                <SectionHeader title={group.title} compact />
                {group.items.map((notification) => (
                  <NotificationRow key={notification.id} notification={notification} onPress={() => open(notification)} />
                ))}
              </View>
            ))}
          </View>
        )}
      </QueryState>
    </Screen>
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
