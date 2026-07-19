import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SHADOW } from '../../constants/theme';

const SCHEMES = [
  {
    id: 1,
    name: 'PM-KISAN Samman Nidhi',
    ministry: 'Ministry of Agriculture',
    benefit: '₹6,000/year',
    description: 'Direct income support of ₹6000 per year in three equal installments of ₹2000 to all landholding farmer families.',
    eligibility: 'All farmer families with cultivable land holding. Exclusions: institutional landholders, constitutional post holders, income-tax payers.',
    documents: 'Aadhaar, Land records, Bank account details',
    icon: 'cash-outline',
    color: '#16a34a',
    tag: 'Income Support',
  },
  {
    id: 2,
    name: 'PM Fasal Bima Yojana',
    ministry: 'Ministry of Agriculture',
    benefit: 'Up to full sum insured',
    description: 'Crop insurance scheme providing financial support to farmers suffering crop loss/damage due to unforeseen events.',
    eligibility: 'All farmers growing notified crops in notified areas. Compulsory for loanee farmers, voluntary for others.',
    documents: 'Land records, Sowing certificate, Bank account, Aadhaar',
    icon: 'shield-checkmark-outline',
    color: '#3b82f6',
    tag: 'Insurance',
  },
  {
    id: 3,
    name: 'Kisan Credit Card (KCC)',
    ministry: 'Ministry of Finance',
    benefit: 'Credit up to ₹3 Lakh @ 4%',
    description: 'Provides farmers with timely credit for agricultural needs at subsidized interest rates of 4% per annum.',
    eligibility: 'Farmers, tenant farmers, oral lessees, sharecroppers, SHGs or Joint Liability Groups of farmers.',
    documents: 'Land ownership/lease documents, Identity proof, Address proof',
    icon: 'card-outline',
    color: '#f59e0b',
    tag: 'Credit',
  },
  {
    id: 4,
    name: 'Soil Health Card Scheme',
    ministry: 'Ministry of Agriculture',
    benefit: 'Free soil analysis',
    description: 'Provides farmers with Soil Health Cards indicating nutrient status of soil and recommended dosage of nutrients.',
    eligibility: 'All farmers across India are eligible to get Soil Health Cards.',
    documents: 'Aadhaar card, Land details',
    icon: 'color-filter-outline',
    color: '#8b5cf6',
    tag: 'Soil Health',
  },
  {
    id: 5,
    name: 'eNAM – National Agri Market',
    ministry: 'Ministry of Agriculture',
    benefit: 'Better price discovery',
    description: 'Pan-India electronic trading portal enabling farmers to sell produce online and get competitive prices.',
    eligibility: 'All registered farmers with produce to sell.',
    documents: 'Aadhaar, Bank account, Mobile number',
    icon: 'storefront-outline',
    color: '#ef4444',
    tag: 'Market Access',
  },
];

const tagColors = {
  'Income Support': { bg: '#dcfce7', text: '#166534' },
  'Insurance': { bg: '#dbeafe', text: '#1e40af' },
  'Credit': { bg: '#fef3c7', text: '#92400e' },
  'Soil Health': { bg: '#ede9fe', text: '#5b21b6' },
  'Market Access': { bg: '#fee2e2', text: '#991b1b' },
};

export default function Schemes() {
  const [selected, setSelected] = useState(null);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <LinearGradient colors={['#4c1d95', '#5b21b6', '#6d28d9']} style={styles.header}>
        <Text style={styles.headerTitle}>📋 Government Schemes</Text>
        <Text style={styles.headerSub}>Agricultural welfare programs for farmers</Text>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.scroll}>
        {SCHEMES.map(scheme => {
          const tc = tagColors[scheme.tag] || { bg: '#dcfce7', text: '#166534' };
          return (
            <TouchableOpacity key={scheme.id} style={[styles.card, SHADOW.small]} onPress={() => setSelected(scheme)}>
              <View style={[styles.iconWrap, { backgroundColor: scheme.color + '18' }]}>
                <Ionicons name={scheme.icon} size={24} color={scheme.color} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.nameRow}>
                  <Text style={styles.schemeName} numberOfLines={1}>{scheme.name}</Text>
                  <View style={[styles.tag, { backgroundColor: tc.bg }]}>
                    <Text style={[styles.tagText, { color: tc.text }]}>{scheme.tag}</Text>
                  </View>
                </View>
                <Text style={styles.ministry}>{scheme.ministry}</Text>
                <View style={styles.benefitRow}>
                  <Ionicons name="gift-outline" size={13} color={scheme.color} />
                  <Text style={[styles.benefit, { color: scheme.color }]}>{scheme.benefit}</Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textLight} />
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={!!selected} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            {selected && (
              <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.modalTop}>
                  <View style={[styles.iconWrap, { backgroundColor: selected.color + '18', width: 52, height: 52 }]}>
                    <Ionicons name={selected.icon} size={26} color={selected.color} />
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.modalTitle}>{selected.name}</Text>
                    <Text style={styles.modalMinistry}>{selected.ministry}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelected(null)}>
                    <Ionicons name="close-circle" size={28} color={COLORS.textLight} />
                  </TouchableOpacity>
                </View>

                <View style={[styles.benefitBanner, { backgroundColor: selected.color + '15', borderColor: selected.color + '30' }]}>
                  <Ionicons name="gift" size={18} color={selected.color} />
                  <Text style={[styles.benefitBannerText, { color: selected.color }]}>Benefit: {selected.benefit}</Text>
                </View>

                <DetailSection title="About the Scheme" text={selected.description} />
                <DetailSection title="Eligibility" text={selected.eligibility} />
                <DetailSection title="Required Documents" text={selected.documents} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function DetailSection({ title, text }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionText}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 24 },
  headerTitle: { color: '#fff', fontSize: 22, fontWeight: '800' },
  headerSub: { color: 'rgba(255,255,255,0.7)', fontSize: 13, marginTop: 2 },
  scroll: { padding: 16, paddingBottom: 32 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: RADIUS.lg,
    padding: 14, marginBottom: 10,
  },
  iconWrap: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 2, flexWrap: 'wrap' },
  schemeName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, flex: 1 },
  tag: { borderRadius: 99, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { fontSize: 10, fontWeight: '700' },
  ministry: { fontSize: 11, color: COLORS.textSecondary, marginBottom: 4 },
  benefitRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  benefit: { fontSize: 12, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '85%',
  },
  modalTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 16 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textPrimary },
  modalMinistry: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  benefitBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderRadius: RADIUS.md, borderWidth: 1,
    padding: 12, marginBottom: 16,
  },
  benefitBannerText: { fontWeight: '700', fontSize: 14 },
  section: { marginBottom: 16 },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: COLORS.primary, marginBottom: 6 },
  sectionText: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 20 },
});
