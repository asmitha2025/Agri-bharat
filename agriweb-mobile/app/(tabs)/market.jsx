import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SHADOW } from '../../constants/theme';

const COMMODITIES = [
  { id: 1, name: 'Wheat', unit: 'per quintal', price: 2275, change: +45, market: 'Mumbai APMC' },
  { id: 2, name: 'Rice (Basmati)', unit: 'per quintal', price: 6800, change: -120, market: 'Delhi Azadpur' },
  { id: 3, name: 'Maize', unit: 'per quintal', price: 1950, change: +30, market: 'Pune APMC' },
  { id: 4, name: 'Soybean', unit: 'per quintal', price: 4620, change: +85, market: 'Indore APMC' },
  { id: 5, name: 'Cotton (Long)', unit: 'per quintal', price: 7200, change: -200, market: 'Rajkot APMC' },
  { id: 6, name: 'Onion', unit: 'per quintal', price: 2800, change: +350, market: 'Lasalgaon APMC' },
  { id: 7, name: 'Tomato', unit: 'per quintal', price: 1400, change: -100, market: 'Kolar APMC' },
  { id: 8, name: 'Potato', unit: 'per quintal', price: 1250, change: +20, market: 'Agra APMC' },
  { id: 9, name: 'Sugarcane', unit: 'per tonne', price: 3150, change: 0, market: 'FRP Rate 2024-25' },
  { id: 10, name: 'Groundnut', unit: 'per quintal', price: 5800, change: +110, market: 'Junagadh APMC' },
];

export default function MarketPrices() {
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');

  const filtered = COMMODITIES
    .filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      if (sortBy === 'price') return b.price - a.price;
      if (sortBy === 'change') return b.change - a.change;
      return 0;
    });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <LinearGradient colors={['#064e3b', '#065f46', '#047857']} style={styles.header}>
        <Text style={styles.headerTitle}>📈 Market Prices</Text>
        <Text style={styles.headerSub}>Live commodity prices • Updated today</Text>
      </LinearGradient>

      {/* Search + Sort */}
      <View style={styles.controls}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={16} color={COLORS.textSecondary} style={{ paddingLeft: 10 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search commodity..."
            placeholderTextColor={COLORS.textLight}
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <View style={styles.sortRow}>
          {['name', 'price', 'change'].map(s => (
            <TouchableOpacity
              key={s}
              style={[styles.sortBtn, sortBy === s && styles.sortBtnActive]}
              onPress={() => setSortBy(s)}
            >
              <Text style={[styles.sortBtnText, sortBy === s && styles.sortBtnTextActive]}>
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Table Header */}
      <View style={styles.tableHeader}>
        <Text style={[styles.thCell, { flex: 2 }]}>Commodity</Text>
        <Text style={[styles.thCell, { flex: 1.2, textAlign: 'right' }]}>Price (₹)</Text>
        <Text style={[styles.thCell, { flex: 1, textAlign: 'right' }]}>Change</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {filtered.map((c, i) => {
          const isUp = c.change > 0;
          const isFlat = c.change === 0;
          return (
            <View key={c.id} style={[styles.row, i % 2 === 0 && styles.rowAlt, SHADOW.small]}>
              <View style={{ flex: 2 }}>
                <Text style={styles.commName}>{c.name}</Text>
                <Text style={styles.market}>{c.market}</Text>
                <Text style={styles.unit}>{c.unit}</Text>
              </View>
              <Text style={[styles.price, { flex: 1.2, textAlign: 'right' }]}>
                ₹{c.price.toLocaleString()}
              </Text>
              <View style={[styles.changeBadge, {
                flex: 1, justifyContent: 'flex-end',
                backgroundColor: isFlat ? '#f3f4f6' : isUp ? '#dcfce7' : '#fee2e2',
              }]}>
                <Ionicons
                  name={isFlat ? 'remove-outline' : isUp ? 'trending-up-outline' : 'trending-down-outline'}
                  size={13}
                  color={isFlat ? '#9ca3af' : isUp ? '#16a34a' : '#ef4444'}
                />
                <Text style={[styles.changeText, {
                  color: isFlat ? '#9ca3af' : isUp ? '#16a34a' : '#ef4444',
                }]}>
                  {isFlat ? '0' : `${isUp ? '+' : ''}${c.change}`}
                </Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 },
  controls: { padding: 12, gap: 8 },
  searchWrap: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: RADIUS.md,
    borderWidth: 1.5, borderColor: '#d1fae5', ...SHADOW.small,
  },
  searchInput: { flex: 1, paddingVertical: 10, paddingRight: 12, fontSize: 14, color: COLORS.textPrimary },
  sortRow: { flexDirection: 'row', gap: 8 },
  sortBtn: {
    paddingHorizontal: 14, paddingVertical: 6,
    borderRadius: 99, backgroundColor: '#fff',
    borderWidth: 1.5, borderColor: '#d1fae5',
  },
  sortBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  sortBtnText: { fontSize: 12, fontWeight: '600', color: COLORS.textSecondary },
  sortBtnTextActive: { color: '#fff' },
  tableHeader: {
    flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 8,
    backgroundColor: '#f0fdf4', borderBottomWidth: 1, borderBottomColor: '#d1fae5',
  },
  thCell: { fontSize: 11, fontWeight: '700', color: COLORS.textSecondary, textTransform: 'uppercase' },
  scroll: { paddingHorizontal: 12, paddingBottom: 32, paddingTop: 4 },
  row: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: RADIUS.md,
    paddingVertical: 12, paddingHorizontal: 12, marginBottom: 6,
  },
  rowAlt: { backgroundColor: '#f9fafb' },
  commName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
  market: { fontSize: 11, color: COLORS.textSecondary, marginTop: 1 },
  unit: { fontSize: 10, color: COLORS.textLight },
  price: { fontSize: 15, fontWeight: '800', color: COLORS.textPrimary },
  changeBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    borderRadius: 99, paddingHorizontal: 8, paddingVertical: 4,
    alignSelf: 'center',
  },
  changeText: { fontSize: 12, fontWeight: '700' },
});
