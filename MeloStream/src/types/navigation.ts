export type RootStackParamList = {
  Auth: undefined;
  App: undefined;
};

export type AuthStackParamList = {
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

export type AppStackParamList = {
  Tabs: undefined;
  FullScreenPlayer: undefined;
  PlaylistDetail: { playlistId: string };
  ArtistDetail: { artistId: string };
  AlbumDetail: { albumId: string };
  SongDetail: { songId: string };
  Suggestions: undefined;
};

export type BottomTabParamList = {
  Home: undefined;
  Search: undefined;
  Library: undefined;
  Liked: undefined;
  Profile: undefined;
};