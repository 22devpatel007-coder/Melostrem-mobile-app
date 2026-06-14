import { useQuery, useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { QUERY_KEYS } from '@constants/queryKeys';
import {
  submitSuggestion,
  fetchSuggestions,
  updateSuggestion,
  fetchMySuggestions,
} from '@services/suggestions.service';
import { useAuthStore } from '@store/authStore';

export const useSubmitSuggestion = () =>
  useMutation({ mutationFn: submitSuggestion });

export const useMySubmissions = () => {
  const uid = useAuthStore((s) => s.user?.uid ?? null);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: [QUERY_KEYS.SUGGESTIONS, 'mine', uid],
    queryFn:  fetchMySuggestions,
    enabled:  !!uid,
    staleTime: 30_000,
    retry: 1,
  });
  return { submissions: data ?? [], loading: isLoading, isError, refetch };
};

export const useUpdateSuggestion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: updateSuggestion,
    onSuccess: () => qc.invalidateQueries({ queryKey: [QUERY_KEYS.SUGGESTIONS] }),
  });
};

export const useAdminSuggestions = () => {
  const isAdmin = useAuthStore((s) => s.user?.isAdmin ?? false);
  const query = useInfiniteQuery({
    queryKey: [QUERY_KEYS.SUGGESTIONS, 'admin'],
    queryFn:  fetchSuggestions,
    getNextPageParam: (lastPage: any) => lastPage.nextCursor ?? undefined,
    initialPageParam: null,
    enabled:  isAdmin,
    staleTime: 30_000,
  });
  return {
    suggestions:        query.data?.pages.flatMap((p: any) => p.suggestions) ?? [],
    loading:            query.isLoading,
    isError:            query.isError,
    error:              query.error ?? null,
    refetch:            query.refetch,
    fetchNextPage:      query.fetchNextPage,
    hasNextPage:        query.hasNextPage ?? false,
    isFetchingNextPage: query.isFetchingNextPage ?? false,
  };
};