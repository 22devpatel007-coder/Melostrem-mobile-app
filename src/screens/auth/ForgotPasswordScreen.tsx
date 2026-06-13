import React, { useState, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { sendPasswordReset } from '@services/auth.service';
import { AuthStackParamList } from '@/types/navigation';
import { COLORS } from '@constants/colors';
import { TYPOGRAPHY } from '../../constants/typography';
import { LAYOUT } from '../../constants/layout';

type Props = NativeStackScreenProps<AuthStackParamList, 'ForgotPassword'>;

const FIREBASE_ERRORS: Record<string, string | null> = {
  'auth/invalid-email':          'Please enter a valid email address.',
  'auth/too-many-requests':      'Too many attempts. Please wait and try again.',
  'auth/network-request-failed': 'Network error. Please check your connection.',
  'auth/user-not-found':         null, // silent — show success to prevent enumeration
};

const getErrorMessage = (code: string) =>
  code in FIREBASE_ERRORS ? FIREBASE_ERRORS[code] : 'Something went wrong. Please try again.';

export default function ForgotPasswordScreen({ navigation }: Props) {
  const [email, setEmail]   = useState('');
  const [error, setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent]     = useState(false);

  const submitting = useRef(false);

  const handleSubmit = async () => {
    if (submitting.current) return;
    if (!email.trim()) { setError('Please enter your email address.'); return; }

    submitting.current = true;
    setError('');
    setLoading(true);

    try {
      await sendPasswordReset(email.trim());
      setSent(true);
    } catch (err: any) {
      if (err?.code === 'auth/user-not-found') { setSent(true); return; }
      const msg = getErrorMessage(err?.code);
      if (msg) setError(msg);
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <View style={styles.root}>
        <View style={styles.card}>
          <View style={styles.logoRow}>
            <View style={styles.logoIcon}><Text style={styles.logoNote}>♪</Text></View>
            <Text style={styles.logoText}>MeloStream</Text>
          </View>

          <View style={styles.successBox} accessibilityRole="text">
            <Text style={styles.successTitle}>Check your inbox</Text>
            <Text style={styles.successBody}>
              If an account exists for {email.trim()}, a password reset link has been sent. Check your spam folder if you don't see it.
            </Text>
          </View>

          <TouchableOpacity onPress={() => navigation.navigate('Login')} accessibilityRole="link">
            <Text style={styles.backLink}>← Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>

          <View style={styles.logoRow}>
            <View style={styles.logoIcon}><Text style={styles.logoNote}>♪</Text></View>
            <Text style={styles.logoText}>MeloStream</Text>
          </View>
          <Text style={styles.subtitle}>Reset your password</Text>
          <Text style={styles.hint}>Enter your email and we'll send you a reset link.</Text>

          {!!error && (
            <View style={styles.errorBox} accessibilityRole="alert">
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="you@example.com"
              placeholderTextColor={COLORS.textMuted}
              value={email}
              onChangeText={(t) => { setEmail(t); if (error) setError(''); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="email"
              editable={!loading}
            />
          </View>

          <TouchableOpacity
            style={[styles.primaryBtn, (loading || !email.trim()) && styles.btnDisabled]}
            onPress={handleSubmit}
            disabled={loading || !email.trim()}
            accessibilityRole="button"
          >
            {loading
              ? <ActivityIndicator color="#000" size="small" />
              : <Text style={styles.primaryBtnText}>Send Reset Link</Text>
            }
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => navigation.navigate('Login')}
            style={styles.backRow}
            accessibilityRole="link"
          >
            <Text style={styles.backLink}>← Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root:    { flex: 1, backgroundColor: COLORS.background },
  scroll:  { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: LAYOUT.spacing.md },
  card: {
    width: '100%', maxWidth: 400,
    backgroundColor: COLORS.surface, borderRadius: 16,
    padding: LAYOUT.spacing.xl, borderWidth: 1, borderColor: COLORS.border,
  },
  logoRow:  { flexDirection: 'row', alignItems: 'center', gap: LAYOUT.spacing.sm, marginBottom: LAYOUT.spacing.xs },
  logoIcon: { width: 36, height: 36, backgroundColor: COLORS.primary, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  logoNote: { color: '#000', fontSize: 18, fontWeight: '700' },
  logoText: { color: COLORS.textPrimary, fontSize: TYPOGRAPHY.sizes.xl, fontWeight: '700', letterSpacing: -0.3 },
  subtitle: { color: COLORS.textPrimary, fontSize: TYPOGRAPHY.sizes.lg, fontWeight: '600', marginTop: LAYOUT.spacing.md, marginBottom: LAYOUT.spacing.xs },
  hint:     { color: COLORS.textMuted, fontSize: TYPOGRAPHY.sizes.sm, marginBottom: LAYOUT.spacing.lg, lineHeight: 20 },
  errorBox: { backgroundColor: 'rgba(244,63,94,0.1)', borderWidth: 1, borderColor: 'rgba(244,63,94,0.25)', borderRadius: 8, padding: LAYOUT.spacing.sm, marginBottom: LAYOUT.spacing.md },
  errorText:{ color: '#f87171', fontSize: TYPOGRAPHY.sizes.sm, lineHeight: 20 },
  fieldGroup:{ marginBottom: LAYOUT.spacing.md },
  label:    { color: COLORS.textSecondary, fontSize: TYPOGRAPHY.sizes.sm, fontWeight: '500', marginBottom: LAYOUT.spacing.xs },
  input: {
    backgroundColor: COLORS.backgroundSecondary, borderWidth: 1,
    borderColor: COLORS.border, borderRadius: 8,
    paddingHorizontal: LAYOUT.spacing.md, paddingVertical: 11,
    color: COLORS.textPrimary, fontSize: TYPOGRAPHY.sizes.base,
    fontFamily: TYPOGRAPHY.families.sans,
  },
  primaryBtn:     { backgroundColor: COLORS.primary, borderRadius: 8, paddingVertical: 13, alignItems: 'center', justifyContent: 'center', minHeight: 44 },
  btnDisabled:    { opacity: 0.6 },
  primaryBtnText: { color: '#000', fontSize: TYPOGRAPHY.sizes.base, fontWeight: '700' },
  successBox:  { backgroundColor: 'rgba(34,197,94,0.08)', borderWidth: 1, borderColor: 'rgba(34,197,94,0.25)', borderRadius: 8, padding: LAYOUT.spacing.md, marginVertical: LAYOUT.spacing.lg },
  successTitle:{ color: COLORS.textPrimary, fontSize: TYPOGRAPHY.sizes.base, fontWeight: '600', marginBottom: LAYOUT.spacing.xs },
  successBody: { color: COLORS.textMuted, fontSize: TYPOGRAPHY.sizes.sm, lineHeight: 20 },
  backRow:  { marginTop: LAYOUT.spacing.lg, alignItems: 'center' },
  backLink: { color: COLORS.primary, fontSize: TYPOGRAPHY.sizes.sm, fontWeight: '500' },
});