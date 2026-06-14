/**
 * src/components/songs/SongList.tsx
 *
 * Mobile version of web SongList.jsx.
 * - FlatList replaces @tanstack/react-virtual
 * - useLikedSongs called once here — likedSongIds passed to every SongCard
 * - Infinite scroll via onEndReached
 * - getItemLayout for perf (fixed row height)
 * - removeClippedSubviews + windowSize for memory
 */

import React, { useCallback, memo } from 'react';
import {
  FlatList,
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  ListRenderItemInfo,
} from 'react-native';
import { useAuthStore } from '@store/authStore';
import { useLikedSongs } from '@hooks/useLikedSongs';
import { SongCard } from '@components/songs/SongCard';
import { SongListSkeleton } from '@components/songs/SongListSkeleton';
import { COLORS } from '@constants/colors';
import { LAYOUT } from '@constants/layout';
import { TYPOGRAPHY } from '@constants/typography';
import { Song } from '../../types/song';

// ── Constants ─────────────────────────────────────────────────────────────────
const SONG_ROW_HEIGHT  = 60;
const SENTINEL_OFFSET  = 8;

// ── Props ─────────────────────────────────────────────────────────────────────
interface SongListProps {
  songs:               Song[];
  fetchNextPage?:      () => void;
  hasNextPage?:        boolean;
  isFetchingNextPage?: boolean;
  isLoading?:          boolean;
  ListHeaderComponent?: React.ReactElement;
}

// ── List header ───────────────────────────────────────────────────────────────
const ListHeader = memo(() => (
  <View style={headerStyles.row}>
    <Text style={[headerStyles.col, headerStyles.colIndex]}>#</Text>
    <View style={headerStyles.colCover} />
    <Text style={headerStyles.col}>Title</Text>
    <Text style={[headerStyles.col, headerStyles.colGenre]}>Tags</Text>
    <Text style={[headerStyles.col, headerStyles.colDur]}>Time</Text>
    <View style={headerStyles.colActions} />
  </View>
));

const headerStyles = StyleSheet.create({
  row: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: LAYOUT.spacing.sm,
    paddingBottom:     LAYOUT.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    marginBottom:      LAYOUT.spacing.xs,
    gap:               LAYOUT.spacing.sm,
  },
  col: {
    fontSize:      TYPOGRAPHY.sizes.xs,
    fontWeight:    TYPOGRAPHY.weights.semibold,
    color:         COLORS.textMuted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    flex:          1,
  },
  colIndex: {
    flex:      0,
    width:     28,
    textAlign: 'center',
  },
  colCover: {
    width:     44,
    flexShrink: 0,
  },
  colGenre: {
    flex:      0,
    width:     80,
  },
  colDur: {
    flex:      0,
    width:     36,
    textAlign: 'right',
  },
  colActions: {
    width:     64,
    flexShrink: 0,
  },
});

// ── Empty state ───────────────────────────────────────────────────────────────
const EmptyState = memo(() => (
  <View style={emptyStyles.container}>
    <View style={emptyStyles.icon}>
      <Text style={emptyStyles.iconText}>♪</Text>
    </View>
    <Text style={emptyStyles.title}>No songs found</Text>
    <Text style={emptyStyles.subtitle}>Try a different search or check back later.</Text>
  </View>
));

const emptyStyles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding:    LAYOUT.spacing.xl * 2,
  },
  icon: {
    width:           56,
    height:          56,
    backgroundColor: '#1a1a1a',
    borderWidth:     1,
    borderColor:     '#2d2d2d',
    borderRadius:    LAYOUT.radius.md,
    alignItems:      'center',
    justifyContent:  'center',
    marginBottom:    LAYOUT.spacing.md,
  },
  iconText: {
    fontSize: 22,
    color:    COLORS.textMuted,
  },
  title: {
    color:      COLORS.textPrimary,
    fontSize:   TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
    fontFamily: TYPOGRAPHY.families.sans,
    marginBottom: 6,
  },
  subtitle: {
    color:      COLORS.textSecondary,
    fontSize:   TYPOGRAPHY.sizes.sm,
    fontFamily: TYPOGRAPHY.families.sans,
    textAlign:  'center',
  },
});

// ── Footer ────────────────────────────────────────────────────────────────────
const ListFooter = memo(({ isFetchingNextPage }: { isFetchingNextPage?: boolean }) => {
  if (!isFetchingNextPage) return null;
  return (
    <View style={footerStyles.container}>
      <ActivityIndicator color={COLORS.primary} size="small" />
    </View>
  );
});

const footerStyles = StyleSheet.create({
  container: {
    paddingVertical: LAYOUT.spacing.md,
    alignItems:      'center',
  },
});

// ── SongList ──────────────────────────────────────────────────────────────────
export const SongList = memo(({
  songs,
  fetchNextPage,
  hasNextPage,
  isFetchingNextPage,
  isLoading,
  ListHeaderComponent,
}: SongListProps) => {
  // Single useLikedSongs call — passed down to every SongCard as prop
  const user = useAuthStore((s) => s.user);
  const { likedSongIds } = useLikedSongs(user?.uid);

  const renderItem = useCallback(
    ({ item, index }: ListRenderItemInfo<Song>) => (
      <SongCard
        song={item}
        songList={songs}
        contextSongs={songs}
        index={index}
        startIndex={index}
        likedSongIds={likedSongIds}
      />
    ),
    [songs, likedSongIds],
  );

  const keyExtractor = useCallback((item: Song) => item.id, []);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: SONG_ROW_HEIGHT,
      offset: SONG_ROW_HEIGHT * index,
      index,
    }),
    [],
  );

  const onEndReached = useCallback(() => {
    if (hasNextPage && !isFetchingNextPage) fetchNextPage?.();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (isLoading) return <SongListSkeleton />;

  return (
    <FlatList
      data={songs}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      ListHeaderComponent={
        <>
          {ListHeaderComponent}
          <ListHeader />
        </>
      }
      ListEmptyComponent={<EmptyState />}
      ListFooterComponent={<ListFooter isFetchingNextPage={isFetchingNextPage} />}
      onEndReached={onEndReached}
      onEndReachedThreshold={SENTINEL_OFFSET / 100}
      removeClippedSubviews
      windowSize={10}
      maxToRenderPerBatch={10}
      updateCellsBatchingPeriod={50}
      initialNumToRender={12}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    />
  );
});

SongList.displayName = 'SongList';

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  content: {
    paddingBottom: LAYOUT.miniPlayerHeight + LAYOUT.tabBarHeight + LAYOUT.spacing.md,
  },
});

export default SongList;