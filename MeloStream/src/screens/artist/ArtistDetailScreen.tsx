// src/screens/artist/ArtistDetailScreen.tsx

import React, { useCallback, useMemo } from 'react';
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
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useArtist } from '@hooks/useArtist';
import { usePlayerStore } from '@store/playerStore';
import { useAuthStore } from '@store/authStore';
import { COLORS } from '@constants/colors';
import { TYPOGRAPHY } from '@constants/typography';
import { LAYOUT } from '@constants/layout';
import type { Song } from '../../types/song';
import type { AppStackParamList } from '../../types/navigation';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

type RouteProps = RouteProp<AppStackParamList, 'ArtistDetail'>;
type AppNavigatorProp = NativeStackNavigationProp<AppStackParamList>;

const SONG_ROW_HEIGHT = 64;

function formatDuration(seconds?: number): string {
  if (!seconds || isNaN(seconds)) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = String(Math.floor(seconds % 60)).padStart(2, '0');
  return `${m}:${s}`;
}

// ── Skeleton ──────────────────────────────────────────────────────────────────
const Skeleton = React.memo(() => (
  <View style={styles.skeletonWrap}>
    <View style={styles.skeletonHero} />
    {Array.from({ length: 8 }).map((_, i) => (
      <View key={i} style={styles.skeletonRow}>
        <View style={styles.skeletonCover} />
        <View style={styles.skeletonMeta}>
          <View style={[styles.skeletonLine, { width: '55%' }]} />
          <View style={[styles.skeletonLine, { width: '35%', marginTop: 6 }]} />
        </View>
      </View>
    ))}
  </View>
));

// ── Song row ──────────────────────────────────────────────────────────────────
interface SongRowProps {
  song: Song;
  index: number;
  isActive: boolean;
  onPress: (song: Song, index: number) => void;
}

const SongRow = React.memo<SongRowProps>(({ song, index, isActive, onPress }) => (
  <Pressable
    onPress={() => onPress(song, index)}
    style={({ pressed }) => [
      styles.songRow,
      isActive && styles.songRowActive,
      pressed && styles.songRowPressed,
    ]}
  >
    <Text style={styles.rowNum}>{isActive ? '♪' : index + 1}</Text>
    <Image source={{ uri: song.coverUrl }} style={styles.songCover} contentFit="cover" transition={200} />
    <View style={styles.songMeta}>
      <Text style={[styles.songTitle, isActive && styles.songTitleActive]} numberOfLines={1}>
        {song.title}
      </Text>
      <Text style={styles.songArtist} numberOfLines={1}>{song.artist}</Text>
    </View>
    {Array.isArray(song.tags) && song.tags.length > 0 && (
      <View style={styles.genreBadge}>
        <Text style={styles.genreBadgeText}>{song.tags[0]}</Text>
      </View>
    )}
    <Text style={styles.duration}>{formatDuration(song.duration)}</Text>
  </Pressable>
));

// ── ArtistDetailScreen ────────────────────────────────────────────────────────
export const ArtistDetailScreen = React.memo(() => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<AppNavigatorProp>();
  const route = useRoute<RouteProps>();
  const { artistId } = route.params;

  const {
    artist, songs,
    isLoading, isError,
    fetchNextPage, hasNextPage, isFetchingNextPage,
    refetch,
  } = useArtist(artistId);

  const currentSong        = usePlayerStore((s) => s.currentSong);
  const setPlaybackContext = usePlayerStore((s) => s.setPlaybackContext);
  const logPick            = usePlayerStore((s) => s.logPick);
  const { user }           = useAuthStore();

  const handlePlayAll = useCallback(() => {
    if (!songs.length) return;
    setPlaybackContext('library', artistId, songs, 0);
  }, [songs, artistId, setPlaybackContext]);

  const handleSongPress = useCallback((song: Song, index: number) => {
    logPick?.(song, currentSong, user?.uid ?? '');
    setPlaybackContext('library', artistId, songs, index);
  }, [songs, artistId, setPlaybackContext, logPick, currentSong, user?.uid]);

  // ── Albums from songs ─────────────────────────────────────────────────────
  const albums = useMemo(() => {
    const map = new Map<string, { albumId: string; albumName: string; coverUrl: string }>();
    songs.forEach((song) => {
      if (song.albumId && !map.has(song.albumId)) {
        map.set(song.albumId, {
          albumId: song.albumId,
          albumName: song.album || 'Unknown Album',
          coverUrl: song.coverUrl || '',
        });
      }
    });
    return Array.from(map.values());
  }, [songs]);

  const keyExtractor = useCallback((item: Song) => item.id, []);

  const getItemLayout = useCallback((_: any, index: number) => ({
    length: SONG_ROW_HEIGHT,
    offset: SONG_ROW_HEIGHT * index,
    index,
  }), []);

  const renderSong = useCallback(({ item, index }: { item: Song; index: number }) => (
    <SongRow
      song={item}
      index={index}
      isActive={currentSong?.id === item.id}
      onPress={handleSongPress}
    />
  ), [currentSong?.id, handleSongPress]);

  const ListHeader = useMemo(() => (
    <View>
      {/* Hero */}
      <View style={styles.hero}>
        {artist?.imageUrl ? (
          <Image source={{ uri: artist.imageUrl }} style={styles.heroImg} contentFit="cover" />
        ) : (
          <View style={styles.heroImgPlaceholder}>
            <Text style={styles.heroImgPlaceholderText}>♪</Text>
          </View>
        )}
        <View style={styles.heroMeta}>
          <View style={styles.typeRow}>
            <Text style={styles.typeLabel}>ARTIST</Text>
            {artist?.verified && (
              <View style={styles.verifiedBadge}>
                <Text style={styles.verifiedText}>✓ Verified</Text>
              </View>
            )}
          </View>
          <Text style={styles.heroName}>{artist?.name}</Text>
          {artist?.bio ? <Text style={styles.heroBio}>{artist.bio}</Text> : null}
          <View style={styles.heroStats}>
            <Text style={styles.statItem}>{artist?.songCount ?? songs.length} songs</Text>
            {(artist?.albumCount ?? albums.length) > 0 && (
              <Text style={styles.statItem}>{artist?.albumCount ?? albums.length} albums</Text>
            )}
          </View>
          {songs.length > 0 && (
            <TouchableOpacity style={styles.playBtn} onPress={handlePlayAll}>
              <Text style={styles.playBtnText}>▶  Play All</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.divider} />
      <Text style={styles.sectionTitle}>Songs</Text>

      {songs.length === 0 && !isLoading && (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No songs found for this artist.</Text>
        </View>
      )}
    </View>
  ), [artist, songs.length, albums.length, isLoading, handlePlayAll]);

  const ListFooter = useMemo(() => (
    <View>
      {isFetchingNextPage && (
        <View style={styles.loadingMore}>
          <ActivityIndicator size="small" color={COLORS.primary} />
        </View>
      )}
      {/* Discography */}
      {albums.length > 0 && (
        <View style={styles.discography}>
          <Text style={styles.sectionTitle}>Discography</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.albumScroll}>
            {albums.map((alb) => (
              <TouchableOpacity
                key={alb.albumId}
                style={styles.albumCard}
                onPress={() => navigation.navigate('AlbumDetail', { albumId: alb.albumId })}
                activeOpacity={0.75}
              >
                <Image source={{ uri: alb.coverUrl }} style={styles.albumCover} contentFit="cover" />
                <Text style={styles.albumName} numberOfLines={2}>{alb.albumName}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
      <View style={{ height: LAYOUT.miniPlayerHeight + LAYOUT.tabBarHeight + LAYOUT.spacing.md }} />
    </View>
  ), [isFetchingNextPage, albums, navigation]);

  // ── States ────────────────────────────────────────────────────────────────
  if (isLoading) return <Skeleton />;

  if (isError || (!artist && !isLoading)) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>{!artist ? 'Artist not found' : 'Could not load artist'}</Text>
        <Text style={styles.errorSub}>{!artist ? "This artist doesn't exist." : 'Something went wrong.'}</Text>
        {isError && (
          <TouchableOpacity style={styles.retryBtn} onPress={refetch}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
        <Text style={styles.backBtnText}>← Back</Text>
      </TouchableOpacity>

      <FlatList
        data={songs}
        keyExtractor={keyExtractor}
        renderItem={renderSong}
        getItemLayout={getItemLayout}
        removeClippedSubviews
        maxToRenderPerBatch={15}
        windowSize={10}
        initialNumToRender={15}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        onEndReached={() => hasNextPage && !isFetchingNextPage && fetchNextPage()}
        onEndReachedThreshold={0.4}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
});

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  backBtn: { paddingHorizontal: LAYOUT.spacing.md, paddingVertical: LAYOUT.spacing.sm },
  backBtnText: { fontSize: TYPOGRAPHY.sizes.sm, color: COLORS.primary, fontFamily: TYPOGRAPHY.families.sans },

  // ── Hero ──
  hero: { padding: LAYOUT.spacing.md, gap: LAYOUT.spacing.md },
  heroImg: { width: 120, height: 120, borderRadius: 60, alignSelf: 'center', backgroundColor: COLORS.overlay },
  heroImgPlaceholder: {
    width: 120, height: 120, borderRadius: 60, alignSelf: 'center',
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center',
  },
  heroImgPlaceholderText: { fontSize: 40, color: COLORS.textMuted },
  heroMeta: { gap: LAYOUT.spacing.xs },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: LAYOUT.spacing.sm },
  typeLabel: { fontSize: TYPOGRAPHY.sizes.xs, fontWeight: TYPOGRAPHY.weights.bold, color: COLORS.primary, letterSpacing: 1.5, fontFamily: TYPOGRAPHY.families.sans },
  verifiedBadge: { backgroundColor: COLORS.accentMuted, borderWidth: 1, borderColor: 'rgba(34,197,94,0.25)', borderRadius: LAYOUT.radius.full, paddingHorizontal: LAYOUT.spacing.sm, paddingVertical: 2 },
  verifiedText: { fontSize: TYPOGRAPHY.sizes.xs, fontWeight: TYPOGRAPHY.weights.bold, color: COLORS.primary, fontFamily: TYPOGRAPHY.families.sans },
  heroName: { fontSize: TYPOGRAPHY.sizes['3xl'], fontWeight: TYPOGRAPHY.weights.bold, color: COLORS.white, fontFamily: TYPOGRAPHY.families.sans, letterSpacing: -0.5 },
  heroBio: { fontSize: TYPOGRAPHY.sizes.sm, color: COLORS.textSecondary, fontFamily: TYPOGRAPHY.families.sans, lineHeight: 20 },
  heroStats: { flexDirection: 'row', gap: LAYOUT.spacing.lg },
  statItem: { fontSize: TYPOGRAPHY.sizes.sm, color: COLORS.textMuted, fontFamily: TYPOGRAPHY.families.sans },
  playBtn: { alignSelf: 'flex-start', backgroundColor: COLORS.primary, borderRadius: LAYOUT.radius.md, paddingHorizontal: LAYOUT.spacing.xl, paddingVertical: LAYOUT.spacing.sm + 2, marginTop: LAYOUT.spacing.sm },
  playBtnText: { fontSize: TYPOGRAPHY.sizes.sm, fontWeight: TYPOGRAPHY.weights.bold, color: COLORS.black, fontFamily: TYPOGRAPHY.families.sans },

  divider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: LAYOUT.spacing.md, marginBottom: LAYOUT.spacing.md },
  sectionTitle: { fontSize: TYPOGRAPHY.sizes.lg, fontWeight: TYPOGRAPHY.weights.bold, color: COLORS.white, fontFamily: TYPOGRAPHY.families.sans, paddingHorizontal: LAYOUT.spacing.md, marginBottom: LAYOUT.spacing.sm },

  // ── Song row ──
  songRow: { flexDirection: 'row', alignItems: 'center', gap: LAYOUT.spacing.sm, height: SONG_ROW_HEIGHT, paddingHorizontal: LAYOUT.spacing.md },
  songRowActive: { backgroundColor: COLORS.rowActiveBg },
  songRowPressed: { backgroundColor: COLORS.rowHover },
  rowNum: { fontSize: TYPOGRAPHY.sizes.xs, color: COLORS.textMuted, width: 20, textAlign: 'center', fontFamily: TYPOGRAPHY.families.sans },
  songCover: { width: 44, height: 44, borderRadius: LAYOUT.radius.sm, backgroundColor: COLORS.overlay },
  songMeta: { flex: 1, minWidth: 0 },
  songTitle: { fontSize: TYPOGRAPHY.sizes.base, fontWeight: TYPOGRAPHY.weights.medium, color: COLORS.textPrimary, fontFamily: TYPOGRAPHY.families.sans },
  songTitleActive: { color: COLORS.primary },
  songArtist: { fontSize: TYPOGRAPHY.sizes.sm, color: COLORS.textMuted, fontFamily: TYPOGRAPHY.families.sans, marginTop: 2 },
  genreBadge: { backgroundColor: COLORS.accentMuted, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)', borderRadius: LAYOUT.radius.xs, paddingHorizontal: LAYOUT.spacing.sm, paddingVertical: 2 },
  genreBadgeText: { fontSize: 10, fontWeight: TYPOGRAPHY.weights.medium, color: COLORS.primary, fontFamily: TYPOGRAPHY.families.sans },
  duration: { fontSize: TYPOGRAPHY.sizes.xs, color: COLORS.textMuted, fontFamily: TYPOGRAPHY.families.mono, minWidth: 36, textAlign: 'right' },

  separator: { height: 1, backgroundColor: COLORS.rowDivider, marginHorizontal: LAYOUT.spacing.md },

  // ── Discography ──
  discography: { paddingTop: LAYOUT.spacing.lg },
  albumScroll: { paddingHorizontal: LAYOUT.spacing.md, gap: LAYOUT.spacing.md },
  albumCard: { width: 130 },
  albumCover: { width: 130, height: 130, borderRadius: LAYOUT.radius.lg, backgroundColor: COLORS.overlay, marginBottom: LAYOUT.spacing.xs },
  albumName: { fontSize: TYPOGRAPHY.sizes.sm, fontWeight: TYPOGRAPHY.weights.semibold, color: COLORS.textPrimary, fontFamily: TYPOGRAPHY.families.sans },

  loadingMore: { alignItems: 'center', paddingVertical: LAYOUT.spacing.md },

  // ── Empty / error ──
  emptyBox: { alignItems: 'center', paddingVertical: LAYOUT.spacing.xl },
  emptyText: { fontSize: TYPOGRAPHY.sizes.sm, color: COLORS.textMuted, fontFamily: TYPOGRAPHY.families.sans },
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background, padding: LAYOUT.spacing.xl, gap: LAYOUT.spacing.sm },
  errorIcon: { fontSize: 32 },
  errorTitle: { fontSize: TYPOGRAPHY.sizes.lg, fontWeight: TYPOGRAPHY.weights.semibold, color: COLORS.white, fontFamily: TYPOGRAPHY.families.sans, textAlign: 'center' },
  errorSub: { fontSize: TYPOGRAPHY.sizes.sm, color: COLORS.textMuted, fontFamily: TYPOGRAPHY.families.sans, textAlign: 'center' },
  retryBtn: { marginTop: LAYOUT.spacing.sm, backgroundColor: COLORS.primary, paddingHorizontal: LAYOUT.spacing.xl, paddingVertical: LAYOUT.spacing.sm + 2, borderRadius: LAYOUT.radius.md },
  retryText: { fontSize: TYPOGRAPHY.sizes.sm, fontWeight: TYPOGRAPHY.weights.semibold, color: COLORS.black, fontFamily: TYPOGRAPHY.families.sans },

  // ── Skeleton ──
  skeletonWrap: { flex: 1, backgroundColor: COLORS.background, padding: LAYOUT.spacing.md },
  skeletonHero: { height: 220, borderRadius: LAYOUT.radius.xl, backgroundColor: COLORS.surface, marginBottom: LAYOUT.spacing.lg },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: LAYOUT.spacing.md, height: SONG_ROW_HEIGHT, paddingHorizontal: LAYOUT.spacing.sm },
  skeletonCover: { width: 44, height: 44, borderRadius: LAYOUT.radius.sm, backgroundColor: COLORS.surface },
  skeletonMeta: { flex: 1 },
  skeletonLine: { height: 11, borderRadius: LAYOUT.radius.xs, backgroundColor: COLORS.surface },
});