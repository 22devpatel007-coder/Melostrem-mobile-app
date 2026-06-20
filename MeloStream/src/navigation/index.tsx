import React, { useCallback, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { NavigationContainer, useNavigationContainerRef, DarkTheme } from '@react-navigation/native';
import { COLORS } from '@constants/colors';
import { RootStackParamList } from '../types/navigation';
import { AuthNavigator } from './AuthNavigator';
import { AppNavigator } from './AppNavigator';
import { linking } from './linking';
import { useAuthStore } from '../store/authStore';
import { usePlayerStore } from '../store/playerStore';
import { MiniPlayerBar } from '@components/player/MiniPlayerBar';
import { createNativeStackNavigator } from '@react-navigation/native-stack';

const Root = createNativeStackNavigator<RootStackParamList>();

const navTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: COLORS.background,
    card: COLORS.background,
    border: COLORS.border,
    primary: COLORS.primary,
    text: COLORS.textPrimary,
  },
};

function getIsFullScreenPlayerActive(rootState: any): boolean {
  if (!rootState) return false;
  const appRoute = rootState.routes?.find((r: any) => r.name === 'App');
  const appState = appRoute?.state;
  if (!appState || appState.index == null) return false;
  return appState.routes[appState.index]?.name === 'FullScreenPlayer';
}

function GlobalMiniPlayer({
  navigationRef,
}: {
  navigationRef: ReturnType<typeof useNavigationContainerRef<RootStackParamList>>;
}) {
  const currentSong = usePlayerStore((s) => s.currentSong);
  const [isFullScreenPlayerActive, setIsFullScreenPlayerActive] = useState(false);

  useEffect(() => {
    const unsubscribe = navigationRef.addListener('state', () => {
      setIsFullScreenPlayerActive(getIsFullScreenPlayerActive(navigationRef.getRootState()));
    });
    return unsubscribe;
  }, [navigationRef]);

  const handleExpand = useCallback(() => {
    navigationRef.navigate('App', { screen: 'FullScreenPlayer' });
  }, [navigationRef]);

  if (!currentSong || isFullScreenPlayerActive) return null;
  return <MiniPlayerBar onExpand={handleExpand} />;
}

export function RootNavigator() {
  const user = useAuthStore((s) => s.user);
  const navigationRef = useNavigationContainerRef<RootStackParamList>();

  return (
    <NavigationContainer ref={navigationRef} linking={linking} theme={navTheme}>
      <View style={styles.root}>
        <Root.Navigator screenOptions={{ headerShown: false }}>
          {user ? (
            <Root.Screen name="App"  component={AppNavigator}  />
          ) : (
            <Root.Screen name="Auth" component={AuthNavigator} />
          )}
        </Root.Navigator>
        {user && <GlobalMiniPlayer navigationRef={navigationRef} />}
      </View>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});