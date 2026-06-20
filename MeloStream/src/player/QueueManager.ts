import TrackPlayer, { type MediaItem } from '@rntp/player';
import { buildTrack } from './TrackBuilder';
import { Song } from '../types/song';

export const QueueManager = {
  setQueue(songs: Song[], startIndex = 0) {
    const tracks = songs.map(buildTrack);
    TrackPlayer.setMediaItems(tracks, startIndex);
    TrackPlayer.play();
  },

  addToQueue(song: Song) {
    TrackPlayer.addMediaItem(buildTrack(song));
  },

  removeFromQueueById(songId: string) {
    const queue = TrackPlayer.getQueue();
    const index = queue.findIndex((item: MediaItem) => item.mediaId === songId);
    if (index === -1) return;
    TrackPlayer.removeMediaItem(index);
  },

  reorderQueue(fromIndex: number, toIndex: number) {
    TrackPlayer.moveMediaItem(fromIndex, toIndex);
  },

  skipTo(index: number) {
    TrackPlayer.skipToIndex(index);
  },

  clear() {
    TrackPlayer.clear();
  },
};