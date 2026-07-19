import React from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { useRouter } from 'expo-router';
import { COLORS, RADIUS, SHADOW } from '../../constants/theme';

const MenuItem = ({ icon, label, sublabel, onPress, danger }) => (
  <TouchableOpacity style={[styles.menuItem, SHADOW.small]} onPress={onPress}>
    <View style={[styles.menuIcon, { backgroundColor: danger ? '#fee2e2' : COLORS.primaryLight }]}>
      <Ionicons name={icon} size={20} color={danger ? '#ef4444' : COLORS.primary} />
    </View>
    <View style={{ flex: 1 }}>
      <Text style={[styles.menuLabel, danger && { color: '#ef4444' }]}>{label}</Text>
      {sublabel && <Text style={styles.menuSub}>{sublabel}</Text>}
    </View>
    <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
  </TouchableOpacity>
);

export default function Profile() {
  const { user, isAdmin, logout } = useAuth();
  const router = useRouter();

  const handleLogout = () => {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign Out', style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const initial = (user?.displayName || user?.email || 'U')[0].toUpperCase();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <LinearGradient colors={['#14532d', '#166534', '#15803d']} style={styles.header}>
        <View style={styles.avatarWrap}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          {isAdmin && (
            <View style={styles.adminBadge}>
              <Ionicons name="shield-checkmark" size={11} color="#fbbf24" />
              <Text style={styles.adminBadgeText}>Admin</Text>
            </View>
          )}
        </View>
        <Text style={styles.name}>{user?.displayName || 'Farmer'}</Text>
        <Text style={styles.email}>{user?.email || '—'}</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll}>
        <Text style={styles.section}>Account</Text>
        <MenuItem icon="person-outline" label="Full Name" sublabel={user?.displayName || 'Not set'} onPress={() => {}} />
        <MenuItem icon="mail-outline" label="Email" sublabel={user?.email || '—'} onPress={() => {}} />
        <MenuItem icon="shield-outline" label="Role" sublabel={isAdmin ? 'Administrator' : 'Farmer'} onPress={() => {}} />

        <Text style={styles.section}>App</Text>
        <MenuItem icon="grid-outline" label="Dashboard" onPress={() => router.push('/(tabs)')} />
        <MenuItem icon="bug-outline" label="Pest Control" onPress={() => router.push('/(tabs)/pest-control')} />
        <MenuItem icon="partly-sunny-outline" label="Weather Center" onPress={() => router.push('/(tabs)/weather')} />
        <MenuItem icon="document-text-outline" label="Government Schemes" onPress={() => router.push('/(tabs)/schemes')} />
        <MenuItem icon="trending-up-outline" label="Market Prices" onPress={() => router.push('/(tabs)/market')} />

        {isAdmin && (
          <>
            <Text style={styles.section}>Admin Tools</Text>
            <MenuItem icon="people-outline" label="Manage Farmers" onPress={() => router.push('/(tabs)/farmers')} />
            <MenuItem icon="call-outline" label="Call History" onPress={() => router.push('/(tabs)/calls')} />
          </>
        )}

        <Text style={styles.section}>Other</Text>
        <MenuItem danger icon="log-out-outline" label="Sign Out" onPress={handleLogout} />

        <Text style={styles.version}>AgriWeb Mobile v1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 32, alignItems: 'center' },
  avatarWrap: { alignItems: 'center', marginBottom: 12 },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#fff', fontSize: 30, fontWeight: '800' },
  adminBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(251,191,36,0.2)', borderRadius: 99,
    paddingHorizontal: 10, paddingVertical: 3, marginTop: 6,
  },
  adminBadgeText: { color: '#fbbf24', fontSize: 11, fontWeight: '700' },
  name: { color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 2 },
  email: { color: 'rgba(255,255,255,0.65)', fontSize: 13 },
  scroll: { padding: 16, paddingBottom: 40 },
  section: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase', marginBottom: 8, marginTop: 16 },
  menuItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: RADIUS.lg,
    padding: 14, marginBottom: 6,
  },
  menuIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  menuLabel: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  menuSub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  version: { textAlign: 'center', fontSize: 12, color: COLORS.textLight, marginTop: 20 },
});
