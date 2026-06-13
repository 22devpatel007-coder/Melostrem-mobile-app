// src/screens/playlists/PlaylistsScreen.tsx

import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Pressable,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUserPlaylists, useAdminPlaylists } from '@hooks/usePlaylists';
import { usePlayerStore } from '@store/playerStore';
import { useAuthStore } from '@store/authStore';
import { getPlaylistSongs } from '@services/playlists.service';
import { COLORS } from '@constants/colors';
import { TYPOGRAPHY } from '@constants/typography';
import { LAYOUT } from '@constants/layout';
import type { Playlist } from '../../types/playlist';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { AppStackParamList } from '../../types/navigation';
type AppNavigatorProp = NativeStackNavigationProp<AppStackParamList>;

// ── Sort helpers ──────────────────────────────────────────────────────────────
type SortKey = 'date_desc' | 'date_asc' | 'name_asc' | 'songs_desc';

function sortPlaylists(list: Playlist[], key: SortKey): Playlist[] {
  return [...list].sort((a, b) => {
    if (key === 'name_asc')   return (a.name ?? '').localeCompare(b.name ?? '');
    if (key === 'songs_desc') return (b.songs?.length ?? 0) - (a.songs?.length ?? 0);
    if (key === 'date_asc')   return (a.createdAt ?? 0) - (b.createdAt ?? 0);
    return (b.createdAt ?? 0) - (a.createdAt ?? 0); // date_desc default
  });
}

const SORT_OPTIONS: { key: SortKey; label: string }[] = [
  { key: 'date_desc', label: 'Newest' },
  { key: 'date_asc',  label: 'Oldest' },
  { key: 'name_asc',  label: 'A–Z'    },
  { key: 'songs_desc', label: 'Songs' },
];

// ── Skeleton ──────────────────────────────────────────────────────────────────
const PlaylistCardSkeleton = React.memo(() => (
  <View style={styles.skeletonCard}>
    <View style={styles.skeletonCover} />
    <View style={styles.skeletonLine} />
    <View style={[styles.skeletonLine, { width: '55%', marginTop: 4 }]} />
  </View>
));

const LibrarySkeleton = React.memo(() => (
  <View style={styles.skeletonWrap}>
    <View style={styles.skeletonHeader} />
    <View style={styles.skeletonGrid}>
      {Array.from({ length: 6 }).map((_, i) => <PlaylistCardSkeleton key={i} />)}
    </View>
  </View>
));

// ── Playlist card ─────────────────────────────────────────────────────────────
interface PlaylistCardProps {
  playlist: Playlist;
  onPress: (playlist: Playlist) => void;
  onQuickPlay: (playlist: Playlist) => void;
}

const PlaylistCard = React.memo<PlaylistCardProps>(({ playlist, onPress, onQuickPlay }) => {
  const songCount = playlist.songs?.length ?? 0;

  return (
    <Pressable
      onPress={() => onPress(playlist)}
      style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
    >
      {/* Cover */}
      {playlist.coverUrl ? (
        <Image source={{ uri: playlist.coverUrl }} style={styles.cardCover} contentFit="cover" transition={200} />
      ) : (
        <View style={styles.cardCoverPlaceholder}>
          <Text style={styles.cardCoverIcon}>♪</Text>
        </View>
      )}

      {/* Quick play overlay */}
      <TouchableOpacity
        style={styles.cardPlayBtn}
        onPress={() => onQuickPlay(playlist)}
        hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
      >
        <Text style={styles.cardPlayIcon}>▶</Text>
      </TouchableOpacity>

      {/* Meta */}
      <Text style={styles.cardName} numberOfLines={2}>{playlist.name}</Text>
      <Text style={styles.cardCount}>{songCount} {songCount === 1 ? 'song' : 'songs'}</Text>
    </Pressable>
  );
});

// ── Section header ────────────────────────────────────────────────────────────
const SectionHeader = React.memo(({ label, count }: { label: string; count: number }) => (
  <View style={styles.sectionHeader}>
    <Text style={styles.sectionLabel}>{label.toUpperCase()}</Text>
    <View style={styles.sectionBadge}>
      <Text style={styles.sectionBadgeText}>{count}</Text>
    </View>
  </View>
));

// ── PlaylistsScreen ─────────────────────────────────────────────────────────────
export const PlaylistsScreen = React.memo(() => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<AppNavigatorProp>();

  const { playlists: userPlaylists, isLoading: userLoading } = useUserPlaylists();
  const { adminPlaylists, isLoading: adminLoading }          = useAdminPlaylists();

  const setPlaybackContext = usePlayerStore((s) => s.setPlaybackContext);
  const { user, isAdmin }  = useAuthStore();

  const [searchText, setSearchText] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('date_desc');
  const [showSortSheet, setShowSortSheet] = useState(false);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Search debounce ───────────────────────────────────────────────────────
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(searchText.trim()), 300);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [searchText]);

  // ── Filter + sort ─────────────────────────────────────────────────────────
  const filterAndSort = useCallback((list: Playlist[]) => {
    const q = debouncedSearch.toLowerCase();
    const filtered = q ? list.filter((pl) => (pl.name ?? '').toLowerCase().includes(q)) : list;
    return sortPlaylists(filtered, sortKey);
  }, [debouncedSearch, sortKey]);

  const filteredUser  = useMemo(() => filterAndSort(userPlaylists),  [filterAndSort, userPlaylists]);
  const filteredAdmin = useMemo(() => filterAndSort(adminPlaylists), [filterAndSort, adminPlaylists]);

  // ── Quick play ────────────────────────────────────────────────────────────
  const handleQuickPlay = useCallback(async (playlist: Playlist) => {
    try {
      const songs = await getPlaylistSongs(playlist.songs ?? []);
      if (!songs.length) {
        Alert.alert('Empty Playlist', 'This playlist has no songs yet.');
        return;
      }
      setPlaybackContext('playlist', playlist.id, songs, 0);
    } catch {
      Alert.alert('Error', 'Failed to play playlist. Please try again.');
    }
  }, [setPlaybackContext]);

  // ── Navigate to detail ────────────────────────────────────────────────────
  const handleCardPress = useCallback((playlist: Playlist) => {
    navigation.navigate('PlaylistDetail', { playlistId: playlist.id });
  }, [navigation]);

  // ── Render card ───────────────────────────────────────────────────────────
  const renderCard = useCallback(({ item }: { item: Playlist }) => (
    <PlaylistCard playlist={item} onPress={handleCardPress} onQuickPlay={handleQuickPlay} />
  ), [handleCardPress, handleQuickPlay]);

  const keyExtractor = useCallback((item: Playlist) => item.id, []);

  const isLoading = userLoading || adminLoading;

  if (isLoading) return <LibrarySkeleton />;

  const currentSortLabel = SORT_OPTIONS.find((o) => o.key === sortKey)?.label ?? 'Newest';

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>

      {/* ── Topbar ── */}
      <View style={styles.topbar}>
        <Text style={styles.topbarTitle}>Library</Text>
        <TouchableOpacity
          style={styles.newBtn}
          onPress={() => navigation.navigate('Suggestions')}
        >
          <Text style={styles.newBtnText}>+ New</Text>
        </TouchableOpacity>
      </View>

      {/* ── Search + sort ── */}
      <View style={styles.controls}>
        <View style={styles.searchBox}>
          <Text style={styles.searchIcon}>⌕</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search playlists…"
            placeholderTextColor={COLORS.textMuted}
            value={searchText}
            onChangeText={setSearchText}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Text style={styles.searchClear}>✕</Text>
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity style={styles.sortBtn} onPress={() => setShowSortSheet(true)}>
          <Text style={styles.sortBtnText}>{currentSortLabel} ▾</Text>
        </TouchableOpacity>
      </View>

      {/* ── Sort sheet (inline) ── */}
      {showSortSheet && (
        <View style={styles.sortSheet}>
          {SORT_OPTIONS.map((opt) => (
            <TouchableOpacity
              key={opt.key}
              style={[styles.sortOption, sortKey === opt.key && styles.sortOptionActive]}
              onPress={() => { setSortKey(opt.key); setShowSortSheet(false); }}
            >
              <Text style={[styles.sortOptionText, sortKey === opt.key && styles.sortOptionTextActive]}>
                {opt.label}
              </Text>
              {sortKey === opt.key && <Text style={styles.sortCheck}>✓</Text>}
            </TouchableOpacity>
          ))}
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {/* ── Your Playlists ── */}
        <SectionHeader label="Your Playlists" count={filteredUser.length} />

        {filteredUser.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>{debouncedSearch ? '🔍' : '♪'}</Text>
            <Text style={styles.emptyText}>
              {debouncedSearch
                ? `No playlists match "${debouncedSearch}"`
                : "You haven't created any playlists yet."}
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filteredUser.map((pl) => (
              <PlaylistCard key={pl.id} playlist={pl} onPress={handleCardPress} onQuickPlay={handleQuickPlay} />
            ))}
          </View>
        )}

        {/* ── Library Playlists ── */}
        <View style={styles.sectionGap} />
        <SectionHeader label="Library Playlists" count={filteredAdmin.length} />

        {filteredAdmin.length === 0 ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyIcon}>♪</Text>
            <Text style={styles.emptyText}>
              {debouncedSearch
                ? `No library playlists match "${debouncedSearch}"`
                : 'No library playlists available.'}
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {filteredAdmin.map((pl) => (
              <PlaylistCard key={pl.id} playlist={pl} onPress={handleCardPress} onQuickPlay={handleQuickPlay} />
            ))}
          </View>
        )}

        <View style={{ height: LAYOUT.miniPlayerHeight + LAYOUT.tabBarHeight + LAYOUT.spacing.md }} />
      </ScrollView>
    </View>
  );
});

// ── Styles ────────────────────────────────────────────────────────────────────
const CARD_GAP = 10;
const CARD_WIDTH = '48%';

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  // ── Topbar ──
  topbar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.spacing.md, height: 60,
    borderBottomWidth: 1, borderBottomColor: COLORS.borderMuted,
  },
  topbarTitle: { fontSize: TYPOGRAPHY.sizes.xl, fontWeight: TYPOGRAPHY.weights.bold, color: COLORS.white, fontFamily: TYPOGRAPHY.families.sans },
  newBtn: { backgroundColor: COLORS.primary, borderRadius: LAYOUT.radius.md, paddingHorizontal: LAYOUT.spacing.md, paddingVertical: LAYOUT.spacing.xs + 2 },
  newBtnText: { fontSize: TYPOGRAPHY.sizes.sm, fontWeight: TYPOGRAPHY.weights.bold, color: COLORS.black, fontFamily: TYPOGRAPHY.families.sans },

  // ── Controls ──
  controls: { flexDirection: 'row', alignItems: 'center', gap: LAYOUT.spacing.sm, paddingHorizontal: LAYOUT.spacing.md, paddingVertical: LAYOUT.spacing.sm },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: LAYOUT.spacing.sm,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: LAYOUT.radius.lg, paddingHorizontal: LAYOUT.spacing.md, height: 40,
  },
  searchIcon: { fontSize: 16, color: COLORS.textMuted },
  searchInput: { flex: 1, color: COLORS.textPrimary, fontSize: TYPOGRAPHY.sizes.sm, fontFamily: TYPOGRAPHY.families.sans, padding: 0 },
  searchClear: { fontSize: 12, color: COLORS.textMuted },
  sortBtn: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderRadius: LAYOUT.radius.md, paddingHorizontal: LAYOUT.spacing.sm, height: 40,
    alignItems: 'center', justifyContent: 'center',
  },
  sortBtnText: { fontSize: TYPOGRAPHY.sizes.xs, fontWeight: TYPOGRAPHY.weights.medium, color: COLORS.textSecondary, fontFamily: TYPOGRAPHY.families.sans },

  // ── Sort sheet ──
  sortSheet: {
    marginHorizontal: LAYOUT.spacing.md,
    backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: LAYOUT.radius.lg, overflow: 'hidden',
    marginBottom: LAYOUT.spacing.sm,
  },
  sortOption: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: LAYOUT.spacing.md, paddingVertical: LAYOUT.spacing.sm + 2 },
  sortOptionActive: { backgroundColor: COLORS.accentMuted },
  sortOptionText: { fontSize: TYPOGRAPHY.sizes.sm, color: COLORS.textSecondary, fontFamily: TYPOGRAPHY.families.sans },
  sortOptionTextActive: { color: COLORS.primary, fontWeight: TYPOGRAPHY.weights.semibold },
  sortCheck: { fontSize: 13, color: COLORS.primary },

  // ── Scroll ──
  scrollContent: { paddingHorizontal: LAYOUT.spacing.md, paddingTop: LAYOUT.spacing.md },

  // ── Section ──
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: LAYOUT.spacing.sm, marginBottom: LAYOUT.spacing.md },
  sectionLabel: { fontSize: TYPOGRAPHY.sizes.xs, fontWeight: TYPOGRAPHY.weights.bold, color: COLORS.textMuted, letterSpacing: 0.7, fontFamily: TYPOGRAPHY.families.sans },
  sectionBadge: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: LAYOUT.radius.full, paddingHorizontal: LAYOUT.spacing.sm, paddingVertical: 2 },
  sectionBadgeText: { fontSize: TYPOGRAPHY.sizes.xs, fontWeight: TYPOGRAPHY.weights.semibold, color: COLORS.textMuted, fontFamily: TYPOGRAPHY.families.sans },
  sectionGap: { height: LAYOUT.spacing.xl },

  // ── Grid ──
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP },

  // ── Card ──
  card: {
    width: CARD_WIDTH,
    backgroundColor: COLORS.surface,
    borderWidth: 1, borderColor: COLORS.border,
    borderRadius: LAYOUT.radius.lg,
    padding: LAYOUT.spacing.sm,
    marginBottom: CARD_GAP,
  },
  cardPressed: { backgroundColor: COLORS.surfaceHover },
  cardCover: { width: '100%', aspectRatio: 1, borderRadius: LAYOUT.radius.md, backgroundColor: COLORS.overlay, marginBottom: LAYOUT.spacing.sm },
  cardCoverPlaceholder: {
    width: '100%', aspectRatio: 1, borderRadius: LAYOUT.radius.md,
    backgroundColor: COLORS.overlay, alignItems: 'center', justifyContent: 'center',
    marginBottom: LAYOUT.spacing.sm,
  },
  cardCoverIcon: { fontSize: 28, color: COLORS.textMuted },
  cardPlayBtn: {
    position: 'absolute', top: LAYOUT.spacing.sm + 4, right: LAYOUT.spacing.sm + 4,
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center', justifyContent: 'center',
  },
  cardPlayIcon: { fontSize: 11, color: COLORS.black },
  cardName: { fontSize: TYPOGRAPHY.sizes.sm, fontWeight: TYPOGRAPHY.weights.semibold, color: COLORS.textPrimary, fontFamily: TYPOGRAPHY.families.sans, marginBottom: 2 },
  cardCount: { fontSize: TYPOGRAPHY.sizes.xs, color: COLORS.textMuted, fontFamily: TYPOGRAPHY.families.sans },

  // ── Empty ──
  emptyBox: { alignItems: 'center', paddingVertical: LAYOUT.spacing.xl, gap: LAYOUT.spacing.sm },
  emptyIcon: { fontSize: 32 },
  emptyText: { fontSize: TYPOGRAPHY.sizes.sm, color: COLORS.textMuted, fontFamily: TYPOGRAPHY.families.sans, textAlign: 'center' },

  // ── Skeleton ──
  skeletonWrap: { flex: 1, backgroundColor: COLORS.background, padding: LAYOUT.spacing.md },
  skeletonHeader: { height: 24, width: 120, borderRadius: LAYOUT.radius.sm, backgroundColor: COLORS.surface, marginBottom: LAYOUT.spacing.lg },
  skeletonGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: CARD_GAP },
  skeletonCard: { width: CARD_WIDTH, backgroundColor: COLORS.surface, borderRadius: LAYOUT.radius.lg, padding: LAYOUT.spacing.sm, marginBottom: CARD_GAP },
  skeletonCover: { width: '100%', aspectRatio: 1, borderRadius: LAYOUT.radius.md, backgroundColor: COLORS.overlay, marginBottom: LAYOUT.spacing.sm },
  skeletonLine: { height: 11, width: '75%', borderRadius: LAYOUT.radius.xs, backgroundColor: COLORS.overlay },
});