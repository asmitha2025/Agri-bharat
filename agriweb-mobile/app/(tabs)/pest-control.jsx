import React, { useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  TextInput, Modal, ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { COLORS, RADIUS, SHADOW } from '../../constants/theme';

const PESTS = [
  {
    id: 1, name: 'Brown Plant Hopper', crop: 'Rice', severity: 'High',
    description: 'A destructive pest that causes "hopperburn" by sucking plant sap. Can devastate entire rice paddies.',
    symptoms: 'Yellowing and browning of rice plants, circular patches of dead plants.',
    control: 'Use resistant varieties. Apply neem-based pesticides. Avoid over-application of nitrogen.',
    icon: 'bug', color: '#ef4444',
  },
  {
    id: 2, name: 'Aphids', crop: 'Wheat / Vegetables', severity: 'Medium',
    description: 'Small, soft-bodied insects that cluster on new growth and undersides of leaves.',
    symptoms: 'Curling leaves, sticky honeydew residue, sooty mold on leaves.',
    control: 'Introduce natural predators (ladybugs). Use insecticidal soap or neem oil spray.',
    icon: 'ellipse', color: '#f59e0b',
  },
  {
    id: 3, name: 'Fall Armyworm', crop: 'Maize', severity: 'High',
    description: 'Invasive caterpillar that feeds on leaves, stems, and ears of maize.',
    symptoms: 'Ragged, windowpane-like feeding damage; frass (droppings) in whorls.',
    control: 'Apply Bt (Bacillus thuringiensis) biopesticide. Use pheromone traps for monitoring.',
    icon: 'leaf', color: '#ef4444',
  },
  {
    id: 4, name: 'Whitefly', crop: 'Cotton / Tomato', severity: 'Medium',
    description: 'Tiny white insects that feed on plant juices and transmit plant viruses.',
    symptoms: 'Yellowing leaves, clouds of white insects when plant is disturbed.',
    control: 'Use yellow sticky traps. Apply imidacloprid or neem oil. Remove infected leaves.',
    icon: 'cloud', color: '#f59e0b',
  },
  {
    id: 5, name: 'Red Spider Mite', crop: 'Many crops', severity: 'Low',
    description: 'Tiny mites that feed on plant cell contents, causing stippling on leaves.',
    symptoms: 'Bronze or silver stippling on leaves, fine webbing on undersides.',
    control: 'Increase humidity. Apply miticide or predatory mites. Avoid water stress on plants.',
    icon: 'radio-button-on', color: '#16a34a',
  },
];

const severityColor = { High: '#ef4444', Medium: '#f59e0b', Low: '#16a34a' };

export default function PestControl() {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState(null);

  const filtered = PESTS.filter(p =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.crop.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: COLORS.background }}>
      <LinearGradient colors={['#7f1d1d', '#991b1b', '#b91c1c']} style={styles.header}>
        <Text style={styles.headerTitle}>🐛 Pest Control</Text>
        <Text style={styles.headerSub}>Identify & manage crop pests</Text>
      </LinearGradient>

      <View style={styles.searchWrap}>
        <Ionicons name="search-outline" size={18} color={COLORS.textSecondary} style={{ paddingHorizontal: 10 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search pest or crop..."
          placeholderTextColor={COLORS.textLight}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scroll}>
        {filtered.map(pest => (
          <TouchableOpacity key={pest.id} style={[styles.card, SHADOW.small]} onPress={() => setSelected(pest)}>
            <View style={[styles.pestIcon, { backgroundColor: pest.color + '20' }]}>
              <Ionicons name={pest.icon} size={22} color={pest.color} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.pestName}>{pest.name}</Text>
              <Text style={styles.pestCrop}>Affects: {pest.crop}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: severityColor[pest.severity] + '20' }]}>
              <Text style={[styles.badgeText, { color: severityColor[pest.severity] }]}>{pest.severity}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={!!selected} animationType="slide" transparent onRequestClose={() => setSelected(null)}>
        <View style={styles.overlay}>
          <View style={styles.modal}>
            {selected && (
              <ScrollView>
                <View style={styles.modalHeader}>
                  <View style={[styles.pestIcon, { backgroundColor: selected.color + '20', marginRight: 12 }]}>
                    <Ionicons name={selected.icon} size={28} color={selected.color} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.modalTitle}>{selected.name}</Text>
                    <Text style={styles.modalCrop}>{selected.crop}</Text>
                  </View>
                  <TouchableOpacity onPress={() => setSelected(null)}>
                    <Ionicons name="close-circle" size={28} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>
                <InfoSection title="Description" text={selected.description} />
                <InfoSection title="Symptoms" text={selected.symptoms} />
                <InfoSection title="Control Measures" text={selected.control} />
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function InfoSection({ title, text }) {
  return (
    <View style={styles.infoSection}>
      <Text style={styles.infoTitle}>{title}</Text>
      <Text style={styles.infoText}>{text}</Text>
    </View>
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
  scroll: { paddingHorizontal: 16, paddingBottom: 32 },
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: RADIUS.lg,
    padding: 14, marginBottom: 10,
  },
  pestIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  pestName: { fontSize: 15, fontWeight: '700', color: COLORS.textPrimary },
  pestCrop: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  badge: { borderRadius: 99, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modal: {
    backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
    padding: 24, maxHeight: '85%',
  },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  modalTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textPrimary },
  modalCrop: { fontSize: 13, color: COLORS.textSecondary, marginTop: 2 },
  infoSection: { marginBottom: 16 },
  infoTitle: { fontSize: 14, fontWeight: '700', color: COLORS.primary, marginBottom: 6 },
  infoText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 21 },
});
