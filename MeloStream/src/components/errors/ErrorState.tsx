import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { COLORS } from '@constants/colors';
import { TYPOGRAPHY } from '@constants/typography';
import { LAYOUT } from '@constants/layout';

type Variant = 'app' | 'player' | 'page';

interface ErrorStateProps {
  variant?: Variant;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  showHomeButton?: boolean;
}

export const ErrorState = React.memo(({
  variant = 'page',
  title,
  message,
  actionLabel,
  onAction,
  showHomeButton = false,
}: ErrorStateProps) => {
  const navigation = useNavigation<any>();

  // ── Player variant — compact inline bar ──────────────────────────────────
  if (variant === 'player') {
    return (
      <View style={styles.playerWrap}>
        <Text style={styles.playerIcon}>⚠</Text>
        <Text style={styles.playerText} numberOfLines={1}>{title}</Text>
        {onAction && actionLabel && (
          <TouchableOpacity style={styles.playerBtn} onPress={onAction}>
            <Text style={styles.playerBtnText}>{actionLabel}</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }

  // ── App / Page variant ───────────────────────────────────────────────────
  const isApp = variant === 'app';

  return (
    <View style={[styles.wrap, isApp && styles.wrapApp]}>
      <View style={styles.card}>
        <View style={styles.iconWrap}>
          <Text style={styles.iconText}>⚠</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        {!!message && <Text style={styles.message}>{message}</Text>}
        {(onAction || showHomeButton) && (
          <View style={styles.actions}>
            {onAction && actionLabel && (
              <TouchableOpacity style={styles.primaryBtn} onPress={onAction}>
                <Text style={styles.primaryBtnText}>{actionLabel}</Text>
              </TouchableOpacity>
            )}
            {showHomeButton && (
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => navigation.navigate('Home')}
              >
                <Text style={styles.secondaryBtnText}>Go to Library</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  // ── Page / App wrap
  wrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: LAYOUT.spacing.lg,
    backgroundColor: COLORS.background,
  },
  wrapApp: { minHeight: '100%' },

  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: LAYOUT.radius.lg,
    padding: LAYOUT.spacing.xl,
    alignItems: 'center',
    width: '100%',
    maxWidth: 400,
    gap: LAYOUT.spacing.sm,
  },

  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: LAYOUT.radius.lg,
    backgroundColor: COLORS.dangerMuted,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: LAYOUT.spacing.xs,
  },
  iconText: { fontSize: 24, color: COLORS.danger },

  title: {
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.sizes.md,
    fontWeight: TYPOGRAPHY.weights.semibold,
    textAlign: 'center',
  },
  message: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.sm,
    textAlign: 'center',
    lineHeight: TYPOGRAPHY.sizes.sm * 1.5,
  },

  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: LAYOUT.spacing.sm,
    justifyContent: 'center',
    marginTop: LAYOUT.spacing.xs,
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: LAYOUT.radius.sm,
    paddingHorizontal: LAYOUT.spacing.md,
    paddingVertical: LAYOUT.spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: COLORS.black,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  secondaryBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: LAYOUT.radius.sm,
    paddingHorizontal: LAYOUT.spacing.md,
    paddingVertical: LAYOUT.spacing.sm,
    minHeight: 44,
    justifyContent: 'center',
  },
  secondaryBtnText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },

  // ── Player variant
  playerWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.spacing.sm,
    paddingHorizontal: LAYOUT.spacing.md,
    flex: 1,
  },
  playerIcon: { fontSize: 16, color: COLORS.warning },
  playerText: {
    flex: 1,
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  playerBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: LAYOUT.radius.sm,
    paddingHorizontal: LAYOUT.spacing.sm,
    paddingVertical: 4,
  },
  playerBtnText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
});

export default ErrorState;