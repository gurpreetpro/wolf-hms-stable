import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, Package, AlertTriangle, Search,
  Clock, ChevronRight, Plus, TrendingDown,
} from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';

interface ReagentItem {
  id: number;
  name: string;
  catalog_no: string;
  analyzer: string;
  department: string;
  current_stock: number;
  unit: string;
  reorder_level: number;
  lot_number: string;
  expiry_date: string;
  status: 'OK' | 'LOW' | 'CRITICAL' | 'EXPIRED';
  last_received?: string;
  tests_remaining?: number;
}

const MOCK_REAGENTS: ReagentItem[] = [
  { id: 1, name: 'CBC Reagent Pack', catalog_no: 'SYS-CBC-500', analyzer: 'Sysmex XN-1000', department: 'Hematology', current_stock: 320, unit: 'tests', reorder_level: 100, lot_number: 'LOT-2026-A142', expiry_date: '2026-09-15', status: 'OK', last_received: '2026-02-28', tests_remaining: 320 },
  { id: 2, name: 'Glucose Reagent', catalog_no: 'VIT-GLU-1000', analyzer: 'Vitros 5600', department: 'Biochemistry', current_stock: 85, unit: 'mL', reorder_level: 200, lot_number: 'LOT-2026-B089', expiry_date: '2026-06-30', status: 'LOW', last_received: '2026-02-20', tests_remaining: 170 },
  { id: 3, name: 'Creatinine Reagent', catalog_no: 'VIT-CRE-500', analyzer: 'Vitros 5600', department: 'Biochemistry', current_stock: 35, unit: 'mL', reorder_level: 100, lot_number: 'LOT-2026-B112', expiry_date: '2026-05-10', status: 'CRITICAL', last_received: '2026-02-15', tests_remaining: 70 },
  { id: 4, name: 'TSH Reagent Kit', catalog_no: 'COB-TSH-100', analyzer: 'Cobas e601', department: 'Immunoassay', current_stock: 48, unit: 'tests', reorder_level: 25, lot_number: 'LOT-2026-C045', expiry_date: '2026-08-20', status: 'OK', last_received: '2026-03-01', tests_remaining: 48 },
  { id: 5, name: 'PT Reagent', catalog_no: 'STA-PT-200', analyzer: 'Stago STA-R', department: 'Coagulation', current_stock: 12, unit: 'mL', reorder_level: 50, lot_number: 'LOT-2025-D078', expiry_date: '2026-03-10', status: 'CRITICAL', last_received: '2026-01-20', tests_remaining: 24 },
  { id: 6, name: 'Blood Culture Media', catalog_no: 'BIO-BCM-50', analyzer: 'BacT/ALERT 3D', department: 'Microbiology', current_stock: 30, unit: 'bottles', reorder_level: 20, lot_number: 'LOT-2026-M033', expiry_date: '2026-07-31', status: 'OK', last_received: '2026-02-25', tests_remaining: 30 },
  { id: 7, name: 'HbA1c Reagent', catalog_no: 'BIO-HBA-200', analyzer: 'Bio-Rad D-100', department: 'Specialized', current_stock: 0, unit: 'tests', reorder_level: 50, lot_number: 'LOT-2025-S019', expiry_date: '2025-12-31', status: 'EXPIRED', last_received: '2025-10-15', tests_remaining: 0 },
  { id: 8, name: 'Electrolyte Solution', catalog_no: 'VIT-ELY-500', analyzer: 'Vitros 5600', department: 'Biochemistry', current_stock: 180, unit: 'mL', reorder_level: 100, lot_number: 'LOT-2026-B150', expiry_date: '2026-11-20', status: 'OK', last_received: '2026-03-02', tests_remaining: 360 },
];

const STATUS_CONFIG: Record<string, { color: string; label: string }> = {
  OK: { color: '#10b981', label: 'In Stock' },
  LOW: { color: '#f59e0b', label: 'Low Stock' },
  CRITICAL: { color: '#ef4444', label: 'Critical' },
  EXPIRED: { color: '#64748b', label: 'Expired' },
};

export const ReagentStockScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);

  const [reagents] = useState<ReagentItem[]>(MOCK_REAGENTS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'ALL' | 'OK' | 'LOW' | 'CRITICAL' | 'EXPIRED'>('ALL');

  const filtered = reagents
    .filter(r => filter === 'ALL' || r.status === filter)
    .filter(r => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return r.name.toLowerCase().includes(q) || r.catalog_no.toLowerCase().includes(q) || r.analyzer.toLowerCase().includes(q);
    });

  const okCount = reagents.filter(r => r.status === 'OK').length;
  const lowCount = reagents.filter(r => r.status === 'LOW').length;
  const criticalCount = reagents.filter(r => r.status === 'CRITICAL').length;
  const expiredCount = reagents.filter(r => r.status === 'EXPIRED').length;

  const getDaysUntilExpiry = (date: string) => {
    const diff = new Date(date).getTime() - Date.now();
    return Math.round(diff / 86400000);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={22} color={COLORS.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Reagent Stock</Text>
            <Text style={styles.headerSub}>Inventory & Lot Tracking</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}>
          {/* Summary Strip */}
          <View style={styles.summaryRow}>
            <TouchableOpacity style={styles.summaryCard} onPress={() => setFilter('OK')}>
              <Text style={[styles.summaryValue, { color: '#10b981' }]}>{okCount}</Text>
              <Text style={styles.summaryLabel}>OK</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.summaryCard} onPress={() => setFilter('LOW')}>
              <Text style={[styles.summaryValue, { color: '#f59e0b' }]}>{lowCount}</Text>
              <Text style={styles.summaryLabel}>Low</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.summaryCard} onPress={() => setFilter('CRITICAL')}>
              <Text style={[styles.summaryValue, { color: '#ef4444' }]}>{criticalCount}</Text>
              <Text style={styles.summaryLabel}>Critical</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.summaryCard} onPress={() => setFilter('EXPIRED')}>
              <Text style={[styles.summaryValue, { color: '#64748b' }]}>{expiredCount}</Text>
              <Text style={styles.summaryLabel}>Expired</Text>
            </TouchableOpacity>
          </View>

          {/* Search */}
          <View style={styles.searchBox}>
            <Search size={18} color={COLORS.textSecondary} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search reagent, catalog #, analyzer..."
              placeholderTextColor={COLORS.textMuted}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          {/* Filter */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{ gap: 8 }}>
            {(['ALL', 'CRITICAL', 'LOW', 'OK', 'EXPIRED'] as const).map(f => (
              <TouchableOpacity
                key={f}
                style={[styles.filterChip, filter === f && styles.filterChipActive]}
                onPress={() => setFilter(f)}
              >
                <Text style={[styles.filterChipText, filter === f && styles.filterChipTextActive]}>
                  {f === 'ALL' ? 'All Items' : STATUS_CONFIG[f]?.label || f}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Reagent Cards */}
          {filtered.map(reagent => {
            const cfg = STATUS_CONFIG[reagent.status];
            const daysToExpiry = getDaysUntilExpiry(reagent.expiry_date);
            const expiryWarning = daysToExpiry <= 30 && daysToExpiry > 0;
            const stockPercent = Math.min(100, (reagent.current_stock / (reagent.reorder_level * 3)) * 100);

            return (
              <GlassCard key={reagent.id} style={styles.reagentCard}>
                <View style={styles.reagentTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reagentName}>{reagent.name}</Text>
                    <Text style={styles.reagentCatalog}>{reagent.catalog_no} • {reagent.analyzer}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: cfg.color + '20' }]}>
                    <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                  </View>
                </View>

                {/* Stock Bar */}
                <View style={styles.stockBarContainer}>
                  <View style={styles.stockBarBg}>
                    <View style={[styles.stockBarFill, {
                      width: `${stockPercent}%` as any,
                      backgroundColor: reagent.status === 'CRITICAL' ? '#ef4444' : reagent.status === 'LOW' ? '#f59e0b' : '#10b981',
                    }]} />
                  </View>
                  <Text style={styles.stockText}>{reagent.current_stock} {reagent.unit}</Text>
                </View>

                {/* Details Grid */}
                <View style={styles.detailGrid}>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Lot #</Text>
                    <Text style={styles.detailValue}>{reagent.lot_number}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Reorder Level</Text>
                    <Text style={styles.detailValue}>{reagent.reorder_level} {reagent.unit}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Tests Left</Text>
                    <Text style={[styles.detailValue, (reagent.tests_remaining ?? 0) < 50 && { color: '#ef4444' }]}>
                      ~{reagent.tests_remaining ?? 0}
                    </Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Expiry</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      {(expiryWarning || daysToExpiry <= 0) && <AlertTriangle size={12} color={daysToExpiry <= 0 ? '#ef4444' : '#f59e0b'} />}
                      <Text style={[styles.detailValue, daysToExpiry <= 0 ? { color: '#ef4444' } : expiryWarning ? { color: '#f59e0b' } : {}]}>
                        {daysToExpiry <= 0 ? 'EXPIRED' : `${daysToExpiry}d left`}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Department */}
                <View style={styles.reagentFooter}>
                  <Text style={styles.deptChip}>{reagent.department}</Text>
                  {reagent.last_received && (
                    <Text style={styles.receivedText}>
                      Received: {new Date(reagent.last_received).toLocaleDateString()}
                    </Text>
                  )}
                </View>
              </GlassCard>
            );
          })}

          {filtered.length === 0 && (
            <View style={styles.emptyState}>
              <Package size={48} color={COLORS.textMuted} />
              <Text style={styles.emptyText}>No reagents found</Text>
              <Text style={styles.emptySubtext}>Adjust filters or search</Text>
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
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: SPACING.m, paddingVertical: SPACING.s, marginTop: SPACING.m,
  },
  backBtn: {
    padding: 10, backgroundColor: COLORS.surface, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  headerTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 22 },
  headerSub: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  // Summary
  summaryRow: { flexDirection: 'row', gap: 8, marginBottom: SPACING.m },
  summaryCard: {
    flex: 1, alignItems: 'center', paddingVertical: 12,
    backgroundColor: COLORS.surface, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  summaryValue: { fontFamily: FONTS.bold, fontSize: 24 },
  summaryLabel: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  // Search
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: COLORS.surface, borderRadius: 16,
    paddingHorizontal: 14, paddingVertical: 10,
    borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.s,
  },
  searchInput: { flex: 1, fontFamily: FONTS.regular, color: COLORS.text, fontSize: 14 },
  // Filter
  filterScroll: { marginBottom: SPACING.m, maxHeight: 42 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  filterChipActive: { backgroundColor: COLORS.primary + '20', borderColor: COLORS.primary },
  filterChipText: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 12 },
  filterChipTextActive: { color: COLORS.primary },
  // Reagent Card
  reagentCard: { padding: SPACING.m, marginBottom: 12, borderWidth: 0 },
  reagentTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  reagentName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 15 },
  reagentCatalog: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  statusText: { fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 0.5 },
  // Stock Bar
  stockBarContainer: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  stockBarBg: { flex: 1, height: 6, backgroundColor: COLORS.border, borderRadius: 3, overflow: 'hidden' },
  stockBarFill: { height: 6, borderRadius: 3 },
  stockText: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 13, minWidth: 60, textAlign: 'right' },
  // Details
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10 },
  detailItem: { width: '47%' as any },
  detailLabel: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 10,  textTransform: 'uppercase' as any, letterSpacing: 0.5 },
  detailValue: { fontFamily: FONTS.medium, color: COLORS.text, fontSize: 13, marginTop: 1 },
  // Footer
  reagentFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  deptChip: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 11, backgroundColor: COLORS.surface, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  receivedText: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 11 },
  // Empty
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 18, marginTop: 16 },
  emptySubtext: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 13, marginTop: 4 },
});
