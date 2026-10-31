import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';

import { useStoresHydrated } from '@/hooks/useStoresHydrated';
import { RootNavigator } from '@/navigation/RootNavigator';
import { fontAssets, useTheme } from '@/theme';

import { AppProviders } from './AppProviders';
import { SplashScreen } from './SplashScreen';

/**
 * Mounts the navigator as soon as fonts and persisted stores are ready, under
 * the animated splash, so the first screen is already drawn when the splash fades.
 */
const AppContent = () => {
  const { isDark } = useTheme();
  const hydrated = useStoresHydrated();
  // On a font load error fall back to system fonts rather than blocking the app.
  const [fontsLoaded, fontError] = useFonts(fontAssets);
  const fontsReady = fontsLoaded || fontError !== null;
  const ready = hydrated && fontsReady;
  const [splashDone, setSplashDone] = useState(false);
  const finishSplash = useCallback(() => setSplashDone(true), []);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      {ready ? <RootNavigator /> : null}
      {splashDone ? null : <SplashScreen fontsReady={fontsReady} appReady={ready} onFinish={finishSplash} />}
    </>
  );
};

const App = () => (
  <AppProviders>
    <AppContent />
  </AppProviders>
);

export default App;
