// src/hooks/useArtist.ts

import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { useCallback } from 'react';
import { getArtist, getArtistSongs } from '@services/artists.service';
import { QUERY_KEYS } from '@constants/queryKeys';
import type { Artist, ArtistSongsPage } from '@services/artists.service';
import type { Song } from '../types/song';

const SONGS_PER_PAGE = 30;

export const useArtist = (artistId?: string | null, { songLimit = SONGS_PER_PAGE } = {}) => {
  const isValid = !!artistId && typeof artistId === 'string';

  const artistQuery = useQuery<Artist | null, Error>({
    queryKey: [QUERY_KEYS.ARTIST, artistId],
    queryFn: () => getArtist(artistId!),
    enabled: isValid,
    staleTime: 5 * 60_000,
    retry: (count, error: any) => error?.response?.status === 404 ? false : count < 2,
  });

  const songsQuery = useInfiniteQuery<ArtistSongsPage, Error>({
    queryKey: [QUERY_KEYS.ARTIST_SONGS, artistId],
    queryFn: ({ pageParam }) => getArtistSongs(artistId!, songLimit, pageParam as string | null),
    getNextPageParam: (last) => last.hasMore ? last.nextCursor : undefined,
    initialPageParam: null,
    enabled: isValid,
    staleTime: 2 * 60_000,
  });

  const songs: Song[] = songsQuery.data?.pages.flatMap((p) => p.songs) ?? [];
  const error = artistQuery.error ?? songsQuery.error ?? null;
  const isError = artistQuery.isError || songsQuery.isError;

  const refetch = useCallback(() => {
    artistQuery.refetch();
    songsQuery.refetch();
  }, [artistQuery, songsQuery]);

  return {
    artist: artistQuery.data ?? null,
    songs,
    isLoading: artistQuery.isLoading,
    isError,
    error,
    refetch,
    fetchNextPage: songsQuery.fetchNextPage,
    hasNextPage: songsQuery.hasNextPage ?? false,
    isFetchingNextPage: songsQuery.isFetchingNextPage,
    isSongsLoading: songsQuery.isLoading,
    songsError: songsQuery.error ?? null,
    refetchArtist: artistQuery.refetch,
    refetchSongs: songsQuery.refetch,
  };
};