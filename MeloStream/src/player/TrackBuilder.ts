import type { MediaItem } from '@rntp/player';
import type { Song } from '../types/song';

export function buildTrack(song: Song): MediaItem {
  return {
    mediaId:    song.id,
    url:        song.audioUrl ?? '',
    title:      song.title,
    artist:     song.artist ?? 'Unknown Artist',
    artworkUrl: song.coverUrl ?? undefined,
    duration:   song.duration ?? undefined,
  };
}