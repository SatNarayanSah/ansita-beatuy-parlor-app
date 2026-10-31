import { useFonts } from 'expo-font';
import * as NativeSplash from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useState } from 'react';

import { OfflineBanner } from '@/components/layout/OfflineBanner';
import { useStoresHydrated } from '@/hooks/useStoresHydrated';
import { RootNavigator } from '@/navigation/RootNavigator';
import { fontAssets, useTheme } from '@/theme';

import { AppProviders } from './AppProviders';
import { ErrorBoundary } from './ErrorBoundary';
import { SplashScreen } from './SplashScreen';

// Keep the native splash up until the animated one has drawn its first frame,
// so there is no blank flash between them. Both share the same background.
NativeSplash.preventAutoHideAsync().catch(() => undefined);

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
  const hideNativeSplash = useCallback(() => {
    NativeSplash.hideAsync().catch(() => undefined);
  }, []);

  return (
    <>
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <ErrorBoundary>{ready ? <RootNavigator /> : null}</ErrorBoundary>
      <OfflineBanner />
      {splashDone ? null : <SplashScreen fontsReady={fontsReady} appReady={ready} onFinish={finishSplash} onFirstFrame={hideNativeSplash} />}
    </>
  );
};

const App = () => (
  <AppProviders>
    <AppContent />
  </AppProviders>
);

export default App;
