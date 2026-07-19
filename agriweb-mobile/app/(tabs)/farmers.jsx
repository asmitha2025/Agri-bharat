import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { db, collection, getDocs, query, orderBy } from '../../firebase';
import { COLORS, RADIUS, SHADOW } from '../../constants/theme';

export default function Farmers() {
  const [farmers, setFarmers] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();

  const fetchFarmers = async () => {
    try {
      const q = query(collection(db, 'farmers'), orderBy('name'));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setFarmers(data);
      setFiltered(data);
    } catch (e) {
      console.warn('fetchFarmers:', e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchFarmers(); }, []);

  useEffect(() => {
    const q = search.toLowerCase();
    setFiltered(farmers.filter(f =>
      f.name?.toLowerCase().includes(q) ||
      f.phone?.includes(q) ||
      f.village?.toLowerCase().includes(q)
    ));
  }, [search, farmers]);

  const onRefresh = () => { setRefreshing(true); fetchFarmers(); };

  const initials = (name = '') =>
    name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';

  const avatarColor = (name = '') => {
    const colors = ['#16a34a', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4'];
    return colors[name.charCodeAt(0) % colors.length] || COLORS.primary;
  };

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={[styles.card, SHADOW.small]}
      onPress={() => router.push({ pathname: '/farmers/[id]', params: { id: item.id } })}
    >
      <View style={[styles.avatar, { backgroundColor: avatarColor(item.name) }]}>
        <Text style={styles.avatarText}>{initials(item.name)}</Text>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.name}>{item.name || 'Unknown'}</Text>
        <Text style={styles.sub}>{item.village || item.location || '—'}</Text>
        {item.phone && (
          <View style={styles.phoneRow}>
            <Ionicons name="call-outline" size={12} color={COLORS.textSecondary} />
            <Text style={styles.phone}>{item.phone}</Text>
          </View>
        )}
      </View>
      {item.cropType && (
        <View style={styles.cropBadge}>
          <Text style={styles.cropText}>{item.cropType}</Text>
        </View>
      )}
      <Ionicons name="chevron-forward" size={16} color={COLORS.textLight} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <LinearGradient colors={['#0c4a6e', '#0369a1', '#0284c7']} style={styles.header}>
        <Text style={styles.headerTitle}>👨‍🌾 Farmers</Text>
        <Text style={styles.headerSub}>{farmers.length} registered farmers</Text>
      </LinearGradient>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={COLORS.textSecondary} style={{ paddingLeft: 12 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search by name, phone or village..."
          placeholderTextColor={COLORS.textLight}
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')} style={{ paddingRight: 12 }}>
            <Ionicons name="close-circle" size={18} color={COLORS.textLight} />
          </TouchableOpacity>
        )}
      </View>

      {loading ? (
        <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} size="large" />
      ) : filtered.length === 0 ? (
        <View style={styles.empty}>
          <Ionicons name="people-outline" size={48} color={COLORS.textLight} />
          <Text style={styles.emptyText}>{search ? 'No farmers match your search' : 'No farmers registered yet'}</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
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
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', margin: 16, borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: '#d1fae5', ...SHADOW.small,
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, color: COLORS.textPrimary },
  list: { paddingHorizontal: 16, paddingBottom: 32 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: RADIUS.lg,
    padding: 14, marginBottom: 8,
  },
  avatar: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center',
  },
  avatarText: { color: '#fff', fontWeight: '800', fontSize: 16 },
  name: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  sub: { fontSize: 12, color: COLORS.textSecondary, marginTop: 1 },
  phoneRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  phone: { fontSize: 12, color: COLORS.textSecondary },
  cropBadge: {
    backgroundColor: COLORS.primaryLight, borderRadius: 99,
    paddingHorizontal: 8, paddingVertical: 3,
  },
  cropText: { fontSize: 11, fontWeight: '600', color: COLORS.primary },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  emptyText: { fontSize: 14, color: COLORS.textSecondary },
});
