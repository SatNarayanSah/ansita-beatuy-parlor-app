import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useMemo } from 'react';

import { useT } from '@/i18n';
import { ForgotPasswordScreen } from '@/screens/auth/ForgotPasswordScreen';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { OnboardingScreen } from '@/screens/auth/OnboardingScreen';
import { RegisterScreen } from '@/screens/auth/RegisterScreen';
import { BookingScreen } from '@/screens/customer/BookingScreen';
import { BookingSuccessScreen } from '@/screens/customer/BookingSuccessScreen';
import { CourseDetailScreen } from '@/screens/customer/CourseDetailScreen';
import { EditProfileScreen } from '@/screens/customer/EditProfileScreen';
import { EnrollScreen } from '@/screens/customer/EnrollScreen';
import { HelpContactScreen } from '@/screens/customer/HelpContactScreen';
import { LoyaltyHistoryScreen } from '@/screens/customer/LoyaltyHistoryScreen';
import { PreferencesScreen } from '@/screens/customer/PreferencesScreen';
import { RescheduleScreen } from '@/screens/customer/RescheduleScreen';
import { ServiceDetailScreen } from '@/screens/customer/ServiceDetailScreen';
import { DemoDataScreen } from '@/screens/shared/DemoDataScreen';
import { NotificationsScreen } from '@/screens/shared/NotificationsScreen';
import { SettingsScreen } from '@/screens/shared/SettingsScreen';
import { UIKitShowcaseScreen } from '@/screens/shared/UIKitShowcaseScreen';
import { selectCurrentUser, useAuthStore, useSettingsStore } from '@/store';
import { toNavigationTheme, useTheme } from '@/theme';

import { AdminTabs } from './AdminTabs';
import { CustomerTabs } from './CustomerTabs';
import type { RootStackParamList } from './types';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Auth-aware root. Screens are rendered conditionally (React Navigation's auth
 * flow pattern), so signing in, signing out and switching roles swap the
 * available screens and the navigator moves to the right first screen itself.
 *
 * The signed-in group's `navigationKey` is the user id: switching demo roles
 * from Settings resets that group, landing on the new role's tabs instead of
 * leaving Settings orphaned on top.
 */
export const RootNavigator = () => {
  const theme = useTheme();
  const t = useT();
  const navigationTheme = useMemo(() => toNavigationTheme(theme), [theme]);
  // Persisted session: a valid stored session goes straight to the tabs on relaunch.
  const user = useAuthStore(selectCurrentUser);
  const hasSeenOnboarding = useSettingsStore((state) => state.hasSeenOnboarding);

  return (
    <NavigationContainer theme={navigationTheme}>
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
              <Stack.Screen name="AdminTabs" component={AdminTabs} options={{ headerShown: false, animation: 'fade' }} />
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
                <Stack.Screen name="CourseDetail" component={CourseDetailScreen} options={{ title: '' }} />
                <Stack.Screen name="Enroll" component={EnrollScreen} options={{ title: t('courses.enroll') }} />
                <Stack.Screen name="EditProfile" component={EditProfileScreen} options={{ title: t('profile.edit') }} />
                <Stack.Screen name="Preferences" component={PreferencesScreen} options={{ title: t('profile.preferences') }} />
                <Stack.Screen name="LoyaltyHistory" component={LoyaltyHistoryScreen} options={{ title: t('profile.loyalty') }} />
                <Stack.Screen name="HelpContact" component={HelpContactScreen} options={{ title: t('profile.help') }} />
              </>
            )}
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="DemoData" component={DemoDataScreen} options={{ title: 'Demo Data' }} />
            {__DEV__ ? <Stack.Screen name="UIKitShowcase" component={UIKitShowcaseScreen} options={{ title: 'UI Kit' }} /> : null}
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
