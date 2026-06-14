/**
 * src/components/errors/NetworkErrorBanner.tsx
 * Mobile rewrite of web NetworkErrorBanner.jsx
 * Uses @react-native-community/netinfo instead of window events
 * Uses Animated API instead of CSS animations
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { Animated, Text, TouchableOpacity, View, StyleSheet, Platform } from 'react-native';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

const BANNER_HEIGHT = Platform.OS === 'ios' ? 44 : 40;
const RECONNECTED_DURATION = 3000;

export default function NetworkErrorBanner() {
  const [isOnline, setIsOnline]               = useState(true);
  const [justReconnected, setJustReconnected] = useState(false);
  const [dismissed, setDismissed]             = useState(false);

  const translateY  = useRef(new Animated.Value(-BANNER_HEIGHT)).current;
  const opacity     = useRef(new Animated.Value(0)).current;
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeTimer      = useRef<ReturnType<typeof setTimeout> | null>(null);

  const slideDown = useCallback(() => {
    Animated.parallel([
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 10,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [translateY, opacity]);

  const slideUp = useCallback((cb?: () => void) => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -BANNER_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(cb);
  }, [translateY, opacity]);

  const handleConnectivityChange = useCallback((state: NetInfoState) => {
    const online = state.isConnected && state.isInternetReachable !== false;

    if (online) {
      setIsOnline(true);
      setDismissed(false);
      setJustReconnected(true);
      slideDown();

      // auto-hide after 3s
      reconnectTimer.current = setTimeout(() => {
        slideUp(() => setJustReconnected(false));
      }, RECONNECTED_DURATION);
    } else {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (fadeTimer.current)      clearTimeout(fadeTimer.current);
      setIsOnline(false);
      setJustReconnected(false);
      setDismissed(false);
      slideDown();
    }
  }, [slideDown, slideUp]);

  useEffect(() => {
    // get initial state
    NetInfo.fetch().then(handleConnectivityChange);

    const unsubscribe = NetInfo.addEventListener(handleConnectivityChange);

    return () => {
      unsubscribe();
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (fadeTimer.current)      clearTimeout(fadeTimer.current);
    };
  }, [handleConnectivityChange]);

  const handleDismiss = useCallback(() => {
    slideUp(() => setDismissed(true));
  }, [slideUp]);

  const showOffline     = !isOnline && !dismissed;
  const showReconnected = isOnline && justReconnected;

  if (!showOffline && !showReconnected) return null;

  return (
    <Animated.View
      style={[
        styles.banner,
        showOffline     ? styles.offline     : styles.reconnected,
        { transform: [{ translateY }], opacity },
      ]}
      accessibilityRole="alert"
      accessibilityLiveRegion={showOffline ? 'assertive' : 'polite'}
    >
      {/* Icon */}
      <View style={styles.icon}>
        {showOffline ? <OfflineIcon /> : <OnlineIcon />}
      </View>

      {/* Message */}
      <Text style={styles.text} numberOfLines={1}>
        {showOffline
          ? 'No internet connection — some features may not work'
          : 'Back online'}
      </Text>

      {/* Dismiss — only when offline */}
      {showOffline && (
        <TouchableOpacity
          onPress={handleDismiss}
          style={styles.dismiss}
          accessibilityLabel="Dismiss offline notification"
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <CloseIcon />
        </TouchableOpacity>
      )}
    </Animated.View>
  );
}

// ── Icons ─────────────────────────────────────────────────────────────────────

import Svg, { Line, Path, Polyline } from 'react-native-svg';

const OfflineIcon = () => (
  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none"
    stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <Line x1="1" y1="1" x2="23" y2="23" stroke="#fffbeb" />
    <Path d="M16.72 11.06A10.94 10.94 0 0 1 19 12.55" stroke="#fffbeb" />
    <Path d="M5 12.55a10.94 10.94 0 0 1 5.17-2.39" stroke="#fffbeb" />
    <Path d="M10.71 5.05A16 16 0 0 1 22.56 9" stroke="#fffbeb" />
    <Path d="M1.42 9a15.91 15.91 0 0 1 4.7-2.88" stroke="#fffbeb" />
    <Path d="M8.53 16.11a6 6 0 0 1 6.95 0" stroke="#fffbeb" />
    <Line x1="12" y1="20" x2="12.01" y2="20" stroke="#fffbeb" />
  </Svg>
);

const OnlineIcon = () => (
  <Svg width={15} height={15} viewBox="0 0 24 24" fill="none"
    stroke="#f0fdf4" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round">
    <Polyline points="20 6 9 17 4 12" stroke="#f0fdf4" />
  </Svg>
);

const CloseIcon = () => (
  <Svg width={12} height={12} viewBox="0 0 24 24" fill="none"
    stroke="rgba(255,251,235,0.7)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
    <Line x1="18" y1="6" x2="6" y2="18" stroke="rgba(255,251,235,0.7)" />
    <Line x1="6"  y1="6" x2="18" y2="18" stroke="rgba(255,251,235,0.7)" />
  </Svg>
);

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10000,
    height: BANNER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 8,
  },
  offline: {
    backgroundColor: 'rgba(161, 98, 7, 0.96)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(245, 158, 11, 0.3)',
  },
  reconnected: {
    backgroundColor: 'rgba(21, 128, 61, 0.96)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(34, 197, 94, 0.3)',
  },
  icon: {
    flexShrink: 0,
    opacity: 0.9,
  },
  text: {
    flex: 1,
    fontSize: 13,
    fontWeight: '500',
    color: '#fffbeb',
    fontFamily: 'Inter',
  },
  dismiss: {
    flexShrink: 0,
    padding: 6,
    borderRadius: 4,
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
});