import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Search, Package, AlertTriangle } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';

interface DrugStockItem {
  id: number; name: string; generic_name: string; category: string;
  batch_no: string; expiry_date: string; stock_quantity: number; unit: string;
  reorder_level: number; mrp: number; location: string; is_controlled: boolean;
  schedule?: string; status: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'EXPIRED';
}

const MOCK_DRUGS: DrugStockItem[] = [
  { id: 1, name: 'Atorvastatin 20mg', generic_name: 'Atorvastatin', category: 'Cardiovascular', batch_no: 'B-2026-A101', expiry_date: '2027-06-30', stock_quantity: 450, unit: 'tabs', reorder_level: 100, mrp: 8.5, location: 'Rack A-3', is_controlled: false, status: 'IN_STOCK' },
  { id: 2, name: 'Metformin 500mg', generic_name: 'Metformin', category: 'Antidiabetic', batch_no: 'B-2026-D055', expiry_date: '2027-03-15', stock_quantity: 800, unit: 'tabs', reorder_level: 200, mrp: 4.2, location: 'Rack B-1', is_controlled: false, status: 'IN_STOCK' },
  { id: 3, name: 'Meropenem 1g', generic_name: 'Meropenem', category: 'Antibiotic', batch_no: 'B-2026-M032', expiry_date: '2026-09-20', stock_quantity: 35, unit: 'vials', reorder_level: 50, mrp: 480, location: 'Fridge R-2', is_controlled: false, status: 'LOW_STOCK' },
  { id: 4, name: 'Insulin Glargine 100IU', generic_name: 'Insulin Glargine', category: 'Antidiabetic', batch_no: 'B-2026-I018', expiry_date: '2026-08-10', stock_quantity: 12, unit: 'pens', reorder_level: 20, mrp: 650, location: 'Fridge R-1', is_controlled: false, status: 'LOW_STOCK' },
  { id: 5, name: 'Morphine 10mg/mL', generic_name: 'Morphine Sulfate', category: 'Opioid Analgesic', batch_no: 'B-2026-N005', expiry_date: '2026-12-31', stock_quantity: 8, unit: 'amps', reorder_level: 10, mrp: 45, location: 'Narcotics Safe', is_controlled: true, schedule: 'Schedule H1', status: 'LOW_STOCK' },
  { id: 6, name: 'Aspirin 75mg', generic_name: 'Aspirin', category: 'Antiplatelet', batch_no: 'B-2026-A200', expiry_date: '2027-12-31', stock_quantity: 1200, unit: 'tabs', reorder_level: 300, mrp: 2.5, location: 'Rack A-1', is_controlled: false, status: 'IN_STOCK' },
  { id: 7, name: 'Ondansetron 4mg', generic_name: 'Ondansetron', category: 'Antiemetic', batch_no: 'B-2025-O040', expiry_date: '2026-03-08', stock_quantity: 25, unit: 'amps', reorder_level: 30, mrp: 18, location: 'Rack C-2', is_controlled: false, status: 'EXPIRED' },
  { id: 8, name: 'Noradrenaline 4mg/4mL', generic_name: 'Norepinephrine', category: 'Vasopressor', batch_no: 'B-2026-V012', expiry_date: '2026-11-15', stock_quantity: 0, unit: 'amps', reorder_level: 15, mrp: 120, location: 'Emergency Store', is_controlled: false, status: 'OUT_OF_STOCK' },
  { id: 9, name: 'Midazolam 5mg/mL', generic_name: 'Midazolam', category: 'Benzodiazepine', batch_no: 'B-2026-N009', expiry_date: '2027-01-20', stock_quantity: 15, unit: 'amps', reorder_level: 10, mrp: 35, location: 'Narcotics Safe', is_controlled: true, schedule: 'Schedule H', status: 'IN_STOCK' },
  { id: 10, name: 'Folic Acid 5mg', generic_name: 'Folic Acid', category: 'Vitamin', batch_no: 'B-2026-V050', expiry_date: '2028-01-31', stock_quantity: 2000, unit: 'tabs', reorder_level: 500, mrp: 1.5, location: 'Rack D-4', is_controlled: false, status: 'IN_STOCK' },
];

const STATUS_CFG: Record<string, { color: string; label: string }> = {
  IN_STOCK: { color: '#10b981', label: 'In Stock' },
  LOW_STOCK: { color: '#f59e0b', label: 'Low Stock' },
  OUT_OF_STOCK: { color: '#ef4444', label: 'Out of Stock' },
  EXPIRED: { color: '#64748b', label: 'Expired' },
};

export const DrugInventoryScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);
  const [drugs] = useState<DrugStockItem[]>(MOCK_DRUGS);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'EXPIRED'>('ALL');

  const filtered = drugs
    .filter(d => filter === 'ALL' || d.status === filter)
    .filter(d => !search.trim() || d.name.toLowerCase().includes(search.toLowerCase()) || d.generic_name.toLowerCase().includes(search.toLowerCase()) || d.category.toLowerCase().includes(search.toLowerCase()));

  const counts = { all: drugs.length, in: drugs.filter(d => d.status === 'IN_STOCK').length, low: drugs.filter(d => d.status === 'LOW_STOCK').length, oos: drugs.filter(d => d.status === 'OUT_OF_STOCK').length, exp: drugs.filter(d => d.status === 'EXPIRED').length };

  const getDaysToExpiry = (d: string) => Math.round((new Date(d).getTime() - Date.now()) / 86400000);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={22} color={COLORS.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Drug Inventory</Text>
            <Text style={styles.headerSub}>{counts.all} items • {counts.oos} out of stock</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}>
          {/* Summary */}
          <View style={styles.summaryRow}>
            {[{ label: 'OK', count: counts.in, color: '#10b981', f: 'IN_STOCK' as const }, { label: 'Low', count: counts.low, color: '#f59e0b', f: 'LOW_STOCK' as const }, { label: 'OOS', count: counts.oos, color: '#ef4444', f: 'OUT_OF_STOCK' as const }, { label: 'Exp', count: counts.exp, color: '#64748b', f: 'EXPIRED' as const }].map(s => (
              <TouchableOpacity key={s.f} style={styles.summaryCard} onPress={() => setFilter(filter === s.f ? 'ALL' : s.f)}>
                <Text style={[styles.summaryValue, { color: s.color }]}>{s.count}</Text>
                <Text style={styles.summaryLabel}>{s.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Search */}
          <View style={styles.searchBox}>
            <Search size={18} color={COLORS.textSecondary} />
            <TextInput style={styles.searchInput} placeholder="Search drug, generic, category..." placeholderTextColor={COLORS.textMuted} value={search} onChangeText={setSearch} />
          </View>

          {/* Drug Cards */}
          {filtered.map(drug => {
            const cfg = STATUS_CFG[drug.status];
            const daysExp = getDaysToExpiry(drug.expiry_date);
            const stockPct = Math.min(100, (drug.stock_quantity / (drug.reorder_level * 3)) * 100);
            return (
              <GlassCard key={drug.id} style={styles.drugCard}>
                <View style={styles.drugTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.drugName}>{drug.name}</Text>
                    <Text style={styles.drugGeneric}>{drug.generic_name} • {drug.category}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: cfg.color + '20' }]}>
                    <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                </View>
                <View style={styles.stockBarRow}>
                  <View style={styles.stockBarBg}>
                    <View style={[styles.stockBarFill, { width: `${stockPct}%` as any, backgroundColor: cfg.color }]} />
                  </View>
                  <Text style={styles.stockQty}>{drug.stock_quantity} {drug.unit}</Text>
                </View>
                <View style={styles.detailGrid}>
                  <View style={styles.detailItem}><Text style={styles.dLabel}>Batch</Text><Text style={styles.dValue}>{drug.batch_no}</Text></View>
                  <View style={styles.detailItem}><Text style={styles.dLabel}>MRP</Text><Text style={styles.dValue}>₹{drug.mrp}</Text></View>
                  <View style={styles.detailItem}><Text style={styles.dLabel}>Location</Text><Text style={styles.dValue}>{drug.location}</Text></View>
                  <View style={styles.detailItem}>
                    <Text style={styles.dLabel}>Expiry</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3 }}>
                      {daysExp <= 30 && <AlertTriangle size={11} color={daysExp <= 0 ? '#ef4444' : '#f59e0b'} />}
                      <Text style={[styles.dValue, daysExp <= 0 ? { color: '#ef4444' } : daysExp <= 30 ? { color: '#f59e0b' } : {}]}>{daysExp <= 0 ? 'EXPIRED' : `${daysExp}d`}</Text>
                    </View>
                  </View>
                </View>
                {drug.is_controlled && (
                  <View style={styles.controlledBar}><Package size={12} color="#ef4444" /><Text style={styles.controlledText}>{drug.schedule || 'Controlled'} — Narcotics Register</Text></View>
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
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: SPACING.m },
  summaryCard: { flex: 1, alignItems: 'center', paddingVertical: 12, backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border },
  summaryValue: { fontFamily: FONTS.bold, fontSize: 24 },
  summaryLabel: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  searchBox: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: COLORS.surface, borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.m },
  searchInput: { flex: 1, fontFamily: FONTS.regular, color: COLORS.text, fontSize: 14 },
  drugCard: { padding: SPACING.m, marginBottom: 12, borderWidth: 0 },
  drugTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  drugName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 15 },
  drugGeneric: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 0.5 },
  stockBarRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  stockBarBg: { flex: 1, height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
  stockBarFill: { height: 6, borderRadius: 3 },
  stockQty: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 13, minWidth: 70, textAlign: 'right' },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  detailItem: { width: '47%' as any, marginBottom: 4 },
  dLabel: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 10, textTransform: 'uppercase' as any, letterSpacing: 0.5 },
  dValue: { fontFamily: FONTS.medium, color: COLORS.text, fontSize: 13, marginTop: 1 },
  controlledBar: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ef444410', padding: 8, borderRadius: 8, marginTop: 8 },
  controlledText: { fontFamily: FONTS.medium, color: '#ef4444', fontSize: 11 },
});
