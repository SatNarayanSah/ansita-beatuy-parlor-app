import type { ReactNode } from 'react';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ToastProvider } from '@/components/ui/Toast';
import { ThemeProvider } from '@/theme';

interface AppProvidersProps {
  children: ReactNode;
}

/** App-wide providers. ToastProvider sits inside ThemeProvider because the snackbar is themed. */
export const AppProviders = ({ children }: AppProvidersProps) => (
  <GestureHandlerRootView style={styles.root}>
    <SafeAreaProvider>
      <ThemeProvider>
        <ToastProvider>{children}</ToastProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  </GestureHandlerRootView>
);

const styles = StyleSheet.create({
  root: { flex: 1 },
});
