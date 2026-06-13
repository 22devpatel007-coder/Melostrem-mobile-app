import { LinkingOptions } from '@react-navigation/native';
import { RootStackParamList } from '../types/navigation';

export const linking: LinkingOptions<RootStackParamList> = {
  prefixes: ['melostream://', 'https://melostream.app'],
  config: {
    screens: {
      Auth: {
        screens: {
          Login: 'login',
          Register: 'register',
          ForgotPassword: 'forgot-password',
        },
      },
      App: {
        screens: {
          Tabs: {
            screens: {
              Home: 'home',
              Search: 'search',
              Library: 'library',
              Liked: 'liked',
              Profile: 'profile',
            },
          },
          FullScreenPlayer: 'player',
          PlaylistDetail: 'playlists/:playlistId',
          ArtistDetail: 'artist/:artistId',
          AlbumDetail: 'album/:albumId',
          SongDetail: 'song/:songId',
          Suggestions: 'suggestions',
        },
      },
    },
  },
};