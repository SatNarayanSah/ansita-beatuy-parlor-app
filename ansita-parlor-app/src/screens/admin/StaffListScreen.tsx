import { View } from 'react-native';

import { Avatar, Badge, Card, FAB, ListItem, QueryState, Screen, SkeletonListItem } from '@/components/ui';
import { useServiceQuery } from '@/hooks/useServiceQuery';
import type { RootStackScreenProps } from '@/navigation/types';
import { appointmentService, staffService } from '@/services';
import { selectIsStaffWorkingOn, useAppointmentStore, useStaffStore } from '@/store';
import { useTheme } from '@/theme';
import { todayISO } from '@/utils/date';
import { formatEnumLabel } from '@/utils/format';

type Props = RootStackScreenProps<'StaffList'>;

export const StaffListScreen = ({ navigation }: Props) => {
  const { spacing } = useTheme();
  const today = todayISO();
  const query = useServiceQuery(
    async () => {
      const [staff, todays] = await Promise.all([staffService.listStaff(), appointmentService.listAppointments({ date: today })]);
      return { staff, todays: todays.filter((a) => a.status !== 'cancelled') };
    },
    [today],
    { refetchOn: [useStaffStore, useAppointmentStore] },
  );

  return (
    <Screen
      refreshing={query.refreshing}
      onRefresh={() => void query.refetch()}
      overlay={<FAB icon="person-add" label="Staff" onPress={() => navigation.navigate('StaffForm')} />}
    >
      <QueryState
        query={query}
        skeleton={
          <View style={{ gap: spacing.sm }}>
            {Array.from({ length: 4 }, (_, i) => (
              <SkeletonListItem key={i} />
            ))}
          </View>
        }
        isEmpty={(data) => data.staff.length === 0}
        empty={{ icon: 'people-outline', title: 'No staff yet', message: 'Add your team to start taking bookings.', actionLabel: 'Add staff', onAction: () => navigation.navigate('StaffForm') }}
      >
        {({ staff, todays }) => (
          <View style={{ gap: spacing.md }}>
            {staff.map((member) => {
              const count = todays.filter((a) => a.staffId === member.id).length;
              const working = selectIsStaffWorkingOn(member, today);
              return (
                <Card key={member.id} padding="sm" onPress={() => navigation.navigate('StaffDetail', { staffId: member.id })} accessibilityLabel={member.name}>
                  <ListItem
                    title={member.name}
                    subtitle={`${formatEnumLabel(member.role)} · ★ ${member.rating || '–'}`}
                    description={!member.isActive ? 'Inactive' : working ? `${count} booking${count === 1 ? '' : 's'} today` : 'Day off today'}
                    left={<Avatar name={member.name} uri={member.avatar} size="lg" />}
                    right={
                      member.isActive ? (
                        <Badge label={working ? 'Working' : 'Off'} tone={working ? 'success' : 'neutral'} size="sm" dot />
                      ) : (
                        <Badge label="Inactive" tone="neutral" size="sm" />
                      )
                    }
                    showChevron
                  />
                </Card>
              );
            })}
          </View>
        )}
      </QueryState>
    </Screen>
  );
};
