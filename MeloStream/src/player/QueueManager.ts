import TrackPlayer, { type MediaItem } from '@rntp/player';
import { buildTrack } from './TrackBuilder';
import { Song } from '../types/song';

export const QueueManager = {
  setQueue(songs: Song[], startIndex = 0) {
    const tracks = songs.map(buildTrack);
    TrackPlayer.setMediaItems(tracks, startIndex);
  },

  addToQueue(song: Song) {
    TrackPlayer.addMediaItem(buildTrack(song));
  },

  removeFromQueue(index: number) {
    TrackPlayer.removeMediaItem(index);
  },

  skipTo(index: number) {
    TrackPlayer.skipToIndex(index);
  },

  clear() {
    TrackPlayer.clear();
  },
};