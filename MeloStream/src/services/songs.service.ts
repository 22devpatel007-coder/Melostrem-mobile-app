import api from './api';

const _audioUrlCache = new Map<string, { url: string; expiresAt: number }>();
const AUDIO_URL_CACHE_TTL_MS = 300_000;

const unwrap = (res: any) => {
  const body = res?.data ?? res;
  return body != null ? body : {};
};

export const extractSong = (payload: any) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  return {
    id:          typeof payload.id          === 'string'  ? payload.id               : '',
    title:       typeof payload.title       === 'string'  ? payload.title.trim()     : '',
    artist:      typeof payload.artist      === 'string'  ? payload.artist.trim()    : '',
    tags:        Array.isArray(payload.tags) ? payload.tags.map(String) : [],
    album:       typeof payload.album       === 'string'  ? payload.album.trim()     : '',
    duration:    typeof payload.duration    === 'number'  ? payload.duration         : 0,
    coverUrl:    typeof payload.coverUrl    === 'string'  ? payload.coverUrl         : '',
    titleLower:  typeof payload.titleLower  === 'string'  ? payload.titleLower       : '',
    artistLower: typeof payload.artistLower === 'string'  ? payload.artistLower      : '',
    artistId:    payload.artistId    ?? null,
    albumId:     payload.albumId     ?? null,
    trackNumber: payload.trackNumber != null ? Number(payload.trackNumber) || null : null,
    playCount:   typeof payload.playCount   === 'number'  ? payload.playCount        : 0,
    featured:    typeof payload.featured    === 'boolean' ? payload.featured         : false,
    uploadedBy:  typeof payload.uploadedBy  === 'string'  ? payload.uploadedBy       : '',
    createdAt:   payload.createdAt  ?? null,
    updatedAt:   payload.updatedAt  ?? null,
  };
};

const extractSongs = (payload: any) => {
  if (!payload || typeof payload !== 'object') return { songs: [], nextCursor: null, hasMore: false };
  if (Array.isArray(payload)) return { songs: payload.map(extractSong).filter(Boolean), nextCursor: null, hasMore: false };
  const songs      = Array.isArray(payload.songs) ? payload.songs.map(extractSong).filter(Boolean) : [];
  const nextCursor = payload.nextCursor ?? null;
  const hasMore    = typeof payload.hasMore === 'boolean' ? payload.hasMore : false;
  return { songs, nextCursor, hasMore };
};

const extractSongForPlay = (payload: any) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  return {
    id:       typeof payload.id === 'string' ? payload.id : '',
    audioUrl: payload.audioUrl || payload.fileUrl || '',
  };
};

export const getSongs = async (limit = 20, cursor: string | null = null) => {
  const params: any = { limit };
  if (cursor) params.cursor = cursor;
  const res = await api.get('/songs', { params });
  const normalized = extractSongs(unwrap(res));
  return {
    songs:      Array.isArray(normalized.songs) ? normalized.songs : [],
    nextCursor: normalized.nextCursor ?? null,
    hasMore:    normalized.nextCursor != null && normalized.hasMore === true,
  };
};

export const getSongAudioUrl = async (id: string): Promise<string> => {
  const cached = _audioUrlCache.get(id);
  if (cached && Date.now() < cached.expiresAt) return cached.url;
  try {
    const res  = await api.get(`/songs/${id}`);
    const data = extractSongForPlay(unwrap(res));
    const url  = data?.audioUrl || '';
    if (url) _audioUrlCache.set(id, { url, expiresAt: Date.now() + AUDIO_URL_CACHE_TTL_MS });
    return url;
  } catch (err: any) {
    console.warn('[songs.service] getSongAudioUrl failed:', err.message);
    return '';
  }
};

export const getSongById = async (id: string) => {
  const res     = await api.get(`/songs/${id}`);
  const payload = unwrap(res);
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return null;
  const audioUrl = payload.audioUrl || payload.fileUrl || '';
  return { ...extractSong(payload), audioUrl, fileUrl: audioUrl };
};

export const createSong = async (formData: FormData) => {
  const res = await api.post('/songs', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
  return extractSong(unwrap(res));
};

export const updateSong = async (id: string, data: any) => {
  const res = await api.patch(`/songs/${id}`, data);
  return extractSong(unwrap(res));
};

export const deleteSong = async (id: string) => {
  const res = await api.delete(`/songs/${id}`);
  return unwrap(res);
};

export const bulkDeleteSongs = async (ids: string[]) => {
  const res = await api.delete('/songs/bulk-delete', { data: { ids } });
  return res?.data ?? {};
};