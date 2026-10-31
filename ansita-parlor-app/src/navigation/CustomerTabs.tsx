import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { TabBar, tabIcon } from '@/components/navigation/TabBar';
import { useT } from '@/i18n';
import { CoursesScreen } from '@/screens/customer/CoursesScreen';
import { HomeScreen } from '@/screens/customer/HomeScreen';
import { MyAppointmentsScreen } from '@/screens/customer/MyAppointmentsScreen';
import { ProfileScreen } from '@/screens/customer/ProfileScreen';
import { ServicesScreen } from '@/screens/customer/ServicesScreen';
import { useTheme } from '@/theme';

import { tabScreenOptions } from './tabOptions';
import type { CustomerTabParamList } from './types';

const Tab = createBottomTabNavigator<CustomerTabParamList>();

export const CustomerTabs = () => {
  const theme = useTheme();
  const t = useT();

  return (
    <Tab.Navigator tabBar={(props) => <TabBar {...props} />} screenOptions={tabScreenOptions(theme)}>
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ headerShown: false, tabBarLabel: t('tab.home'), tabBarIcon: tabIcon('home-outline', 'home') }}
      />
      <Tab.Screen
        name="Book"
        component={ServicesScreen}
        options={{ title: t('services.title'), tabBarLabel: t('tab.book'), tabBarIcon: tabIcon('add-circle-outline', 'add-circle') }}
      />
      <Tab.Screen
        name="MyAppointments"
        component={MyAppointmentsScreen}
        options={{ title: t('appointments.title'), tabBarLabel: t('tab.bookings'), tabBarIcon: tabIcon('calendar-outline', 'calendar') }}
      />
      <Tab.Screen
        name="Courses"
        component={CoursesScreen}
        options={{ title: t('courses.title'), tabBarLabel: t('tab.courses'), tabBarIcon: tabIcon('school-outline', 'school') }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: t('profile.title'), tabBarLabel: t('tab.profile'), tabBarIcon: tabIcon('person-outline', 'person') }}
      />
    </Tab.Navigator>
  );
};
