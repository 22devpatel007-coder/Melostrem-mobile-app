import TrackPlayer from 'react-native-track-player';
import { buildTrack } from './TrackBuilder';
import { Song } from '../types/song';

export const QueueManager = {
  async setQueue(songs: Song[], startIndex = 0) {
    await TrackPlayer.reset();
    const tracks = songs.map(buildTrack);
    await TrackPlayer.add(tracks);
    await TrackPlayer.skip(startIndex);
  },

  async addToQueue(song: Song) {
    await TrackPlayer.add(buildTrack(song));
  },

  async removeFromQueue(index: number) {
    await TrackPlayer.remove(index);
  },

  async skipTo(index: number) {
    await TrackPlayer.skip(index);
  },

  async clear() {
    await TrackPlayer.reset();
  },
};