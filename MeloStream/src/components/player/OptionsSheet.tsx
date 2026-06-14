/**
 * src/components/player/OptionsSheet.tsx
 *
 * Mobile bottom sheet — replaces framer-motion with Reanimated + Gesture Handler.
 * Drag-to-dismiss via PanGestureHandler.
 * Props: { song, isOpen, onClose }
 */

import React, { memo, useCallback, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  StyleSheet,
  Image,
  ScrollView,
} from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  runOnJS,
} from 'react-native-reanimated';
import { PanGestureHandler, PanGestureHandlerGestureEvent } from 'react-native-gesture-handler';
import Svg, { Path, Line, Circle, Polyline } from 'react-native-svg';
import { useNavigation } from '@react-navigation/native';
import { useLikedSongs } from '@hooks/useLikedSongs';
import { useAuthStore } from '@store/authStore';
import { useQueueStore } from '@store/queueStore';
import { COLORS } from '@constants/colors';
import { LAYOUT } from '@constants/layout';
import { TYPOGRAPHY } from '@constants/typography';
import { Song } from '../../types/song';

const DRAG_THRESHOLD = 100;

// ── Icons ─────────────────────────────────────────────────────────────────────
const HeartIcon = ({ filled, colored }: { filled: boolean; colored?: boolean }) => (
  <Svg width={20} height={20} viewBox="0 0 24 24"
    fill={filled ? (colored ? '#ef4444' : COLORS.textSecondary) : 'none'}
    stroke={colored && filled ? '#ef4444' : COLORS.textSecondary}
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
  >
    <Path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
  </Svg>
);

const QueueIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"
    stroke={COLORS.textSecondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Line x1="8"  y1="6"  x2="21" y2="6"  />
    <Line x1="8"  y1="12" x2="21" y2="12" />
    <Line x1="8"  y1="18" x2="21" y2="18" />
    <Line x1="3"  y1="6"  x2="3.01" y2="6"  />
    <Line x1="3"  y1="12" x2="3.01" y2="12" />
    <Line x1="3"  y1="18" x2="3.01" y2="18" />
  </Svg>
);

const PlaylistAddIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"
    stroke={COLORS.textSecondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Line x1="12" y1="5" x2="12" y2="19" />
    <Line x1="5"  y1="12" x2="19" y2="12" />
  </Svg>
);

const ArtistIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"
    stroke={COLORS.textSecondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <Circle cx="12" cy="7" r="4" />
  </Svg>
);

const AlbumIcon = () => (
  <Svg width={20} height={20} viewBox="0 0 24 24" fill="none"
    stroke={COLORS.textSecondary} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Circle cx="12" cy="12" r="10" />
    <Circle cx="12" cy="12" r="3"  />
  </Svg>
);

const ChevronIcon = () => (
  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none"
    stroke={COLORS.textMuted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <Polyline points="9 18 15 12 9 6" />
  </Svg>
);

// ── OptionRow ─────────────────────────────────────────────────────────────────
interface OptionRowProps {
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  onPress: () => void;
  disabled?: boolean;
  accent?: boolean;
}

const OptionRow = memo(({ icon, label, sublabel, onPress, disabled, accent }: OptionRowProps) => (
  <TouchableOpacity
    style={[styles.row, disabled && styles.rowDisabled]}
    onPress={disabled ? undefined : onPress}
    disabled={disabled}
    activeOpacity={0.7}
    accessibilityRole="button"
    accessibilityLabel={label}
    accessibilityState={{ disabled }}
  >
    <View style={styles.rowIcon}>{icon}</View>
    <View style={styles.rowText}>
      <Text style={[styles.rowLabel, accent && styles.rowLabelAccent]}>{label}</Text>
      {sublabel && <Text style={styles.rowSublabel} numberOfLines={1}>{sublabel}</Text>}
    </View>
    <ChevronIcon />
  </TouchableOpacity>
));

// ── Component ─────────────────────────────────────────────────────────────────
interface OptionsSheetProps {
  song: Song | null;
  isOpen: boolean;
  onClose: () => void;
}

export const OptionsSheet = memo(({ song, isOpen, onClose }: OptionsSheetProps) => {
  const navigation = useNavigation<any>();

  const user     = useAuthStore((s) => s.user);
  const uid      = user?.uid;

  const { likedSongIds, toggleLike, isToggling } = useLikedSongs(uid);
  const addToQueue = useQueueStore((s) => s.addToQueue);

  const isLiked = !!song && likedSongIds.includes(song.id);

  // ── Slide animation ───────────────────────────────────────────────────────
  const translateY = useSharedValue(400);

  useEffect(() => {
    translateY.value = isOpen
      ? withSpring(0, { damping: 20, stiffness: 200 })
      : withTiming(400, { duration: 250 });
  }, [isOpen]);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // ── Drag to dismiss ───────────────────────────────────────────────────────
  const onGestureEvent = useCallback((event: PanGestureHandlerGestureEvent) => {
    const { translationY } = event.nativeEvent;
    if (translationY > 0) {
      translateY.value = translationY;
    }
  }, []);

  const dismiss = useCallback(() => onClose(), [onClose]);

  const onGestureEnd = useCallback((event: PanGestureHandlerGestureEvent) => {
    const { translationY, velocityY } = event.nativeEvent;
    if (translationY > DRAG_THRESHOLD || velocityY > 800) {
      translateY.value = withTiming(400, { duration: 200 });
      runOnJS(dismiss)();
    } else {
      translateY.value = withSpring(0, { damping: 20 });
    }
  }, [dismiss]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleLike = useCallback(async () => {
    if (!uid || !song || isToggling) return;
    try { await toggleLike(song.id); } catch { /* handled by hook */ }
  }, [uid, song, isToggling, toggleLike]);

  const handleAddToQueue = useCallback(() => {
    if (!song) return;
    addToQueue(song);
    onClose();
  }, [song, addToQueue, onClose]);

  const handleGoToArtist = useCallback(() => {
    if (!song?.artistId) return;
    navigation.navigate('ArtistDetail', { artistId: song.artistId });
    onClose();
  }, [song, navigation, onClose]);

  const handleGoToAlbum = useCallback(() => {
    if (!song?.albumId) return;
    navigation.navigate('AlbumDetail', { albumId: song.albumId });
    onClose();
  }, [song, navigation, onClose]);

  if (!song) return null;

  const coverUri = song.coverUrl || song.coverUrl;

  return (
    <Modal
      visible={isOpen}
      transparent
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      {/* Backdrop */}
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.backdrop} />
      </TouchableWithoutFeedback>

      {/* Panel */}
      <PanGestureHandler
        onGestureEvent={onGestureEvent}
        onHandlerStateChange={onGestureEnd}
      >
        <Animated.View style={[styles.panel, animStyle]}>
          {/* Drag handle */}
          <View style={styles.handle} />

          {/* Song header */}
          <View style={styles.header}>
            {coverUri ? (
              <Image source={{ uri: coverUri }} style={styles.cover} resizeMode="cover" />
            ) : (
              <View style={[styles.cover, styles.coverFallback]}>
                <Text style={styles.coverFallbackText}>♪</Text>
              </View>
            )}
            <View style={styles.headerInfo}>
              <Text style={styles.headerTitle} numberOfLines={1}>{song.title}</Text>
              <Text style={styles.headerArtist} numberOfLines={1}>{song.artist}</Text>
            </View>
            {uid && (
              <TouchableOpacity
                onPress={handleLike}
                disabled={isToggling}
                activeOpacity={0.7}
                style={styles.headerHeart}
                accessibilityRole="button"
                accessibilityLabel={isLiked ? 'Unlike' : 'Like'}
              >
                <HeartIcon filled={isLiked} colored={isLiked} />
              </TouchableOpacity>
            )}
          </View>

          <ScrollView scrollEnabled={false}>
            {uid && (
              <OptionRow
                icon={<HeartIcon filled={isLiked} colored={isLiked} />}
                label={isLiked ? 'Unlike' : 'Like'}
                sublabel={isLiked ? 'Remove from Liked Songs' : 'Add to Liked Songs'}
                onPress={handleLike}
                disabled={isToggling}
                accent={isLiked}
              />
            )}
            <OptionRow
              icon={<QueueIcon />}
              label="Add to Queue"
              onPress={handleAddToQueue}
            />
            <OptionRow
              icon={<PlaylistAddIcon />}
              label="Add to Playlist"
              onPress={() => {/* TODO: AddToPlaylist modal */}}
            />
            <OptionRow
              icon={<ArtistIcon />}
              label="Go to Artist"
              sublabel={song.artistId ? song.artist : 'Not available'}
              onPress={handleGoToArtist}
              disabled={!song.artistId}
            />
            <OptionRow
              icon={<AlbumIcon />}
              label="Go to Album"
              sublabel={song.albumId ? song.album : 'Not available'}
              onPress={handleGoToAlbum}
              disabled={!song.albumId}
            />
          </ScrollView>

          {/* Cancel */}
          <TouchableOpacity style={styles.cancelBtn} onPress={onClose} activeOpacity={0.7}>
            <Text style={styles.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </Animated.View>
      </PanGestureHandler>
    </Modal>
  );
});

OptionsSheet.displayName = 'OptionsSheet';

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  backdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  panel: {
    position:        'absolute',
    bottom:          0,
    left:            0,
    right:           0,
    backgroundColor: '#161616',
    borderTopLeftRadius:  20,
    borderTopRightRadius: 20,
    borderTopWidth:  1,
    borderTopColor:  'rgba(255,255,255,0.08)',
    paddingBottom:    8,
  },
  handle: {
    width:           36,
    height:          4,
    backgroundColor: '#3a3a3a',
    borderRadius:    2,
    alignSelf:       'center',
    marginTop:       12,
    marginBottom:    14,
  },

  // Header
  header: {
    flexDirection:  'row',
    alignItems:     'center',
    gap:            LAYOUT.spacing.sm,
    paddingHorizontal: LAYOUT.spacing.md,
    paddingBottom:  LAYOUT.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255,255,255,0.06)',
    marginBottom:   LAYOUT.spacing.xs,
  },
  cover: {
    width:        46,
    height:       46,
    borderRadius: LAYOUT.radius.sm,
    flexShrink:   0,
  },
  coverFallback: {
    backgroundColor: COLORS.overlay,
    alignItems:      'center',
    justifyContent:  'center',
  },
  coverFallbackText: {
    color:    COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.md,
  },
  headerInfo: {
    flex:     1,
    minWidth: 0,
  },
  headerTitle: {
    color:      COLORS.textPrimary,
    fontSize:   TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    fontFamily: TYPOGRAPHY.families.sans,
  },
  headerArtist: {
    color:      COLORS.textSecondary,
    fontSize:   TYPOGRAPHY.sizes.xs,
    fontFamily: TYPOGRAPHY.families.sans,
    marginTop:  2,
  },
  headerHeart: {
    width:          36,
    height:         36,
    alignItems:     'center',
    justifyContent: 'center',
    borderRadius:   999,
    flexShrink:     0,
  },

  // Rows
  row: {
    flexDirection:     'row',
    alignItems:        'center',
    gap:               14,
    paddingHorizontal: LAYOUT.spacing.md,
    paddingVertical:   13,
  },
  rowDisabled: {
    opacity: 0.35,
  },
  rowIcon: {
    flexShrink: 0,
  },
  rowText: {
    flex:     1,
    minWidth: 0,
  },
  rowLabel: {
    color:      COLORS.textPrimary,
    fontSize:   TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.medium,
    fontFamily: TYPOGRAPHY.families.sans,
  },
  rowLabelAccent: {
    color: '#f87171',
  },
  rowSublabel: {
    color:      COLORS.textSecondary,
    fontSize:   TYPOGRAPHY.sizes.xs,
    fontFamily: TYPOGRAPHY.families.sans,
    marginTop:  2,
  },

  // Cancel
  cancelBtn: {
    marginHorizontal: LAYOUT.spacing.md,
    marginTop:        LAYOUT.spacing.sm,
    paddingVertical:  13,
    backgroundColor:  'rgba(255,255,255,0.05)',
    borderWidth:      1,
    borderColor:      'rgba(255,255,255,0.07)',
    borderRadius:     LAYOUT.radius.md,
    alignItems:       'center',
  },
  cancelText: {
    color:      COLORS.textSecondary,
    fontSize:   TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
    fontFamily: TYPOGRAPHY.families.sans,
  },
});

export default OptionsSheet;