import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { COLORS } from '@constants/colors';
import { LAYOUT } from '@constants/layout';

const SkeletonItem = React.memo(({ index }: { index: number }) => {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1,   duration: 800, useNativeDriver: true, delay: index * 40 }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, []);

  return (
    <Animated.View style={[styles.row, { opacity }]}>
      {/* Track number */}
      <View style={styles.num} />
      {/* Cover */}
      <View style={styles.cover} />
      {/* Meta */}
      <View style={styles.meta}>
        <View style={[styles.titleBar, { width: `${55 + (index % 5) * 8}%` }]} />
        <View style={[styles.artistBar, { width: `${30 + (index % 4) * 7}%` }]} />
      </View>
      {/* Duration */}
      <View style={styles.dur} />
    </Animated.View>
  );
});

export const SongListSkeleton = ({ count = 8 }: { count?: number }) => {
  const safeCount = Math.max(1, Math.min(count, 50));
  return (
    <View style={styles.container}>
      {Array.from({ length: safeCount }).map((_, i) => (
        <SkeletonItem key={i} index={i} />
      ))}
    </View>
  );
};

const SK = {
  backgroundColor: COLORS.surface,
  borderRadius: LAYOUT.radius.sm,
} as const;

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: LAYOUT.spacing.md,
    paddingVertical: LAYOUT.spacing.sm,
    gap: LAYOUT.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderMuted,
  },

  num:    { ...SK, width: 16, height: 14 },
  cover:  { ...SK, width: 48, height: 48, borderRadius: LAYOUT.radius.md },
  meta:   { flex: 1, gap: 6 },
  titleBar:  { ...SK, height: 13 },
  artistBar: { ...SK, height: 11 },
  dur:    { ...SK, width: 36, height: 12 },
});

export default SongListSkeleton;