// src/hooks/useLikedSongs.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@constants/queryKeys';
import { getLikedSongs, toggleLikeSong } from '@services/users.service';
import { useErrorHandler } from '@hooks/useErrorHandler';
import type { Song } from '../types/song';

interface UseLikedSongsReturn {
  likedSongs: Song[];
  likedSongIds: string[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  toggleLike: (songId: string) => void;
  isToggling: boolean;
}

export const useLikedSongs = (uid?: string | null): UseLikedSongsReturn => {
  const qc = useQueryClient();

  const query = useQuery<Song[], Error>({
    queryKey: [QUERY_KEYS.LIKED_SONGS, uid],
    queryFn: () => getLikedSongs(uid!),
    enabled: !!uid,
    staleTime: 30_000,
  });

  useErrorHandler({ error: query.error, isError: query.isError, context: 'loading liked songs' });

  const likedSongs = query.data ?? [];
  const likedSongIds = likedSongs.map((s) => s.id);

  // Optimistic toggle — unchanged from web
  const toggle = useMutation<string[], Error, string>({
    mutationFn: (songId) => toggleLikeSong(uid!, songId),

    onMutate: async (songId) => {
      await qc.cancelQueries({ queryKey: [QUERY_KEYS.LIKED_SONGS, uid] });
      const previous = qc.getQueryData<Song[]>([QUERY_KEYS.LIKED_SONGS, uid]);

      qc.setQueryData<Song[]>([QUERY_KEYS.LIKED_SONGS, uid], (old = []) => {
        const alreadyLiked = old.some((s) => s.id === songId);
        if (alreadyLiked) return old.filter((s) => s.id !== songId);
        return [...old, { id: songId, title: '', artist: '', coverUrl: '', audioUrl: '', duration: 0 } as Song];
      });

      return { previous };
    },

    onError: (_err, _songId, context: any) => {
      qc.setQueryData([QUERY_KEYS.LIKED_SONGS, uid], context?.previous);
    },

    onSettled: () => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.LIKED_SONGS, uid] });
    },
  });

  return {
    likedSongs,
    likedSongIds,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ?? null,
    refetch: query.refetch,
    toggleLike: toggle.mutate,
    isToggling: toggle.isPending,
  };
};

// Standalone toggle for SongCard / context menus
export const useToggleLikeSong = () => {
  const qc = useQueryClient();
  return useMutation<string[], Error, { uid: string; songId: string }>({
    mutationFn: ({ uid, songId }) => toggleLikeSong(uid, songId),
    onSuccess: (_data, { uid }) => {
      qc.invalidateQueries({ queryKey: [QUERY_KEYS.LIKED_SONGS, uid] });
    },
  });
};