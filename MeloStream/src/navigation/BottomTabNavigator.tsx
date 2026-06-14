import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BottomTabParamList } from '../types/navigation';
import { COLORS } from '../constants/colors';

// Screens — created in Phase 8
import { HomeScreen } from '../screens/home/HomeScreen';
import { SearchScreen } from '../screens/search/SearchScreen';
import { PlaylistsScreen } from '../screens/playlists/PlaylistsScreen';
import { LikedSongsScreen } from '../screens/liked/LikedSongsScreen';
import { ProfileScreen }from '../screens/profile/ProfileScreen';

const Tab = createBottomTabNavigator<BottomTabParamList>();

export function BottomTabNavigator() {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textMuted,
        animation: 'fade',
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopColor: COLORS.border,
          borderTopWidth: 1,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: 'Inter_400Regular',
        },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{ tabBarLabel: 'Home' }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{ tabBarLabel: 'Search' }}
      />
      <Tab.Screen
        name="Library"
        component={PlaylistsScreen}
        options={{ tabBarLabel: 'Library' }}
      />
      <Tab.Screen
        name="Liked"
        component={LikedSongsScreen}
        options={{ tabBarLabel: 'Liked' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ tabBarLabel: 'Profile' }}
      />
      
    </Tab.Navigator>
  );
}