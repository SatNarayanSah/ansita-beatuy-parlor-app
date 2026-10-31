import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';

import { useStoresHydrated } from '@/hooks/useStoresHydrated';
import { RootNavigator } from '@/navigation/RootNavigator';
import { fontAssets, useTheme } from '@/theme';

import { AppProviders } from './AppProviders';
import { BootScreen } from './BootScreen';

/** Waits for fonts and persisted stores, then shows the navigator. */
const AppContent = () => {
  const { isDark } = useTheme();
  const hydrated = useStoresHydrated();
  // On a font load error fall back to system fonts rather than blocking the app.
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const ready = hydrated && (fontsLoaded || fontError !== null);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {ready ? <RootNavigator /> : <BootScreen />}
    </>
  );
};

const App = () => (
  <AppProviders>
    <AppContent />
  </AppProviders>
);

export default App;
