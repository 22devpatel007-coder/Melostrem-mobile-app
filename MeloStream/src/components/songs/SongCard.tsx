/**
 * src/components/songs/SongCard.tsx
 *
 * Mobile version of web SongCard.jsx.
 * - No CSS injection — uses StyleSheet
 * - No react-router Link — uses navigation
 * - likedSongIds passed from parent (SongList) — zero hook overhead per card
 * - Scale press animation via Reanimated
 * - Equalizer bars via Animated (RN core)
 */

import React, { memo, useCallback, useRef, useState } from 'react';
import {
  Animated,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Image } from 'expo-image';
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
} from 'react-native-reanimated';
import Svg, { Path, Polygon, Circle as SvgCircle } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { usePlayerStore } from '@store/playerStore';
import { formatDuration } from '../../utils/formatters';
import { sanitizeDisplay } from '../../utils/sanitize';
import { LikeButton } from '../player/LikeButton';
import { OptionsSheet } from '../player/OptionsSheet';
import { COLORS } from '@constants/colors';
import { LAYOUT } from '@constants/layout';
import { TYPOGRAPHY } from '@constants/typography';
import { Song } from '../../types/song';

// ── Icons ─────────────────────────────────────────────────────────────────────
const PlayIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill={COLORS.textPrimary}>
    <Path d="M8 5.14v14l11-7-11-7z" />
  </Svg>
);

const DotsIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill={COLORS.textSecondary}>
    <SvgCircle cx="5"  cy="12" r="1.5" />
    <SvgCircle cx="12" cy="12" r="1.5" />
    <SvgCircle cx="19" cy="12" r="1.5" />
  </Svg>
);

// ── Equalizer bars ────────────────────────────────────────────────────────────
const EqualizerBars = memo(() => {
  const bars = [
    useRef(new Animated.Value(0.4)).current,
    useRef(new Animated.Value(1.0)).current,
    useRef(new Animated.Value(0.65)).current,
    useRef(new Animated.Value(0.3)).current,
  ];

  React.useEffect(() => {
    const anims = bars.map((bar, i) =>
      Animated.loop(
        Animated.sequence([
          Animated.timing(bar, {
            toValue: 1,
            duration: 400 + i * 80,
            useNativeDriver: true,
            delay: i * 80,
          }),
          Animated.timing(bar, {
            toValue: 0.3,
            duration: 400 + i * 80,
            useNativeDriver: true,
          }),
        ])
      )
    );
    anims.forEach((a) => a.start());
    return () => anims.forEach((a) => a.stop());
  }, []);

  return (
    <View style={eqStyles.container} accessibilityLabel="Now playing">
      {bars.map((bar, i) => (
        <Animated.View
          key={i}
          style={[eqStyles.bar, { transform: [{ scaleY: bar }] }]}
        />
      ))}
    </View>
  );
});

const eqStyles = StyleSheet.create({
  container: {
    flexDirection:  'row',
    alignItems:     'flex-end',
    gap:            2,
    height:         16,
  },
  bar: {
    width:           3,
    height:          16,
    borderRadius:    1,
    backgroundColor: COLORS.primary,
  },
});

// ── Props ─────────────────────────────────────────────────────────────────────
interface SongCardProps {
  song:          Song;
  songList?:     Song[];
  contextSongs?: Song[];
  index?:        number;
  startIndex?:   number;
  likedSongIds?: string[];
}

// ── Component ─────────────────────────────────────────────────────────────────
export const SongCard = memo(({
  song,
  songList,
  contextSongs,
  index,
  startIndex,
  likedSongIds = [],
}: SongCardProps) => {
  const navigation = useNavigation<any>();

  const pool      = contextSongs ?? songList ?? null;
  const poolIndex = startIndex   ?? index    ?? 0;

  const currentSong          = usePlayerStore((s) => s.currentSong);
  const isPlaying            = usePlayerStore((s) => s.isPlaying);
  const setPlaybackContext   = usePlayerStore((s) => s.setPlaybackContext);

  const [showOptions, setShowOptions] = useState(false);

  const isActive = currentSong?.id === song.id;
  const isLiked  = likedSongIds.includes(song.id);
  const dur      = formatDuration(song.duration);

  const safeTitle  = sanitizeDisplay(song.title);
  const safeArtist = sanitizeDisplay(song.artist);
  const safeTags   = Array.isArray(song.tags) ? song.tags.map(sanitizeDisplay) : [];

  // ── Scale press animation ─────────────────────────────────────────────────
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const onPressIn  = useCallback(() => { scale.value = withSpring(0.97, { damping: 10 }); }, []);
  const onPressOut = useCallback(() => { scale.value = withSpring(1.0,  { damping: 10 }); }, []);

  // ── Play ──────────────────────────────────────────────────────────────────
  const handlePlay = useCallback(() => {
    const safePool = Array.isArray(pool) && pool.length > 0 ? pool : [song];
    const idx      = safePool.findIndex((s) => s.id === song.id);
    const safeIdx  = idx >= 0 ? idx : poolIndex;
    setPlaybackContext('library', null, safePool, safeIdx);
  }, [song, pool, poolIndex, setPlaybackContext]);

  const handleArtistPress = useCallback(() => {
    if (song.artistId) navigation.navigate('ArtistDetail', { artistId: song.artistId });
  }, [song.artistId, navigation]);

  const coverUri = song.coverUrl || song.coverUrl;

  return (
    <>
      <Reanimated.View style={animStyle}>
        <TouchableOpacity
          style={[styles.row, isActive && styles.rowActive]}
          onPress={handlePlay}
          onPressIn={onPressIn}
          onPressOut={onPressOut}
          activeOpacity={1}
          accessibilityRole="button"
          accessibilityLabel={`Play ${safeTitle} by ${safeArtist}`}
        >
          {/* Col 1: Index / equalizer */}
          <View style={styles.indexCol}>
            {isActive && isPlaying ? (
              <EqualizerBars />
            ) : isActive ? (
              <PlayIcon />
            ) : (
              <Text style={styles.indexNum}>{poolIndex + 1}</Text>
            )}
          </View>

          {/* Col 2: Cover */}
          <View style={styles.coverWrap}>
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={styles.cover} contentFit="cover" transition={200} cachePolicy="memory-disk" recyclingKey={song.id} />
            ) : (
              <View style={[styles.cover, styles.coverFallback]}>
                <Text style={styles.coverFallbackText}>♪</Text>
              </View>
            )}
          </View>

          {/* Col 3: Title + Artist */}
          <View style={styles.meta}>
            <Text
              style={[styles.title, isActive && styles.titleActive]}
              numberOfLines={1}
            >
              {safeTitle}
            </Text>
            <TouchableOpacity
              onPress={handleArtistPress}
              disabled={!song.artistId}
              activeOpacity={0.7}
            >
              <Text style={styles.artist} numberOfLines={1}>{safeArtist}</Text>
            </TouchableOpacity>
          </View>

          {/* Col 4: Genre tag */}
          {safeTags.length > 0 && (
            <View style={styles.genreWrap}>
              <Text style={styles.genre} numberOfLines={1}>{safeTags[0]}</Text>
            </View>
          )}

          {/* Col 5: Duration */}
          {dur && dur !== '0:00' && (
            <Text style={styles.duration}>{dur}</Text>
          )}

          {/* Col 6: Actions */}
          <View style={styles.actions}>
            <LikeButton song={song} size="sm" />
            <TouchableOpacity
              onPress={() => setShowOptions(true)}
              style={styles.iconBtn}
              activeOpacity={0.7}
              accessibilityRole="button"
              accessibilityLabel="More options"
            >
              <DotsIcon />
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Reanimated.View>

      <OptionsSheet
        song={song}
        isOpen={showOptions}
        onClose={() => setShowOptions(false)}
      />
    </>
  );
});

SongCard.displayName = 'SongCard';

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  row: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: LAYOUT.spacing.sm,
    paddingVertical:   LAYOUT.spacing.xs,
    minHeight:         60,
    borderLeftWidth:   3,
    borderLeftColor:   'transparent',
    gap:               LAYOUT.spacing.sm,
  },
  rowActive: {
    borderLeftColor:  COLORS.primary,
    backgroundColor:  'rgba(108,99,255,0.06)',
  },

  // Index
  indexCol: {
    width:           28,
    alignItems:      'center',
    justifyContent:  'center',
    flexShrink:      0,
  },
  indexNum: {
    color:     COLORS.textMuted,
    fontSize:  TYPOGRAPHY.sizes.xs,
    fontFamily: TYPOGRAPHY.families.sans,
  },

  // Cover
  coverWrap: {
    width:        44,
    height:       44,
    borderRadius: LAYOUT.radius.sm,
    overflow:     'hidden',
    backgroundColor: '#111',
    flexShrink:   0,
  },
  cover: {
    width:  '100%',
    height: '100%',
  },
  coverFallback: {
    alignItems:     'center',
    justifyContent: 'center',
    backgroundColor: COLORS.overlay,
  },
  coverFallbackText: {
    color:    COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.md,
  },

  // Meta
  meta: {
    flex:     1,
    minWidth: 0,
    gap:      2,
  },
  title: {
    color:      COLORS.textPrimary,
    fontSize:   TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
    fontFamily: TYPOGRAPHY.families.sans,
  },
  titleActive: {
    color: COLORS.primary,
  },
  artist: {
    color:      COLORS.textSecondary,
    fontSize:   TYPOGRAPHY.sizes.xs,
    fontFamily: TYPOGRAPHY.families.sans,
  },

  // Genre
  genreWrap: {
    flexShrink: 0,
  },
  genre: {
    color:           COLORS.primary,
    fontSize:        TYPOGRAPHY.sizes.xs,
    fontFamily:      TYPOGRAPHY.families.sans,
    fontWeight:      TYPOGRAPHY.weights.medium,
    backgroundColor: 'rgba(108,99,255,0.1)',
    borderWidth:     1,
    borderColor:     'rgba(108,99,255,0.2)',
    borderRadius:    LAYOUT.radius.xs,
    paddingHorizontal: 6,
    paddingVertical:   2,
    maxWidth:          80,
  },

  // Duration
  duration: {
    color:      COLORS.textMuted,
    fontSize:   TYPOGRAPHY.sizes.xs,
    fontFamily: TYPOGRAPHY.families.mono,
    flexShrink: 0,
  },

  // Actions
  actions: {
    flexDirection: 'row',
    alignItems:    'center',
    flexShrink:    0,
    gap:           2,
  },
  iconBtn: {
    width:          32,
    height:         32,
    alignItems:     'center',
    justifyContent: 'center',
    borderRadius:   999,
  },
});

export default SongCard;