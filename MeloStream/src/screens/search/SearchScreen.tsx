// src/screens/search/SearchScreen.tsx

import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  ScrollView,
  TouchableOpacity,
  Pressable,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MMKV } from 'react-native-mmkv';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useSearch } from '@hooks/useSearch';
import { usePlayerStore } from '@store/playerStore';
import { COLORS } from '@constants/colors';
import { TYPOGRAPHY } from '@constants/typography';
import { LAYOUT } from '@constants/layout';
import { QUERY_KEYS } from '@constants/queryKeys';
import { getSongs } from '@services/songs.service';
import type { Song } from '../../types/song';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../types/navigation';
type AppNavigatorProp = NativeStackNavigationProp<AppStackParamList>;

// ── MMKV search history (Rule 4) ──────────────────────────────────────────────
let _storage: MMKV | null = null;
const getStorage = () => _storage ?? (_storage = new MMKV({ id: 'melostream-search' }));
const HISTORY_KEY = 'search_history';
const MAX_HISTORY = 8;

function readHistory(): string[] {
  try {
    const raw = getStorage().getString(HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function pushHistory(query: string): void {
  try {
    const prev = readHistory().filter((q) => q !== query);
    getStorage().set(HISTORY_KEY, JSON.stringify([query, ...prev].slice(0, MAX_HISTORY)));
  } catch {}
}
function removeEntry(query: string): string[] {
  const updated = readHistory().filter((q) => q !== query);
  getStorage().set(HISTORY_KEY, JSON.stringify(updated));
  return updated;
}
function clearHistory(): void {
  getStorage().set(HISTORY_KEY, JSON.stringify([]));
}

// ── Artist extraction ─────────────────────────────────────────────────────────
interface ArtistItem {
  id: string | null;
  name: string;
  coverUrl: string | null;
}

function extractArtists(songs: Song[], limit = 12): ArtistItem[] {
  const seen = new Set<string>();
  const result: ArtistItem[] = [];
  for (const song of songs) {
    const name = (song.artist || '').trim();
    if (!name) continue;
    const key = song.artistId || name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push({ id: song.artistId || null, name, coverUrl: song.coverUrl || null });
    if (result.length >= limit) break;
  }
  return result;
}

// ── Colour palette for artist tiles ──────────────────────────────────────────
const PALETTE = [
  { bg: 'rgba(124,58,237,0.18)',  accent: '#7c3aed' },
  { bg: 'rgba(220,38,38,0.18)',   accent: '#dc2626' },
  { bg: 'rgba(234,88,12,0.18)',   accent: '#ea580c' },
  { bg: 'rgba(219,39,119,0.18)',  accent: '#db2777' },
  { bg: 'rgba(8,145,178,0.18)',   accent: '#0891b2' },
  { bg: 'rgba(15,118,110,0.18)',  accent: '#0f766e' },
  { bg: 'rgba(67,56,202,0.18)',   accent: '#4338ca' },
  { bg: 'rgba(22,163,74,0.18)',   accent: '#16a34a' },
  { bg: 'rgba(147,51,234,0.18)',  accent: '#9333ea' },
  { bg: 'rgba(190,18,60,0.18)',   accent: '#be123c' },
];

const SORT_OPTIONS = [
  { key: 'relevance', label: 'Relevance' },
  { key: 'title',     label: 'Title A–Z'  },
  { key: 'artist',    label: 'Artist A–Z' },
] as const;

type SortKey = 'relevance' | 'title' | 'artist';

const SONG_ROW_HEIGHT = 64;

// ── Sub-components ────────────────────────────────────────────────────────────

const SkeletonRow = React.memo(() => (
  <View style={styles.skeletonRow}>
    <View style={styles.skeletonCover} />
    <View style={styles.skeletonMeta}>
      <View style={[styles.skeletonLine, { width: '55%' }]} />
      <View style={[styles.skeletonLine, { width: '35%', marginTop: 6 }]} />
    </View>
  </View>
));

interface ArtistTileProps {
  artist: ArtistItem;
  index: number;
  onPress: (artist: ArtistItem) => void;
}

const ArtistTile = React.memo<ArtistTileProps>(({ artist, index, onPress }) => {
  const palette = PALETTE[index % PALETTE.length];
  const initial = artist.name.charAt(0).toUpperCase();
  return (
    <TouchableOpacity
      style={[styles.tile, { backgroundColor: palette.bg }]}
      onPress={() => onPress(artist)}
      activeOpacity={0.75}
    >
      <View style={styles.tileAvatar}>
        {artist.coverUrl ? (
          <Image source={{ uri: artist.coverUrl }} style={styles.tileAvatarImg} contentFit="cover" />
        ) : (
          <View style={[styles.tileAvatarInitials, { backgroundColor: palette.accent }]}>
            <Text style={styles.tileInitialText}>{initial}</Text>
          </View>
        )}
      </View>
      <Text style={styles.tileLabel} numberOfLines={1}>{artist.name}</Text>
    </TouchableOpacity>
  );
});

interface SongRowProps {
  song: Song;
  index: number;
  isActive: boolean;
  isPlaying: boolean;
  query: string;
  onPress: (song: Song, index: number) => void;
}

const SongRow = React.memo<SongRowProps>(({ song, index, isActive, isPlaying, onPress }) => (
  <Pressable
    onPress={() => onPress(song, index)}
    style={({ pressed }) => [
      styles.songRow,
      isActive && styles.songRowActive,
      pressed && styles.songRowPressed,
    ]}
  >
    <Image source={{ uri: song.coverUrl }} style={styles.songCover} contentFit="cover" transition={200} />
    <View style={styles.songMeta}>
      <Text style={[styles.songTitle, isActive && styles.songTitleActive]} numberOfLines={1}>
        {song.title}
      </Text>
      <Text style={styles.songArtist} numberOfLines={1}>{song.artist}</Text>
    </View>
    {isActive && (
      <Text style={styles.songPlaying}>{isPlaying ? '▶' : '⏸'}</Text>
    )}
  </Pressable>
));

// ── SearchScreen ──────────────────────────────────────────────────────────────
export const SearchScreen = React.memo(() => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<AppNavigatorProp>();

  const [inputText, setInputText]   = useState('');
  const [query, setQuery]           = useState('');
  const [sortKey, setSortKey]       = useState<SortKey>('relevance');
  const [history, setHistory]       = useState<string[]>(readHistory);
  const [searchFocused, setSearchFocused] = useState(false);

  const inputRef = useRef<TextInput>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying   = usePlayerStore((s) => s.isPlaying);
  const setPlaybackContext = usePlayerStore((s) => s.setPlaybackContext);

  // ── Search debounce (300ms URL equivalent) ────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setQuery(inputText.trim()), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [inputText]);

  // ── Push to history when query settles ───────────────────────────────────
  useEffect(() => {
    if (query.length >= 2) {
      pushHistory(query);
      setHistory(readHistory());
    }
  }, [query]);

  const { songs, total, isFetching, isError } = useSearch(query);

  // ── Browse library for artists ────────────────────────────────────────────
  const { data: libraryData } = useInfiniteQuery({
    queryKey: [QUERY_KEYS.SONGS, 'browse-artists'],
    queryFn: ({ pageParam }) => getSongs(500, pageParam as string | null),
    getNextPageParam: () => undefined,
    initialPageParam: null,
    staleTime: 5 * 60_000,
  });

  const librarySongs = useMemo(
    () => libraryData?.pages.flatMap((p) => p?.songs ?? []) ?? [],
    [libraryData],
  );

  const browseArtists = useMemo(() => extractArtists(librarySongs, 12), [librarySongs]);

  // ── Sort ──────────────────────────────────────────────────────────────────
  const sortedSongs = useMemo(() => {
    if (!songs.length) return songs;
    if (sortKey === 'title')  return [...songs].sort((a, b) => a.title.localeCompare(b.title));
    if (sortKey === 'artist') return [...songs].sort((a, b) => a.artist.localeCompare(b.artist));
    return songs;
  }, [songs, sortKey]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSongPress = useCallback((song: Song, index: number) => {
    setPlaybackContext('dynamic', null, sortedSongs, index);
  }, [sortedSongs, setPlaybackContext]);

  const handlePlayAll = useCallback(() => {
    if (!sortedSongs.length) return;
    setPlaybackContext('dynamic', null, sortedSongs, 0);
  }, [sortedSongs, setPlaybackContext]);

  const handleArtistPress = useCallback((artist: ArtistItem) => {
    if (artist.id) {
      navigation.navigate('ArtistDetail', { artistId: artist.id });
    } else {
      setInputText(artist.name);
    }
  }, [navigation]);

  const handleHistoryPress = useCallback((q: string) => {
    setInputText(q);
    inputRef.current?.blur();
  }, []);

  const handleHistoryRemove = useCallback((q: string) => {
    setHistory(removeEntry(q));
  }, []);

  const handleClearHistory = useCallback(() => {
    clearHistory();
    setHistory([]);
  }, []);

  const handleClearInput = useCallback(() => {
    setInputText('');
    setQuery('');
    inputRef.current?.focus();
  }, []);

  // ── Derived state ─────────────────────────────────────────────────────────
  const hasQuery    = query.length >= 2;
  const showBrowse  = !hasQuery;
  const showSkeleton = hasQuery && isFetching;
  const hasResults  = hasQuery && !isFetching && !isError && sortedSongs.length > 0;
  const noResults   = hasQuery && !isFetching && !isError && sortedSongs.length === 0;

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
      query={query}
      onPress={handleSongPress}
    />
  ), [currentSong?.id, isPlaying, query, handleSongPress]);

  // ── Mood color for search border ──────────────────────────────────────────
  const moodColor = useMemo(() => {
    if (isFetching) return '#8b5cf6';
    if (hasQuery && !isFetching && sortedSongs.length === 0) return COLORS.danger;
    return COLORS.primary;
  }, [isFetching, hasQuery, sortedSongs.length]);

  const ListHeader = useMemo(() => (
    <View>
      {/* History — shown when no active query */}
      {showBrowse && history.length > 0 && (
        <View style={styles.historySection}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>RECENT SEARCHES</Text>
            <TouchableOpacity onPress={handleClearHistory}>
              <Text style={styles.historyClearAll}>Clear all</Text>
            </TouchableOpacity>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.historyPills}>
            {history.map((q) => (
              <View key={q} style={styles.historyPill}>
                <TouchableOpacity onPress={() => handleHistoryPress(q)}>
                  <Text style={styles.historyPillText}>{q}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleHistoryRemove(q)} hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}>
                  <Text style={styles.historyPillDel}>×</Text>
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>
        </View>
      )}

      {/* Error */}
      {isError && (
        <View style={styles.errorBox}>
          <Text style={styles.errorTitle}>Search failed</Text>
          <Text style={styles.errorSub}>Something went wrong. Please try again.</Text>
        </View>
      )}

      {/* Skeleton */}
      {showSkeleton && (
        <View>
          {Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)}
        </View>
      )}

      {/* Results header */}
      {hasResults && (
        <View>
          <View style={styles.resultsHeader}>
            <View style={styles.resultsMeta}>
              <Text style={styles.resultsLabel}>
                Results for <Text style={styles.resultsQuery}>"{query}"</Text>
              </Text>
              <Text style={styles.resultsCount}>{total} {total === 1 ? 'song' : 'songs'}</Text>
            </View>
            <View style={styles.resultsControls}>
              <View style={styles.sortRow}>
                {SORT_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.key}
                    onPress={() => setSortKey(opt.key)}
                    style={[styles.sortBtn, sortKey === opt.key && styles.sortBtnActive]}
                  >
                    <Text style={[styles.sortBtnText, sortKey === opt.key && styles.sortBtnTextActive]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.playAllBtn} onPress={handlePlayAll}>
                <Text style={styles.playAllText}>▶  Play all</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* No results */}
      {noResults && (
        <View style={styles.emptyBox}>
          <View style={styles.emptyIcon}><Text style={styles.emptyIconText}>♪</Text></View>
          <Text style={styles.emptyTitle}>No results for "{query}"</Text>
          <Text style={styles.emptySub}>Try a different search term or browse an artist below</Text>
        </View>
      )}

      {/* Browse artists */}
      {showBrowse && (
        <View style={styles.browseSection}>
          <Text style={styles.browseTitle}>Browse Artists</Text>
          {browseArtists.length === 0 ? (
            <Text style={styles.browseEmpty}>No artists found in your library yet.</Text>
          ) : (
            <View style={styles.tileGrid}>
              {browseArtists.map((artist, i) => (
                <ArtistTile key={artist.id || artist.name} artist={artist} index={i} onPress={handleArtistPress} />
              ))}
            </View>
          )}
        </View>
      )}

      {hasResults && <View style={styles.listTopBorder} />}
    </View>
  ), [
    showBrowse, history, isError, showSkeleton, hasResults, noResults,
    query, total, sortKey, browseArtists,
    handleClearHistory, handleHistoryPress, handleHistoryRemove,
    handlePlayAll, handleArtistPress,
  ]);

  const ListFooter = useMemo(() => (
    <View style={{ height: LAYOUT.miniPlayerHeight + LAYOUT.tabBarHeight + LAYOUT.spacing.md }} />
  ), []);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Search bar ── */}
      <View style={styles.hero}>
        {showBrowse && (
          <Text style={styles.heroEyebrow}>What do you want to listen to?</Text>
        )}
        <View style={[styles.searchBox, { borderColor: moodColor }, searchFocused && styles.searchBoxFocused]}>
          <Text style={[styles.searchIcon, { color: moodColor }]}>⌕</Text>
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder="Artists, songs…"
            placeholderTextColor={COLORS.textMuted}
            value={inputText}
            onChangeText={setInputText}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {isFetching && <ActivityIndicator size="small" color={COLORS.primary} />}
          {inputText.length > 0 && !isFetching && (
            <TouchableOpacity onPress={handleClearInput} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* ── Results list ── */}
      <FlatList
        data={hasResults ? sortedSongs : []}
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
        keyboardDismissMode="on-drag"
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
});

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // ── Hero / search ──
  hero: {
    paddingHorizontal: LAYOUT.spacing.md,
    paddingTop: LAYOUT.spacing.lg,
    paddingBottom: LAYOUT.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderMuted,
  },
  heroEyebrow: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textSecondary,
    fontFamily: TYPOGRAPHY.families.sans,
    textAlign: 'center',
    marginBottom: LAYOUT.spacing.sm,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.spacing.sm,
    backgroundColor: COLORS.surface,
    borderWidth: 2,
    borderRadius: LAYOUT.radius.lg,
    paddingHorizontal: LAYOUT.spacing.md,
    height: 46,
  },
  searchBoxFocused: {
    backgroundColor: COLORS.surfaceHover,
  },
  searchIcon: { fontSize: 18 },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.sizes.md,
    fontFamily: TYPOGRAPHY.families.sans,
    padding: 0,
  },
  searchClear: { fontSize: 13, color: COLORS.textMuted },

  // ── History ──
  historySection: { paddingHorizontal: LAYOUT.spacing.md, paddingTop: LAYOUT.spacing.lg },
  historyHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: LAYOUT.spacing.sm },
  historyTitle: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.textMuted,
    letterSpacing: 0.6,
    fontFamily: TYPOGRAPHY.families.sans,
  },
  historyClearAll: { fontSize: TYPOGRAPHY.sizes.xs, color: COLORS.danger, fontFamily: TYPOGRAPHY.families.sans },
  historyPills: { gap: LAYOUT.spacing.sm, paddingBottom: LAYOUT.spacing.sm },
  historyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: LAYOUT.radius.full,
    overflow: 'hidden',
  },
  historyPillText: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textPrimary,
    paddingHorizontal: LAYOUT.spacing.md,
    paddingVertical: LAYOUT.spacing.sm,
    fontFamily: TYPOGRAPHY.families.sans,
  },
  historyPillDel: {
    fontSize: 15,
    color: COLORS.textMuted,
    paddingRight: LAYOUT.spacing.sm,
    paddingVertical: LAYOUT.spacing.sm,
  },

  // ── Error ──
  errorBox: { alignItems: 'center', padding: LAYOUT.spacing.xl },
  errorTitle: { fontSize: TYPOGRAPHY.sizes.lg, fontWeight: TYPOGRAPHY.weights.semibold, color: COLORS.white, fontFamily: TYPOGRAPHY.families.sans },
  errorSub: { fontSize: TYPOGRAPHY.sizes.sm, color: COLORS.textMuted, marginTop: 4, fontFamily: TYPOGRAPHY.families.sans },

  // ── Results header ──
  resultsHeader: { paddingHorizontal: LAYOUT.spacing.md, paddingTop: LAYOUT.spacing.lg, paddingBottom: LAYOUT.spacing.sm },
  resultsMeta: { flexDirection: 'row', alignItems: 'baseline', gap: LAYOUT.spacing.sm, flexWrap: 'wrap', marginBottom: LAYOUT.spacing.sm },
  resultsLabel: { fontSize: TYPOGRAPHY.sizes.sm, color: COLORS.textSecondary, fontFamily: TYPOGRAPHY.families.sans },
  resultsQuery: { color: COLORS.white, fontWeight: TYPOGRAPHY.weights.semibold },
  resultsCount: { fontSize: TYPOGRAPHY.sizes.xs, color: COLORS.textMuted, fontFamily: TYPOGRAPHY.families.sans },
  resultsControls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: LAYOUT.spacing.sm },
  sortRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.borderMuted,
    borderRadius: LAYOUT.radius.md,
    overflow: 'hidden',
    flex: 1,
  },
  sortBtn: { flex: 1, alignItems: 'center', paddingVertical: LAYOUT.spacing.sm },
  sortBtnActive: { backgroundColor: COLORS.accentMuted },
  sortBtnText: { fontSize: TYPOGRAPHY.sizes.xs, color: COLORS.textMuted, fontFamily: TYPOGRAPHY.families.sans },
  sortBtnTextActive: { color: COLORS.primary, fontWeight: TYPOGRAPHY.weights.semibold },
  playAllBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: LAYOUT.radius.md,
    paddingHorizontal: LAYOUT.spacing.md,
    paddingVertical: LAYOUT.spacing.sm,
  },
  playAllText: { fontSize: TYPOGRAPHY.sizes.sm, fontWeight: TYPOGRAPHY.weights.semibold, color: COLORS.black, fontFamily: TYPOGRAPHY.families.sans },
  listTopBorder: { height: 1, backgroundColor: COLORS.borderMuted, marginHorizontal: LAYOUT.spacing.md, marginTop: LAYOUT.spacing.sm },

  // ── Empty ──
  emptyBox: { alignItems: 'center', paddingVertical: LAYOUT.spacing['2xl'], paddingHorizontal: LAYOUT.spacing.xl },
  emptyIcon: {
    width: 64, height: 64,
    backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: LAYOUT.radius.xl,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: LAYOUT.spacing.md,
  },
  emptyIconText: { fontSize: 26 },
  emptyTitle: { fontSize: TYPOGRAPHY.sizes.lg, fontWeight: TYPOGRAPHY.weights.semibold, color: COLORS.white, fontFamily: TYPOGRAPHY.families.sans, textAlign: 'center' },
  emptySub: { fontSize: TYPOGRAPHY.sizes.sm, color: COLORS.textMuted, fontFamily: TYPOGRAPHY.families.sans, textAlign: 'center', marginTop: 6, lineHeight: 20 },

  // ── Browse artists ──
  browseSection: { paddingHorizontal: LAYOUT.spacing.md, paddingTop: LAYOUT.spacing.lg },
  browseTitle: { fontSize: TYPOGRAPHY.sizes.xl, fontWeight: TYPOGRAPHY.weights.bold, color: COLORS.white, fontFamily: TYPOGRAPHY.families.sans, marginBottom: LAYOUT.spacing.md },
  browseEmpty: { fontSize: TYPOGRAPHY.sizes.sm, color: COLORS.textMuted, fontFamily: TYPOGRAPHY.families.sans },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: LAYOUT.spacing.sm },
  tile: {
    width: '48%',
    borderRadius: LAYOUT.radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)',
    padding: LAYOUT.spacing.sm,
    height: 88,
    justifyContent: 'flex-end',
  },
  tileAvatar: { width: 32, height: 32, borderRadius: 16, overflow: 'hidden', marginBottom: LAYOUT.spacing.xs },
  tileAvatarImg: { width: 32, height: 32, borderRadius: 16 },
  tileAvatarInitials: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  tileInitialText: { fontSize: 13, fontWeight: TYPOGRAPHY.weights.bold, color: COLORS.white },
  tileLabel: { fontSize: TYPOGRAPHY.sizes.sm, fontWeight: TYPOGRAPHY.weights.bold, color: COLORS.white, fontFamily: TYPOGRAPHY.families.sans },

  // ── Song row ──
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.spacing.md,
    height: SONG_ROW_HEIGHT,
    paddingHorizontal: LAYOUT.spacing.md,
  },
  songRowActive: { backgroundColor: COLORS.rowActiveBg },
  songRowPressed: { backgroundColor: COLORS.rowHover },
  songCover: { width: 44, height: 44, borderRadius: LAYOUT.radius.sm, backgroundColor: COLORS.overlay },
  songMeta: { flex: 1, minWidth: 0 },
  songTitle: { fontSize: TYPOGRAPHY.sizes.base, fontWeight: TYPOGRAPHY.weights.medium, color: COLORS.textPrimary, fontFamily: TYPOGRAPHY.families.sans },
  songTitleActive: { color: COLORS.primary },
  songArtist: { fontSize: TYPOGRAPHY.sizes.sm, color: COLORS.textMuted, fontFamily: TYPOGRAPHY.families.sans, marginTop: 2 },
  songPlaying: { fontSize: 11, color: COLORS.primary },

  separator: { height: 1, backgroundColor: COLORS.rowDivider, marginHorizontal: LAYOUT.spacing.md },

  // ── Skeleton ──
  skeletonRow: {
    flexDirection: 'row', alignItems: 'center', gap: LAYOUT.spacing.md,
    paddingHorizontal: LAYOUT.spacing.md, height: SONG_ROW_HEIGHT,
  },
  skeletonCover: { width: 44, height: 44, borderRadius: LAYOUT.radius.sm, backgroundColor: COLORS.surface },
  skeletonMeta: { flex: 1 },
  skeletonLine: { height: 11, borderRadius: LAYOUT.radius.xs, backgroundColor: COLORS.surface },
});