import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useMemo } from 'react';

import { ForgotPasswordScreen } from '@/screens/auth/ForgotPasswordScreen';
import { LoginScreen } from '@/screens/auth/LoginScreen';
import { OnboardingScreen } from '@/screens/auth/OnboardingScreen';
import { RegisterScreen } from '@/screens/auth/RegisterScreen';
import { DemoDataScreen } from '@/screens/shared/DemoDataScreen';
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
              <Stack.Screen name="CustomerTabs" component={CustomerTabs} options={{ headerShown: false, animation: 'fade' }} />
            )}
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="DemoData" component={DemoDataScreen} options={{ title: 'Demo Data' }} />
            {__DEV__ ? <Stack.Screen name="UIKitShowcase" component={UIKitShowcaseScreen} options={{ title: 'UI Kit' }} /> : null}
          </Stack.Group>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
