import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { AppStackParamList } from '../types/navigation';
import { BottomTabNavigator } from './BottomTabNavigator';
import { usePlayerStore } from '../store/playerStore';

// Placeholder screens — replaced in later phases
import { View as V, Text } from 'react-native';
const Placeholder = (name: string) => () => <V style={{flex:1,backgroundColor:'#0F0F0F'}}><Text style={{color:'#fff'}}>{name}</Text></V>;

const FullScreenPlayerScreen  = Placeholder('FullScreenPlayer');
const PlaylistDetailScreen    = Placeholder('PlaylistDetail');
const ArtistDetailScreen      = Placeholder('ArtistDetail');
const AlbumDetailScreen       = Placeholder('AlbumDetail');
const SongDetailScreen        = Placeholder('SongDetail');
const SuggestionsScreen       = Placeholder('Suggestions');

// Temporary MiniPlayerBar stub — replaced in Phase 8
const MiniPlayerBar = () => (
  <View style={styles.miniPlayer} />
);

const Stack = createNativeStackNavigator<AppStackParamList>();

export function AppNavigator() {
  const currentSong = usePlayerStore((s) => s.currentSong);

  return (
    <View style={styles.root}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        <Stack.Screen name="Tabs"             component={BottomTabNavigator} />
        <Stack.Screen
          name="FullScreenPlayer"
          component={FullScreenPlayerScreen}
          options={{ presentation: 'fullScreenModal', animation: 'slide_from_bottom' }}
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

      {currentSong && <MiniPlayerBar />}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0F0F0F',
  },
  miniPlayer: {
    height: 64,
    backgroundColor: '#161616',
    borderTopWidth: 1,
    borderTopColor: '#2a2a2a',
  },
});