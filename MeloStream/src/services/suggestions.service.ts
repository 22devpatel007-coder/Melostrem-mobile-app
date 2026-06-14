import api from './api';

const normalizeSuggestion = (raw: any) => ({
  id:           raw?.id           ?? null,
  userId:       raw?.userId       ?? null,
  userEmail:    raw?.userEmail    ?? '',
  link:         raw?.link         ?? '',
  playlistName: raw?.playlistName ?? null,
  status:       raw?.status       ?? 'pending',
  adminMessage: raw?.adminMessage ?? null,
  createdAt:    raw?.createdAt    ?? null,
  updatedAt:    raw?.updatedAt    ?? null,
});

const extractSuggestions = (data: any): any[] => {
  const arr = data?.suggestions ?? data?.data ?? data;
  if (!Array.isArray(arr)) return [];
  return arr.map(normalizeSuggestion);
};

export const submitSuggestion = async ({
  link,
  playlistName,
}: {
  link: string;
  playlistName?: string | null;
}) => {
  const { data } = await api.post('/suggestions', {
    link: link.trim(),
    playlistName: playlistName?.trim() || null,
  });
  return data;
};

export const fetchSuggestions = async ({ pageParam = null }: { pageParam?: any } = {}) => {
  const params = pageParam ? { cursor: pageParam } : {};
  const { data } = await api.get('/suggestions', { params });
  return {
    suggestions: extractSuggestions(data),
    nextCursor:  data?.nextCursor ?? null,
    hasMore:     data?.hasMore    ?? false,
  };
};

export const updateSuggestion = async ({
  id,
  status,
  adminMessage,
}: {
  id: string;
  status: string;
  adminMessage?: string | null;
}) => {
  const { data } = await api.patch(`/suggestions/${id}`, {
    status,
    adminMessage: adminMessage?.trim() || null,
  });
  return data;
};

export const fetchMySuggestions = async (): Promise<any[]> => {
  const { data } = await api.get('/suggestions/mine');
  const arr = data?.suggestions ?? data?.data ?? data;
  if (!Array.isArray(arr)) return [];
  return arr.map(normalizeSuggestion);
};