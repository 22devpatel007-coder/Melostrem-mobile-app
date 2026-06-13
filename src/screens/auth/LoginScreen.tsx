import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, ActivityIndicator, ScrollView,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '@config/firebase';
import { loginWithEmail } from '@services/auth.service';
import { useAuthStore } from '@store/authStore';
import { AuthStackParamList } from '@/types/navigation';
import { COLORS } from '@constants/colors';
import { TYPOGRAPHY } from '../../constants/typography';
import { LAYOUT } from '../../constants/layout';

type Props = NativeStackScreenProps<AuthStackParamList, 'Login'>;

const FIREBASE_ERRORS: Record<string, string> = {
  'auth/invalid-credential':       'Invalid email or password. Please try again.',
  'auth/user-not-found':           'Invalid email or password. Please try again.',
  'auth/wrong-password':           'Invalid email or password. Please try again.',
  'auth/invalid-email':            'Please enter a valid email address.',
  'auth/user-disabled':            'This account has been disabled. Please contact support.',
  'auth/too-many-requests':        'Too many failed attempts. Try again later.',
  'auth/network-request-failed':   'Network error. Please check your connection.',
};

const getErrorMessage = (code: string) =>
  FIREBASE_ERRORS[code] ?? 'Something went wrong. Please try again.';

export default function LoginScreen({ navigation }: Props) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const submitting = useRef(false);

  const user        = useAuthStore((s) => s.user);
  const authLoading = useAuthStore((s) => s.loading);

  useEffect(() => {
    if (!authLoading && user) navigation.replace('Login'); // RootNavigator handles redirect
  }, [user, authLoading]);

  const handleLogin = async () => {
    if (submitting.current) return;
    if (!email.trim() || !password) { setError('Please enter your email and password.'); return; }

    submitting.current = true;
    setError('');
    setLoading(true);

    try {
      await loginWithEmail(email.trim(), password);
    } catch (err: any) {
      const msg = getErrorMessage(err?.code);
      if (msg) setError(msg);
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  };

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

          {/* Brand */}
          <View style={styles.logoRow}>
            <View style={styles.logoIcon}>
              <Text style={styles.logoNote}>♪</Text>
            </View>
            <Text style={styles.logoText}>MeloStream</Text>
          </View>
          <Text style={styles.subtitle}>Sign in to your account</Text>

          {/* Error */}
          {!!error && (
            <View style={styles.errorBox} accessibilityRole="alert">
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Email */}
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

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              placeholder="••••••••"
              placeholderTextColor={COLORS.textMuted}
              value={password}
              onChangeText={(t) => { setPassword(t); if (error) setError(''); }}
              secureTextEntry
              autoComplete="current-password"
              editable={!loading}
            />
          </View>

          {/* Forgot */}
          <TouchableOpacity
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgotRow}
            accessibilityRole="link"
          >
            <Text style={styles.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={handleLogin}
            disabled={loading}
            accessibilityRole="button"
          >
            {loading
              ? <ActivityIndicator color="#000" size="small" />
              : <Text style={styles.primaryBtnText}>Sign In</Text>
            }
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Footer */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Don't have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Register')} accessibilityRole="link">
              <Text style={styles.link}>Create one</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.devCredit}>Developed by Dev · Personal use only</Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: LAYOUT.spacing.md,
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: LAYOUT.spacing.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: LAYOUT.spacing.sm,
    marginBottom: LAYOUT.spacing.xs,
  },
  logoIcon: {
    width: 36, height: 36,
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoNote: {
    color: '#000',
    fontSize: 18,
    fontWeight: '700',
  },
  logoText: {
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.sizes.xl,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
    marginTop: LAYOUT.spacing.xs,
    marginBottom: LAYOUT.spacing.lg,
  },
  errorBox: {
    backgroundColor: 'rgba(244,63,94,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(244,63,94,0.25)',
    borderRadius: 8,
    padding: LAYOUT.spacing.sm,
    marginBottom: LAYOUT.spacing.md,
  },
  errorText: {
    color: '#f87171',
    fontSize: TYPOGRAPHY.sizes.sm,
    lineHeight: 20,
  },
  fieldGroup: {
    marginBottom: LAYOUT.spacing.md,
  },
  label: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '500',
    marginBottom: LAYOUT.spacing.xs,
  },
  input: {
    backgroundColor: COLORS.backgroundSecondary,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    paddingHorizontal: LAYOUT.spacing.md,
    paddingVertical: 11,
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.sizes.base,
    fontFamily: TYPOGRAPHY.families.sans,
  },
  forgotRow: {
    alignSelf: 'flex-start',
    marginBottom: LAYOUT.spacing.md,
    marginTop: -LAYOUT.spacing.xs,
  },
  forgotText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: '500',
  },
  primaryBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 44,
  },
  btnDisabled: {
    opacity: 0.6,
  },
  primaryBtnText: {
    color: '#000',
    fontSize: TYPOGRAPHY.sizes.base,
    fontWeight: '700',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: LAYOUT.spacing.lg,
    gap: LAYOUT.spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  dividerText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.xs,
    fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerText: {
    color: COLORS.textMuted,
    fontSize: TYPOGRAPHY.sizes.sm,
  },
  link: {
    color: COLORS.primary,
    fontSize: TYPOGRAPHY.sizes.sm,
    fontWeight: '600',
  },
  devCredit: {
    color: COLORS.textMuted,
    fontSize: 11,
    textAlign: 'center',
    marginTop: LAYOUT.spacing.sm,
    opacity: 0.6,
  },
});