import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Radio, AlertTriangle, TrendingUp } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';

interface DoseRecord {
  id: number; patient_name: string; patient_uhid: string; modality: string;
  study: string; date: string;
  dose_mgy: number; drl_mgy: number; // Diagnostic Reference Level
  kvp: number; mA: number;
  compliant: boolean;
}

const MOCK_RECORDS: DoseRecord[] = [
  { id: 1, patient_name: 'Rakesh Kumar', patient_uhid: 'UHID-5001', modality: 'CT', study: 'CT Chest', date: '2026-03-05', dose_mgy: 12.4, drl_mgy: 15, kvp: 120, mA: 250, compliant: true },
  { id: 2, patient_name: 'Vijay Singh', patient_uhid: 'UHID-5003', modality: 'MRI', study: 'MRI Brain', date: '2026-03-05', dose_mgy: 0, drl_mgy: 0, kvp: 0, mA: 0, compliant: true },
  { id: 3, patient_name: 'Mohan Lal', patient_uhid: 'UHID-5005', modality: 'X-RAY', study: 'X-Ray Knee', date: '2026-03-05', dose_mgy: 0.05, drl_mgy: 0.1, kvp: 55, mA: 4, compliant: true },
  { id: 4, patient_name: 'Sunil Verma', patient_uhid: 'UHID-3001', modality: 'CT', study: 'CT Abdomen', date: '2026-03-05', dose_mgy: 18.2, drl_mgy: 15, kvp: 120, mA: 300, compliant: false },
  { id: 5, patient_name: 'Priya Nair', patient_uhid: 'UHID-2004', modality: 'MAMMO', study: 'Mammography', date: '2026-03-05', dose_mgy: 1.8, drl_mgy: 3, kvp: 28, mA: 80, compliant: true },
  { id: 6, patient_name: 'Anita Devi', patient_uhid: 'UHID-5002', modality: 'X-RAY', study: 'Chest X-Ray', date: '2026-03-05', dose_mgy: 0.02, drl_mgy: 0.3, kvp: 120, mA: 2, compliant: true },
];

export const RadiationDoseScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);
  const [records] = useState(MOCK_RECORDS);
  const [filter, setFilter] = useState('ALL');

  const filtered = records.filter(r => {
    if (filter === 'ALL') return true;
    if (filter === 'EXCEEDED') return !r.compliant;
    return r.modality === filter;
  });

  const totalStudies = records.length;
  const exceededCount = records.filter(r => !r.compliant).length;
  const avgDose = records.filter(r => r.dose_mgy > 0).reduce((s, r) => s + r.dose_mgy, 0) / Math.max(1, records.filter(r => r.dose_mgy > 0).length);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={22} color={COLORS.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Radiation Dose Log</Text>
            <Text style={styles.headerSub}>AERB / ICRP Compliance Tracking</Text>
          </View>
        </View>

        {/* Summary Banner */}
        <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.banner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.bannerStats}>
            <View style={styles.bannerStat}>
              <Text style={styles.bannerValue}>{totalStudies}</Text>
              <Text style={styles.bannerLabel}>Studies</Text>
            </View>
            <View style={styles.bannerDivider} />
            <View style={styles.bannerStat}>
              <Text style={[styles.bannerValue, { color: '#10b981' }]}>{avgDose.toFixed(1)}</Text>
              <Text style={styles.bannerLabel}>Avg mGy</Text>
            </View>
            <View style={styles.bannerDivider} />
            <View style={styles.bannerStat}>
              <Text style={[styles.bannerValue, { color: exceededCount > 0 ? '#ef4444' : '#10b981' }]}>{exceededCount}</Text>
              <Text style={styles.bannerLabel}>DRL Exceeded</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{ paddingHorizontal: SPACING.m, gap: 8 }}>
          {[{ key: 'ALL', label: 'All' }, { key: 'EXCEEDED', label: '⚠️ Exceeded' }, { key: 'CT', label: 'CT' }, { key: 'X-RAY', label: 'X-Ray' }, { key: 'MAMMO', label: 'Mammo' }].map(f => (
            <TouchableOpacity key={f.key} style={[styles.filterChip, filter === f.key && styles.filterActive]} onPress={() => setFilter(f.key)}>
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}>
          {filtered.map(record => {
            const dosePercent = record.drl_mgy > 0 ? Math.min(100, (record.dose_mgy / record.drl_mgy) * 100) : 0;
            const barColor = !record.compliant ? '#ef4444' : dosePercent > 75 ? '#f59e0b' : '#10b981';
            return (
              <GlassCard key={record.id} style={[styles.doseCard, !record.compliant && { borderColor: '#ef444440', borderWidth: 1 }]}>
                <View style={styles.doseTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.dosePatient}>{record.patient_name}</Text>
                    <Text style={styles.doseMeta}>{record.patient_uhid} • {record.modality} • {record.study}</Text>
                  </View>
                  {!record.compliant && (
                    <View style={styles.exceedBadge}><AlertTriangle size={12} color="#ef4444" /><Text style={styles.exceedText}>DRL EXCEEDED</Text></View>
                  )}
                </View>

                {record.dose_mgy > 0 && (
                  <>
                    <View style={styles.doseBarRow}>
                      <Text style={styles.doseValue}>{record.dose_mgy} mGy</Text>
                      <Text style={styles.drlValue}>DRL: {record.drl_mgy} mGy</Text>
                    </View>
                    <View style={styles.barTrack}>
                      <View style={[styles.barFill, { width: `${dosePercent}%` as any, backgroundColor: barColor }]} />
                    </View>
                  </>
                )}

                {record.dose_mgy === 0 && (
                  <Text style={styles.noDoseText}>No ionizing radiation (MRI)</Text>
                )}

                {record.kvp > 0 && (
                  <View style={styles.paramsRow}>
                    <View style={styles.paramChip}><Text style={styles.paramText}>kVp: {record.kvp}</Text></View>
                    <View style={styles.paramChip}><Text style={styles.paramText}>mA: {record.mA}</Text></View>
                    <View style={styles.paramChip}><Text style={styles.paramText}>{record.date}</Text></View>
                  </View>
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
  banner: { marginHorizontal: SPACING.m, borderRadius: 20, padding: 18, marginBottom: SPACING.m, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  bannerStats: { flexDirection: 'row', alignItems: 'center' },
  bannerStat: { flex: 1, alignItems: 'center' },
  bannerValue: { fontFamily: FONTS.bold, color: '#fff', fontSize: 26, marginBottom: 2 },
  bannerLabel: { fontFamily: FONTS.medium, color: '#94a3b8', fontSize: 11 },
  bannerDivider: { width: 1, height: 36, backgroundColor: 'rgba(255,255,255,0.1)' },
  filterScroll: { marginBottom: 4, maxHeight: 42 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  filterActive: { backgroundColor: '#8b5cf620', borderColor: '#8b5cf6' },
  filterText: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 12 },
  filterTextActive: { color: '#8b5cf6' },
  doseCard: { padding: SPACING.m, marginBottom: 10, borderWidth: 0 },
  doseTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 8 },
  dosePatient: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 15 },
  doseMeta: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  exceedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ef444420', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  exceedText: { fontFamily: FONTS.bold, color: '#ef4444', fontSize: 9 },
  doseBarRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  doseValue: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 14 },
  drlValue: { fontFamily: FONTS.medium, color: COLORS.textMuted, fontSize: 12 },
  barTrack: { height: 8, backgroundColor: COLORS.surface, borderRadius: 4, overflow: 'hidden', marginBottom: 8 },
  barFill: { height: '100%' as any, borderRadius: 4 },
  noDoseText: { fontFamily: FONTS.medium, color: '#10b981', fontSize: 12, marginBottom: 4 },
  paramsRow: { flexDirection: 'row', gap: 8 },
  paramChip: { backgroundColor: COLORS.surface, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  paramText: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 10 },
});
