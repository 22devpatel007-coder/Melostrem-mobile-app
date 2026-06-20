import { useEffect } from 'react';
import * as SplashScreen from 'expo-splash-screen';
import AppProviders from '@providers/AppProviders';
import { RootNavigator } from '@navigation/index';
import { useAuthStore } from '@store/authStore';
import { init } from '@services/errorReporter';

SplashScreen.preventAutoHideAsync();
init();

function SplashGate() {
  const loading = useAuthStore((s) => s.loading);

  useEffect(() => {
    if (!loading) {
      SplashScreen.hideAsync();
    }
  }, [loading]);

  return <RootNavigator />;
}

export default function App() {
  return (
    <AppProviders>
      <SplashGate />
    </AppProviders>
  );
}