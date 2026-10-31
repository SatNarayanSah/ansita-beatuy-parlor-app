import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { TabBar, tabIcon } from '@/components/navigation/TabBar';
import { AppointmentsScreen } from '@/screens/admin/AppointmentsScreen';
import { CustomersScreen } from '@/screens/admin/CustomersScreen';
import { DashboardScreen } from '@/screens/admin/DashboardScreen';
import { MoreScreen } from '@/screens/admin/MoreScreen';
import { TrainingScreen } from '@/screens/admin/TrainingScreen';
import { useAppointmentStore } from '@/store';
import { useTheme } from '@/theme';
import { todayISO } from '@/utils/date';

import { tabScreenOptions } from './tabOptions';
import type { AdminTabParamList } from './types';

const Tab = createBottomTabNavigator<AdminTabParamList>();

export const AdminTabs = () => {
  const theme = useTheme();
  // Badge the Appointments tab with booking requests awaiting confirmation.
  const pendingCount = useAppointmentStore(
    (state) => state.appointments.filter((a) => a.status === 'pending' && a.date >= todayISO()).length,
  );

  return (
    <Tab.Navigator tabBar={(props) => <TabBar {...props} />} screenOptions={tabScreenOptions(theme)}>
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ headerShown: false, tabBarIcon: tabIcon('grid-outline', 'grid') }}
      />
      <Tab.Screen
        name="Appointments"
        component={AppointmentsScreen}
        options={{
          tabBarIcon: tabIcon('calendar-outline', 'calendar'),
          tabBarBadge: pendingCount > 0 ? pendingCount : undefined,
        }}
      />
      <Tab.Screen name="Customers" component={CustomersScreen} options={{ tabBarIcon: tabIcon('people-outline', 'people') }} />
      <Tab.Screen name="Training" component={TrainingScreen} options={{ tabBarIcon: tabIcon('school-outline', 'school') }} />
      <Tab.Screen name="More" component={MoreScreen} options={{ tabBarIcon: tabIcon('ellipsis-horizontal-circle-outline', 'ellipsis-horizontal-circle') }} />
    </Tab.Navigator>
  );
};
