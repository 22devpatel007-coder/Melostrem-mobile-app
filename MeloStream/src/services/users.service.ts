import api from './api';

// ── Envelope helpers ──────────────────────────────────────────────────────────
const extractArray = (res: any): any[] => {
  if (Array.isArray(res?.data?.data)) return res.data.data;
  if (Array.isArray(res?.data))       return res.data;
  return [];
};

const extractObject = (res: any): any | null => {
  if (res?.data?.data && typeof res.data.data === 'object') return res.data.data;
  if (res?.data       && typeof res.data       === 'object') return res.data;
  return null;
};

// ── Service functions ─────────────────────────────────────────────────────────
export const getUsers         = async () => extractArray(await api.get('/users'));
export const getUserById      = async (uid: string) => extractObject(await api.get(`/users/${uid}`));
export const updateUserRole   = async (uid: string, role: string) => extractObject(await api.put(`/users/${uid}/role`, { role }));
export const getLikedSongs    = async (uid: string) => extractArray(await api.get(`/users/${uid}/liked-songs`));
export const toggleLikeSong   = async (uid: string, songId: string) => extractArray(await api.post(`/users/${uid}/liked-songs/${songId}`));
export const sendHeartbeat    = (uid: string) => api.post(`/users/${uid}/heartbeat`);
export const sendOffline      = (uid: string) => api.post(`/users/${uid}/offline`);
export const getRecentPlays   = async (uid: string, limit = 20) => extractArray(await api.get(`/users/${uid}/recent-plays`, { params: { limit } }));
export const getUserPlaylists = async (uid: string) => extractArray(await api.get(`/users/${uid}/playlists`));
export const getSessionData   = async (uid: string) => extractObject(await api.get(`/users/${uid}/session`));
export const updateListenSession = (uid: string, action: string, durationSeconds: number) =>
  api.patch(`/users/${uid}/listen-session`, { action, durationSeconds });