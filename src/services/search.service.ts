import api from './api';

export const searchSongs = async (query: string, limit = 20): Promise<any[]> => {
  const res = await api.get('/search', { params: { q: query, limit } });
  return res.data?.data ?? res.data ?? [];
};