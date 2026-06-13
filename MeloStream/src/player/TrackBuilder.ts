import { Track } from 'react-native-track-player';
import { Song } from '../types/song';

export function buildTrack(song: Song): Track {
  return {
    id:      song.id,
    url:     song.audioUrl ?? '',
    title:   song.title,
    artist:  song.artist ?? 'Unknown Artist',
    artwork: song.coverUrl ?? undefined,
    duration: song.duration ?? undefined,
  };
}