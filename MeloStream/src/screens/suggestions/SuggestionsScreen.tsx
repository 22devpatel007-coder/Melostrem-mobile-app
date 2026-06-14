import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Linking,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useSubmitSuggestion, useMySubmissions } from '@hooks/useSuggestions';
import { COLORS } from '@constants/colors';
import { TYPOGRAPHY } from '@constants/typography';
import { LAYOUT } from '@constants/layout';

// ── Helpers ───────────────────────────────────────────────────────────────────

const ALLOWED_HOSTNAMES = new Set([
  'open.spotify.com',
  'youtube.com',
  'www.youtube.com',
  'music.youtube.com',
  'youtu.be',
]);

const isValidUrl = (str: string): boolean => {
  try {
    const url = new URL(str.trim());
    return url.protocol === 'https:' && ALLOWED_HOSTNAMES.has(url.hostname);
  } catch {
    return false;
  }
};

const formatDate = (ts: any): string => {
  if (!ts) return '—';
  try {
    const d = ts?.toDate
      ? ts.toDate()
      : new Date(ts._seconds ? ts._seconds * 1000 : ts);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '—';
  }
};

// ── Status config ─────────────────────────────────────────────────────────────

type StatusKey = 'pending' | 'reviewed' | 'rejected';

const STATUS_CONFIG: Record<StatusKey, { badgeColor: string; badgeBg: string; msgColor: string; msgBg: string }> = {
  pending:  { badgeColor: '#facc15', badgeBg: 'rgba(234,179,8,0.1)',   msgColor: '#d1d5db', msgBg: 'rgba(107,114,128,0.1)' },
  reviewed: { badgeColor: '#34d399', badgeBg: 'rgba(52,211,153,0.1)',  msgColor: '#6ee7b7', msgBg: 'rgba(52,211,153,0.1)' },
  rejected: { badgeColor: '#f87171', badgeBg: 'rgba(248,113,113,0.1)', msgColor: '#fde68a', msgBg: 'rgba(234,179,8,0.1)'  },
};

// ── SubmissionCard ────────────────────────────────────────────────────────────

const SubmissionCard = ({ s }: { s: any }) => {
  const config = STATUS_CONFIG[(s.status as StatusKey)] ?? STATUS_CONFIG.pending;

  return (
    <View style={styles.card}>
      <View style={styles.cardTopRow}>
        <View style={styles.cardLeft}>
          <Text style={styles.cardName} numberOfLines={1}>
            {s.playlistName || <Text style={styles.noName}>No name given</Text>}
          </Text>
          <Text style={styles.cardDate}>{formatDate(s.createdAt)}</Text>
        </View>
        <View style={styles.cardRight}>
          <View style={[styles.badge, { backgroundColor: config.badgeBg }]}>
            <Text style={[styles.badgeText, { color: config.badgeColor }]}>
              {s.status}
            </Text>
          </View>
          <TouchableOpacity onPress={() => Linking.openURL(s.link)} style={styles.linkBtn}>
            <Text style={styles.linkBtnText}>↗</Text>
          </TouchableOpacity>
        </View>
      </View>

      {s.adminMessage && (
        <View style={[styles.adminMsg, { backgroundColor: config.msgBg }]}>
          <Text style={styles.adminLabel}>ADMIN</Text>
          <Text style={[styles.adminMsgText, { color: config.msgColor }]}>
            {s.adminMessage}
          </Text>
        </View>
      )}

      {s.status === 'rejected' && !s.adminMessage && (
        <Text style={styles.rejectHint}>
          Your suggestion was not accepted. You may submit a new one.
        </Text>
      )}
    </View>
  );
};

// ── MySubmissions ─────────────────────────────────────────────────────────────

const MySubmissions = () => {
  const { submissions, loading, isError, refetch } = useMySubmissions();

  return (
    <View style={styles.mySection}>
      <Text style={styles.mySectionTitle}>⏱  My Submissions</Text>

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={COLORS.primary} />
        </View>
      )}

      {isError && !loading && (
        <View style={styles.centered}>
          <Text style={styles.errorText}>Failed to load submissions.</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={() => refetch()}>
            <Text style={styles.retryText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {!loading && !isError && submissions.length === 0 && (
        <Text style={styles.emptyText}>No submissions yet.</Text>
      )}

      {!loading && !isError && submissions.map((s: any) => (
        <SubmissionCard key={s.id} s={s} />
      ))}
    </View>
  );
};

// ── SuggestionsScreen ─────────────────────────────────────────────────────────

export default function SuggestionsScreen() {
  const insets = useSafeAreaInsets();
  const [link, setLink]               = useState('');
  const [playlistName, setPlaylistName] = useState('');
  const [linkError, setLinkError]     = useState('');
  const [submitted, setSubmitted]     = useState(false);

  const { mutate, isPending } = useSubmitSuggestion();

  const handleSubmit = useCallback(() => {
    const trimmed = link.trim();
    if (!trimmed) {
      setLinkError('Please paste a playlist link.');
      return;
    }
    if (!isValidUrl(trimmed)) {
      setLinkError('Only public Spotify or YouTube playlist links are accepted.');
      return;
    }
    setLinkError('');

    mutate(
      { link: trimmed, playlistName: playlistName.trim() || null },
      {
        onSuccess: () => setSubmitted(true),
        onError: (err: any) => {
          if (err?.status === 429) {
            setLinkError("You've already submitted a playlist today. Try again tomorrow.");
          } else if (err?.status === 400) {
            setLinkError(err?.message || 'Invalid submission. Please check the link.');
          } else {
            setLinkError('Something went wrong. Please try again.');
          }
        },
      },
    );
  }, [link, playlistName, mutate]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + LAYOUT.miniPlayerHeight + 16 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconWrap}>
            <Text style={styles.iconText}>🔗</Text>
          </View>
          <View>
            <Text style={styles.headerTitle}>Share a Playlist</Text>
            <Text style={styles.headerSub}>Send a playlist link to the admin for review.</Text>
          </View>
        </View>

        {/* Success */}
        {submitted ? (
          <View style={styles.successBox}>
            <Text style={styles.successIcon}>✅</Text>
            <Text style={styles.successTitle}>Thanks! We got it.</Text>
            <Text style={styles.successMsg}>
              Your playlist link has been sent to the admin. We'll review it and add songs manually.
            </Text>
            <TouchableOpacity
              style={styles.anotherBtn}
              onPress={() => { setSubmitted(false); setLink(''); setPlaylistName(''); }}
            >
              <Text style={styles.anotherBtnText}>Share another</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.form}>
            {/* Link field */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Playlist link <Text style={styles.required}>*</Text>
              </Text>
              <TextInput
                style={[styles.input, linkError ? styles.inputError : null]}
                value={link}
                onChangeText={(t) => { setLink(t); if (linkError) setLinkError(''); }}
                placeholder="https://open.spotify.com/playlist/..."
                placeholderTextColor={COLORS.textMuted}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                editable={!isPending}
              />
              {!!linkError && <Text style={styles.errorMsg}>{linkError}</Text>}
            </View>

            {/* Name field */}
            <View style={styles.field}>
              <Text style={styles.label}>
                Playlist name <Text style={styles.optional}>(optional)</Text>
              </Text>
              <TextInput
                style={styles.input}
                value={playlistName}
                onChangeText={(t) => { if (t.length <= 50) setPlaylistName(t); }}
                placeholder="e.g. Chill Vibes 2024"
                placeholderTextColor={COLORS.textMuted}
                maxLength={50}
                editable={!isPending}
              />
              <Text style={styles.charCount}>{playlistName.length}/50</Text>
            </View>

            {/* Info note */}
            <View style={styles.infoNote}>
              <Text style={styles.infoText}>
                Make sure your playlist is set to{' '}
                <Text style={styles.infoHighlight}>Public</Text> before sharing —
                private links cannot be reviewed by the admin.
              </Text>
            </View>

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, (!link.trim() || isPending) && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={isPending || !link.trim()}
            >
              {isPending
                ? <ActivityIndicator color={COLORS.black} size="small" />
                : <Text style={styles.submitBtnText}>Send to Admin</Text>
              }
            </TouchableOpacity>
          </View>
        )}

        {/* My Submissions */}
        <MySubmissions />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: LAYOUT.spacing.md,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.spacing.md,
    marginBottom: LAYOUT.spacing.lg,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: LAYOUT.radius.md,
    backgroundColor: 'rgba(108,99,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: { fontSize: 20 },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  headerSub: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  form: { gap: LAYOUT.spacing.md },
  field: { gap: LAYOUT.spacing.xs },
  label: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  required: { color: COLORS.danger },
  optional: { color: COLORS.textMuted },
  input: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: LAYOUT.radius.md,
    paddingHorizontal: LAYOUT.spacing.md,
    paddingVertical: LAYOUT.spacing.sm + 2,
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  inputError: { borderColor: COLORS.danger },
  errorMsg: {
    color: COLORS.danger,
    fontSize: TYPOGRAPHY.sizes.xs,
  },
  charCount: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: 'right',
  },
  infoNote: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: LAYOUT.radius.md,
    padding: LAYOUT.spacing.md,
  },
  infoText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.xs,
    lineHeight: TYPOGRAPHY.sizes.xs * 1.7,
  },
  infoHighlight: {
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.weights.semibold,
  },
  submitBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: LAYOUT.radius.md,
    paddingVertical: LAYOUT.spacing.sm + 2,
    alignItems: 'center',
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText: {
    color: COLORS.black,
    fontWeight: TYPOGRAPHY.weights.bold,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  successBox: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: LAYOUT.radius.lg,
    padding: LAYOUT.spacing.xl,
    alignItems: 'center',
    gap: LAYOUT.spacing.sm,
  },
  successIcon: { fontSize: 40 },
  successTitle: {
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.sizes.lg,
    fontWeight: TYPOGRAPHY.weights.bold,
  },
  successMsg: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.sm,
    textAlign: 'center',
    lineHeight: TYPOGRAPHY.sizes.sm * 1.6,
  },
  anotherBtn: {
    marginTop: LAYOUT.spacing.xs,
    backgroundColor: COLORS.overlay,
    borderRadius: LAYOUT.radius.md,
    paddingHorizontal: LAYOUT.spacing.lg,
    paddingVertical: LAYOUT.spacing.sm,
  },
  anotherBtnText: {
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  mySection: { marginTop: LAYOUT.spacing.xl },
  mySectionTitle: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.semibold,
    marginBottom: LAYOUT.spacing.md,
  },
  loadingRow: { alignItems: 'center', paddingVertical: LAYOUT.spacing.lg },
  centered: { alignItems: 'center', paddingVertical: LAYOUT.spacing.lg },
  errorText: { color: COLORS.danger, fontSize: TYPOGRAPHY.sizes.xs, marginBottom: LAYOUT.spacing.sm },
  retryBtn: {
    backgroundColor: COLORS.surface,
    borderRadius: LAYOUT.radius.md,
    paddingHorizontal: LAYOUT.spacing.md,
    paddingVertical: LAYOUT.spacing.xs,
  },
  retryText: { color: COLORS.textPrimary, fontSize: TYPOGRAPHY.sizes.xs },
  emptyText: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.sizes.sm },
  card: {
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: LAYOUT.radius.lg,
    padding: LAYOUT.spacing.md,
    marginBottom: LAYOUT.spacing.sm,
    gap: LAYOUT.spacing.sm,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: LAYOUT.spacing.sm,
  },
  cardLeft: { flex: 1, gap: 2 },
  cardName: {
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: TYPOGRAPHY.weights.medium,
  },
  noName: { color: COLORS.textMuted, fontStyle: 'italic', fontSize: TYPOGRAPHY.sizes.xs },
  cardDate: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.sizes.xs },
  cardRight: { flexDirection: 'row', alignItems: 'center', gap: LAYOUT.spacing.sm },
  badge: {
    borderRadius: LAYOUT.radius.full,
    paddingHorizontal: LAYOUT.spacing.sm,
    paddingVertical: 2,
  },
  badgeText: { fontSize: 10, fontWeight: TYPOGRAPHY.weights.bold },
  linkBtn: { padding: 4 },
  linkBtnText: { color: COLORS.textSecondary, fontSize: TYPOGRAPHY.sizes.sm },
  adminMsg: {
    borderRadius: LAYOUT.radius.md,
    padding: LAYOUT.spacing.sm,
    gap: 4,
  },
  adminLabel: {
    color: COLORS.textMuted,
    fontSize: 10,
    fontWeight: TYPOGRAPHY.weights.bold,
    letterSpacing: 1,
  },
  adminMsgText: { fontSize: TYPOGRAPHY.sizes.xs, lineHeight: TYPOGRAPHY.sizes.xs * 1.7 },
  rejectHint: { color: '#ca8a04', fontSize: TYPOGRAPHY.sizes.xs },
});