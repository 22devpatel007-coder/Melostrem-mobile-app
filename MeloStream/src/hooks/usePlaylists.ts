// src/hooks/usePlaylists.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@constants/queryKeys';
import {
  fetchAdminPlaylists,
  fetchUserPlaylists,
  createPlaylist as createPlaylistREST,
  updatePlaylist as updatePlaylistREST,
  deletePlaylist as deletePlaylistREST,
  addSongToPlaylist as addSongREST,
  removeSongFromPlaylist as removeSongREST,
  reorderPlaylistSongs as reorderREST,
} from '@services/playlists.service';
import { useAuthStore } from '@store/authStore';
import { useErrorHandler } from '@hooks/useErrorHandler';
import type { Playlist } from '../types/playlist';

// ── useUserPlaylists ──────────────────────────────────────────────────────────
export const useUserPlaylists = () => {
  const uid = useAuthStore((s) => s.user?.uid ?? null);

  const query = useQuery<Playlist[], Error>({
    queryKey: [QUERY_KEYS.USER_PLAYLISTS, uid],
    queryFn: () => fetchUserPlaylists(uid!),
    enabled: !!uid,
    staleTime: 30_000,
    gcTime: 5 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  useErrorHandler({ error: query.error, isError: query.isError, context: 'loading playlists' });

  return {
    playlists: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ?? null,
    refetch: query.refetch,
  };
};

// ── useAdminPlaylists ─────────────────────────────────────────────────────────
export const useAdminPlaylists = () => {
  const query = useQuery<Playlist[], Error>({
    queryKey: [QUERY_KEYS.ADMIN_PLAYLISTS],
    queryFn: fetchAdminPlaylists,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  useErrorHandler({ error: query.error, isError: query.isError, context: 'loading playlists' });

  return {
    adminPlaylists: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ?? null,
    refetch: query.refetch,
  };
};

// ── usePlaylists (admin CRUD) ─────────────────────────────────────────────────
export const usePlaylists = () => {
  const qc = useQueryClient();
  const invalidate = () => qc.invalidateQueries({ queryKey: [QUERY_KEYS.PLAYLISTS] });

  const query = useQuery<Playlist[], Error>({
    queryKey: [QUERY_KEYS.PLAYLISTS],
    queryFn: fetchAdminPlaylists,
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  useErrorHandler({ error: query.error, isError: query.isError, context: 'loading playlists' });

  const create     = useMutation({ mutationFn: createPlaylistREST, onSuccess: invalidate });
  const update     = useMutation({ mutationFn: ({ id, data }: { id: string; data: object }) => updatePlaylistREST(id, data), onSuccess: invalidate });
  const remove     = useMutation({ mutationFn: deletePlaylistREST, onSuccess: invalidate });
  const addSong    = useMutation({ mutationFn: ({ playlistId, songId }: { playlistId: string; songId: string }) => addSongREST(playlistId, songId), onSuccess: invalidate });
  const removeSong = useMutation({ mutationFn: ({ playlistId, songId }: { playlistId: string; songId: string }) => removeSongREST(playlistId, songId), onSuccess: invalidate });
  const reorder = useMutation({ mutationFn: ({ playlistId, songIds }: { playlistId: string; songIds: string[] }) => reorderREST(playlistId, songIds), onSuccess: invalidate });
  return {
    playlists: query.data ?? [],
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ?? null,
    refetch: query.refetch,
    createPlaylist: create.mutate,
    updatePlaylist: update.mutate,
    deletePlaylist: remove.mutate,
    addSongToPlaylist: addSong.mutate,
    removeSongFromPlaylist: removeSong.mutate,
    reorderSongs: reorder.mutate,
  };
};