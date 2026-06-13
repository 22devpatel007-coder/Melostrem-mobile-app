import { useCallback } from 'react';
import { View } from 'react-native';
import * as SplashScreen from 'expo-splash-screen';
import AppProviders from '@providers/AppProviders';
import {RootNavigator} from '@navigation/index';
import { init } from '@services/errorReporter';

SplashScreen.preventAutoHideAsync();
init();

export default function App() {
  const onReady = useCallback(async () => {
    await SplashScreen.hideAsync();
  }, []);

  return (
    <AppProviders>
      <RootNavigator onReady={onReady} />
    </AppProviders>
  );
}