import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/** Root stack. Guest and signed-in screens are mutually exclusive groups. */
export type RootStackParamList = {
  // Guest
  Onboarding: undefined;
  /** `email` prefills the field, e.g. after a password reset. */
  Login: { email?: string } | undefined;
  Register: undefined;
  ForgotPassword: { email?: string } | undefined;
  // Signed in
  AdminTabs: NavigatorScreenParams<AdminTabParamList> | undefined;
  CustomerTabs: NavigatorScreenParams<CustomerTabParamList> | undefined;
  Settings: undefined;
  DemoData: undefined;
  /** Dev-only; not registered in production builds. */
  UIKitShowcase: undefined;
};

export type AdminTabParamList = {
  Dashboard: undefined;
  Appointments: undefined;
  Customers: undefined;
  Training: undefined;
  More: undefined;
};

export type CustomerTabParamList = {
  Home: undefined;
  Book: undefined;
  MyAppointments: undefined;
  Courses: undefined;
  Profile: undefined;
};

export type RootStackScreenProps<T extends keyof RootStackParamList> = NativeStackScreenProps<RootStackParamList, T>;

export type AdminTabScreenProps<T extends keyof AdminTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<AdminTabParamList, T>,
  RootStackScreenProps<keyof RootStackParamList>
>;

export type CustomerTabScreenProps<T extends keyof CustomerTabParamList> = CompositeScreenProps<
  BottomTabScreenProps<CustomerTabParamList, T>,
  RootStackScreenProps<keyof RootStackParamList>
>;

// Types `useNavigation()` without a generic anywhere in the app.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace ReactNavigation {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface RootParamList extends RootStackParamList {}
  }
}
