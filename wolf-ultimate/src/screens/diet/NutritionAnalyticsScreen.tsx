import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { TouchableOpacity } from 'react-native';
import { ArrowLeft, TrendingUp } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';

const WARD_DATA = [
  { ward: 'Ortho-A', patients: 6, meals: 18, delivered: 16, compliance: 89 },
  { ward: 'Gen-B', patients: 4, meals: 12, delivered: 12, compliance: 100 },
  { ward: 'Neuro-ICU', patients: 3, meals: 9, delivered: 8, compliance: 78 },
  { ward: 'Card-B', patients: 5, meals: 15, delivered: 14, compliance: 93 },
  { ward: 'Med-A', patients: 4, meals: 12, delivered: 10, compliance: 83 },
  { ward: 'Surg-A', patients: 2, meals: 6, delivered: 6, compliance: 100 },
];

const DIET_DIST = [
  { type: 'Regular', count: 8, color: '#3b82f6' },
  { type: 'Diabetic', count: 4, color: '#f59e0b' },
  { type: 'Cardiac', count: 3, color: '#ef4444' },
  { type: 'Renal', count: 2, color: '#8b5cf6' },
  { type: 'High Protein', count: 3, color: '#ec4899' },
  { type: 'Soft/Liquid', count: 3, color: '#10b981' },
  { type: 'NBM', count: 1, color: '#64748b' },
];

export const NutritionAnalyticsScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);
  const totalPatients = WARD_DATA.reduce((s, w) => s + w.patients, 0);
  const totalMeals = WARD_DATA.reduce((s, w) => s + w.meals, 0);
  const totalDelivered = WARD_DATA.reduce((s, w) => s + w.delivered, 0);
  const avgCompliance = Math.round(WARD_DATA.reduce((s, w) => s + w.compliance, 0) / WARD_DATA.length);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={22} color={COLORS.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Nutrition Analytics</Text>
            <Text style={styles.headerSub}>Today's overview</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}>
          {/* Summary Cards */}
          <View style={styles.summaryRow}>
            <GlassCard style={styles.summaryCard}>
              <Text style={[styles.sumValue, { color: '#3b82f6' }]}>{totalPatients}</Text><Text style={styles.sumLabel}>Patients</Text>
            </GlassCard>
            <GlassCard style={styles.summaryCard}>
              <Text style={[styles.sumValue, { color: '#10b981' }]}>{totalDelivered}/{totalMeals}</Text><Text style={styles.sumLabel}>Meals</Text>
            </GlassCard>
            <GlassCard style={styles.summaryCard}>
              <Text style={[styles.sumValue, { color: avgCompliance >= 90 ? '#10b981' : '#f59e0b' }]}>{avgCompliance}%</Text><Text style={styles.sumLabel}>Compliance</Text>
            </GlassCard>
          </View>

          {/* Diet Distribution */}
          <Text style={styles.secTitle}>Diet Type Distribution</Text>
          <GlassCard style={styles.distCard}>
            {DIET_DIST.map(d => {
              const pct = Math.round((d.count / totalPatients) * 100);
              return (
                <View key={d.type} style={styles.distRow}>
                  <View style={[styles.distDot, { backgroundColor: d.color }]} />
                  <Text style={styles.distName}>{d.type}</Text>
                  <Text style={styles.distCount}>{d.count}</Text>
                  <View style={styles.distBar}><View style={[styles.distFill, { width: `${pct}%` as any, backgroundColor: d.color }]} /></View>
                  <Text style={[styles.distPct, { color: d.color }]}>{pct}%</Text>
                </View>
              );
            })}
          </GlassCard>

          {/* Ward-wise */}
          <Text style={styles.secTitle}>Ward-wise Delivery</Text>
          {WARD_DATA.map(w => (
            <GlassCard key={w.ward} style={styles.wardCard}>
              <View style={styles.wardTop}>
                <Text style={styles.wardName}>{w.ward}</Text>
                <Text style={[styles.wardComp, { color: w.compliance >= 90 ? '#10b981' : '#f59e0b' }]}>{w.compliance}%</Text>
              </View>
              <View style={styles.wardMeta}>
                <Text style={styles.wardMetaText}>{w.patients} patients</Text>
                <Text style={styles.wardMetaText}>{w.delivered}/{w.meals} delivered</Text>
              </View>
              <View style={styles.barTrack}><View style={[styles.barFill, { width: `${w.compliance}%` as any, backgroundColor: w.compliance >= 90 ? '#10b981' : '#f59e0b' }]} /></View>
            </GlassCard>
          ))}
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
  summaryCard: { flex: 1, padding: 14, alignItems: 'center', borderWidth: 0, gap: 4 },
  sumValue: { fontFamily: FONTS.bold, fontSize: 22 },
  sumLabel: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 10 },
  secTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16, marginBottom: SPACING.s },
  distCard: { padding: SPACING.m, marginBottom: SPACING.l, borderWidth: 0 },
  distRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  distDot: { width: 10, height: 10, borderRadius: 5 },
  distName: { fontFamily: FONTS.medium, color: COLORS.text, fontSize: 12, width: 80 },
  distCount: { fontFamily: FONTS.bold, color: COLORS.textSecondary, fontSize: 12, width: 20, textAlign: 'right' },
  distBar: { flex: 1, height: 6, backgroundColor: COLORS.surface, borderRadius: 3, overflow: 'hidden', marginHorizontal: 4 },
  distFill: { height: '100%' as any, borderRadius: 3 },
  distPct: { fontFamily: FONTS.bold, fontSize: 11, width: 30, textAlign: 'right' },
  wardCard: { padding: 12, marginBottom: 8, borderWidth: 0 },
  wardTop: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  wardName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 14 },
  wardComp: { fontFamily: FONTS.bold, fontSize: 14 },
  wardMeta: { flexDirection: 'row', gap: 12, marginBottom: 6 },
  wardMetaText: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 11 },
  barTrack: { height: 6, backgroundColor: COLORS.surface, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%' as any, borderRadius: 3 },
});
