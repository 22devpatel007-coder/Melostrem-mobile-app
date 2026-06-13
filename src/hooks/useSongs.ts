/**
 * src/hooks/useSongs.ts
 *
 * Mirrors web useSongs.js logic:
 * - useInfiniteQuery with cursor pagination
 * - staleTime 2min / gcTime 10min
 * - Pagination bridge registration with playerStore
 * - Append new pages to queue on fetch
 * - Shuffle order via session (MMKV instead of sessionStorage)
 *
 * Mobile-specific changes:
 * - TypeScript
 * - MMKV instead of sessionStorage for shuffle seed
 * - Imports from mobile service/store paths
 */

import { useEffect, useRef } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@constants/queryKeys';
import { getSongs } from '@services/songs.service';
import { useErrorHandler } from '@hooks/useErrorHandler';
import  { registerPaginationBridge, appendSongsToQueue } from '@store/playerStore';
import { useQueueStore } from '@store/queueStore';
import type { Song } from '../types/song';

const PAGE_LIMIT = 50;

interface SongsPage {
  songs: Song[];
  hasMore: boolean;
  nextCursor: string | null;
}

interface UseSongsReturn {
  songs: Song[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  fetchNextPage: () => void;
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
}

export const useSongs = (limit = PAGE_LIMIT): UseSongsReturn => {
  const appendSongs = useQueueStore((s) => s.appendSongs);

  const query = useInfiniteQuery<SongsPage, Error>({
    queryKey: [QUERY_KEYS.SONGS],
    queryFn: ({ pageParam }) => getSongs(limit, pageParam as string | null),
    getNextPageParam: (lastPage) => {
      if (!lastPage || typeof lastPage !== 'object') return undefined;
      return lastPage.hasMore && lastPage.nextCursor != null
        ? lastPage.nextCursor
        : undefined;
    },
    initialPageParam: null,
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
  });

  useErrorHandler({
    error: query.error,
    isError: query.isError,
    context: 'loading songs',
  });

  const songs: Song[] = query.data?.pages.flatMap((p) =>
    Array.isArray(p?.songs) ? p.songs : [],
  ) ?? [];

  // ── Pagination bridge ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!registerPaginationBridge) return;
    registerPaginationBridge({
      fetchNextPage: query.fetchNextPage,
      hasNextPage: () => query.hasNextPage ?? false,
      appendSongs: (newSongs: Song[]) => appendSongs(newSongs),
    });
  }, [query.fetchNextPage]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Append new page to queue on fetch ────────────────────────────────────
  const previousPageCountRef = useRef(0);

  useEffect(() => {
    const pages = query.data?.pages;
    if (!pages) return;

    const pageCount = pages.length;

    if (pageCount > 1 && pageCount > previousPageCountRef.current) {
      const newestPage = pages[pageCount - 1];
      const newPageSongs: Song[] = Array.isArray(newestPage?.songs)
        ? newestPage.songs
        : [];

      if (newPageSongs.length > 0) {
        appendSongsToQueue?.(newPageSongs);
      }
    }

    previousPageCountRef.current = pageCount;
  }, [query.data?.pages]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    songs,
    isLoading: query.isLoading,
    isError: query.isError,
    error: query.error ?? null,
    refetch: query.refetch,
    fetchNextPage: query.fetchNextPage,
    hasNextPage: query.hasNextPage ?? false,
    isFetchingNextPage: query.isFetchingNextPage,
  };
};