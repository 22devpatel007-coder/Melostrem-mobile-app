// src/screens/auth/RegisterScreen.tsx
import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { registerWithEmail } from '@services/auth.service';
import { AuthStackParamList } from '@/types/navigation';
import { COLORS } from '@constants/colors';

type Props = NativeStackScreenProps<AuthStackParamList, 'Register'>;

const FIREBASE_ERROR_MAP: Record<string, string> = {
  'auth/email-already-in-use': 'An account with this email already exists.',
  'auth/invalid-email': 'Please enter a valid email address.',
  'auth/weak-password': 'Password must be at least 6 characters.',
  'auth/network-request-failed': 'Network error. Please check your connection.',
  'auth/too-many-requests': 'Too many attempts. Please try again later.',
};

const getFriendlyError = (err: any): string =>
  (err?.code && FIREBASE_ERROR_MAP[err.code]) || 'Something went wrong. Please try again.';

const MusicNoteIcon = () => (
  <Text style={{ color: '#000', fontSize: 18, fontWeight: '700' }}>♪</Text>
);

export default function RegisterScreen({ navigation }: Props) {
  const [fields, setFields] = useState({ name: '', email: '', password: '', confirm: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState<string | null>(null);

  const handleChange = (key: string, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }));
    if (error) setError('');
  };

  const validate = () => {
    if (!fields.name.trim()) return 'Full name is required.';
    if (!fields.email.trim()) return 'Email is required.';
    if (fields.password.length < 6) return 'Password must be at least 6 characters.';
    if (fields.password !== fields.confirm) return 'Passwords do not match.';
    return null;
  };

  const handleRegister = async () => {
    const validationError = validate();
    if (validationError) return setError(validationError);
    setLoading(true);
    setError('');
    try {
      await registerWithEmail(fields.email.trim(), fields.password, fields.name.trim());
      // AuthProvider handles navigation after onAuthStateChanged fires
    } catch (err: any) {
      setError(getFriendlyError(err));
    } finally {
      setLoading(false);
    }
  };

  const inputBorder = (key: string) => ({
    borderColor: focused === key ? COLORS.primary : '#2d2d2d',
  });

  return (
    <KeyboardAvoidingView
      style={styles.root}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          {/* Logo */}
          <View style={styles.logoRow}>
            <View style={styles.logoIcon}>
              <MusicNoteIcon />
            </View>
            <Text style={styles.logoText}>MeloStream</Text>
          </View>
          <Text style={styles.subtitle}>Create your account</Text>

          {/* Error */}
          {!!error && (
            <View style={styles.errorBox} accessibilityRole="alert">
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Fields */}
          {[
            { key: 'name',     label: 'Full Name',        placeholder: 'John Doe',         secure: false, complete: 'name' },
            { key: 'email',    label: 'Email',             placeholder: 'you@example.com',  secure: false, complete: 'email-address' },
            { key: 'password', label: 'Password',          placeholder: 'Min. 6 characters',secure: true,  complete: 'password' },
            { key: 'confirm',  label: 'Confirm Password',  placeholder: '••••••••',         secure: true,  complete: 'password' },
          ].map(({ key, label, placeholder, secure, complete }) => (
            <View key={key} style={styles.fieldGroup}>
              <Text style={styles.label}>{label}</Text>
              <TextInput
                style={[styles.input, inputBorder(key), loading && styles.inputDisabled]}
                placeholder={placeholder}
                placeholderTextColor="#4b5563"
                value={fields[key as keyof typeof fields]}
                onChangeText={(v) => handleChange(key, v)}
                secureTextEntry={secure}
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete={complete as any}
                editable={!loading}
                onFocus={() => setFocused(key)}
                onBlur={() => setFocused(null)}
              />
            </View>
          ))}

          {/* Submit */}
          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.btnDisabled]}
            onPress={handleRegister}
            disabled={loading}
            activeOpacity={0.8}
          >
            {loading
              ? <ActivityIndicator color="#000" size="small" />
              : <Text style={styles.primaryBtnText}>Create Account</Text>
            }
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.divider}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>OR</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Footer */}
          <View style={styles.footerRow}>
            <Text style={styles.footerText}>Already have an account? </Text>
            <TouchableOpacity onPress={() => navigation.navigate('Login')}>
              <Text style={styles.link}>Sign in</Text>
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
    backgroundColor: '#0F0F0F',
  },
  scroll: {
    flexGrow: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#1a1a1a',
    borderWidth: 1,
    borderColor: '#2d2d2d',
    borderRadius: 16,
    padding: 32,
    width: '100%',
    maxWidth: 400,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  logoIcon: {
    width: 36,
    height: 36,
    backgroundColor: '#22c55e',
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoText: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  subtitle: {
    color: '#6b7280',
    fontSize: 14,
    marginBottom: 24,
    marginTop: 2,
  },
  errorBox: {
    backgroundColor: 'rgba(239,68,68,0.1)',
    borderWidth: 1,
    borderColor: 'rgba(239,68,68,0.35)',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#f87171',
    fontSize: 13,
    lineHeight: 18,
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    color: '#9ca3af',
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#111',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    color: '#fff',
    fontSize: 14,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  primaryBtn: {
    backgroundColor: '#22c55e',
    borderRadius: 8,
    padding: 13,
    alignItems: 'center',
    marginTop: 4,
    minHeight: 44,
    justifyContent: 'center',
  },
  btnDisabled: {
    opacity: 0.65,
  },
  primaryBtnText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 15,
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    gap: 12,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#2d2d2d',
  },
  dividerText: {
    color: '#4b5563',
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 24,
  },
  footerText: {
    color: '#6b7280',
    fontSize: 13,
  },
  link: {
    color: '#22c55e',
    fontSize: 13,
    fontWeight: '600',
  },
  devCredit: {
    color: '#6b7280',
    fontSize: 11,
    textAlign: 'center',
    marginTop: 12,
    opacity: 0.6,
  },
});