import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { TabBar, tabIcon } from '@/components/navigation/TabBar';
import { HomeScreen } from '@/screens/customer/HomeScreen';
import { BookScreen, CoursesScreen, MyAppointmentsScreen } from '@/screens/customer/PlaceholderTabs';
import { ProfileScreen } from '@/screens/customer/ProfileScreen';
import { useTheme } from '@/theme';

import { tabScreenOptions } from './tabOptions';
import type { CustomerTabParamList } from './types';

const Tab = createBottomTabNavigator<CustomerTabParamList>();

export const CustomerTabs = () => {
  const theme = useTheme();

  return (
    <Tab.Navigator tabBar={(props) => <TabBar {...props} />} screenOptions={tabScreenOptions(theme)}>
      <Tab.Screen name="Home" component={HomeScreen} options={{ headerShown: false, tabBarIcon: tabIcon('home-outline', 'home') }} />
      <Tab.Screen name="Book" component={BookScreen} options={{ title: 'Book', tabBarIcon: tabIcon('add-circle-outline', 'add-circle') }} />
      <Tab.Screen
        name="MyAppointments"
        component={MyAppointmentsScreen}
        options={{ title: 'My Appointments', tabBarLabel: 'Bookings', tabBarIcon: tabIcon('calendar-outline', 'calendar') }}
      />
      <Tab.Screen name="Courses" component={CoursesScreen} options={{ tabBarIcon: tabIcon('school-outline', 'school') }} />
      <Tab.Screen name="Profile" component={ProfileScreen} options={{ tabBarIcon: tabIcon('person-outline', 'person') }} />
    </Tab.Navigator>
  );
};
