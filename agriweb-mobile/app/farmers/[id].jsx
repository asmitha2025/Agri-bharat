import React, { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  ActivityIndicator, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { db, doc, getDoc } from '../../firebase';
import { COLORS, RADIUS, SHADOW } from '../../constants/theme';

const InfoRow = ({ icon, label, value }) => (
  <View style={styles.infoRow}>
    <View style={styles.infoIconWrap}>
      <Ionicons name={icon} size={16} color={COLORS.primary} />
    </View>
    <View>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value || '—'}</Text>
    </View>
  </View>
);

export default function FarmerDetail() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [farmer, setFarmer] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFarmer = async () => {
      try {
        const snap = await getDoc(doc(db, 'farmers', id));
        if (snap.exists()) setFarmer({ id: snap.id, ...snap.data() });
      } catch (e) {
        console.warn('fetchFarmer:', e.message);
      } finally {
        setLoading(false);
      }
    };
    if (id) fetchFarmer();
  }, [id]);

  const initial = (name = '') =>
    name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </SafeAreaView>
    );
  }

  if (!farmer) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }}>
        <Ionicons name="person-outline" size={48} color={COLORS.textLight} />
        <Text style={{ color: COLORS.textSecondary, marginTop: 12 }}>Farmer not found</Text>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <Text style={styles.backBtnText}>Go Back</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <LinearGradient colors={['#0c4a6e', '#0369a1', '#0284c7']} style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backArrow}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.avatarCircle}>
          <Text style={styles.avatarText}>{initial(farmer.name)}</Text>
        </View>
        <Text style={styles.farmerName}>{farmer.name}</Text>
        {farmer.village && <Text style={styles.farmerVillage}>{farmer.village}</Text>}
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Quick actions */}
        {farmer.phone && (
          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.actionBtn} onPress={() => Linking.openURL(`tel:${farmer.phone}`)}>
              <Ionicons name="call" size={20} color={COLORS.primary} />
              <Text style={styles.actionLabel}>Call</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => Linking.openURL(`sms:${farmer.phone}`)}>
              <Ionicons name="chatbubble" size={20} color="#3b82f6" />
              <Text style={[styles.actionLabel, { color: '#3b82f6' }]}>SMS</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn} onPress={() => Linking.openURL(`https://wa.me/${farmer.phone}`)}>
              <Ionicons name="logo-whatsapp" size={20} color="#22c55e" />
              <Text style={[styles.actionLabel, { color: '#22c55e' }]}>WhatsApp</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Details card */}
        <View style={[styles.card, SHADOW.small]}>
          <Text style={styles.cardTitle}>Personal Information</Text>
          <InfoRow icon="call-outline" label="Phone" value={farmer.phone} />
          <InfoRow icon="location-outline" label="Village" value={farmer.village} />
          <InfoRow icon="map-outline" label="District" value={farmer.district} />
          <InfoRow icon="person-outline" label="Age" value={farmer.age ? `${farmer.age} years` : null} />
        </View>

        {/* Farm details */}
        <View style={[styles.card, SHADOW.small]}>
          <Text style={styles.cardTitle}>Farm Details</Text>
          <InfoRow icon="leaf-outline" label="Crop Type" value={farmer.cropType} />
          <InfoRow icon="resize-outline" label="Land Area" value={farmer.landArea ? `${farmer.landArea} acres` : null} />
          <InfoRow icon="water-outline" label="Irrigation" value={farmer.irrigation} />
          <InfoRow icon="construct-outline" label="Soil Type" value={farmer.soilType} />
        </View>

        {/* Registration */}
        <View style={[styles.card, SHADOW.small]}>
          <Text style={styles.cardTitle}>Registration</Text>
          <InfoRow icon="calendar-outline" label="Registered On" value={
            farmer.createdAt
              ? new Date(farmer.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
              : null
          } />
          <InfoRow icon="id-card-outline" label="Farmer ID" value={farmer.id} />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 28, alignItems: 'center' },
  backArrow: { position: 'absolute', top: 16, left: 16, padding: 4 },
  avatarCircle: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  avatarText: { color: '#fff', fontSize: 28, fontWeight: '800' },
  farmerName: { color: '#fff', fontSize: 20, fontWeight: '800' },
  farmerVillage: { color: 'rgba(255,255,255,0.65)', fontSize: 13, marginTop: 2 },
  scroll: { padding: 16, paddingBottom: 40 },
  actionsRow: {
    flexDirection: 'row', justifyContent: 'space-around',
    backgroundColor: '#fff', borderRadius: RADIUS.lg,
    padding: 16, marginBottom: 14, ...SHADOW.small,
  },
  actionBtn: { alignItems: 'center', gap: 6 },
  actionLabel: { fontSize: 12, fontWeight: '600', color: COLORS.primary },
  card: {
    backgroundColor: '#fff', borderRadius: RADIUS.lg,
    padding: 16, marginBottom: 14,
  },
  cardTitle: { fontSize: 13, fontWeight: '700', color: COLORS.textSecondary, marginBottom: 12, textTransform: 'uppercase' },
  infoRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f0fdf4' },
  infoIconWrap: { width: 28, height: 28, borderRadius: 8, backgroundColor: COLORS.primaryLight, justifyContent: 'center', alignItems: 'center', marginTop: 1 },
  infoLabel: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 2 },
  infoValue: { fontSize: 14, fontWeight: '600', color: COLORS.textPrimary },
  backBtn: { marginTop: 16, backgroundColor: COLORS.primary, borderRadius: RADIUS.md, paddingHorizontal: 20, paddingVertical: 10 },
  backBtnText: { color: '#fff', fontWeight: '700' },
});
