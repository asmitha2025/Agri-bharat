import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { db, collection, getDocs, query, orderBy, limit } from '../../firebase';
import { COLORS, RADIUS, SHADOW } from '../../constants/theme';

const statusConfig = {
  completed: { color: '#16a34a', bg: '#dcfce7', icon: 'checkmark-circle-outline' },
  pending:   { color: '#f59e0b', bg: '#fef3c7', icon: 'time-outline' },
  missed:    { color: '#ef4444', bg: '#fee2e2', icon: 'close-circle-outline' },
  default:   { color: '#6b7280', bg: '#f3f4f6', icon: 'ellipse-outline' },
};

export default function CallHistory() {
  const [calls, setCalls] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchCalls = async () => {
    try {
      const q = query(collection(db, 'calls'), orderBy('timestamp', 'desc'), limit(50));
      const snap = await getDocs(q);
      setCalls(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.warn('fetchCalls:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchCalls(); }, []);

  const onRefresh = () => { setRefreshing(true); fetchCalls(); };

  const formatTime = (timestamp) => {
    if (!timestamp) return '—';
    try {
      const d = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
    } catch { return '—'; }
  };

  const renderItem = ({ item }) => {
    const cfg = statusConfig[item.status] || statusConfig.default;
    return (
      <View style={[styles.card, SHADOW.small]}>
        <View style={[styles.callIcon, { backgroundColor: cfg.bg }]}>
          <Ionicons name={cfg.icon} size={20} color={cfg.color} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.callerName}>{item.callerName || item.phoneNumber || 'Unknown Caller'}</Text>
          {item.phoneNumber && item.callerName && (
            <Text style={styles.phone}>{item.phoneNumber}</Text>
          )}
          <Text style={styles.time}>{formatTime(item.timestamp)}</Text>
          {item.query && (
            <Text style={styles.query} numberOfLines={2}>"{item.query}"</Text>
          )}
        </View>
        <View style={[styles.badge, { backgroundColor: cfg.bg }]}>
          <Text style={[styles.badgeText, { color: cfg.color }]}>
            {item.status || 'unknown'}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <LinearGradient colors={['#7c2d12', '#9a3412', '#c2410c']} style={styles.header}>
        <Text style={styles.headerTitle}>📞 Call History</Text>
        <Text style={styles.headerSub}>{calls.length} recent calls</Text>
      </LinearGradient>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} size="large" />
      ) : calls.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="call-outline" size={48} color={COLORS.textLight} />
          <Text style={styles.emptyText}>No call history found</Text>
        </View>
      ) : (
        <FlatList
          data={calls}
          keyExtractor={i => i.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[COLORS.primary]} />}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 },
  list: { padding: 16, paddingBottom: 32 },
  card: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: '#fff', borderRadius: RADIUS.lg,
    padding: 14, marginBottom: 8,
  },
  callIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  callerName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  phone: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  time: { fontSize: 11, color: COLORS.textLight, marginTop: 3 },
  query: { fontSize: 12, color: COLORS.textSecondary, fontStyle: 'italic', marginTop: 4, lineHeight: 16 },
  badge: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4, alignSelf: 'flex-start' },
  badgeText: { fontSize: 11, fontWeight: '700' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary },
});
