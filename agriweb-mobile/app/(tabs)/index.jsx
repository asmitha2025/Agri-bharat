import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity,
  RefreshControl, ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../../context/AuthContext';
import { db, collection, getDocs, query, orderBy, limit } from '../../firebase';
import { COLORS, RADIUS, SHADOW } from '../../constants/theme';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

const StatCard = ({ icon, label, value, color, iconBg }) => (
  <View style={[styles.statCard, SHADOW.small]}>
    <View style={[styles.statIcon, { backgroundColor: iconBg || '#dcfce7' }]}>
      <Ionicons name={icon} size={22} color={color || COLORS.primary} />
    </View>
    <Text style={styles.statValue}>{value}</Text>
    <Text style={styles.statLabel}>{label}</Text>
  </View>
);

const QuickLink = ({ icon, label, color, onPress }) => (
  <TouchableOpacity style={[styles.quickLink, SHADOW.small]} onPress={onPress}>
    <View style={[styles.quickIcon, { backgroundColor: color + '20' }]}>
      <Ionicons name={icon} size={24} color={color} />
    </View>
    <Text style={styles.quickLabel}>{label}</Text>
  </TouchableOpacity>
);

export default function Dashboard() {
  const { user, isAdmin, logout } = useAuth();
  const router = useRouter();
  const [stats, setStats] = useState({ farmers: 0, calls: 0 });
  const [recentCalls, setRecentCalls] = useState([]);
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      if (isAdmin) {
        const farmersSnap = await getDocs(collection(db, 'farmers'));
        const callsQ = query(collection(db, 'calls'), orderBy('timestamp', 'desc'), limit(3));
        const callsSnap = await getDocs(callsQ);
        setStats({ farmers: farmersSnap.size, calls: callsSnap.size });
        setRecentCalls(callsSnap.docs.map(d => ({ id: d.id, ...d.data() })));
      }
    } catch (e) {
      console.warn(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchData(); };

  const greeting = () => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <LinearGradient colors={['#14532d', '#166534', '#15803d']} style={styles.header}>
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.greeting}>{greeting()}, 👋</Text>
            <Text style={styles.userName}>{user?.displayName || user?.email?.split('@')[0] || 'Farmer'}</Text>
          </View>
          <View style={[styles.avatarCircle]}>
            <Ionicons name="person" size={22} color="#fff" />
          </View>
        </View>
        {isAdmin && (
          <View style={styles.adminBadge}>
            <Ionicons name="shield-checkmark" size={12} color="#fbbf24" />
            <Text style={styles.adminBadgeText}>Admin</Text>
          </View>
        )}
      </LinearGradient>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
      >
        {/* Stats */}
        {isAdmin && (
          <>
            <Text style={styles.sectionTitle}>Overview</Text>
            {loading
              ? <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} />
              : (
                <View style={styles.statsRow}>
                  <StatCard icon="people-outline" label="Farmers" value={stats.farmers} color="#16a34a" iconBg="#dcfce7" />
                  <StatCard icon="call-outline" label="Calls" value={stats.calls} color="#3b82f6" iconBg="#dbeafe" />
                </View>
              )
            }
          </>
        )}

        {/* Quick Links */}
        <Text style={styles.sectionTitle}>Quick Access</Text>
        <View style={styles.quickGrid}>
          <QuickLink icon="bug-outline" label="Pest Control" color="#ef4444" onPress={() => router.push('/(tabs)/pest-control')} />
          <QuickLink icon="partly-sunny-outline" label="Weather" color="#f59e0b" onPress={() => router.push('/(tabs)/weather')} />
          <QuickLink icon="document-text-outline" label="Schemes" color="#8b5cf6" onPress={() => router.push('/(tabs)/schemes')} />
          <QuickLink icon="trending-up-outline" label="Market" color="#16a34a" onPress={() => router.push('/(tabs)/market')} />
          {isAdmin && <QuickLink icon="people-outline" label="Farmers" color="#0ea5e9" onPress={() => router.push('/(tabs)/farmers')} />}
          {isAdmin && <QuickLink icon="call-outline" label="Call History" color="#f97316" onPress={() => router.push('/(tabs)/calls')} />}
        </View>

        {/* Recent Calls (admin) */}
        {isAdmin && recentCalls.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recent Calls</Text>
            {recentCalls.map(c => (
              <View key={c.id} style={[styles.callRow, SHADOW.small]}>
                <View style={styles.callIcon}>
                  <Ionicons name="call" size={16} color={COLORS.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.callName}>{c.callerName || c.phoneNumber || 'Unknown'}</Text>
                  <Text style={styles.callTime}>{c.timestamp ? new Date(c.timestamp.toDate?.() || c.timestamp).toLocaleDateString() : '—'}</Text>
                </View>
                <View style={[styles.callBadge, { backgroundColor: c.status === 'completed' ? '#dcfce7' : '#fef3c7' }]}>
                  <Text style={[styles.callBadgeText, { color: c.status === 'completed' ? COLORS.primary : '#92400e' }]}>
                    {c.status || 'pending'}
                  </Text>
                </View>
              </View>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  greeting: { color: 'rgba(255,255,255,0.7)', fontSize: 13 },
  userName: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 2 },
  avatarCircle: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center',
  },
  adminBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(251,191,36,0.15)', borderRadius: 99,
    paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start', marginTop: 10,
  },
  adminBadgeText: { color: '#fbbf24', fontSize: 11, fontWeight: '700' },
  scroll: { padding: 16, paddingBottom: 32 },
  sectionTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 12, marginTop: 8 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: RADIUS.lg,
    padding: 16, alignItems: 'center',
  },
  statIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  statValue: { fontSize: 26, fontWeight: '800', color: COLORS.textPrimary },
  statLabel: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  quickLink: {
    width: '46%', backgroundColor: '#fff', borderRadius: RADIUS.lg,
    padding: 16, alignItems: 'center', gap: 8,
  },
  quickIcon: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  quickLabel: { fontSize: 13, fontWeight: '600', color: COLORS.textPrimary },
  callRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: RADIUS.md, padding: 14, marginBottom: 8,
  },
  callIcon: {
    width: 36, height: 36, borderRadius: 10,
    backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center',
  },
  callName: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  callTime: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  callBadge: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  callBadgeText: { fontSize: 11, fontWeight: '700' },
});
