import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Search, Clock, AlertTriangle, ChevronRight,
  Pill, ShieldAlert, Package,
} from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';
import pharmacyService, { PrescriptionItem } from '../../services/pharmacyService';

const PRIORITY_COLORS: Record<string, string> = { STAT: '#ef4444', URGENT: '#f59e0b', ROUTINE: '#64748b' };
const STATUS_COLORS: Record<string, string> = { PENDING: '#f59e0b', PROCESSING: '#3b82f6', DISPENSED: '#10b981', PARTIAL: '#8b5cf6', CANCELLED: '#64748b' };

export const PrescriptionQueueScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);

  const [prescriptions, setPrescriptions] = useState<PrescriptionItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('PENDING');

  const load = async () => {
    try {
      const data = await pharmacyService.getPrescriptionQueue();
      setPrescriptions(data);
    } catch (error) {
      console.error('Failed to load prescriptions:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = prescriptions
    .filter(p => selectedStatus === 'ALL' || p.status === selectedStatus)
    .filter(p => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return p.patient_name.toLowerCase().includes(q) || p.prescription_id.toLowerCase().includes(q) || p.prescribing_doctor.toLowerCase().includes(q);
    })
    .sort((a, b) => {
      const pOrder = { STAT: 0, URGENT: 1, ROUTINE: 2 };
      return (pOrder[a.priority] ?? 2) - (pOrder[b.priority] ?? 2);
    });

  const hasControlled = (rx: PrescriptionItem) => rx.items.some(i => i.is_controlled);
  const hasOutOfStock = (rx: PrescriptionItem) => rx.items.some(i => !i.stock_available);
  const hasInteraction = (rx: PrescriptionItem) => rx.items.some(i => Boolean(i.interaction_warning));

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Prescription Queue</Text>
          <Text style={styles.headerCount}>{filtered.length} orders</Text>
        </View>

        {/* Search */}
        <View style={styles.searchRow}>
          <View style={styles.searchBox}>
            <Search size={18} color={COLORS.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search patient, Rx ID, doctor..."
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
        </View>

        {/* Status Filter */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{ paddingHorizontal: SPACING.m, gap: 8 }}>
          {['PENDING', 'PROCESSING', 'ALL', 'DISPENSED'].map(st => (
            <TouchableOpacity
              key={st}
              style={[styles.filterChip, selectedStatus === st && styles.filterChipActive]}
              onPress={() => setSelectedStatus(st)}
            >
              {st !== 'ALL' && <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[st] || '#64748b' }]} />}
              <Text style={[styles.filterChipText, selectedStatus === st && styles.filterChipTextActive]}>
                {st === 'ALL' ? 'All' : st.charAt(0) + st.slice(1).toLowerCase()}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Queue */}
        <ScrollView
          contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
        >
          {filtered.map(rx => (
            <TouchableOpacity key={rx.id} onPress={() => navigation.navigate('Dispensing', { prescriptionId: rx.prescription_id })}>
              <GlassCard style={[styles.rxCard, hasInteraction(rx) && styles.interactionBorder]}>
                <View style={styles.rxTop}>
                  <View style={[styles.priorityBadge, { backgroundColor: PRIORITY_COLORS[rx.priority] + '20' }]}>
                    <Text style={[styles.priorityText, { color: PRIORITY_COLORS[rx.priority] }]}>{rx.priority}</Text>
                  </View>
                  <View style={styles.rxFlags}>
                    {hasControlled(rx) && (
                      <View style={styles.flagIcon}><ShieldAlert size={14} color="#ef4444" /></View>
                    )}
                    {hasOutOfStock(rx) && (
                      <View style={styles.flagIcon}><Package size={14} color="#f59e0b" /></View>
                    )}
                    {hasInteraction(rx) && (
                      <View style={styles.flagIcon}><AlertTriangle size={14} color="#8b5cf6" /></View>
                    )}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: STATUS_COLORS[rx.status] + '20' }]}>
                    <Text style={[styles.statusText, { color: STATUS_COLORS[rx.status] }]}>{rx.status}</Text>
                  </View>
                </View>

                <Text style={styles.rxPatient}>{rx.patient_name}</Text>
                <Text style={styles.rxMeta}>{rx.patient_uhid} • {rx.age}/{rx.gender} • {rx.prescribing_doctor}</Text>

                <View style={styles.rxSource}>
                  <Text style={styles.sourceText}>
                    {rx.source}{rx.ward_name ? ` • ${rx.ward_name}` : ''}{rx.bed_no ? ` • Bed ${rx.bed_no}` : ''}
                  </Text>
                  <Text style={styles.rxId}>{rx.prescription_id}</Text>
                </View>

                {/* Drug summary */}
                <View style={styles.drugSummary}>
                  {rx.items.slice(0, 3).map((item, idx) => (
                    <View key={idx} style={styles.drugRow}>
                      <Pill size={12} color={item.is_controlled ? '#ef4444' : COLORS.textMuted} />
                      <Text style={[styles.drugName, !item.stock_available && { color: '#f59e0b' }]} numberOfLines={1}>
                        {item.drug_name}
                      </Text>
                      <Text style={styles.drugQty}>×{item.quantity}</Text>
                    </View>
                  ))}
                  {rx.items.length > 3 && (
                    <Text style={styles.moreItems}>+{rx.items.length - 3} more items</Text>
                  )}
                </View>

                {rx.notes && (
                  <View style={styles.noteBar}>
                    <Text style={styles.noteText} numberOfLines={1}>📝 {rx.notes}</Text>
                  </View>
                )}
              </GlassCard>
            </TouchableOpacity>
          ))}

          {filtered.length === 0 && (
            <View style={styles.emptyState}>
              <Pill size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No prescriptions</Text>
              <Text style={styles.emptySubtext}>Queue is clear for this filter</Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const getStyles = (COLORS: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    paddingHorizontal: SPACING.m, paddingVertical: SPACING.s, marginTop: SPACING.m,
  },
  headerTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 28 },
  headerCount: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 14, marginBottom: 4 },
  searchRow: { paddingHorizontal: SPACING.m, marginBottom: SPACING.s },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.surface, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.border },
  searchInput: { flex: 1, fontFamily: FONTS.regular, color: COLORS.text, fontSize: 14 },
  filterScroll: { marginBottom: 8, maxHeight: 42 },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  filterChipActive: { backgroundColor: COLORS.primary + '20', borderColor: COLORS.primary },
  filterChipText: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 12 },
  filterChipTextActive: { color: COLORS.primary },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  // Rx Card
  rxCard: { padding: SPACING.m, marginBottom: 12, borderWidth: 0 },
  interactionBorder: { borderWidth: 1, borderColor: '#8b5cf640' },
  rxTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 8, gap: 6 },
  priorityBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  priorityText: { fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 1 },
  rxFlags: { flexDirection: 'row', gap: 4, flex: 1 },
  flagIcon: { padding: 4, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 6 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  statusText: { fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 0.5 },
  rxPatient: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16, marginBottom: 2 },
  rxMeta: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 12, marginBottom: 6 },
  rxSource: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  sourceText: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 11 },
  rxId: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 11 },
  // Drug Summary
  drugSummary: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 8, gap: 4, marginBottom: 6 },
  drugRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  drugName: { flex: 1, fontFamily: FONTS.medium, color: COLORS.text, fontSize: 12 },
  drugQty: { fontFamily: FONTS.bold, color: COLORS.textSecondary, fontSize: 11 },
  moreItems: { fontFamily: FONTS.medium, color: COLORS.primary, fontSize: 11, marginTop: 2 },
  noteBar: { backgroundColor: '#f59e0b10', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  noteText: { fontFamily: FONTS.regular, color: '#f59e0b', fontSize: 11 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 18, marginTop: 16 },
  emptySubtext: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 13, marginTop: 4 },
});
