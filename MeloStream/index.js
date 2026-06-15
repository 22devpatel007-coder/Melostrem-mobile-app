import { registerRootComponent } from 'expo';
import TrackPlayer from '@rntp/player';
import { PlaybackService } from './src/player/PlaybackService';
import App from './App';

TrackPlayer.registerPlaybackService(() => PlaybackService);

registerRootComponent(App);