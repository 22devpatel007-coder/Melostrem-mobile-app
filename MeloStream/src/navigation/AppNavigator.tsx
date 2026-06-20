import React from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppStackParamList } from '../types/navigation';
import { BottomTabNavigator } from './BottomTabNavigator';
import NetworkErrorBanner from '@components/errors/NetworkErrorBanner';
import { FullScreenPlayerScreen } from '@screens/player/FullScreenPlayerScreen';

const Placeholder = (name: string) => () => (
  <View style={{ flex: 1, backgroundColor: '#0F0F0F' }}>
    <Text style={{ color: '#fff' }}>{name}</Text>
  </View>
);


const PlaylistDetailScreen   = Placeholder('PlaylistDetail');
const ArtistDetailScreen     = Placeholder('ArtistDetail');
const AlbumDetailScreen      = Placeholder('AlbumDetail');
const SongDetailScreen       = Placeholder('SongDetail');
const SuggestionsScreen      = Placeholder('Suggestions');

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppNavigator() {
  return (
    <View style={styles.root}>
      <NetworkErrorBanner />

      <Stack.Navigator
        screenOptions={{ headerShown: false }}
      >
        <Stack.Screen name="Tabs"            component={BottomTabNavigator} />
        <Stack.Screen
          name="FullScreenPlayer"
          component={FullScreenPlayerScreen}
          options={{
            presentation: 'transparentModal',
            animation: 'slide_from_bottom',
          }}
        />
        <Stack.Screen
          name="PlaylistDetail"
          component={PlaylistDetailScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="ArtistDetail"
          component={ArtistDetailScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="AlbumDetail"
          component={AlbumDetailScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="SongDetail"
          component={SongDetailScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen
          name="Suggestions"
          component={SuggestionsScreen}
          options={{ presentation: 'modal' }}
        />
     </Stack.Navigator>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
});