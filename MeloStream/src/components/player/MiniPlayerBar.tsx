/**
 * src/components/player/MiniPlayerBar.tsx
 *
 * Absolute overlay — sits above tab bar, below overlays/modals.
 * Progress bar: react-native Animated (not Reanimated) — no external slider needed.
 * Slide-up animation: react-native-reanimated (separate import).
 * Audio state: useProgress() from react-native-track-player.
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
} from 'react-native';
import Reanimated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import TrackPlayer, { useProgress } from '@rntp/player';
import { COLORS } from '@constants/colors';
import { LAYOUT } from '@constants/layout';
import { TYPOGRAPHY } from '@constants/typography';
import { usePlayerStore } from '@store/playerStore';

// ── Icons ─────────────────────────────────────────────────────────────────────
import Svg, { Line, Polygon, Rect } from 'react-native-svg';

const PlayIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill={COLORS.white}>
    <Polygon points="5,3 19,12 5,21" />
  </Svg>
);

const PauseIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill={COLORS.white}>
    <Rect x="6" y="4" width="4" height="16" />
    <Rect x="14" y="4" width="4" height="16" />
  </Svg>
);

const NextIcon = () => (
  <Svg width={18} height={18} viewBox="0 0 24 24" fill={COLORS.textSecondary}>
    <Polygon points="5,3 15,12 5,21" />
    <Rect x="17" y="3" width="2" height="18" />
  </Svg>
);

const ChevronUpIcon = () => (
  <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={COLORS.textSecondary} strokeWidth="2.5">
    <Line x1="18" y1="15" x2="12" y2="9" />
    <Line x1="12" y1="9" x2="6" y2="15" />
  </Svg>
);

// ── Props ─────────────────────────────────────────────────────────────────────
interface MiniPlayerBarProps {
  onExpand: () => void;
}

// ── Component ─────────────────────────────────────────────────────────────────
export const MiniPlayerBar = React.memo(({ onExpand }: MiniPlayerBarProps) => {
  const currentSong = usePlayerStore((s) => s.currentSong);
  const isPlaying   = usePlayerStore((s) => s.isPlaying);
  const togglePlay  = usePlayerStore((s) => s.togglePlay);
  const playNext    = usePlayerStore((s) => s.playNext);

  const { position, duration } = useProgress(250);

  // ── RN Animated — progress bar only ───────────────────────────────────────
  const progressAnim = useRef(new Animated.Value(0)).current;
  const barWidth     = useRef(0);
  const isSeeking    = useRef(false);

  useEffect(() => {
    if (isSeeking.current || !duration) return;
    const pct = position / duration;
    progressAnim.setValue(pct);
  }, [position, duration, progressAnim]);

  // ── Reanimated — slide-up animation ───────────────────────────────────────
  const translateY = useSharedValue(80);
  const opacity    = useSharedValue(0);

  useEffect(() => {
    if (currentSong) {
      translateY.value = withSpring(0, { damping: 15, stiffness: 120 });
      opacity.value    = withTiming(1, { duration: 200 });
    } else {
      translateY.value = withSpring(80, { damping: 15 });
      opacity.value    = withTiming(0, { duration: 150 });
    }
  }, [currentSong]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity:   opacity.value,
  }));

  // ── Seek via PanResponder ─────────────────────────────────────────────────
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder:  () => true,
      onPanResponderGrant: () => { isSeeking.current = true; },
      onPanResponderMove: (_, gs) => {
        const w = barWidth.current;
        if (!w) return;
        const pct = Math.max(0, Math.min(1, gs.moveX / w));
        progressAnim.setValue(pct);
      },
      onPanResponderRelease: async (_, gs) => {
        const w = barWidth.current;
        if (!w) return;
        const pct = Math.max(0, Math.min(1, gs.moveX / w));
        await TrackPlayer.seekTo(pct * (duration || 0));
        isSeeking.current = false;
      },
      onPanResponderTerminate: () => { isSeeking.current = false; },
    })
  ).current;

  const onBarLayout = useCallback((e: any) => {
    barWidth.current = e.nativeEvent.layout.width;
  }, []);

  const progressWidth = progressAnim.interpolate({
    inputRange:  [0, 1],
    outputRange: ['0%', '100%'],
    extrapolate: 'clamp',
  });

  if (!currentSong) return null;

  const coverUri = currentSong.coverUrl || currentSong.imageUrl;

  return (
    <Reanimated.View style={[styles.root, animStyle]}>
      {/* ── Progress bar ── */}
      <View
        style={styles.seekTrack}
        onLayout={onBarLayout}
        {...panResponder.panHandlers}
        accessibilityRole="adjustable"
        accessibilityLabel="Seek"
      >
        <Animated.View style={[styles.seekFill, { width: progressWidth }]} />
      </View>

      {/* ── Main row ── */}
      <View style={styles.row}>

        {/* Song info — tap to expand */}
        <TouchableOpacity
          style={styles.songInfo}
          onPress={onExpand}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={`Now playing: ${currentSong.title} by ${currentSong.artist}. Tap to expand.`}
        >
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
          <View style={styles.textBlock}>
            <Text style={styles.title} numberOfLines={1}>{currentSong.title}</Text>
            <Text style={styles.artist} numberOfLines={1}>{currentSong.artist}</Text>
          </View>
        </TouchableOpacity>

        {/* Controls */}
        <View style={styles.controls}>
          <TouchableOpacity
            onPress={togglePlay}
            style={styles.playBtn}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={isPlaying ? 'Pause' : 'Play'}
          >
            {isPlaying ? <PauseIcon /> : <PlayIcon />}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={playNext}
            style={styles.iconBtn}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Next song"
          >
            <NextIcon />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={onExpand}
            style={styles.iconBtn}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel="Expand player"
          >
            <ChevronUpIcon />
          </TouchableOpacity>
        </View>
      </View>
    </Reanimated.View>
  );
});

MiniPlayerBar.displayName = 'MiniPlayerBar';

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: {
    position:        'absolute',
    left:            0,
    right:           0,
    bottom:          LAYOUT.tabBarHeight,
    height:          LAYOUT.miniPlayerHeight,
    backgroundColor: COLORS.playerBg,
    borderTopWidth:  1,
    borderTopColor:  COLORS.playerBorder,
    zIndex:          95,
  },
  seekTrack: {
    height:          3,
    backgroundColor: COLORS.progressTrack,
    overflow:        'hidden',
  },
  seekFill: {
    height:          '100%',
    backgroundColor: COLORS.progressFill,
  },
  row: {
    flex:              1,
    flexDirection:     'row',
    alignItems:        'center',
    paddingHorizontal: LAYOUT.spacing.sm,
    gap:               LAYOUT.spacing.xs,
  },
  songInfo: {
    flex:          1,
    flexDirection: 'row',
    alignItems:    'center',
    gap:           LAYOUT.spacing.sm,
    minWidth:      0,
  },
  artwork: {
    width:        44,
    height:       44,
    borderRadius: LAYOUT.radius.sm,
    flexShrink:   0,
  },
  artworkFallback: {
    backgroundColor: COLORS.overlay,
    alignItems:      'center',
    justifyContent:  'center',
  },
  artworkFallbackText: {
    fontSize: TYPOGRAPHY.sizes.md,
    color:    COLORS.textMuted,
  },
  textBlock: {
    flex:     1,
    minWidth: 0,
  },
  title: {
    color:      COLORS.textPrimary,
    fontSize:   TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    fontFamily: TYPOGRAPHY.families.sans,
  },
  artist: {
    color:      COLORS.textSecondary,
    fontSize:   TYPOGRAPHY.sizes.xs,
    fontFamily: TYPOGRAPHY.families.sans,
    marginTop:  2,
  },
  controls: {
    flexDirection: 'row',
    alignItems:    'center',
    gap:           LAYOUT.spacing.xs,
    flexShrink:    0,
  },
  playBtn: {
    width:           36,
    height:          36,
    borderRadius:    LAYOUT.radius.full,
    backgroundColor: COLORS.primary,
    alignItems:      'center',
    justifyContent:  'center',
  },
  iconBtn: {
    width:          34,
    height:         34,
    alignItems:     'center',
    justifyContent: 'center',
  },
});