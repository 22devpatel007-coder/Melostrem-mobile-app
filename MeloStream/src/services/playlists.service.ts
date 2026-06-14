import api from './api';

// ── Envelope helpers ──────────────────────────────────────────────────────────
const extractArray = (res: any): any[] => {
  if (Array.isArray(res?.data?.data)) return res.data.data;
  if (Array.isArray(res?.data))       return res.data;
  return [];
};

const extractObject = (res: any): any => {
  if (res?.data?.data && typeof res.data.data === 'object') return res.data.data;
  if (res?.data       && typeof res.data       === 'object') return res.data;
  return {};
};


// ── Service functions ─────────────────────────────────────────────────────────
export const getPlaylists      = async () => extractArray(await api.get('/playlists'));
export const getPlaylistById   = async (id: string) => extractObject(await api.get(`/playlists/${id}`));
export const createPlaylist    = async (data: any) => extractObject(await api.post('/playlists', data));
export const updatePlaylist    = async (id: string, data: any) => extractObject(await api.put(`/playlists/${id}`, data));
export const deletePlaylist    = async (id: string) => { const res = await api.delete(`/playlists/${id}`); return res?.data?.data ?? res?.data ?? { deleted: true }; };
export const addSongToPlaylist = async (playlistId: string, songId: string) => extractObject(await api.post(`/playlists/${playlistId}/songs`, { songId }));
export const removeSongFromPlaylist = async (playlistId: string, songId: string) => { const res = await api.delete(`/playlists/${playlistId}/songs/${songId}`); return res?.data?.data ?? res?.data ?? { removed: true }; };
export const reorderPlaylistSongs = async (playlistId: string, songIds: string[]) =>
  extractObject(await api.put(`/playlists/${playlistId}/songs/reorder`, { songIds }));

export const fetchAdminPlaylists = async (): Promise<any[]> => {
  try {
    return extractArray(await api.get('/playlists/admin'));
  } catch (err: any) {
    console.error('[playlists.service] fetchAdminPlaylists:', err.message);
    throw err;
  }
};

export const fetchUserPlaylists = async (uid?: string | null): Promise<any[]> => {
  if (!uid) return [];
  try {
    return extractArray(await api.get(`/users/${uid}/playlists`));
  } catch (err: any) {
    console.error('[playlists.service] fetchUserPlaylists:', err.message);
    throw err;
  }
};

export const getPlaylistSongs = async (songIds: string[]): Promise<any[]> => {
  if (!Array.isArray(songIds) || songIds.length === 0) return [];
  const uniqueIds = [...new Set(songIds.filter(Boolean))];
  if (!uniqueIds.length) return [];
  try {
    const res   = await api.post('/songs/batch', { ids: uniqueIds });
    const songs = res?.data?.data ?? res?.data ?? [];
    if (!Array.isArray(songs)) return [];
    const songMap = new Map(songs.filter((s: any) => s?.id).map((s: any) => [s.id, s]));
    return uniqueIds.reduce((acc: any[], id) => { const s = songMap.get(id); if (s) acc.push(s); return acc; }, []);
  } catch (err: any) {
    console.error('[playlists.service] getPlaylistSongs:', err.message);
    throw err;
  }
};

export const getPlaylistSongsPaged = async (songIds: string[], page = 0, limit = 20) => {
  if (!Array.isArray(songIds) || songIds.length === 0) return { songs: [], hasMore: false, nextPage: null };
  const uniqueIds = [...new Set(songIds.filter(Boolean))];
  const pageIds   = uniqueIds.slice(page * limit, page * limit + limit);
  if (!pageIds.length) return { songs: [], hasMore: false, nextPage: null };
  try {
    const res   = await api.post('/songs/batch', { ids: pageIds });
    const songs = res?.data?.data ?? res?.data ?? [];
    if (!Array.isArray(songs)) return { songs: [], hasMore: false, nextPage: null };
    const songMap = new Map(songs.filter((s: any) => s?.id).map((s: any) => [s.id, s]));
    const ordered = pageIds.reduce((acc: any[], id) => { const s = songMap.get(id); if (s) acc.push(s); return acc; }, []);
    const hasMore = page * limit + limit < uniqueIds.length;
    return { songs: ordered, hasMore, nextPage: hasMore ? page + 1 : null };
  } catch (err: any) {
    console.error('[playlists.service] getPlaylistSongsPaged:', err.message);
    throw err;
  }
};