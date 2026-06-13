import { registerRootComponent } from 'expo';
import TrackPlayer from 'react-native-track-player';
import { PlaybackService } from './src/player/PlaybackService';
import App from './App';

TrackPlayer.registerPlaybackService(() => PlaybackService);

registerRootComponent(App);