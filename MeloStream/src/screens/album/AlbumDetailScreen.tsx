import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { Image } from 'expo-image';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAlbum } from '@hooks/useAlbum';
import { usePlayerStore } from '@store/playerStore';
import { useAuthStore } from '@store/authStore';
import { COLORS } from '@constants/colors';
import { TYPOGRAPHY } from '@constants/typography';
import { LAYOUT } from '@constants/layout';

type AlbumDetailRouteParams = { albumId: string };

const PLACEHOLDER = 'https://placehold.co/200x200/1a1a1a/555?text=♪';
const SONG_PLACEHOLDER = 'https://placehold.co/40x40/111/555?text=♪';

function formatDuration(seconds: number | undefined): string {
  if (!seconds || isNaN(seconds)) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = String(Math.floor(seconds % 60)).padStart(2, '0');
  return `${m}:${s}`;
}

function formatTotalDuration(seconds: number): string {
  if (!seconds) return '';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h > 0) return `${h} hr ${m} min`;
  return `${m} min`;
}

export default function AlbumDetailScreen() {
  const route = useRoute<RouteProp<{ params: AlbumDetailRouteParams }, 'params'>>();
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();

  const albumId = route.params?.albumId ?? '';
  const { album, songs, isLoading, isError, error, refetch } = useAlbum(albumId);
  const { setPlaybackContext, logPick, currentSong } = usePlayerStore();
  const { user } = useAuthStore();

  const handlePlaySong = useCallback(
    (song: any, index: number) => {
      logPick?.(song, currentSong, user?.uid ?? '');
      setPlaybackContext('library', albumId ?? '', songs, index);
    },
    [songs, albumId, setPlaybackContext, logPick, currentSong, user?.uid],
  );

  const handlePlayAll = useCallback(() => {
    if (!songs.length) return;
    setPlaybackContext('library', albumId ?? '', songs, 0);
  }, [songs, albumId, setPlaybackContext]);

  const totalSeconds = songs.reduce(
    (acc: number, s: any) => acc + (Number(s.duration) || 0),
    0,
  );

  if (isLoading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (!album && !isLoading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Album not found</Text>
        <Text style={styles.errorMsg}>This album doesn't exist or hasn't been created yet.</Text>
        <TouchableOpacity style={styles.actionBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.actionBtnText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (error && !album) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorTitle}>Could not load album</Text>
        <Text style={styles.errorMsg}>Something went wrong. Please try again.</Text>
        <TouchableOpacity style={styles.actionBtn} onPress={refetch}>
          <Text style={styles.actionBtnText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderSong = ({ item: song, index }: { item: any; index: number }) => {
    const isActive = currentSong?.id === song.id;
    return (
      <Pressable
        style={[styles.songRow, isActive && styles.songRowActive]}
        onPress={() => handlePlaySong(song, index)}
      >
        <Text style={styles.trackNum}>
          {isActive ? '♪' : (song.trackNumber ?? index + 1)}
        </Text>
        <Image
          source={{ uri: song.coverUrl || SONG_PLACEHOLDER }}
          style={styles.songCover}
          contentFit="cover"
        />
        <View style={styles.songInfo}>
          <Text
            style={[styles.songTitle, isActive && { color: COLORS.primary }]}
            numberOfLines={1}
          >
            {song.title}
          </Text>
          <Text style={styles.songArtist} numberOfLines={1}>
            {song.artist}
          </Text>
        </View>
        {Array.isArray(song.tags) && song.tags.length > 0 && (
          <View style={styles.genrePill}>
            <Text style={styles.genrePillText}>{song.tags[0]}</Text>
          </View>
        )}
        <Text style={styles.duration}>{formatDuration(song.duration)}</Text>
      </Pressable>
    );
  };

  return (
    <FlatList
      data={songs}
      keyExtractor={(item) => item.id}
      renderItem={renderSong}
      contentContainerStyle={[
        styles.listContent,
        { paddingBottom: insets.bottom + LAYOUT.miniPlayerHeight + 16 },
      ]}
      removeClippedSubviews
      ListHeaderComponent={
        <>
          {/* Back button */}
          <View style={[styles.backRow, { marginTop: insets.top + 8 }]}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={styles.backText}>← Back</Text>
            </TouchableOpacity>
          </View>

          {/* Hero */}
          <View style={styles.hero}>
            <Image
              source={{ uri: album?.coverUrl || PLACEHOLDER }}
              style={styles.heroCover}
              contentFit="cover"
            />
            <View style={styles.heroMeta}>
              <Text style={styles.typeLabel}>ALBUM</Text>
              <Text style={styles.heroName}>{album?.title ?? 'Unknown Album'} </Text>
              <View style={styles.heroSubRow}>
                {album?.artistId ? (
                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate('ArtistDetail', { artistId: album.artistId })
                    }
                  >
                    <Text style={styles.artistLink}>
                      {album?.artist ?? 'Unknown Artist'}
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <Text style={styles.artistText}>
                    {album?.title ?? 'Unknown Album'}
                  </Text>
                )}
                {album?.year > 0 && (
                  <>
                    <Text style={styles.subDivider}>·</Text>
                    <Text style={styles.subText}>{album?.year}</Text>
                  </>
                )}
              </View>
              <Text style={styles.heroStats}>
                {songs.length} {songs.length === 1 ? 'song' : 'songs'}
                {totalSeconds > 0 ? ` · ${formatTotalDuration(totalSeconds)}` : ''}
              </Text>
              {songs.length > 0 && (
                <TouchableOpacity style={styles.playBtn} onPress={handlePlayAll}>
                  <Text style={styles.playBtnText}>▶  Play Album</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <View style={styles.divider} />
        </>
      }
      ListEmptyComponent={
        <Text style={styles.empty}>No tracks found for this album.</Text>
      }
      ListFooterComponent={
        album?.artistId ? (
          <View style={styles.moreSection}>
            <View style={styles.moreTitleRow}>
              <Text style={styles.sectionTitle}>More by this artist</Text>
              <TouchableOpacity
                onPress={() =>
                  navigation.navigate('ArtistDetail', { artistId: album.artistId })
                }
              >
                <Text style={styles.seeAll}>See all →</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.moreHint}>
              Visit the artist page to explore their full discography.
            </Text>
          </View>
        ) : null
      }
    />
  );
}

const styles = StyleSheet.create({
  centered: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: LAYOUT.spacing.lg,
  },
  errorTitle: {
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold,
    marginBottom: LAYOUT.spacing.sm,
    textAlign: 'center',
  },
  errorMsg: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.sm,
    textAlign: 'center',
    marginBottom: LAYOUT.spacing.lg,
  },
  actionBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: LAYOUT.radius.md,
    paddingHorizontal: LAYOUT.spacing.xl,
    paddingVertical: LAYOUT.spacing.sm,
  },
  actionBtnText: {
    color: COLORS.black,
    fontWeight: TYPOGRAPHY.weights.bold,
    fontSize: TYPOGRAPHY.sizes.base,
  },
  listContent: {
    backgroundColor: COLORS.background,
  },
  backRow: {
    paddingHorizontal: LAYOUT.spacing.md,
    marginBottom: LAYOUT.spacing.sm,
  },
  backBtn: { alignSelf: 'flex-start' },
  backText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  hero: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: LAYOUT.spacing.md,
    paddingHorizontal: LAYOUT.spacing.md,
    paddingBottom: LAYOUT.spacing.lg,
    flexWrap: 'wrap',
  },
  heroCover: {
    width: 140,
    height: 140,
    borderRadius: LAYOUT.radius.lg,
  },
  heroMeta: {
    flex: 1,
    gap: LAYOUT.spacing.xs,
    minWidth: 160,
  },
  typeLabel: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
    letterSpacing: 1.5,
  },
  heroName: {
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.sizes['2xl'],
    fontWeight: TYPOGRAPHY.weights.bold,
    letterSpacing: -0.5,
    lineHeight: TYPOGRAPHY.sizes['2xl'] * 1.15,
  },
  heroSubRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.spacing.xs,
    flexWrap: 'wrap',
  },
  artistLink: {
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.weights.semibold,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  artistText: {
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.weights.semibold,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  subDivider: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  subText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  heroStats: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
  },
  playBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: LAYOUT.radius.md,
    paddingHorizontal: LAYOUT.spacing.lg,
    paddingVertical: LAYOUT.spacing.sm,
    alignSelf: 'flex-start',
    marginTop: LAYOUT.spacing.xs,
  },
  playBtnText: {
    color: COLORS.black,
    fontWeight: TYPOGRAPHY.weights.bold,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: LAYOUT.spacing.md,
    marginBottom: LAYOUT.spacing.sm,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.spacing.sm,
    paddingVertical: LAYOUT.spacing.sm,
    paddingHorizontal: LAYOUT.spacing.md,
    borderRadius: LAYOUT.radius.md,
  },
  songRowActive: {
    backgroundColor: COLORS.rowActiveBg,
  },
  trackNum: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    width: 24,
    textAlign: 'center',
  },
  songCover: {
    width: 40,
    height: 40,
    borderRadius: LAYOUT.radius.sm,
  },
  songInfo: {
    flex: 1,
    minWidth: 0,
  },
  songTitle: {
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    marginBottom: 2,
  },
  songArtist: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
  },
  genrePill: {
    backgroundColor: 'rgba(108,99,255,0.1)',
    borderRadius: LAYOUT.radius.xs,
    paddingHorizontal: LAYOUT.spacing.sm,
    paddingVertical: 2,
  },
  genrePillText: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  duration: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    minWidth: 36,
    textAlign: 'right',
  },
  empty: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    padding: LAYOUT.spacing.lg,
  },
  moreSection: {
    marginTop: LAYOUT.spacing.xl,
    paddingHorizontal: LAYOUT.spacing.md,
    paddingBottom: LAYOUT.spacing.md,
  },
  moreTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: LAYOUT.spacing.xs,
  },
  sectionTitle: {
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  seeAll: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  moreHint: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
});