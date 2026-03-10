import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Shield, Clock, AlertTriangle } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';

const AMC_DATA = [
  { id: 1, vendor: 'Hamilton India', equipment: 'Ventilators (3 units)', contract: 'AMC-2024-HM-001', start: '2024-06-15', end: '2027-06-15', value: '₹8,50,000/yr', coverage: 'Comprehensive (Parts + Labor)', status: 'ACTIVE', visits_done: 3, visits_planned: 4, response_sla: '4 hours' },
  { id: 2, vendor: 'Siemens Healthineers', equipment: 'CT Scanner (1 unit)', contract: 'AMC-2023-SI-002', start: '2025-01-10', end: '2026-01-10', value: '₹22,00,000/yr', coverage: 'Comprehensive (excl X-ray tube)', status: 'EXPIRING_SOON', visits_done: 4, visits_planned: 4, response_sla: '8 hours' },
  { id: 3, vendor: 'Tuttnauer India', equipment: 'Autoclaves (2 units)', contract: 'AMC-2024-TT-003', start: '2024-04-01', end: '2027-04-01', value: '₹2,40,000/yr', coverage: 'Non-comprehensive (Labor only)', status: 'ACTIVE', visits_done: 2, visits_planned: 4, response_sla: '24 hours' },
  { id: 4, vendor: 'Mindray India', equipment: 'Patient Monitors (8 units)', contract: 'AMC-2025-MR-004', start: '2025-07-15', end: '2028-07-15', value: '₹4,80,000/yr', coverage: 'Comprehensive (Parts + Labor)', status: 'ACTIVE', visits_done: 1, visits_planned: 2, response_sla: '12 hours' },
];

const STATUS_COLORS: Record<string, { color: string; label: string }> = {
  ACTIVE: { color: '#10b981', label: '✅ Active' },
  EXPIRING_SOON: { color: '#f59e0b', label: '⚠️ Expiring Soon' },
  EXPIRED: { color: '#ef4444', label: '❌ Expired' },
};

export const AMCDashboardScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);
  const totalValue = '₹37.7L/yr';

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={22} color={COLORS.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>AMC Dashboard</Text>
            <Text style={styles.headerSub}>{AMC_DATA.length} active contracts • {totalValue}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}>
          {/* Summary */}
          <View style={styles.summaryRow}>
            <GlassCard style={styles.summaryCard}>
              <Shield size={18} color="#10b981" />
              <Text style={[styles.sumValue, { color: '#10b981' }]}>{AMC_DATA.filter(a => a.status === 'ACTIVE').length}</Text>
              <Text style={styles.sumLabel}>Active</Text>
            </GlassCard>
            <GlassCard style={styles.summaryCard}>
              <AlertTriangle size={18} color="#f59e0b" />
              <Text style={[styles.sumValue, { color: '#f59e0b' }]}>{AMC_DATA.filter(a => a.status === 'EXPIRING_SOON').length}</Text>
              <Text style={styles.sumLabel}>Expiring</Text>
            </GlassCard>
            <GlassCard style={styles.summaryCard}>
              <Clock size={18} color="#3b82f6" />
              <Text style={[styles.sumValue, { color: '#3b82f6' }]}>{totalValue}</Text>
              <Text style={styles.sumLabel}>Annual</Text>
            </GlassCard>
          </View>

          {AMC_DATA.map(amc => {
            const st = STATUS_COLORS[amc.status];
            const visitPct = amc.visits_planned > 0 ? Math.round((amc.visits_done / amc.visits_planned) * 100) : 0;
            return (
              <GlassCard key={amc.id} style={[styles.amcCard, amc.status === 'EXPIRING_SOON' && { borderColor: '#f59e0b40', borderWidth: 1 }]}>
                <View style={styles.amcTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.amcVendor}>{amc.vendor}</Text>
                    <Text style={styles.amcEquip}>{amc.equipment}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: st.color + '20' }]}>
                    <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                  </View>
                </View>
                <View style={styles.metaGrid}>
                  <View style={styles.metaItem}><Text style={styles.metaLabel}>Contract</Text><Text style={styles.metaValue}>{amc.contract}</Text></View>
                  <View style={styles.metaItem}><Text style={styles.metaLabel}>Period</Text><Text style={styles.metaValue}>{amc.start} → {amc.end}</Text></View>
                  <View style={styles.metaItem}><Text style={styles.metaLabel}>Value</Text><Text style={[styles.metaValue, { color: '#10b981' }]}>{amc.value}</Text></View>
                  <View style={styles.metaItem}><Text style={styles.metaLabel}>Coverage</Text><Text style={styles.metaValue}>{amc.coverage}</Text></View>
                  <View style={styles.metaItem}><Text style={styles.metaLabel}>SLA</Text><Text style={styles.metaValue}>{amc.response_sla}</Text></View>
                </View>
                <Text style={styles.visitLabel}>PM Visits: {amc.visits_done}/{amc.visits_planned}</Text>
                <View style={styles.barTrack}><View style={[styles.barFill, { width: `${visitPct}%` as any }]} /></View>
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
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: SPACING.l },
  summaryCard: { flex: 1, padding: 14, alignItems: 'center', borderWidth: 0, gap: 6 },
  sumValue: { fontFamily: FONTS.bold, fontSize: 18 },
  sumLabel: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 10 },
  amcCard: { padding: SPACING.m, marginBottom: 12, borderWidth: 0 },
  amcTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 10 },
  amcVendor: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 15 },
  amcEquip: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 11, marginTop: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontFamily: FONTS.bold, fontSize: 10 },
  metaGrid: { gap: 4, marginBottom: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  metaLabel: { fontFamily: FONTS.bold, color: COLORS.textSecondary, fontSize: 10, width: 60, textTransform: 'uppercase' as any },
  metaValue: { fontFamily: FONTS.regular, color: COLORS.text, fontSize: 12, flex: 1 },
  visitLabel: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 11, marginBottom: 4 },
  barTrack: { height: 6, backgroundColor: COLORS.surface, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%' as any, backgroundColor: COLORS.primary, borderRadius: 3 },
});
