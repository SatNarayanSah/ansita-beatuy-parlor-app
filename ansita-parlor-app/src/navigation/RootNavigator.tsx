import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useMemo } from 'react';

import { DemoDataScreen } from '@/screens/shared/DemoDataScreen';
import { UIKitShowcaseScreen } from '@/screens/shared/UIKitShowcaseScreen';
import { toNavigationTheme, useTheme } from '@/theme';

export type RootStackParamList = {
  DemoData: undefined;
  /** Dev-only; not registered in production builds. */
  UIKitShowcase: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/** Temporary root: Demo Data plus the dev UI kit. Auth and role-based tabs come in later phases. */
export const RootNavigator = () => {
  const theme = useTheme();
  const navigationTheme = useMemo(() => toNavigationTheme(theme), [theme]);

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator
        screenOptions={{
          headerTitleStyle: { fontFamily: theme.fontFamily.semibold },
          headerShadowVisible: false,
        }}
      >
        <Stack.Screen name="DemoData" component={DemoDataScreen} options={{ title: 'Demo Data' }} />
        {__DEV__ ? (
          <Stack.Screen name="UIKitShowcase" component={UIKitShowcaseScreen} options={{ title: 'UI Kit' }} />
        ) : null}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
