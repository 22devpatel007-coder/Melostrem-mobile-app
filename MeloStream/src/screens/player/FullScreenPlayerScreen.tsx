/**
 * src/screens/player/FullScreenPlayerScreen.tsx
 *
 * Full-screen player modal.
 * - Swipe down to close via PanResponder
 * - Progress bar via useProgress() + Animated + PanResponder seek
 * - Volume bar via Animated + PanResponder
 * - All state from usePlayerStore + TrackPlayer
 */

import React, { useCallback, useEffect, useRef } from 'react';
import {
  Animated,
  Image,
  PanResponder,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useProgress } from '@rntp/player';
import { COLORS } from '@constants/colors';
import { LAYOUT } from '@constants/layout';
import { TYPOGRAPHY } from '@constants/typography';
import { usePlayerStore } from '@store/playerStore';
import Svg, { Line, Polygon, Rect, Path } from 'react-native-svg';
import Reanimated, { useSharedValue, useAnimatedStyle, withSpring } from 'react-native-reanimated';
import { LikeButton } from '@components/player/LikeButton';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

// ── Icons ─────────────────────────────────────────────────────────────────────

const ChevronDownIcon = () => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill="none" stroke={COLORS.textSecondary} strokeWidth="2.5">
    <Line x1="6" y1="9" x2="12" y2="15" />
    <Line x1="12" y1="15" x2="18" y2="9" />
  </Svg>
);

const PlayIcon = () => (
  <Svg width={32} height={32} viewBox="0 0 24 24" fill={COLORS.black}>
    <Polygon points="5,3 19,12 5,21" />
  </Svg>
);

const PauseIcon = () => (
  <Svg width={32} height={32} viewBox="0 0 24 24" fill={COLORS.black}>
    <Rect x="6" y="4" width="4" height="16" />
    <Rect x="14" y="4" width="4" height="16" />
  </Svg>
);

const NextIcon = () => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill={COLORS.textPrimary}>
    <Polygon points="5,3 15,12 5,21" />
    <Rect x="17" y="3" width="2" height="18" />
  </Svg>
);

const PrevIcon = () => (
  <Svg width={28} height={28} viewBox="0 0 24 24" fill={COLORS.textPrimary}>
    <Polygon points="19,3 9,12 19,21" />
    <Rect x="5" y="3" width="2" height="18" />
  </Svg>
);

const ShuffleIcon = ({ active }: { active: boolean }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none"
    stroke={active ? COLORS.primary : COLORS.textSecondary} strokeWidth="2" strokeLinecap="round">
    <Path d="M16 3h5v5" />
    <Path d="M4 20L21 3" />
    <Path d="M21 16v5h-5" />
    <Path d="M15 15l6 6" />
    <Path d="M4 4l5 5" />
  </Svg>
);

const RepeatIcon = ({ mode }: { mode: 'none' | 'all' | 'one' }) => (
  <Svg width={22} height={22} viewBox="0 0 24 24" fill="none"
    stroke={mode !== 'none' ? COLORS.primary : COLORS.textSecondary} strokeWidth="2" strokeLinecap="round">
    <Path d="M17 1l4 4-4 4" />
    <Path d="M3 11V9a4 4 0 014-4h14" />
    <Path d="M7 23l-4-4 4-4" />
    <Path d="M21 13v2a4 4 0 01-4 4H3" />
    {mode === 'one' && (
      <Path d="M11 10h1v4" stroke={COLORS.primary} strokeWidth="1.5" />
    )}
  </Svg>
);

const VolumeIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill={COLORS.textMuted}>
    <Path d="M11 5L6 9H2v6h4l5 4V5z" />
    <Path d="M15.54 8.46a5 5 0 010 7.07" stroke={COLORS.textMuted} strokeWidth="2" fill="none" />
  </Svg>
);

const VolumeHighIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill={COLORS.textMuted}>
    <Path d="M11 5L6 9H2v6h4l5 4V5z" />
    <Path d="M19.07 4.93a10 10 0 010 14.14" stroke={COLORS.textMuted} strokeWidth="2" fill="none" strokeLinecap="round" />
  </Svg>
);

// ── Component ─────────────────────────────────────────────────────────────────

export function FullScreenPlayerScreen() {
  const navigation = useNavigation();

  const currentSong    = usePlayerStore((s) => s.currentSong);
  const isPlaying      = usePlayerStore((s) => s.isPlaying);
  const shuffleMode    = usePlayerStore((s) => s.shuffleMode);
  const repeatMode     = usePlayerStore((s) => s.repeatMode);
  const volume         = usePlayerStore((s) => s.volume);
  const togglePlay     = usePlayerStore((s) => s.togglePlay);
  const playNext       = usePlayerStore((s) => s.playNext);
  const playPrev       = usePlayerStore((s) => s.playPrev);
  const setRepeatMode  = usePlayerStore((s) => s.setRepeatMode);
  const cycleShuffleMode = usePlayerStore((s) => s.cycleShuffleMode);
  const setVolume      = usePlayerStore((s) => s.setVolume);

  const { position, duration } = useProgress(250);

  // ── Swipe down to close ───────────────────────────────────────────────────
  const translateY = useRef(new Animated.Value(0)).current;

  const swipePan = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gs) => gs.dy > 8 && Math.abs(gs.dy) > Math.abs(gs.dx),
      onPanResponderMove: (_, gs) => {
        if (gs.dy > 0) translateY.setValue(gs.dy);
      },
      onPanResponderRelease: (_, gs) => {
        if (gs.dy > 100) {
          navigation.goBack();
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            tension: 80,
            friction: 10,
          }).start();
        }
      },
      onPanResponderTerminate: () => {
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  // ── Progress seek ─────────────────────────────────────────────────────────
  const progressAnim = useRef(new Animated.Value(0)).current;
  const progressBarWidth = useRef(0);
  const isSeeking = useRef(false);

  useEffect(() => {
    if (isSeeking.current || !duration) return;
    progressAnim.setValue(position / duration);
  }, [position, duration, progressAnim]);

  const seekPan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: () => { isSeeking.current = true; },
      onPanResponderMove: (_, gs) => {
        const w = progressBarWidth.current;
        if (!w) return;
        const pct = Math.max(0, Math.min(1, gs.moveX / w));
        progressAnim.setValue(pct);
      },
      onPanResponderRelease: async (_, gs) => {
        const w = progressBarWidth.current;
        if (!w) return;
        const pct = Math.max(0, Math.min(1, gs.moveX / w));
        const TrackPlayer = (await import('@rntp/player')).default;
        await TrackPlayer.seekTo(pct * (duration || 0));
        isSeeking.current = false;
      },
      onPanResponderTerminate: () => { isSeeking.current = false; },
    })
  ).current;

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  // ── Volume bar ────────────────────────────────────────────────────────────
  const volumeAnim = useRef(new Animated.Value(volume)).current;
  const volumeBarWidth = useRef(0);

  useEffect(() => {
    volumeAnim.setValue(volume);
  }, [volume, volumeAnim]);

  const volumePan = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderMove: (_, gs) => {
        const w = volumeBarWidth.current;
        if (!w) return;
        const v = Math.max(0, Math.min(1, gs.moveX / w));
        volumeAnim.setValue(v);
        setVolume(v);
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  const volumeWidth = volumeAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  // ── Repeat cycle ──────────────────────────────────────────────────────────
  const cycleRepeat = useCallback(() => {
    if (repeatMode === 'none') setRepeatMode('all');
    else if (repeatMode === 'all') setRepeatMode('one');
    else setRepeatMode('none');
  }, [repeatMode, setRepeatMode]);

  const fmt = (t: number) => {
    if (!t || isNaN(t)) return '0:00';
    return `${Math.floor(t / 60)}:${Math.floor(t % 60).toString().padStart(2, '0')}`;
  };
  const slideIn = useSharedValue(SCREEN_HEIGHT);
const slideStyle = useAnimatedStyle(() => ({
  transform: [{ translateY: slideIn.value }],
}));
React.useEffect(() => {
  slideIn.value = withSpring(0, { damping: 20, stiffness: 180 });
}, []);
  if (!currentSong) {
    navigation.goBack();
    return null;
  }

  const coverUri = currentSong.coverUrl || currentSong.imageUrl;

  return (
    <Reanimated.View style={[styles.root, slideStyle]}>
  <Animated.View style={{ flex: 1, transform: [{ translateY }] }} {...swipePan.panHandlers}>

      {/* ── Drag handle ── */}
      <View style={styles.handle} />

      {/* ── Header ── */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerBtn}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Close player"
        >
          <ChevronDownIcon />
        </TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerLabel}>Now Playing</Text>
        </View>

        {/* Placeholder for options — wire up OptionsSheet in next phase */}
        <View style={styles.headerBtn} />
      </View>

      {/* ── Artwork ── */}
      <View style={styles.artworkContainer}>
        {coverUri ? (
          <Image
            source={{ uri: coverUri }}
            style={styles.artwork}
            resizeMode="cover"
          />
        ) : (
          <View style={[styles.artwork, styles.artworkFallback]}>
            <Text style={styles.artworkFallbackText}>♪</Text>
          </View>
        )}
      </View>

      {/* ── Song info ── */}
      <View style={styles.songInfo}>
        <View style={styles.songText}>
          <Text style={styles.title} numberOfLines={1}>{currentSong.title}</Text>
          <Text style={styles.artist} numberOfLines={1}>{currentSong.artist}</Text>
        </View>
        {/* LikeButton placeholder — replace when LikeButton.tsx is built */}
        <LikeButton song={currentSong} size="lg" />
      </View>

      {/* ── Progress bar ── */}
      <View style={styles.progressSection}>
        <View
          style={styles.progressTrack}
          onLayout={(e) => { progressBarWidth.current = e.nativeEvent.layout.width; }}
          {...seekPan.panHandlers}
          accessibilityRole="adjustable"
          accessibilityLabel="Seek"
        >
          <Animated.View style={[styles.progressFill, { width: progressWidth }]}>
            <View style={styles.progressThumb} />
          </Animated.View>
        </View>
        <View style={styles.timeRow}>
          <Text style={styles.timeText}>{fmt(position)}</Text>
          <Text style={styles.timeText}>{fmt(duration)}</Text>
        </View>
      </View>

      {/* ── Transport controls ── */}
      <View style={styles.controls}>
        <TouchableOpacity
          onPress={cycleShuffleMode}
          style={styles.sideBtn}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Shuffle"
        >
          <ShuffleIcon active={shuffleMode !== 'none'} />
          {shuffleMode !== 'none' && <View style={styles.activeDot} />}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={playPrev}
          style={styles.skipBtn}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Previous"
        >
          <PrevIcon />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={togglePlay}
          style={styles.playBtn}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={playNext}
          style={styles.skipBtn}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Next"
        >
          <NextIcon />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={cycleRepeat}
          style={styles.sideBtn}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Repeat"
        >
          <RepeatIcon mode={repeatMode} />
          {repeatMode !== 'none' && <View style={styles.activeDot} />}
        </TouchableOpacity>
      </View>

      {/* ── Volume ── */}
      <View style={styles.volumeSection}>
        <VolumeIcon />
        <View
          style={styles.volumeTrack}
          onLayout={(e) => { volumeBarWidth.current = e.nativeEvent.layout.width; }}
          {...volumePan.panHandlers}
          accessibilityRole="adjustable"
          accessibilityLabel="Volume"
        >
          <Animated.View style={[styles.volumeFill, { width: volumeWidth }]} />
        </View>
        <VolumeHighIcon />
      </View>

    </Animated.View>
</Reanimated.View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    flex:            1,
    backgroundColor: COLORS.background,
    paddingTop:      LAYOUT.spacing.sm,
  },

  handle: {
    width:           36,
    height:          4,
    backgroundColor: COLORS.overlay,
    borderRadius:    LAYOUT.radius.full,
    alignSelf:       'center',
    marginBottom:    LAYOUT.spacing.sm,
  },

  // Header
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    paddingHorizontal: LAYOUT.spacing.md,
    marginBottom:   LAYOUT.spacing.md,
  },
  headerBtn: {
    width:          44,
    height:         44,
    alignItems:     'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex:      1,
    alignItems: 'center',
  },
  headerLabel: {
    color:       COLORS.textSecondary,
    fontSize:    TYPOGRAPHY.sizes.xs,
    fontFamily:  TYPOGRAPHY.families.sans,
    fontWeight:  TYPOGRAPHY.weights.medium,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },

  // Artwork
  artworkContainer: {
    paddingHorizontal: LAYOUT.spacing.xl,
    marginBottom:      LAYOUT.spacing.lg,
  },
  artwork: {
    width:        '100%',
    aspectRatio:  1,
    borderRadius: LAYOUT.radius.xl,
  },
  artworkFallback: {
    backgroundColor: COLORS.surface,
    alignItems:      'center',
    justifyContent:  'center',
  },
  artworkFallbackText: {
    fontSize: 64,
    color:    COLORS.textMuted,
  },

  // Song info
  songInfo: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: LAYOUT.spacing.xl,
    marginBottom:      LAYOUT.spacing.lg,
    gap:               LAYOUT.spacing.md,
  },
  songText: {
    flex:     1,
    minWidth: 0,
  },
  title: {
    color:      COLORS.textPrimary,
    fontSize:   TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold,
    fontFamily: TYPOGRAPHY.families.sans,
  },
  artist: {
    color:      COLORS.textSecondary,
    fontSize:   TYPOGRAPHY.sizes.base,
    fontFamily: TYPOGRAPHY.families.sans,
    marginTop:  4,
  },

  // Progress
  progressSection: {
    paddingHorizontal: LAYOUT.spacing.xl,
    marginBottom:      LAYOUT.spacing.lg,
  },
  progressTrack: {
    height:          6,
    backgroundColor: COLORS.progressTrack,
    borderRadius:    LAYOUT.radius.full,
    overflow:        'visible',
    justifyContent:  'center',
  },
  progressFill: {
    height:          '100%',
    backgroundColor: COLORS.progressFill,
    borderRadius:    LAYOUT.radius.full,
    justifyContent:  'center',
    alignItems:      'flex-end',
  },
  progressThumb: {
    width:           14,
    height:          14,
    borderRadius:    7,
    backgroundColor: COLORS.progressThumb,
    marginRight:     -7,
    shadowColor:     COLORS.black,
    shadowOffset:    { width: 0, height: 1 },
    shadowOpacity:   0.4,
    shadowRadius:    3,
    elevation:       4,
  },
  timeRow: {
    flexDirection:  'row',
    justifyContent: 'space-between',
    marginTop:      LAYOUT.spacing.sm,
  },
  timeText: {
    color:      COLORS.textSecondary,
    fontSize:   TYPOGRAPHY.sizes.xs,
    fontFamily: TYPOGRAPHY.families.mono,
  },

  // Controls
  controls: {
    flexDirection:     'row',
    alignItems:        'center',
    justifyContent:    'space-between',
    paddingHorizontal: LAYOUT.spacing.xl,
    marginBottom:      LAYOUT.spacing.xl,
  },
  sideBtn: {
    width:          44,
    height:         44,
    alignItems:     'center',
    justifyContent: 'center',
  },
  skipBtn: {
    width:          52,
    height:         52,
    alignItems:     'center',
    justifyContent: 'center',
  },
  playBtn: {
    width:           72,
    height:          72,
    borderRadius:    36,
    backgroundColor: COLORS.primary,
    alignItems:      'center',
    justifyContent:  'center',
    shadowColor:     COLORS.primary,
    shadowOffset:    { width: 0, height: 4 },
    shadowOpacity:   0.4,
    shadowRadius:    12,
    elevation:       8,
  },
  activeDot: {
    width:           4,
    height:          4,
    borderRadius:    2,
    backgroundColor: COLORS.primary,
    position:        'absolute',
    bottom:          6,
    alignSelf:       'center',
  },

  // Volume
  volumeSection: {
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: LAYOUT.spacing.xl,
    gap:               LAYOUT.spacing.sm,
  },
  volumeTrack: {
    flex:            1,
    height:          4,
    backgroundColor: COLORS.progressTrack,
    borderRadius:    LAYOUT.radius.full,
    overflow:        'hidden',
  },
  volumeFill: {
    height:          '100%',
    backgroundColor: COLORS.progressFill,
    borderRadius:    LAYOUT.radius.full,
  },
});