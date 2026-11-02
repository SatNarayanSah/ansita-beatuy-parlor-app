import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useMemo } from 'react';

import { useLiveSync } from '@/hooks/useLiveSync';
import { usePhoneNotifications } from '@/hooks/usePhoneNotifications';

import { useT } from '@/i18n';
import { AppointmentDetailScreen } from '@/screens/admin/AppointmentDetailScreen';
import { AppointmentFormScreen } from '@/screens/admin/AppointmentFormScreen';
import { BatchAttendanceScreen } from '@/screens/admin/BatchAttendanceScreen';
import { BatchFormScreen } from '@/screens/admin/BatchFormScreen';
import { BusinessSettingsScreen } from '@/screens/admin/BusinessSettingsScreen';
import { CategoryFormScreen } from '@/screens/admin/CategoryFormScreen';
import { CourseFormScreen } from '@/screens/admin/CourseFormScreen';
import { CourseManageScreen } from '@/screens/admin/CourseManageScreen';
import { CustomerDetailScreen } from '@/screens/admin/CustomerDetailScreen';
import { CustomerFormScreen } from '@/screens/admin/CustomerFormScreen';
import { EnrollmentDetailScreen } from '@/screens/admin/EnrollmentDetailScreen';
import { EnrollStudentScreen } from '@/screens/admin/EnrollStudentScreen';
import { ManageServicesScreen } from '@/screens/admin/ManageServicesScreen';
import { ReportsScreen } from '@/screens/admin/ReportsScreen';
import { ServiceFormScreen } from '@/screens/admin/ServiceFormScreen';
import { StaffDetailScreen } from '@/screens/admin/StaffDetailScreen';
import { StaffFormScreen } from '@/screens/admin/StaffFormScreen';
import { StaffListScreen } from '@/screens/admin/StaffListScreen';
import { ForgotPasswordScreen } from '@/screens/auth/ForgotPasswordScreen';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { OnboardingScreen } from '@/screens/auth/OnboardingScreen';
import { RegisterScreen } from '@/screens/auth/RegisterScreen';
import { BookingScreen } from '@/screens/customer/BookingScreen';
import { BookingSuccessScreen } from '@/screens/customer/BookingSuccessScreen';
import { EditProfileScreen } from '@/screens/customer/EditProfileScreen';
import { HelpContactScreen } from '@/screens/customer/HelpContactScreen';
import { LoyaltyHistoryScreen } from '@/screens/customer/LoyaltyHistoryScreen';
import { PreferencesScreen } from '@/screens/customer/PreferencesScreen';
import { RescheduleScreen } from '@/screens/customer/RescheduleScreen';
import { ServiceDetailScreen } from '@/screens/customer/ServiceDetailScreen';
import { NotificationsScreen } from '@/screens/shared/NotificationsScreen';
import { SettingsScreen } from '@/screens/shared/SettingsScreen';
import { UIKitShowcaseScreen } from '@/screens/shared/UIKitShowcaseScreen';
import { selectCurrentUser, useAuthStore, useSettingsStore } from '@/store';
import { toNavigationTheme, useTheme } from '@/theme';

import { AdminTabs } from './AdminTabs';
import { CustomerTabs } from './CustomerTabs';
import { navigationRef } from './navigationRef';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Auth-aware root. Screens are rendered conditionally (React Navigation's auth
 * flow pattern), so signing in, signing out and switching roles swap the
 * available screens and the navigator moves to the right first screen itself.
 *
 * The signed-in group's `navigationKey` is the user id, so a different account
 * always starts from its own role's tabs.
 */
export const RootNavigator = () => {
  const theme = useTheme();
  const t = useT();
  const navigationTheme = useMemo(() => toNavigationTheme(theme), [theme]);
  // Persisted session: a valid stored session goes straight to the tabs on relaunch.
  const user = useAuthStore(selectCurrentUser);
  const hasSeenOnboarding = useSettingsStore((state) => state.hasSeenOnboarding);
  // Pull new bookings and notifications made on other devices.
  useLiveSync(user !== null);
  // Push registration, reminders, app-icon badge and notification taps.
  usePhoneNotifications(user);

  return (
    <NavigationContainer ref={navigationRef} theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerShadowVisible: false,
          headerTitleStyle: { fontFamily: theme.fontFamily.semibold },
          headerStyle: { backgroundColor: theme.colors.background },
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        {user === null ? (
          <Stack.Group navigationKey="guest" screenOptions={{ headerShown: false, animationTypeForReplace: 'pop' }}>
            {hasSeenOnboarding ? null : <Stack.Screen name="Onboarding" component={OnboardingScreen} options={{ animation: 'fade' }} />}
            <Stack.Screen name="Login" component={LoginScreen} options={{ animation: 'fade' }} />
            <Stack.Screen name="Register" component={RegisterScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} options={{ animation: 'slide_from_right' }} />
          </Stack.Group>
        ) : (
          <Stack.Group navigationKey={user.id}>
            {user.role === 'admin' ? (
              <>
                <Stack.Screen name="AdminTabs" component={AdminTabs} options={{ headerShown: false, animation: 'fade' }} />
                <Stack.Screen name="AppointmentDetail" component={AppointmentDetailScreen} options={{ title: 'Appointment' }} />
                <Stack.Screen
                  name="AppointmentForm"
                  component={AppointmentFormScreen}
                  options={({ route }) => ({ title: route.params?.appointmentId ? 'Edit appointment' : 'New appointment' })}
                />
                <Stack.Screen name="CustomerDetail" component={CustomerDetailScreen} options={{ title: 'Customer' }} />
                <Stack.Screen
                  name="CustomerForm"
                  component={CustomerFormScreen}
                  options={({ route }) => ({ title: route.params?.customerId ? 'Edit customer' : 'New customer' })}
                />
                <Stack.Screen name="ManageServices" component={ManageServicesScreen} options={{ title: 'Services & prices' }} />
                <Stack.Screen name="ServiceForm" component={ServiceFormScreen} options={({ route }) => ({ title: route.params?.serviceId ? 'Edit service' : 'New service' })} />
                <Stack.Screen name="CategoryForm" component={CategoryFormScreen} options={({ route }) => ({ title: route.params?.categoryId ? 'Edit category' : 'New category' })} />
                <Stack.Screen name="StaffList" component={StaffListScreen} options={{ title: 'Staff' }} />
                <Stack.Screen name="StaffDetail" component={StaffDetailScreen} options={{ title: 'Staff member' }} />
                <Stack.Screen name="StaffForm" component={StaffFormScreen} options={({ route }) => ({ title: route.params?.staffId ? 'Edit staff' : 'New staff member' })} />
                <Stack.Screen name="CourseManage" component={CourseManageScreen} options={{ title: 'Course' }} />
                <Stack.Screen name="CourseForm" component={CourseFormScreen} options={({ route }) => ({ title: route.params?.courseId ? 'Edit course' : 'New course' })} />
                <Stack.Screen name="BatchForm" component={BatchFormScreen} options={({ route }) => ({ title: route.params.batchId ? 'Edit batch' : 'New batch' })} />
                <Stack.Screen name="BatchAttendance" component={BatchAttendanceScreen} options={{ title: 'Attendance' }} />
                <Stack.Screen name="EnrollmentDetail" component={EnrollmentDetailScreen} options={{ title: 'Enrollment' }} />
                <Stack.Screen name="EnrollStudent" component={EnrollStudentScreen} options={{ title: 'Enroll student' }} />
                <Stack.Screen name="Reports" component={ReportsScreen} options={{ title: 'Reports' }} />
                <Stack.Screen name="BusinessSettings" component={BusinessSettingsScreen} options={{ title: 'Business settings' }} />
              </>
            ) : (
              <>
                <Stack.Screen name="CustomerTabs" component={CustomerTabs} options={{ headerShown: false, animation: 'fade' }} />
                <Stack.Screen name="ServiceDetail" component={ServiceDetailScreen} options={{ title: '' }} />
                <Stack.Screen name="Booking" component={BookingScreen} options={{ title: t('booking.title') }} />
                <Stack.Screen
                  name="BookingSuccess"
                  component={BookingSuccessScreen}
                  options={{ headerShown: false, animation: 'fade', gestureEnabled: false }}
                />
                <Stack.Screen name="Reschedule" component={RescheduleScreen} options={{ title: t('appointments.reschedule') }} />
                <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: t('profile.edit') }} />
                <Stack.Screen name="Preferences" component={PreferencesScreen} options={{ title: t('profile.preferences') }} />
                <Stack.Screen name="LoyaltyHistory" component={LoyaltyHistoryScreen} options={{ title: t('profile.loyalty') }} />
                <Stack.Screen name="HelpContact" component={HelpContactScreen} options={{ title: t('profile.help') }} />
              </>
            )}
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            {__DEV__ ? <Stack.Screen name="UIKitShowcase" component={UIKitShowcaseScreen} options={{ title: 'UI Kit' }} /> : null}
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
