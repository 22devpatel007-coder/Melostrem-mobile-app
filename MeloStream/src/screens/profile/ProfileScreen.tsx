// src/screens/profile/ProfileScreen.tsx

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuthStore } from '@store/authStore';
import { COLORS } from '@constants/colors';
import { TYPOGRAPHY } from '@constants/typography';
import { LAYOUT } from '@constants/layout';

// ── Avatar placeholder ────────────────────────────────────────────────────────
const Avatar = React.memo(({ photoURL, displayName }: { photoURL?: string | null; displayName?: string | null }) => {
  const initial = (displayName ?? '?').charAt(0).toUpperCase();
  if (photoURL) {
    return <Image source={{ uri: photoURL }} style={styles.avatar} contentFit="cover" transition={200} />;
  }
  return (
    <View style={styles.avatarPlaceholder}>
      <Text style={styles.avatarInitial}>{initial}</Text>
    </View>
  );
});

// ── Info row ──────────────────────────────────────────────────────────────────
const InfoRow = React.memo(({ label, value }: { label: string; value: string }) => (
  <View style={styles.infoRow}>
    <Text style={styles.infoLabel}>{label}</Text>
    <Text style={styles.infoValue} numberOfLines={1}>{value}</Text>
  </View>
));

// ── ProfileScreen ─────────────────────────────────────────────────────────────
export const ProfileScreen = React.memo(() => {
  const insets = useSafeAreaInsets();
  const { user, isAdmin, logout } = useAuthStore();

  const handleLogout = useCallback(() => {
    Alert.alert(
      'Sign Out',
      'Are you sure you want to sign out?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Sign Out', style: 'destructive', onPress: logout },
      ],
    );
  }, [logout]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* ── Topbar ── */}
      <View style={styles.topbar}>
        <Text style={styles.topbarTitle}>Profile</Text>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* ── Avatar + name ── */}
        <View style={styles.hero}>
          <Avatar photoURL={user?.photoURL} displayName={user?.displayName} />
          <Text style={styles.displayName}>{user?.displayName ?? 'No Name'}</Text>
          <Text style={styles.email}>{user?.email ?? ''}</Text>
          {isAdmin && (
            <View style={styles.adminBadge}>
              <Text style={styles.adminBadgeText}>Admin</Text>
            </View>
          )}
        </View>

        {/* ── Account info ── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ACCOUNT</Text>
          <View style={styles.card}>
            <InfoRow label="Name" value={user?.displayName ?? '—'} />
            <View style={styles.divider} />
            <InfoRow label="Email" value={user?.email ?? '—'} />
            <View style={styles.divider} />
            <InfoRow label="Role" value={isAdmin ? 'Administrator' : 'Listener'} />
            <View style={styles.divider} />
            <InfoRow label="UID" value={user?.uid ?? '—'} />
          </View>
        </View>

        {/* ── Sign out ── */}
        <View style={styles.section}>
          <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.8}>
            <Text style={styles.logoutText}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: LAYOUT.miniPlayerHeight + LAYOUT.tabBarHeight + LAYOUT.spacing.md }} />
      </ScrollView>
    </View>
  );
});

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },

  topbar: {
    height: 60,
    justifyContent: 'center',
    paddingHorizontal: LAYOUT.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderMuted,
  },
  topbarTitle: {
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.white,
    fontFamily: TYPOGRAPHY.families.sans,
  },

  scrollContent: { paddingHorizontal: LAYOUT.spacing.md, paddingTop: LAYOUT.spacing.xl },

  // ── Hero ──
  hero: { alignItems: 'center', marginBottom: LAYOUT.spacing.xl },
  avatar: {
    width: 88,
    height: 88,
    borderRadius: 44,
    marginBottom: LAYOUT.spacing.md,
  },
  avatarPlaceholder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: COLORS.accentMuted,
    borderWidth: 2,
    borderColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: LAYOUT.spacing.md,
  },
  avatarInitial: {
    fontSize: TYPOGRAPHY.sizes['3xl'],
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.primary,
    fontFamily: TYPOGRAPHY.families.sans,
  },
  displayName: {
    fontSize: TYPOGRAPHY.sizes['2xl'],
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.white,
    fontFamily: TYPOGRAPHY.families.sans,
    marginBottom: LAYOUT.spacing.xs,
  },
  email: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textMuted,
    fontFamily: TYPOGRAPHY.families.sans,
    marginBottom: LAYOUT.spacing.sm,
  },
  adminBadge: {
    backgroundColor: COLORS.accentMuted,
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: LAYOUT.radius.full,
    paddingHorizontal: LAYOUT.spacing.md,
    paddingVertical: 3,
  },
  adminBadgeText: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.primary,
    fontFamily: TYPOGRAPHY.families.sans,
    letterSpacing: 0.5,
  },

  // ── Section ──
  section: { marginBottom: LAYOUT.spacing.lg },
  sectionTitle: {
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.bold,
    color: COLORS.textMuted,
    letterSpacing: 0.8,
    fontFamily: TYPOGRAPHY.families.sans,
    marginBottom: LAYOUT.spacing.sm,
  },

  // ── Card ──
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: LAYOUT.radius.lg,
    overflow: 'hidden',
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: LAYOUT.spacing.md,
    paddingVertical: LAYOUT.spacing.sm + 2,
  },
  infoLabel: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textMuted,
    fontFamily: TYPOGRAPHY.families.sans,
    flex: 1,
  },
  infoValue: {
    fontSize: TYPOGRAPHY.sizes.sm,
    color: COLORS.textPrimary,
    fontFamily: TYPOGRAPHY.families.sans,
    flex: 2,
    textAlign: 'right',
  },
  divider: { height: 1, backgroundColor: COLORS.borderMuted },

  // ── Logout ──
  logoutBtn: {
    backgroundColor: COLORS.dangerMuted,
    borderWidth: 1,
    borderColor: COLORS.danger,
    borderRadius: LAYOUT.radius.lg,
    paddingVertical: LAYOUT.spacing.md,
    alignItems: 'center',
  },
  logoutText: {
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: TYPOGRAPHY.weights.semibold,
    color: COLORS.danger,
    fontFamily: TYPOGRAPHY.families.sans,
  },
});