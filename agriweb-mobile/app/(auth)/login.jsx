import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, ActivityIndicator,
  Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/AuthContext';
import { COLORS, RADIUS, SHADOW } from '../../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { login, error, setError } = useAuth();
  const router = useRouter();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter both email and password.');
      return;
    }
    setIsLoading(true);
    const ok = await login(email.trim(), password);
    setIsLoading(false);
    if (ok) router.replace('/(tabs)');
  };

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <LinearGradient colors={['#052e16', '#14532d', '#166534']} style={styles.bg}>
        <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
          {/* Logo area */}
          <View style={styles.logoWrap}>
            <View style={styles.logoCircle}>
              <Ionicons name="leaf" size={40} color="#fff" />
            </View>
            <Text style={styles.appName}>AgriWeb</Text>
            <Text style={styles.tagline}>Smart Agriculture Platform</Text>
          </View>

          {/* Card */}
          <View style={styles.card}>
            <Text style={styles.cardTitle}>Welcome Back</Text>
            <Text style={styles.cardSubtitle}>Sign in to your account</Text>

            {!!error && (
              <View style={styles.errorBox}>
                <Ionicons name="alert-circle-outline" size={16} color="#ef4444" />
                <Text style={styles.errorText}>{error}</Text>
              </View>
            )}

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="mail-outline" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="admin@agriweb.com"
                  placeholderTextColor={COLORS.textLight}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Password</Text>
              <View style={styles.inputWrap}>
                <Ionicons name="lock-closed-outline" size={18} color={COLORS.textSecondary} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={COLORS.textLight}
                  secureTextEntry={!showPass}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity onPress={() => setShowPass(!showPass)} style={styles.eyeBtn}>
                  <Ionicons name={showPass ? 'eye-off-outline' : 'eye-outline'} size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Login button */}
            <TouchableOpacity
              style={[styles.loginBtn, isLoading && styles.loginBtnDisabled]}
              onPress={handleLogin}
              disabled={isLoading}
            >
              {isLoading
                ? <ActivityIndicator color="#fff" />
                : <Text style={styles.loginBtnText}>Sign In</Text>
              }
            </TouchableOpacity>

            <Text style={styles.footerNote}>
              Powered by AgriWeb © 2024
            </Text>
          </View>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bg: { flex: 1 },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  logoWrap: { alignItems: 'center', marginBottom: 32 },
  logoCircle: {
    width: 80, height: 80, borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 12,
  },
  appName: { fontSize: 32, fontWeight: '800', color: '#fff', letterSpacing: 1 },
  tagline: { fontSize: 13, color: 'rgba(255,255,255,0.6)', marginTop: 4 },
  card: {
    backgroundColor: '#fff',
    borderRadius: RADIUS.xl,
    padding: 28,
    ...SHADOW.medium,
  },
  cardTitle: { fontSize: 22, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
  cardSubtitle: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 24 },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fef2f2', borderRadius: RADIUS.sm,
    padding: 10, marginBottom: 16,
  },
  errorText: { color: '#ef4444', fontSize: 13, flex: 1 },
  inputGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary, marginBottom: 6 },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1.5, borderColor: '#d1fae5',
    borderRadius: RADIUS.md, backgroundColor: COLORS.background,
  },
  inputIcon: { paddingHorizontal: 12 },
  input: { flex: 1, paddingVertical: 13, fontSize: 14, color: COLORS.textPrimary },
  eyeBtn: { paddingHorizontal: 12 },
  loginBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: RADIUS.md,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 8,
    ...SHADOW.small,
  },
  loginBtnDisabled: { opacity: 0.7 },
  loginBtnText: { color: '#fff', fontWeight: '700', fontSize: 16 },
  footerNote: { textAlign: 'center', marginTop: 20, fontSize: 12, color: COLORS.textLight },
});
