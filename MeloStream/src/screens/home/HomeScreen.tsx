/**
 * src/screens/home/HomeScreen.tsx
 *
 * Mobile HomeScreen — matches web Home.jsx design:
 * - Sticky topbar: title + song count left, search right
 * - Recently Played horizontal scroll grid
 * - Genre pills horizontal scroll
 * - All Songs FlatList with infinite scroll
 * - Search filter with debounce (300ms)
 * - Search history via MMKV (Rule 4)
 * - Skeleton loading states
 * - Performance: React.memo, useCallback, useMemo, getItemLayout, removeClippedSubviews
 */

import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Pressable,
  ActivityIndicator,
  StatusBar,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSongs } from '@hooks/useSongs';
import { usePlayerStore } from '@store/playerStore';
import { useAuthStore } from '@store/authStore';
import { COLORS } from '@constants/colors';
import { TYPOGRAPHY } from '@constants/typography';
import { LAYOUT } from '@constants/layout';
import type { Song } from '../../types/song';

import { MMKV } from 'react-native-mmkv';
let _storage: MMKV | null = null;
const getStorage = () => _storage ?? (_storage = new MMKV({ id: 'melostream-search-history' }));
const HISTORY_KEY = 'search_history';
const MAX_HISTORY = 8;

interface HistoryItem {
  id: string;
  title: string;
  artist: string;
  coverUrl: string;
}

function readHistory(): HistoryItem[] {
  try {
    const raw = getStorage().getString(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(items: HistoryItem[]): void {
  try {
    getStorage().set(HISTORY_KEY, JSON.stringify(items));
  } catch {}
}

function addToHistory(song: Song): HistoryItem[] {
  const prev = readHistory().filter((s) => s.id !== song.id);
  const updated = [
    { id: song.id, title: song.title, artist: song.artist, coverUrl: song.coverUrl },
    ...prev,
  ].slice(0, MAX_HISTORY);
  saveHistory(updated);
  return updated;
}

function removeFromHistory(id: string): HistoryItem[] {
  const updated = readHistory().filter((s) => s.id !== id);
  saveHistory(updated);
  return updated;
}

// ── Song row height for getItemLayout ────────────────────────────────────────
const SONG_ROW_HEIGHT = 64;
const SONG_ROW_SEPARATOR = 1;

// ── Skeleton components ───────────────────────────────────────────────────────
const SongRowSkeleton = React.memo(() => (
  <View style={styles.skeletonRow}>
    <View style={styles.skeletonCover} />
    <View style={styles.skeletonMeta}>
      <View style={[styles.skeletonLine, { width: '60%' }]} />
      <View style={[styles.skeletonLine, { width: '40%', marginTop: 6 }]} />
    </View>
  </View>
));

const HomeSkeleton = React.memo(() => (
  <View style={styles.skeletonContainer}>
    {/* Topbar skeleton */}
    <View style={styles.skeletonTopbar}>
      <View style={[styles.skeletonLine, { width: 120, height: 20 }]} />
      <View style={[styles.skeletonLine, { width: 160, height: 36, borderRadius: LAYOUT.radius.lg }]} />
    </View>
    {/* Recent grid skeleton */}
    <View style={styles.skeletonRecentGrid}>
      {Array.from({ length: 4 }).map((_, i) => (
        <View key={i} style={styles.skeletonRecentCard} />
      ))}
    </View>
    {/* Song rows */}
    {Array.from({ length: 8 }).map((_, i) => (
      <SongRowSkeleton key={i} />
    ))}
  </View>
));

// ── Song row ──────────────────────────────────────────────────────────────────
interface SongRowProps {
  song: Song;
  index: number;
  isPlaying: boolean;
  isActive: boolean;
  onPress: (song: Song, index: number) => void;
}

const SongRow = React.memo<SongRowProps>(({ song, index, isPlaying, isActive, onPress }) => {
  const handlePress = useCallback(() => onPress(song, index), [song, index, onPress]);

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.songRow,
        isActive && styles.songRowActive,
        pressed && styles.songRowPressed,
      ]}
    >
      <Image
        source={{ uri: song.coverUrl }}
        style={styles.songCover}
        contentFit="cover"
        transition={200}
      />
      <View style={styles.songMeta}>
        <Text
          style={[styles.songTitle, isActive && styles.songTitleActive]}
          numberOfLines={1}
        >
          {song.title}
        </Text>
        <Text style={styles.songArtist} numberOfLines={1}>
          {song.artist}
        </Text>
      </View>
      {isActive && (
        <View style={styles.songPlayingIndicator}>
          <Text style={styles.songPlayingDot}>
            {isPlaying ? '▶' : '⏸'}
          </Text>
        </View>
      )}
    </Pressable>
  );
});

// ── Recent card ───────────────────────────────────────────────────────────────
interface RecentCardProps {
  item: HistoryItem;
  onPress: (item: HistoryItem) => void;
}

const RecentCard = React.memo<RecentCardProps>(({ item, onPress }) => {
  const handlePress = useCallback(() => onPress(item), [item, onPress]);
  return (
    <TouchableOpacity style={styles.recentCard} onPress={handlePress} activeOpacity={0.7}>
      <Image
        source={{ uri: item.coverUrl }}
        style={styles.recentCover}
        contentFit="cover"
        transition={200}
      />
      <View style={styles.recentMeta}>
        <Text style={styles.recentTitle} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.recentArtist} numberOfLines={1}>{item.artist}</Text>
      </View>
    </TouchableOpacity>
  );
});

// ── History row ───────────────────────────────────────────────────────────────
interface HistoryRowProps {
  item: HistoryItem;
  onPlay: (item: HistoryItem) => void;
  onRemove: (id: string) => void;
}

const HistoryRow = React.memo<HistoryRowProps>(({ item, onPlay, onRemove }) => (
  <TouchableOpacity style={styles.historyRow} onPress={() => onPlay(item)} activeOpacity={0.7}>
    <Image
      source={{ uri: item.coverUrl }}
      style={styles.historyCover}
      contentFit="cover"
    />
    <View style={styles.historyMeta}>
      <Text style={styles.historyTitle} numberOfLines={1}>{item.title}</Text>
      <Text style={styles.historyArtist} numberOfLines={1}>{item.artist}</Text>
    </View>
    <TouchableOpacity
      onPress={() => onRemove(item.id)}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Text style={styles.historyRemove}>✕</Text>
    </TouchableOpacity>
  </TouchableOpacity>
));

// ── HomeScreen ────────────────────────────────────────────────────────────────
export const HomeScreen = React.memo(() => {
  const insets = useSafeAreaInsets();

  const {
    songs,
    isLoading,
    isFetchingNextPage,
    error,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useSongs();

  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const setPlaybackContext = usePlayerStore((s) => s.setPlaybackContext);
  const logPick = usePlayerStore((s) => s.logPick);
  const { user } = useAuthStore();

  const [activeGenre, setActiveGenre] = useState('All');
  const [searchText, setSearchText] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>(readHistory);
  const [recentlyPlayed, setRecentlyPlayed] = useState<HistoryItem[]>(readHistory);

  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const prevSongRef = useRef<Song | null>(null);

  // ── Track song change → logPick + history ─────────────────────────────────
  useEffect(() => {
    if (!currentSong) return;
    if (prevSongRef.current?.id === currentSong.id) return;
    const prev = prevSongRef.current;
    prevSongRef.current = currentSong;
    logPick?.(currentSong, prev, user?.uid ?? '');
    const updated = addToHistory(currentSong);
    setHistory(updated);
    setRecentlyPlayed(updated);
  }, [currentSong, logPick, user?.uid]);

  // ── Search debounce ───────────────────────────────────────────────────────
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchText);
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchText]);

  // ── Derived data ──────────────────────────────────────────────────────────
  const genres = useMemo(() => {
    const g = new Set(songs.flatMap((s) => (s.tags ?? [])).filter(Boolean));
    return ['All', ...Array.from(g).sort()];
  }, [songs]);

  const filtered = useMemo(() => {
    let r = activeGenre === 'All'
      ? songs
      : songs.filter((s) => (s.tags ?? []).includes(activeGenre));
    if (debouncedSearch.trim().length >= 1) {
      const q = debouncedSearch.trim().toLowerCase();
      r = r.filter(
        (s) =>
          (s.title || '').toLowerCase().includes(q) ||
          (s.artist || '').toLowerCase().includes(q),
      );
    }
    return r;
  }, [songs, activeGenre, debouncedSearch]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSongPress = useCallback((song: Song, index: number) => {
    setPlaybackContext('library', null, filtered, index);
  }, [filtered, setPlaybackContext]);

  const handlePlayFromHistory = useCallback((item: HistoryItem) => {
    const song = songs.find((s) => s.id === item.id);
    if (!song) return;
    const idx = songs.findIndex((s) => s.id === song.id);
    setPlaybackContext('library', null, songs, idx >= 0 ? idx : 0);
    setSearchFocused(false);
    setSearchText('');
  }, [songs, setPlaybackContext]);

  const handleRemoveHistory = useCallback((id: string) => {
    setHistory(removeFromHistory(id));
  }, []);

  const handleClearHistory = useCallback(() => {
    saveHistory([]);
    setHistory([]);
  }, []);

  const handleClearSearch = useCallback(() => {
    setSearchText('');
    setDebouncedSearch('');
  }, []);

  const handleEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  // ── FlatList helpers ──────────────────────────────────────────────────────
  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: SONG_ROW_HEIGHT + SONG_ROW_SEPARATOR,
      offset: (SONG_ROW_HEIGHT + SONG_ROW_SEPARATOR) * index,
      index,
    }),
    [],
  );

  const keyExtractor = useCallback((item: Song) => item.id, []);

  const renderSongRow = useCallback(
    ({ item, index }: { item: Song; index: number }) => (
      <SongRow
        song={item}
        index={index}
        isActive={currentSong?.id === item.id}
        isPlaying={isPlaying && currentSong?.id === item.id}
        onPress={handleSongPress}
      />
    ),
    [currentSong?.id, isPlaying, handleSongPress],
  );

  const ListHeader = useMemo(() => (
    <View>
      {/* Recently Played */}
      {recentlyPlayed.length > 0 && !debouncedSearch && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recently Played</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.recentScroll}
          >
            {recentlyPlayed.slice(0, 8).map((item) => (
              <RecentCard key={item.id} item={item} onPress={handlePlayFromHistory} />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Genre pills */}
      {genres.length > 1 && !debouncedSearch && (
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
              <Text style={[styles.genreText, activeGenre === g && styles.genreTextActive]}>
                {g}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      )}

      {/* All Songs header */}
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>All Songs</Text>
        {debouncedSearch.trim().length >= 1 && (
          <Text style={styles.sectionMeta}>
            {filtered.length === 0
              ? `No results for "${debouncedSearch}"`
              : `${filtered.length} result${filtered.length === 1 ? '' : 's'}`}
          </Text>
        )}
      </View>
    </View>
  ), [recentlyPlayed, debouncedSearch, genres, activeGenre, filtered.length, handlePlayFromHistory]);

  const ListFooter = useMemo(() => (
    <View style={styles.footer}>
      {isFetchingNextPage && (
        <View style={styles.footerLoading}>
          <ActivityIndicator size="small" color={COLORS.primary} />
          <Text style={styles.footerText}>Loading more…</Text>
        </View>
      )}
      {!hasNextPage && songs.length > 0 && !isFetchingNextPage && !debouncedSearch && (
        <Text style={styles.footerDone}>All {songs.length} songs loaded</Text>
      )}
      <View style={{ height: LAYOUT.miniPlayerHeight + LAYOUT.tabBarHeight + LAYOUT.spacing.md }} />
    </View>
  ), [isFetchingNextPage, hasNextPage, songs.length, debouncedSearch]);

  const showHistoryDropdown = searchFocused && searchText.trim() === '' && history.length > 0;

  // ── Loading state ─────────────────────────────────────────────────────────
  if (isLoading) return <HomeSkeleton />;

  // ── Error state ───────────────────────────────────────────────────────────
  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorTitle}>Could not load your library</Text>
        <Text style={styles.errorMessage}>{error.message || 'Something went wrong.'}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={refetch}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor={COLORS.background} />

      {/* ── Sticky topbar ── */}
      <View style={styles.topbar}>
        <View style={styles.topbarLeft}>
          <Text style={styles.topbarTitle}>Your Library</Text>
          <Text style={styles.topbarCount}>{songs.length} songs</Text>
        </View>

        {/* Search */}
        <View style={styles.searchWrap}>
          <View style={[
            styles.searchBox,
            searchFocused && styles.searchBoxFocused,
            showHistoryDropdown && styles.searchBoxOpen,
          ]}>
            <Text style={[styles.searchIcon, searchFocused && styles.searchIconFocused]}>⌕</Text>
            <TextInput
              style={styles.searchInput}
              placeholder="Filter songs…"
              placeholderTextColor={COLORS.textMuted}
              value={searchText}
              onChangeText={setSearchText}
              onFocus={() => setSearchFocused(true)}
              onBlur={() => setTimeout(() => setSearchFocused(false), 150)}
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
            />
            {searchText.length > 0 && (
              <TouchableOpacity onPress={handleClearSearch} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Text style={styles.searchClear}>✕</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* History dropdown */}
          {showHistoryDropdown && (
            <View style={styles.historyDropdown}>
              <View style={styles.historyHeader}>
                <Text style={styles.historyLabel}>RECENT SEARCHES</Text>
                <TouchableOpacity onPress={handleClearHistory}>
                  <Text style={styles.historyClearAll}>Clear all</Text>
                </TouchableOpacity>
              </View>
              {history.map((item) => (
                <HistoryRow
                  key={item.id}
                  item={item}
                  onPlay={handlePlayFromHistory}
                  onRemove={handleRemoveHistory}
                />
              ))}
            </View>
          )}
        </View>
      </View>

      {/* ── Song list ── */}
      <FlatList
        data={filtered}
        keyExtractor={keyExtractor}
        renderItem={renderSongRow}
        getItemLayout={getItemLayout}
        removeClippedSubviews
        maxToRenderPerBatch={15}
        windowSize={10}
        initialNumToRender={15}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      />
    </View>
  );
});

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // ── Topbar ──
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.spacing.md,
    height: 60,
    backgroundColor: COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderMuted,
    zIndex: 20,
  },
  topbarLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: LAYOUT.spacing.sm,
    flex: 1,
  },
  topbarTitle: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.white,
    fontFamily: TYPOGRAPHY.families.sans,
  },
  topbarCount: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textMuted,
    fontFamily: TYPOGRAPHY.families.sans,
  },

  // ── Search ──
  searchWrap: {
    position: 'relative',
    zIndex: 30,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.spacing.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: LAYOUT.radius.lg,
    paddingHorizontal: LAYOUT.spacing.md,
    height: 38,
    width: 180,
  },
  searchBoxFocused: {
    borderColor: COLORS.primary,
  },
  searchBoxOpen: {
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  searchIcon: {
    fontSize: 16,
    color: COLORS.textMuted,
  },
  searchIconFocused: {
    color: COLORS.primary,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontFamily: TYPOGRAPHY.families.sans,
    padding: 0,
  },
  searchClear: {
    fontSize: 12,
    color: COLORS.textMuted,
  },

  // ── History dropdown ──
  historyDropdown: {
    position: 'absolute',
    top: 38,
    right: 0,
    width: 260,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderTopWidth: 0,
    borderBottomLeftRadius: LAYOUT.radius.lg,
    borderBottomRightRadius: LAYOUT.radius.lg,
    zIndex: 100,
    ...Platform.select({
      android: { elevation: 8 },
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
    }),
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.spacing.md,
    paddingVertical: LAYOUT.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  historyLabel: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    fontFamily: TYPOGRAPHY.families.sans,
  },
  historyClearAll: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.primary,
    fontFamily: TYPOGRAPHY.families.sans,
  },
  historyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.spacing.sm,
    paddingHorizontal: LAYOUT.spacing.md,
    paddingVertical: LAYOUT.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderMuted,
  },
  historyCover: {
    width: 32,
    height: 32,
    borderRadius: LAYOUT.radius.sm,
    backgroundColor: COLORS.overlay,
  },
  historyMeta: {
    flex: 1,
    minWidth: 0,
  },
  historyTitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textPrimary,
    fontFamily: TYPOGRAPHY.families.sans,
  },
  historyArtist: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textMuted,
    fontFamily: TYPOGRAPHY.families.sans,
  },
  historyRemove: {
    fontSize: 11,
    color: COLORS.textMuted,
  },

  // ── List content ──
  listContent: {
    paddingHorizontal: LAYOUT.spacing.md,
  },

  // ── Section ──
  section: {
    marginTop: LAYOUT.spacing.lg,
    marginBottom: LAYOUT.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: LAYOUT.spacing.lg,
    marginBottom: LAYOUT.spacing.md,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.white,
    fontFamily: TYPOGRAPHY.families.sans,
  },
  sectionMeta: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textMuted,
    fontFamily: TYPOGRAPHY.families.sans,
  },

  // ── Recently played ──
  recentScroll: {
    gap: LAYOUT.spacing.sm,
    paddingBottom: LAYOUT.spacing.xs,
  },
  recentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.spacing.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: LAYOUT.radius.lg,
    padding: LAYOUT.spacing.sm,
    width: 180,
  },
  recentCover: {
    width: 42,
    height: 42,
    borderRadius: LAYOUT.radius.sm,
    backgroundColor: COLORS.overlay,
  },
  recentMeta: {
    flex: 1,
    minWidth: 0,
  },
  recentTitle: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.textPrimary,
    fontFamily: TYPOGRAPHY.families.sans,
  },
  recentArtist: {
    fontSize: TYPOGRAPHY.sizes.xs,
    color: COLORS.textMuted,
    fontFamily: TYPOGRAPHY.families.sans,
    marginTop: 2,
  },

  // ── Genre pills ──
  genreScrollOuter: {
    marginBottom: LAYOUT.spacing.sm,
  },
  genreScroll: {
    gap: LAYOUT.spacing.sm,
    paddingVertical: LAYOUT.spacing.xs,
  },
  genrePill: {
    paddingHorizontal: LAYOUT.spacing.md,
    paddingVertical: 6,
    borderRadius: LAYOUT.radius.full,
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  genrePillActive: {
    backgroundColor: COLORS.accentMuted,
    borderColor: COLORS.primary,
  },
  genreText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
    color: COLORS.textSecondary,
    fontFamily: TYPOGRAPHY.families.sans,
  },
  genreTextActive: {
    color: COLORS.primary,
  },

  // ── Song row ──
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.spacing.md,
    height: SONG_ROW_HEIGHT,
    borderRadius: LAYOUT.radius.md,
    paddingHorizontal: LAYOUT.spacing.sm,
  },
  songRowActive: {
    backgroundColor: COLORS.rowActiveBg,
  },
  songRowPressed: {
    backgroundColor: COLORS.rowHover,
  },
  songCover: {
    width: 44,
    height: 44,
    borderRadius: LAYOUT.radius.sm,
    backgroundColor: COLORS.overlay,
  },
  songMeta: {
    flex: 1,
    minWidth: 0,
  },
  songTitle: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.medium,
    color: COLORS.textPrimary,
    fontFamily: TYPOGRAPHY.families.sans,
  },
  songTitleActive: {
    color: COLORS.primary,
  },
  songArtist: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textMuted,
    fontFamily: TYPOGRAPHY.families.sans,
    marginTop: 2,
  },
  songPlayingIndicator: {
    width: 24,
    alignItems: 'center',
  },
  songPlayingDot: {
    fontSize: 11,
    color: COLORS.primary,
  },

  // ── Separator ──
  separator: {
    height: SONG_ROW_SEPARATOR,
    backgroundColor: COLORS.rowDivider,
  },

  // ── Footer ──
  footer: {
    alignItems: 'center',
    paddingTop: LAYOUT.spacing.md,
  },
  footerLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.spacing.sm,
  },
  footerText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textMuted,
    fontFamily: TYPOGRAPHY.families.sans,
  },
  footerDone: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textDisabled,
    fontFamily: TYPOGRAPHY.families.sans,
  },

  // ── Error ──
  errorContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    paddingHorizontal: LAYOUT.spacing.xl,
    gap: LAYOUT.spacing.sm,
  },
  errorTitle: {
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.white,
    fontFamily: TYPOGRAPHY.families.sans,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textMuted,
    fontFamily: TYPOGRAPHY.families.sans,
    textAlign: 'center',
  },
  retryBtn: {
    marginTop: LAYOUT.spacing.sm,
    backgroundColor: COLORS.primary,
    paddingHorizontal: LAYOUT.spacing.xl,
    paddingVertical: LAYOUT.spacing.sm + 2,
    borderRadius: LAYOUT.radius.md,
  },
  retryText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.black,
    fontFamily: TYPOGRAPHY.families.sans,
  },

  // ── Skeleton ──
  skeletonContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: LAYOUT.spacing.md,
  },
  skeletonTopbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: LAYOUT.spacing.lg,
  },
  skeletonRecentGrid: {
    flexDirection: 'row',
    gap: LAYOUT.spacing.sm,
    marginBottom: LAYOUT.spacing.lg,
  },
  skeletonRecentCard: {
    width: 100,
    height: 60,
    borderRadius: LAYOUT.radius.lg,
    backgroundColor: COLORS.surface,
  },
  skeletonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.spacing.md,
    height: SONG_ROW_HEIGHT,
    paddingHorizontal: LAYOUT.spacing.sm,
  },
  skeletonCover: {
    width: 44,
    height: 44,
    borderRadius: LAYOUT.radius.sm,
    backgroundColor: COLORS.surface,
  },
  skeletonMeta: {
    flex: 1,
  },
  skeletonLine: {
    height: 12,
    borderRadius: LAYOUT.radius.xs,
    backgroundColor: COLORS.surface,
  },
});