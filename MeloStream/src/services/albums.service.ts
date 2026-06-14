import api from './api';

// ── Envelope helpers ──────────────────────────────────────────────────────────
const extractArray = (res: any): any[] => {
  if (Array.isArray(res?.data?.data)) return res.data.data;
  if (Array.isArray(res?.data)) return res.data;
  return [];
};

const extractItem = (res: any): any => {
  if (res?.data?.data && typeof res.data.data === 'object') return res.data.data;
  if (res?.data && typeof res.data === 'object') return res.data;
  return null;
};

// ── Model transformer ─────────────────────────────────────────────────────────
const extractAlbum = (raw: any) => ({
  id:          raw?.id          ?? raw?._id          ?? '',
  title:       raw?.title       ?? 'Unknown Album',
  artist:      raw?.artist      ?? 'Unknown Artist',
  artistId:    raw?.artistId    ?? raw?.artist_id    ?? null,
  coverUrl:    raw?.coverUrl    ?? raw?.cover_url    ?? raw?.artwork ?? null,
  year:        raw?.year        ?? raw?.releaseYear  ?? null,
  genre:       raw?.genre       ?? null,
  songCount:   raw?.songCount   ?? raw?.song_count   ?? 0,
  createdAt:   raw?.createdAt   ?? null,
});

// ── API calls ─────────────────────────────────────────────────────────────────
export const fetchAlbums = async () => {
  const res = await api.get('/albums');
  return extractArray(res).map(extractAlbum);
};

export const fetchAlbumById = async (id: string) => {
  const res = await api.get(`/albums/${id}`);
  const raw = extractItem(res);
  if (!raw) throw new Error('Album not found');
  return extractAlbum(raw);
};

export const fetchAlbumSongs = async (id: string) => {
  const res = await api.get(`/albums/${id}/songs`);
  return extractArray(res);
};