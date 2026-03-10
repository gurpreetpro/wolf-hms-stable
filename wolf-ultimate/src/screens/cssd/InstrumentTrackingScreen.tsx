import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Package, CheckCircle2, Clock } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';
import cssdService, { Instrument } from '../../services/cssdService';

const STATUS_COLORS: Record<string, { color: string; label: string }> = {
  STERILE: { color: '#10b981', label: '✅ Sterile' }, USED: { color: '#ef4444', label: '🔴 Used' },
  PROCESSING: { color: '#3b82f6', label: '🔄 Processing' }, ISSUED: { color: '#f59e0b', label: '📤 Issued' },
};
const CAT_COLORS: Record<string, string> = {
  SURGICAL: '#ef4444', DENTAL: '#3b82f6', ORTHO: '#8b5cf6', OPHTHAL: '#06b6d4', OBG: '#ec4899', GENERAL: '#10b981',
};

export const InstrumentTrackingScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('ALL');

  const load = async () => {
    try { setInstruments(await cssdService.getInstruments()); }
    catch (e) { console.error(e); } finally { setRefreshing(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = instruments.filter(i => filter === 'ALL' || i.status === filter);

  const handleIssue = (inst: Instrument) => {
    Alert.alert('Issue Instrument', `Issue ${inst.name} to ${inst.department}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Issue', onPress: () => setInstruments(prev => prev.map(i => i.id === inst.id ? { ...i, status: 'ISSUED' as const } : i)) },
    ]);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={22} color={COLORS.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Instruments</Text>
            <Text style={styles.headerSub}>{instruments.length} trays tracked</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{ paddingHorizontal: SPACING.m, gap: 8 }}>
          {['ALL', 'STERILE', 'PROCESSING', 'ISSUED', 'USED'].map(f => (
            <TouchableOpacity key={f} style={[styles.filterChip, filter === f && styles.filterActive]} onPress={() => setFilter(f)}>
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f === 'ALL' ? 'All' : (STATUS_COLORS[f]?.label || f)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}>
          {filtered.map(inst => {
            const st = STATUS_COLORS[inst.status];
            return (
              <GlassCard key={inst.id} style={styles.instCard}>
                <View style={styles.instTop}>
                  <Package size={16} color={CAT_COLORS[inst.category] || COLORS.primary} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.instName}>{inst.name}</Text>
                    <Text style={styles.instMeta}>{inst.tray_id} • {inst.department} • {inst.count} pcs</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: st.color + '20' }]}>
                    <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                  </View>
                </View>
                <View style={styles.detailRow}>
                  <View style={[styles.catBadge, { backgroundColor: (CAT_COLORS[inst.category] || '#3b82f6') + '15' }]}>
                    <Text style={[styles.catText, { color: CAT_COLORS[inst.category] || '#3b82f6' }]}>{inst.category}</Text>
                  </View>
                  {inst.last_sterilized && <Text style={styles.dateText}><CheckCircle2 size={10} color="#10b981" /> {inst.last_sterilized}</Text>}
                  {inst.expiry && <Text style={styles.dateText}><Clock size={10} color="#f59e0b" /> Exp: {inst.expiry}</Text>}
                </View>
                <Text style={styles.barcodeText}>Barcode: {inst.barcode}</Text>
                {inst.status === 'STERILE' && (
                  <TouchableOpacity style={styles.issueBtn} onPress={() => handleIssue(inst)}>
                    <Text style={styles.issueBtnText}>Issue to Dept →</Text>
                  </TouchableOpacity>
                )}
              </GlassCard>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const getStyles = (COLORS: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SPACING.m, paddingVertical: SPACING.s, marginTop: SPACING.m },
  backBtn: { padding: 10, backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border },
  headerTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 22 },
  headerSub: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  filterScroll: { marginBottom: 4, maxHeight: 42 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  filterActive: { backgroundColor: '#10b98120', borderColor: '#10b981' },
  filterText: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 12 },
  filterTextActive: { color: '#10b981' },
  instCard: { padding: SPACING.m, marginBottom: 10, borderWidth: 0 },
  instTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  instName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 14 },
  instMeta: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 10, marginTop: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontFamily: FONTS.bold, fontSize: 9 },
  detailRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 4 },
  catBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  catText: { fontFamily: FONTS.bold, fontSize: 9 },
  dateText: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 10 },
  barcodeText: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 10, marginBottom: 6 },
  issueBtn: { alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: COLORS.primary + '15', borderWidth: 1, borderColor: COLORS.primary + '30' },
  issueBtnText: { fontFamily: FONTS.bold, color: COLORS.primary, fontSize: 12 },
});
