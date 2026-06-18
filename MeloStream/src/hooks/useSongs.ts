import { useEffect, useRef, useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@constants/queryKeys';
import { getSongs, getShuffledSongIds } from '@services/songs.service';
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
  const [shuffleOrder, setShuffleOrder] = useState<string[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    getShuffledSongIds().then((ids) => {
      if (!cancelled) setShuffleOrder(ids);
    });
    return () => { cancelled = true; };
  }, []);

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
      shuffleOrder: shuffleOrder ?? [],
    });
  }, [query.fetchNextPage, shuffleOrder]); // eslint-disable-line react-hooks/exhaustive-deps

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