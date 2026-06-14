import { useQuery } from '@tanstack/react-query';
import { QUERY_KEYS } from '@constants/queryKeys';
import { fetchAlbumById, fetchAlbumSongs } from '@services/albums.service';
import { useErrorHandler } from '@hooks/useErrorHandler';

export const useAlbum = (albumId: string) => {
  const albumQuery = useQuery({
    queryKey: [QUERY_KEYS.ALBUM, albumId],
    queryFn: () => fetchAlbumById(albumId),
    enabled: !!albumId,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const songsQuery = useQuery({
    queryKey: [QUERY_KEYS.ALBUM_SONGS, albumId],
    queryFn: () => fetchAlbumSongs(albumId),
    enabled: !!albumId,
    staleTime: 2 * 60_000,
    gcTime: 5 * 60_000,
    retry: 1,
    refetchOnWindowFocus: false,
  });

  const isError = albumQuery.isError || songsQuery.isError;
  const error = albumQuery.error ?? songsQuery.error ?? null;

  useErrorHandler({ error, isError, context: 'loading album' });

  const refetch = () => {
    albumQuery.refetch();
    songsQuery.refetch();
  };

  return {
    album:     albumQuery.data ?? null,
    songs:     songsQuery.data ?? [],
    isLoading: albumQuery.isLoading || songsQuery.isLoading,
    isError,
    error,
    refetch,
  };
};