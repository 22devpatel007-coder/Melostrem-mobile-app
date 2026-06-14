// src/screens/playlists/PlaylistDetailScreen.tsx

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Pressable,
  Alert,
  ActivityIndicator,
  TextInput,
} from 'react-native';
import { Image } from 'expo-image';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useUserPlaylists, useAdminPlaylists, usePlaylists } from '@hooks/usePlaylists';
import { usePlayerStore } from '@store/playerStore';
import { useAuthStore } from '@store/authStore';
import { getPlaylistSongsPaged } from '@services/playlists.service';
import { COLORS } from '@constants/colors';
import { TYPOGRAPHY } from '@constants/typography';
import { LAYOUT } from '@constants/layout';
import type { Song } from '../../types/song';
import type { AppStackParamList } from '../../types/navigation';

type RouteProps = RouteProp<AppStackParamList, 'PlaylistDetail'>;

const PAGE_LIMIT = 20;
const SONG_ROW_HEIGHT = 64;

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
  isReadOnly: boolean;
  onPress: (song: Song, index: number) => void;
  onMoveUp: (index: number) => void;
  onMoveDown: (index: number) => void;
  onRemove: (songId: string) => void;
  isFirst: boolean;
  isLast: boolean;
}

const SongRow = React.memo<SongRowProps>(({
  song, index, isActive, isReadOnly,
  onPress, onMoveUp, onMoveDown, onRemove,
  isFirst, isLast,
}) => (
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
    {!isReadOnly && (
      <View style={styles.rowActions}>
        <TouchableOpacity
          onPress={() => onMoveUp(index)}
          disabled={isFirst}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Text style={[styles.arrowBtn, isFirst && styles.arrowBtnDisabled]}>↑</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onMoveDown(index)}
          disabled={isLast}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Text style={[styles.arrowBtn, isLast && styles.arrowBtnDisabled]}>↓</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => onRemove(song.id)}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
        >
          <Text style={styles.removeBtn}>✕</Text>
        </TouchableOpacity>
      </View>
    )}
  </Pressable>
));

// ── PlaylistDetailScreen ──────────────────────────────────────────────────────
export const PlaylistDetailScreen = React.memo(() => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<RouteProps>();
  const { playlistId } = route.params;

  const { playlists: userPlaylists } = useUserPlaylists();
  const { adminPlaylists }           = useAdminPlaylists();
  const { removeSongFromPlaylist, reorderSongs, updatePlaylist } = usePlaylists();

  const currentSong        = usePlayerStore((s) => s.currentSong);
  const setPlaybackContext = usePlayerStore((s) => s.setPlaybackContext);
  const logPick            = usePlayerStore((s) => s.logPick);
  const { user }           = useAuthStore();

  const playlist = useMemo(
    () =>
      userPlaylists.find((p) => p.id === playlistId) ||
      adminPlaylists.find((p) => p.id === playlistId) ||
      null,
    [userPlaylists, adminPlaylists, playlistId],
  );

  const isReadOnly = playlist?.createdBy !== user?.uid;

  const [songs, setSongs]           = useState<Song[]>([]);
  const [songsLoading, setSongsLoading] = useState(true);
  const [songsError, setSongsError] = useState<string | null>(null);
  const [page, setPage]             = useState(0);
  const [hasMore, setHasMore]       = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [editMode, setEditMode]     = useState(false);
  const [editName, setEditName]     = useState('');

  const songsKey = (playlist?.songs ?? []).join(',');

  // ── Load first page ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!playlist?.songs?.length) {
      setSongs([]);
      setSongsLoading(false);
      setHasMore(false);
      return;
    }
    setSongsLoading(true);
    setSongsError(null);
    setPage(0);
    setSongs([]);
    getPlaylistSongsPaged(playlist.songs, 0, PAGE_LIMIT)
      .then(({ songs: fetched, hasMore: more }) => {
        setSongs(fetched);
        setHasMore(more);
        setPage(1);
      })
      .catch(() => setSongsError('Could not load songs. Please try again.'))
      .finally(() => setSongsLoading(false));
  }, [songsKey]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (playlist) setEditName(playlist.name ?? '');
  }, [playlist]);

  // ── Load more ─────────────────────────────────────────────────────────────
  const handleLoadMore = useCallback(() => {
    if (loadingMore || !hasMore || !playlist?.songs) return;
    setLoadingMore(true);
    getPlaylistSongsPaged(playlist.songs, page, PAGE_LIMIT)
      .then(({ songs: fetched, hasMore: more }) => {
        setSongs((prev) => [...prev, ...fetched]);
        setHasMore(more);
        setPage((p) => p + 1);
      })
      .catch(() => {}) // silent fail on load more
      .finally(() => setLoadingMore(false));
  }, [playlist?.songs, page, hasMore, loadingMore]);

  // ── Retry ─────────────────────────────────────────────────────────────────
  const handleRetry = useCallback(() => {
    if (!playlist?.songs) return;
    setSongsError(null);
    setSongsLoading(true);
    setPage(0);
    setSongs([]);
    getPlaylistSongsPaged(playlist.songs, 0, PAGE_LIMIT)
      .then(({ songs: fetched, hasMore: more }) => {
        setSongs(fetched);
        setHasMore(more);
        setPage(1);
      })
      .catch(() => setSongsError('Could not load songs. Please try again.'))
      .finally(() => setSongsLoading(false));
  }, [playlist?.songs]);

  // ── Playback ──────────────────────────────────────────────────────────────
  const handlePlayAll = useCallback(() => {
    if (!songs.length) return;
    setPlaybackContext('playlist', playlistId, songs, 0);
  }, [songs, playlistId, setPlaybackContext]);

  const handleShufflePlay = useCallback(() => {
    if (!songs.length) return;
    const idx = Math.floor(Math.random() * songs.length);
    setPlaybackContext('playlist', playlistId, songs, idx);
  }, [songs, playlistId, setPlaybackContext]);

  const handleSongPress = useCallback((song: Song, index: number) => {
    logPick?.(song, currentSong, user?.uid ?? '');
    setPlaybackContext('playlist', playlistId, songs, index);
  }, [songs, playlistId, setPlaybackContext, logPick, currentSong, user?.uid]);

  // ── Reorder / remove ──────────────────────────────────────────────────────
  const handleMoveUp = useCallback(async (index: number) => {
    if (index === 0 || isReadOnly || !playlist?.songs) return;
    const newIds = [...playlist.songs];
    [newIds[index - 1], newIds[index]] = [newIds[index], newIds[index - 1]];
    await reorderSongs({ playlistId, songIds: newIds });
  }, [isReadOnly, playlist?.songs, playlistId, reorderSongs]);

  const handleMoveDown = useCallback(async (index: number) => {
    if (!playlist?.songs || index === playlist.songs.length - 1 || isReadOnly) return;
    const newIds = [...playlist.songs];
    [newIds[index], newIds[index + 1]] = [newIds[index + 1], newIds[index]];
    await reorderSongs({ playlistId, songIds: newIds });
  }, [isReadOnly, playlist?.songs, playlistId, reorderSongs]);

  const handleRemove = useCallback((songId: string) => {
    Alert.alert('Remove Song', 'Remove this song from the playlist?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Remove', style: 'destructive', onPress: () => removeSongFromPlaylist({ playlistId, songId }) },
    ]);
  }, [playlistId, removeSongFromPlaylist]);

  // ── Rename ────────────────────────────────────────────────────────────────
  const handleSaveEdit = useCallback(async () => {
    if (!editName.trim() || isReadOnly) return;
    await updatePlaylist({ id: playlistId, data: { name: editName.trim() } });
    setEditMode(false);
  }, [editName, isReadOnly, playlistId, updatePlaylist]);

  // ── FlatList ──────────────────────────────────────────────────────────────
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
      isReadOnly={isReadOnly}
      onPress={handleSongPress}
      onMoveUp={handleMoveUp}
      onMoveDown={handleMoveDown}
      onRemove={handleRemove}
      isFirst={index === 0}
      isLast={index === songs.length - 1}
    />
  ), [currentSong?.id, isReadOnly, songs.length, handleSongPress, handleMoveUp, handleMoveDown, handleRemove]);

  const ListHeader = useMemo(() => (
    <View>
      {/* Hero */}
      <View style={styles.hero}>
        {playlist?.coverUrl ? (
          <Image source={{ uri: playlist.coverUrl }} style={styles.cover} contentFit="cover" />
        ) : (
          <View style={styles.coverPlaceholder}>
            <Text style={styles.coverPlaceholderText}>♪</Text>
          </View>
        )}

        <View style={styles.typeRow}>
          <Text style={styles.typeLabel}>PLAYLIST</Text>
          {isReadOnly && <View style={styles.libraryBadge}><Text style={styles.libraryBadgeText}>Library</Text></View>}
        </View>

        {!isReadOnly && editMode ? (
          <View style={styles.editRow}>
            <TextInput
              style={styles.editInput}
              value={editName}
              onChangeText={setEditName}
              autoFocus
              returnKeyType="done"
              onSubmitEditing={handleSaveEdit}
            />
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveEdit}>
              <Text style={styles.saveBtnText}>Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setEditMode(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity onLongPress={() => !isReadOnly && setEditMode(true)} activeOpacity={0.8}>
            <Text style={styles.heroName}>{playlist?.name}</Text>
          </TouchableOpacity>
        )}

        {playlist?.description ? (
          <Text style={styles.heroDesc}>{playlist.description}</Text>
        ) : null}
        <Text style={styles.heroCount}>{songs.length} songs</Text>

        {songs.length > 0 && (
          <View style={styles.heroActions}>
            <TouchableOpacity style={styles.playBtn} onPress={handlePlayAll}>
              <Text style={styles.playBtnText}>▶  Play</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.shuffleBtn} onPress={handleShufflePlay}>
              <Text style={styles.shuffleBtnText}>⇌  Shuffle</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <View style={styles.divider} />

      {songs.length === 0 && !songsLoading && (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>No songs in this playlist yet.</Text>
        </View>
      )}
    </View>
  ), [
    playlist, isReadOnly, editMode, editName, songs.length,
    songsLoading, handlePlayAll, handleShufflePlay, handleSaveEdit,
  ]);

  const ListFooter = useMemo(() => (
    <View style={{ alignItems: 'center', paddingVertical: LAYOUT.spacing.md }}>
      {loadingMore && <ActivityIndicator size="small" color={COLORS.primary} />}
      <View style={{ height: LAYOUT.miniPlayerHeight + LAYOUT.tabBarHeight + LAYOUT.spacing.md }} />
    </View>
  ), [loadingMore]);

  // ── States ────────────────────────────────────────────────────────────────
  if (!playlist || songsLoading) return <Skeleton />;

  if (songsError) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorIcon}>⚠️</Text>
        <Text style={styles.errorTitle}>Could not load songs</Text>
        <Text style={styles.errorSub}>{songsError}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={handleRetry}>
          <Text style={styles.retryText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Back button */}
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
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
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

  backBtn: { paddingHorizontal: LAYOUT.spacing.md, paddingVertical: LAYOUT.spacing.sm },
  backBtnText: { fontSize: TYPOGRAPHY.sizes.sm, color: COLORS.primary, fontFamily: TYPOGRAPHY.families.sans },

  // ── Hero ──
  hero: { alignItems: 'center', paddingHorizontal: LAYOUT.spacing.md, paddingTop: LAYOUT.spacing.lg, paddingBottom: LAYOUT.spacing.md },
  cover: { width: 160, height: 160, borderRadius: LAYOUT.radius.lg, backgroundColor: COLORS.overlay, marginBottom: LAYOUT.spacing.md },
  coverPlaceholder: {
    width: 160, height: 160, borderRadius: LAYOUT.radius.lg,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    alignItems: 'center', justifyContent: 'center', marginBottom: LAYOUT.spacing.md,
  },
  coverPlaceholderText: { fontSize: 48, color: COLORS.textMuted },
  typeRow: { flexDirection: 'row', alignItems: 'center', gap: LAYOUT.spacing.sm, marginBottom: LAYOUT.spacing.xs },
  typeLabel: { fontSize: TYPOGRAPHY.sizes.xs, fontWeight: TYPOGRAPHY.weights.bold, color: COLORS.primary, letterSpacing: 1, fontFamily: TYPOGRAPHY.families.sans },
  libraryBadge: { backgroundColor: COLORS.accentMuted, borderWidth: 1, borderColor: 'rgba(34,197,94,0.2)', borderRadius: LAYOUT.radius.xs, paddingHorizontal: LAYOUT.spacing.sm, paddingVertical: 2 },
  libraryBadgeText: { fontSize: TYPOGRAPHY.sizes.xs, fontWeight: TYPOGRAPHY.weights.bold, color: COLORS.primary, fontFamily: TYPOGRAPHY.families.sans },
  heroName: { fontSize: TYPOGRAPHY.sizes['2xl'], fontWeight: TYPOGRAPHY.weights.bold, color: COLORS.white, fontFamily: TYPOGRAPHY.families.sans, textAlign: 'center', marginBottom: LAYOUT.spacing.xs },
  heroDesc: { fontSize: TYPOGRAPHY.sizes.sm, color: COLORS.textSecondary, fontFamily: TYPOGRAPHY.families.sans, textAlign: 'center', marginBottom: LAYOUT.spacing.xs },
  heroCount: { fontSize: TYPOGRAPHY.sizes.sm, color: COLORS.textMuted, fontFamily: TYPOGRAPHY.families.sans, marginBottom: LAYOUT.spacing.md },
  heroActions: { flexDirection: 'row', gap: LAYOUT.spacing.sm },
  playBtn: { backgroundColor: COLORS.primary, borderRadius: LAYOUT.radius.md, paddingHorizontal: LAYOUT.spacing.xl, paddingVertical: LAYOUT.spacing.sm + 2 },
  playBtnText: { fontSize: TYPOGRAPHY.sizes.sm, fontWeight: TYPOGRAPHY.weights.bold, color: COLORS.black, fontFamily: TYPOGRAPHY.families.sans },
  shuffleBtn: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderRadius: LAYOUT.radius.md, paddingHorizontal: LAYOUT.spacing.md, paddingVertical: LAYOUT.spacing.sm + 2 },
  shuffleBtnText: { fontSize: TYPOGRAPHY.sizes.sm, fontWeight: TYPOGRAPHY.weights.medium, color: COLORS.textPrimary, fontFamily: TYPOGRAPHY.families.sans },

  // ── Edit row ──
  editRow: { flexDirection: 'row', alignItems: 'center', gap: LAYOUT.spacing.sm, marginBottom: LAYOUT.spacing.sm },
  editInput: {
    flex: 1, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.primary,
    borderRadius: LAYOUT.radius.md, paddingHorizontal: LAYOUT.spacing.md,
    color: COLORS.textPrimary, fontSize: TYPOGRAPHY.sizes.lg, fontWeight: TYPOGRAPHY.weights.bold,
    fontFamily: TYPOGRAPHY.families.sans, height: 44,
  },
  saveBtn: { backgroundColor: COLORS.primary, borderRadius: LAYOUT.radius.md, paddingHorizontal: LAYOUT.spacing.md, height: 44, justifyContent: 'center' },
  saveBtnText: { fontSize: TYPOGRAPHY.sizes.sm, fontWeight: TYPOGRAPHY.weights.bold, color: COLORS.black, fontFamily: TYPOGRAPHY.families.sans },
  cancelBtn: { backgroundColor: COLORS.surface, borderRadius: LAYOUT.radius.md, paddingHorizontal: LAYOUT.spacing.sm, height: 44, justifyContent: 'center' },
  cancelBtnText: { fontSize: TYPOGRAPHY.sizes.sm, color: COLORS.textMuted, fontFamily: TYPOGRAPHY.families.sans },

  divider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: LAYOUT.spacing.md, marginBottom: LAYOUT.spacing.sm },

  // ── Empty ──
  emptyBox: { alignItems: 'center', paddingVertical: LAYOUT.spacing['2xl'] },
  emptyText: { fontSize: TYPOGRAPHY.sizes.sm, color: COLORS.textMuted, fontFamily: TYPOGRAPHY.families.sans },

  // ── Song row ──
  songRow: {
    flexDirection: 'row', alignItems: 'center', gap: LAYOUT.spacing.sm,
    height: SONG_ROW_HEIGHT, paddingHorizontal: LAYOUT.spacing.md,
  },
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
  rowActions: { flexDirection: 'row', alignItems: 'center', gap: LAYOUT.spacing.xs },
  arrowBtn: { fontSize: 14, color: COLORS.textMuted, padding: 2 },
  arrowBtnDisabled: { color: COLORS.textDisabled },
  removeBtn: { fontSize: 13, color: COLORS.textMuted, padding: 2 },

  separator: { height: 1, backgroundColor: COLORS.rowDivider, marginHorizontal: LAYOUT.spacing.md },

  // ── Error / centered ──
  centered: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.background, padding: LAYOUT.spacing.xl, gap: LAYOUT.spacing.sm },
  errorIcon: { fontSize: 32 },
  errorTitle: { fontSize: TYPOGRAPHY.sizes.lg, fontWeight: TYPOGRAPHY.weights.semibold, color: COLORS.white, fontFamily: TYPOGRAPHY.families.sans, textAlign: 'center' },
  errorSub: { fontSize: TYPOGRAPHY.sizes.sm, color: COLORS.textMuted, fontFamily: TYPOGRAPHY.families.sans, textAlign: 'center' },
  retryBtn: { marginTop: LAYOUT.spacing.sm, backgroundColor: COLORS.primary, paddingHorizontal: LAYOUT.spacing.xl, paddingVertical: LAYOUT.spacing.sm + 2, borderRadius: LAYOUT.radius.md },
  retryText: { fontSize: TYPOGRAPHY.sizes.sm, fontWeight: TYPOGRAPHY.weights.semibold, color: COLORS.black, fontFamily: TYPOGRAPHY.families.sans },

  // ── Skeleton ──
  skeletonWrap: { flex: 1, backgroundColor: COLORS.background, padding: LAYOUT.spacing.md },
  skeletonHero: { height: 280, borderRadius: LAYOUT.radius.xl, backgroundColor: COLORS.surface, marginBottom: LAYOUT.spacing.lg },
  skeletonRow: { flexDirection: 'row', alignItems: 'center', gap: LAYOUT.spacing.md, height: SONG_ROW_HEIGHT, paddingHorizontal: LAYOUT.spacing.sm },
  skeletonCover: { width: 44, height: 44, borderRadius: LAYOUT.radius.sm, backgroundColor: COLORS.surface },
  skeletonMeta: { flex: 1 },
  skeletonLine: { height: 11, borderRadius: LAYOUT.radius.xs, backgroundColor: COLORS.surface },
});