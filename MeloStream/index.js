import { registerRootComponent } from 'expo';
import TrackPlayer from '@rntp/player';
import { PlaybackServiceBackgroundFactory } from './src/player/PlaybackService';
import App from './App';

TrackPlayer.registerBackgroundEventHandler(PlaybackServiceBackgroundFactory);

registerRootComponent(App);