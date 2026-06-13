// src/screens/liked/LikedSongsScreen.tsx

import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Pressable,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLikedSongs } from '@hooks/useLikedSongs';
import { useAuthStore } from '@store/authStore';
import { usePlayerStore } from '@store/playerStore';
import { COLORS } from '@constants/colors';
import { TYPOGRAPHY } from '@constants/typography';
import { LAYOUT } from '@constants/layout';
import type { Song } from '../../types/song';

// ── Genre extraction ──────────────────────────────────────────────────────────
function extractGenres(songs: Song[]): string[] {
  const g = new Set(songs.flatMap((s) => s.tags ?? []).filter(Boolean));
  return ['All', ...Array.from(g).sort()];
}

// ── Sort songs ────────────────────────────────────────────────────────────────
function sortSongs(songs: Song[], sortBy: string): Song[] {
  if (sortBy === 'title')  return [...songs].sort((a, b) => a.title.localeCompare(b.title));
  if (sortBy === 'artist') return [...songs].sort((a, b) => a.artist.localeCompare(b.artist));
  if (sortBy === 'recent') return [...songs].reverse();
  return songs;
}

const SORT_OPTIONS = [
  { key: 'default', label: 'Default' },
  { key: 'recent',  label: 'Recent'  },
  { key: 'title',   label: 'Title'   },
  { key: 'artist',  label: 'Artist'  },
] as const;

type SortKey = 'default' | 'recent' | 'title' | 'artist';

const SONG_ROW_HEIGHT = 64;

// ── Skeleton ──────────────────────────────────────────────────────────────────
const LikedSongsSkeleton = React.memo(() => (
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
  isPlaying: boolean;
  isLiked: boolean;
  onPress: (song: Song, index: number) => void;
  onToggleLike: (songId: string) => void;
}

const SongRow = React.memo<SongRowProps>(({
  song, index, isActive, isPlaying, isLiked, onPress, onToggleLike,
}) => (
  <Pressable
    onPress={() => onPress(song, index)}
    style={({ pressed }) => [
      styles.songRow,
      isActive && styles.songRowActive,
      pressed && styles.songRowPressed,
    ]}
  >
    <Text style={styles.songIndex}>{index + 1}</Text>
    <Image source={{ uri: song.coverUrl }} style={styles.songCover} contentFit="cover" transition={200} />
    <View style={styles.songMeta}>
      <Text style={[styles.songTitle, isActive && styles.songTitleActive]} numberOfLines={1}>
        {song.title}
      </Text>
      <Text style={styles.songArtist} numberOfLines={1}>{song.artist}</Text>
    </View>
    <TouchableOpacity
      onPress={() => onToggleLike(song.id)}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={[styles.heartIcon, isLiked && styles.heartIconActive]}>
        {isLiked ? '♥' : '♡'}
      </Text>
    </TouchableOpacity>
    {isActive && (
      <Text style={styles.playingIndicator}>{isPlaying ? '▶' : '⏸'}</Text>
    )}
  </Pressable>
));

// ── LikedSongsScreen ──────────────────────────────────────────────────────────
export const LikedSongsScreen = React.memo(() => {
  const insets = useSafeAreaInsets();
  const { user } = useAuthStore();

  const { likedSongs, likedSongIds, toggleLike, isLoading, isError, refetch } =
    useLikedSongs(user?.uid);

  const [activeGenre, setActiveGenre] = useState<string>('All');
  const [sortBy, setSortBy] = useState<SortKey>('default');

  const currentSong  = usePlayerStore((s) => s.currentSong);
  const isPlaying    = usePlayerStore((s) => s.isPlaying);
  const setPlaybackContext = usePlayerStore((s) => s.setPlaybackContext);
  const setShuffleMode    = usePlayerStore((s) => s.setShuffleMode);

  // ── Filtered + sorted songs ───────────────────────────────────────────────
  const genres = useMemo(() => extractGenres(likedSongs), [likedSongs]);

  const filteredSongs = useMemo(() => {
    const byGenre = activeGenre === 'All'
      ? likedSongs
      : likedSongs.filter((s) => (s.tags ?? []).includes(activeGenre));
    return sortSongs(byGenre, sortBy);
  }, [likedSongs, activeGenre, sortBy]);

  // ── Play handlers ─────────────────────────────────────────────────────────
  const handleSongPress = useCallback((song: Song, index: number) => {
    setPlaybackContext('liked', 'liked-songs', filteredSongs, index);
  }, [filteredSongs, setPlaybackContext]);

  const handlePlayAll = useCallback(() => {
    if (!filteredSongs.length) return;
    setPlaybackContext('liked', 'liked-songs', filteredSongs, 0);
  }, [filteredSongs, setPlaybackContext]);

  const handleSmartPlay = useCallback(() => {
    if (!filteredSongs.length) return;
    const idx = Math.floor(Math.random() * filteredSongs.length);
    setPlaybackContext('liked', 'liked-songs', filteredSongs, idx);
    setShuffleMode?.('smart');
  }, [filteredSongs, setPlaybackContext, setShuffleMode]);

  // ── FlatList helpers ──────────────────────────────────────────────────────
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
      isPlaying={isPlaying && currentSong?.id === item.id}
      isLiked={likedSongIds.includes(item.id)}
      onPress={handleSongPress}
      onToggleLike={toggleLike}
    />
  ), [currentSong?.id, isPlaying, likedSongIds, handleSongPress, toggleLike]);

  // ── Cover collage (top 4 covers) ──────────────────────────────────────────
  const topCovers = useMemo(
    () => likedSongs.slice(0, 4).map((s) => s.coverUrl).filter(Boolean),
    [likedSongs],
  );

  const ListHeader = useMemo(() => (
    <View>
      {/* Hero */}
      <LinearGradient
        colors={['#1a0a2e', COLORS.background]}
        style={styles.hero}
      >
        {/* Cover collage */}
        <View style={styles.coverGrid}>
          {topCovers.length >= 4 ? (
            <View style={styles.coverGridInner}>
              {topCovers.slice(0, 4).map((uri, i) => (
                <Image key={i} source={{ uri }} style={styles.coverGridItem} contentFit="cover" />
              ))}
            </View>
          ) : topCovers.length > 0 ? (
            <Image source={{ uri: topCovers[0] }} style={styles.coverSingle} contentFit="cover" />
          ) : (
            <View style={styles.coverPlaceholder}>
              <Text style={styles.coverPlaceholderText}>♥</Text>
            </View>
          )}
        </View>

        <Text style={styles.heroTitle}>Liked Songs</Text>
        <Text style={styles.heroCount}>{likedSongs.length} songs</Text>

        {/* Action buttons */}
        <View style={styles.heroActions}>
          <TouchableOpacity style={styles.playAllBtn} onPress={handlePlayAll}>
            <Text style={styles.playAllText}>▶  Play All</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.smartPlayBtn} onPress={handleSmartPlay}>
            <Text style={styles.smartPlayText}>⚡ Smart Play</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>

      {/* Genre filter */}
      {genres.length > 1 && (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.genreScroll}
          style={styles.genreScrollOuter}
        >
          {genres.map((g) => (
            <TouchableOpacity
              key={g}
              onPress={() => setActiveGenre(g)}
              style={[styles.genrePill, activeGenre === g && styles.genrePillActive]}
              activeOpacity={0.7}
            >
              <Text style={[styles.genreText, activeGenre === g && styles.genreTextActive]}>{g}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* Sort bar */}
      <View style={styles.sortBar}>
        <Text style={styles.sortLabel}>Sort</Text>
        <View style={styles.sortOptions}>
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              onPress={() => setSortBy(opt.key)}
              style={[styles.sortBtn, sortBy === opt.key && styles.sortBtnActive]}
            >
              <Text style={[styles.sortBtnText, sortBy === opt.key && styles.sortBtnTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Results count */}
      {activeGenre !== 'All' && (
        <Text style={styles.filteredCount}>
          {filteredSongs.length} {filteredSongs.length === 1 ? 'song' : 'songs'}
        </Text>
      )}
    </View>
  ), [topCovers, likedSongs.length, genres, activeGenre, sortBy, filteredSongs.length, handlePlayAll, handleSmartPlay]);

  const ListFooter = useMemo(() => (
    <View style={{ height: LAYOUT.miniPlayerHeight + LAYOUT.tabBarHeight + LAYOUT.spacing.md }} />
  ), []);

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) return <LikedSongsSkeleton />;

  // ── Error ─────────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Couldn't load your liked songs</Text>
        <Text style={styles.errorSub}>Check your connection and try again.</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={refetch}>
          <Text style={styles.retryText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Empty ─────────────────────────────────────────────────────────────────
  if (likedSongs.length === 0) {
    return (
      <View style={styles.centered}>
        <View style={styles.emptyHeart}>
          <Text style={styles.emptyHeartText}>♡</Text>
        </View>
        <Text style={styles.emptyTitle}>Nothing here yet</Text>
        <Text style={styles.emptySub}>Heart a song to save it here for quick access.</Text>
      </View>
    );
  }

  // ── Full page ─────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <FlatList
        data={filteredSongs}
        keyExtractor={keyExtractor}
        renderItem={renderSong}
        getItemLayout={getItemLayout}
        removeClippedSubviews
        maxToRenderPerBatch={15}
        windowSize={10}
        initialNumToRender={15}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
});

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // ── Hero ──
  hero: {
    alignItems: 'center',
    paddingTop: LAYOUT.spacing.xl,
    paddingBottom: LAYOUT.spacing.lg,
    paddingHorizontal: LAYOUT.spacing.md,
  },
  coverGrid: { marginBottom: LAYOUT.spacing.md },
  coverGridInner: { width: 120, height: 120, flexDirection: 'row', flexWrap: 'wrap', borderRadius: LAYOUT.radius.md, overflow: 'hidden' },
  coverGridItem: { width: 60, height: 60 },
  coverSingle: { width: 120, height: 120, borderRadius: LAYOUT.radius.md },
  coverPlaceholder: {
    width: 120, height: 120, borderRadius: LAYOUT.radius.md,
    backgroundColor: 'rgba(124,58,237,0.18)',
    alignItems: 'center', justifyContent: 'center',
  },
  coverPlaceholderText: { fontSize: 40, color: '#7c3aed' },
  heroTitle: {
    fontSize: TYPOGRAPHY.sizes['2xl'],
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.white,
    fontFamily: TYPOGRAPHY.families.sans,
  },
  heroCount: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textSecondary,
    fontFamily: TYPOGRAPHY.families.sans,
    marginTop: 4,
    marginBottom: LAYOUT.spacing.md,
  },
  heroActions: { flexDirection: 'row', gap: LAYOUT.spacing.sm },
  playAllBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: LAYOUT.radius.md,
    paddingHorizontal: LAYOUT.spacing.xl,
    paddingVertical: LAYOUT.spacing.sm + 2,
  },
  playAllText: { fontSize: TYPOGRAPHY.sizes.sm, fontWeight: TYPOGRAPHY.weights.semibold, color: COLORS.black, fontFamily: TYPOGRAPHY.families.sans },
  smartPlayBtn: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: LAYOUT.radius.md,
    paddingHorizontal: LAYOUT.spacing.md,
    paddingVertical: LAYOUT.spacing.sm + 2,
  },
  smartPlayText: { fontSize: TYPOGRAPHY.sizes.sm, fontWeight: TYPOGRAPHY.weights.medium, color: COLORS.textPrimary, fontFamily: TYPOGRAPHY.families.sans },

  // ── Genre pills ──
  genreScrollOuter: { marginTop: LAYOUT.spacing.md },
  genreScroll: { paddingHorizontal: LAYOUT.spacing.md, gap: LAYOUT.spacing.sm, paddingBottom: LAYOUT.spacing.xs },
  genrePill: {
    paddingHorizontal: LAYOUT.spacing.md, paddingVertical: 6,
    borderRadius: LAYOUT.radius.full, backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
  },
  genrePillActive: { backgroundColor: COLORS.accentMuted, borderColor: COLORS.primary },
  genreText: { fontSize: TYPOGRAPHY.sizes.sm, fontWeight: TYPOGRAPHY.weights.medium, color: COLORS.textSecondary, fontFamily: TYPOGRAPHY.families.sans },
  genreTextActive: { color: COLORS.primary },

  // ── Sort bar ──
  sortBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.spacing.md,
    paddingVertical: LAYOUT.spacing.sm,
    gap: LAYOUT.spacing.sm,
  },
  sortLabel: { fontSize: TYPOGRAPHY.sizes.sm, color: COLORS.textMuted, fontFamily: TYPOGRAPHY.families.sans },
  sortOptions: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.borderMuted,
    borderRadius: LAYOUT.radius.md, overflow: 'hidden', flex: 1,
  },
  sortBtn: { flex: 1, alignItems: 'center', paddingVertical: LAYOUT.spacing.sm },
  sortBtnActive: { backgroundColor: COLORS.accentMuted },
  sortBtnText: { fontSize: TYPOGRAPHY.sizes.xs, color: COLORS.textMuted, fontFamily: TYPOGRAPHY.families.sans },
  sortBtnTextActive: { color: COLORS.primary, fontWeight: TYPOGRAPHY.weights.semibold },

  filteredCount: { fontSize: TYPOGRAPHY.sizes.xs, color: COLORS.textMuted, fontFamily: TYPOGRAPHY.families.sans, paddingHorizontal: LAYOUT.spacing.md, marginBottom: LAYOUT.spacing.sm },

  // ── Song row ──
  songRow: {
    flexDirection: 'row', alignItems: 'center',
    gap: LAYOUT.spacing.sm, height: SONG_ROW_HEIGHT,
    paddingHorizontal: LAYOUT.spacing.md,
  },
  songRowActive: { backgroundColor: COLORS.rowActiveBg },
  songRowPressed: { backgroundColor: COLORS.rowHover },
  songIndex: { fontSize: TYPOGRAPHY.sizes.xs, color: COLORS.textMuted, width: 18, textAlign: 'center', fontFamily: TYPOGRAPHY.families.sans },
  songCover: { width: 44, height: 44, borderRadius: LAYOUT.radius.sm, backgroundColor: COLORS.overlay },
  songMeta: { flex: 1, minWidth: 0 },
  songTitle: { fontSize: TYPOGRAPHY.sizes.base, fontWeight: TYPOGRAPHY.weights.medium, color: COLORS.textPrimary, fontFamily: TYPOGRAPHY.families.sans },
  songTitleActive: { color: COLORS.primary },
  songArtist: { fontSize: TYPOGRAPHY.sizes.sm, color: COLORS.textMuted, fontFamily: TYPOGRAPHY.families.sans, marginTop: 2 },
  heartIcon: { fontSize: 18, color: COLORS.textMuted },
  heartIconActive: { color: COLORS.danger },
  playingIndicator: { fontSize: 11, color: COLORS.primary },

  separator: { height: 1, backgroundColor: COLORS.rowDivider, marginHorizontal: LAYOUT.spacing.md },

  // ── Centered (error/empty) ──
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background, padding: LAYOUT.spacing.xl, gap: LAYOUT.spacing.sm },
  errorIcon: { fontSize: 32 },
  errorTitle: { fontSize: TYPOGRAPHY.sizes.lg, fontWeight: TYPOGRAPHY.weights.semibold, color: COLORS.white, fontFamily: TYPOGRAPHY.families.sans, textAlign: 'center' },
  errorSub: { fontSize: TYPOGRAPHY.sizes.sm, color: COLORS.textMuted, fontFamily: TYPOGRAPHY.families.sans, textAlign: 'center' },
  retryBtn: { marginTop: LAYOUT.spacing.sm, backgroundColor: COLORS.primary, paddingHorizontal: LAYOUT.spacing.xl, paddingVertical: LAYOUT.spacing.sm + 2, borderRadius: LAYOUT.radius.md },
  retryText: { fontSize: TYPOGRAPHY.sizes.sm, fontWeight: TYPOGRAPHY.weights.semibold, color: COLORS.black, fontFamily: TYPOGRAPHY.families.sans },
  emptyHeart: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center', justifyContent: 'center', marginBottom: LAYOUT.spacing.md },
  emptyHeartText: { fontSize: 32, color: COLORS.textMuted },
  emptyTitle: { fontSize: TYPOGRAPHY.sizes.lg, fontWeight: TYPOGRAPHY.weights.semibold, color: COLORS.white, fontFamily: TYPOGRAPHY.families.sans, textAlign: 'center' },
  emptySub: { fontSize: TYPOGRAPHY.sizes.sm, color: COLORS.textMuted, fontFamily: TYPOGRAPHY.families.sans, textAlign: 'center', lineHeight: 20 },

  // ── Skeleton ──
  skeletonWrap: { flex: 1, backgroundColor: COLORS.background, padding: LAYOUT.spacing.md },
  skeletonHero: { height: 260, borderRadius: LAYOUT.radius.xl, backgroundColor: COLORS.surface, marginBottom: LAYOUT.spacing.lg },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: LAYOUT.spacing.md, height: SONG_ROW_HEIGHT, paddingHorizontal: LAYOUT.spacing.sm },
  skeletonCover: { width: 44, height: 44, borderRadius: LAYOUT.radius.sm, backgroundColor: COLORS.surface },
  skeletonMeta: { flex: 1 },
  skeletonLine: { height: 11, borderRadius: LAYOUT.radius.xs, backgroundColor: COLORS.surface },
});