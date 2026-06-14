/**
 * src/components/player/LikeButton.tsx
 *
 * Mobile version — replaces web CSS classes with StyleSheet + Reanimated pulse.
 * Props contract identical to web: { song, size, style }
 */

import React, { memo, useCallback, useRef } from 'react';
import {
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSequence,
  withSpring,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { useLikedSongs } from '@hooks/useLikedSongs';
import { useAuthStore } from '@store/authStore';
import { COLORS } from '@constants/colors';
import { Song } from '../../types/song';

// ── Types ─────────────────────────────────────────────────────────────────────
interface LikeButtonProps {
  song: Song;
  size?: 'sm' | 'md' | 'lg';
  style?: ViewStyle;
}

const SIZE_MAP = {
  sm: { btn: 32, icon: 14 },
  md: { btn: 36, icon: 16 },
  lg: { btn: 44, icon: 20 },
};

// ── HeartIcon ─────────────────────────────────────────────────────────────────
const HeartIcon = ({ size, filled }: { size: number; filled: boolean }) => (
  <Svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={filled ? '#ef4444' : 'none'}
    stroke={filled ? '#ef4444' : COLORS.textSecondary}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </Svg>
);

// ── Component ─────────────────────────────────────────────────────────────────
export const LikeButton = memo(({ song, size = 'md', style }: LikeButtonProps) => {
  const user = useAuthStore((s) => s.user);
  const uid  = user?.uid;

  const { likedSongIds, toggleLike, isToggling } = useLikedSongs(uid);

  const isLiked = !!song && likedSongIds.includes(song.id);
  const { btn, icon } = SIZE_MAP[size] ?? SIZE_MAP.md;

  // ── Pulse animation on like ───────────────────────────────────────────────
  const scale = useSharedValue(1);
  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const handlePress = useCallback(async () => {
    if (!uid || !song || isToggling) return;
    scale.value = withSequence(
      withSpring(1.35, { damping: 4 }),
      withSpring(0.9,  { damping: 6 }),
      withSpring(1,    { damping: 8 }),
    );
    try {
      await toggleLike(song.id);
    } catch {
      // error handled by hook
    }
  }, [uid, song, isToggling, toggleLike, scale]);

  if (!uid) return null;

  return (
    <TouchableOpacity
      onPress={handlePress}
      disabled={isToggling}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={isLiked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}
      accessibilityState={{ checked: isLiked, disabled: isToggling }}
      style={[
        styles.btn,
        { width: btn, height: btn },
        isToggling && styles.toggling,
        style,
      ]}
    >
      <Animated.View style={animStyle}>
        <HeartIcon size={icon} filled={isLiked} />
      </Animated.View>
    </TouchableOpacity>
  );
});

LikeButton.displayName = 'LikeButton';

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  btn: {
    alignItems:      'center',
    justifyContent:  'center',
    borderRadius:    999,
    backgroundColor: 'transparent',
  },
  toggling: {
    opacity: 0.5,
  },
});

export default LikeButton;