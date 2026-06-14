// src/services/artists.service.ts

import api from './api';
import { extractSong } from './songs.service';
import type { Song } from '../types/song';

export interface Artist {
  id: string;
  name: string;
  nameLower: string;
  bio: string;
  imageUrl: string;
  songCount: number;
  albumCount: number;
  verified: boolean;
  createdAt: any;
  updatedAt: any;
}

export interface ArtistSongsPage {
  songs: Song[];
  nextCursor: string | null;
  hasMore: boolean;
}

const unwrap = (res: any): any => res?.data ?? res;

export const extractArtist = (payload: any): Artist | null => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  return {
    id:         typeof payload.id         === 'string'  ? payload.id          : '',
    name:       typeof payload.name       === 'string'  ? payload.name.trim() : '',
    nameLower:  typeof payload.nameLower  === 'string'  ? payload.nameLower   : '',
    bio:        typeof payload.bio        === 'string'  ? payload.bio         : '',
    imageUrl:   typeof payload.imageUrl   === 'string'  ? payload.imageUrl    : '',
    songCount:  typeof payload.songCount  === 'number'  ? payload.songCount   : 0,
    albumCount: typeof payload.albumCount === 'number'  ? payload.albumCount  : 0,
    verified:   typeof payload.verified   === 'boolean' ? payload.verified    : false,
    createdAt:  payload.createdAt ?? null,
    updatedAt:  payload.updatedAt ?? null,
  };
};

export const extractArtistSongs = (payload: any): ArtistSongsPage => {
  if (!payload || typeof payload !== 'object') return { songs: [], nextCursor: null, hasMore: false };
  if (Array.isArray(payload)) {
    return { songs: payload.map(extractSong).filter(Boolean) as Song[], nextCursor: null, hasMore: false };
  }
  return {
    songs:      Array.isArray(payload.songs) ? payload.songs.map(extractSong).filter(Boolean) as Song[] : [],
    nextCursor: payload.nextCursor ?? null,
    hasMore:    typeof payload.hasMore === 'boolean' ? payload.hasMore : false,
  };
};

export const getArtist = async (artistId: string): Promise<Artist | null> => {
  const res = await api.get(`/artists/${artistId}`);
  return extractArtist(unwrap(res));
};

export const getArtistSongs = async (
  artistId: string,
  limit = 30,
  cursor: string | null = null,
): Promise<ArtistSongsPage> => {
  const params: Record<string, any> = { limit };
  if (cursor) params.cursor = cursor;
  const res = await api.get(`/artists/${artistId}/songs`, { params });
  return extractArtistSongs(unwrap(res));
};