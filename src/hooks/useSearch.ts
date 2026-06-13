// src/hooks/useSearch.ts

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@constants/queryKeys';
import { searchSongs } from '@services/search.service';
import { useErrorHandler } from '@hooks/useErrorHandler';
import type { Song } from '../types/song';

interface SearchResult {
  songs: Song[];
  total: number;
  query: string;
}

interface UseSearchReturn {
  songs: Song[];
  total: number;
  data: SearchResult | undefined;
  isLoading: boolean;
  isFetching: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
}

export const useSearch = (rawQuery = '', limit = 20): UseSearchReturn => {
  const normalised = (rawQuery ?? '').trim();
  const [debouncedQuery, setDebouncedQuery] = useState(normalised);

  // 400ms API debounce (SearchBar owns its own 300ms URL debounce)
  useEffect(() => {
    const q = (rawQuery ?? '').trim();
    const timer = setTimeout(() => setDebouncedQuery(q), 400);
    return () => clearTimeout(timer);
  }, [rawQuery]);

  const result = useQuery<SearchResult, Error>({
    queryKey: [QUERY_KEYS.SEARCH, debouncedQuery, limit],
    queryFn: async () => {
  const songs = await searchSongs(debouncedQuery, limit);
  return { songs, total: songs.length, query: debouncedQuery };
},
    enabled: debouncedQuery.length > 1,
    staleTime: 30_000,
    placeholderData: { songs: [], total: 0, query: '' },
  });

  useErrorHandler({
    error: result.error,
    isError: result.isError,
    context: 'loading search results',
  });

  return {
    songs: result.data?.songs ?? [],
    total: result.data?.total ?? 0,
    data: result.data,
    isLoading: result.isLoading,
    isFetching: result.isFetching,
    isError: result.isError,
    error: result.error ?? null,
    refetch: result.refetch,
  };
};