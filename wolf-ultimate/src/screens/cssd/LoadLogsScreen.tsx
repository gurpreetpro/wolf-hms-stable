import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Package, CheckCircle2, Clock } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';

const LOAD_DATA = [
  { id: 1, cycle: 'CYC-2026-0305-001', autoclave: 'Autoclave-1', load_time: '07:55', unload_time: '08:25', loaded_by: 'Meena K.', unloaded_by: 'Meena K.', qc: 'PASS', items: [
    { tray: 'TRAY-001', name: 'Major Surgical Tray', dept: 'Gen Surgery', count: 24 },
    { tray: 'TRAY-002', name: 'Ortho Implant Set', dept: 'Orthopedics', count: 18 },
    { tray: 'TRAY-005', name: 'Eye Micro Set', dept: 'Ophthalmology', count: 8 },
  ]},
  { id: 2, cycle: 'CYC-2026-0305-002', autoclave: 'Autoclave-1', load_time: '08:55', unload_time: '09:25', loaded_by: 'Meena K.', unloaded_by: 'Raju S.', qc: 'PASS', items: [
    { tray: 'TRAY-004', name: 'OBG Delivery Set', dept: 'OBG', count: 16 },
    { tray: 'TRAY-006', name: 'Dental Extraction Set', dept: 'Dental', count: 10 },
  ]},
  { id: 3, cycle: 'CYC-2026-0305-003', autoclave: 'Autoclave-2', load_time: '09:25', loaded_by: 'Raju S.', qc: 'PENDING', items: [
    { tray: 'TRAY-003', name: 'Laparoscopic Set', dept: 'Gen Surgery', count: 12 },
    { tray: 'TRAY-007', name: 'Dressing Tray', dept: 'Ward', count: 6 },
  ]},
];

const QC_COLORS = { PASS: '#10b981', FAIL: '#ef4444', PENDING: '#f59e0b' };

export const LoadLogsScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={22} color={COLORS.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Load Logs</Text>
            <Text style={styles.headerSub}>{LOAD_DATA.length} loads today</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}>
          {LOAD_DATA.map(log => {
            const qcColor = QC_COLORS[log.qc as keyof typeof QC_COLORS];
            return (
              <GlassCard key={log.id} style={styles.logCard}>
                <View style={styles.logTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.logCycle}>{log.cycle}</Text>
                    <Text style={styles.logMeta}>{log.autoclave}</Text>
                  </View>
                  <View style={[styles.qcBadge, { backgroundColor: qcColor + '20' }]}>
                    <Text style={[styles.qcText, { color: qcColor }]}>QC: {log.qc}</Text>
                  </View>
                </View>
                <View style={styles.timeRow}>
                  <Text style={styles.timeText}>🔽 Loaded: {log.load_time} by {log.loaded_by}</Text>
                  {log.unload_time && <Text style={styles.timeText}>🔼 Unloaded: {log.unload_time} by {log.unloaded_by}</Text>}
                </View>
                <Text style={styles.itemsLabel}>Items ({log.items.reduce((s, it) => s + it.count, 0)} pcs)</Text>
                {log.items.map((item, i) => (
                  <View key={i} style={styles.itemRow}>
                    <Package size={12} color={COLORS.primary} />
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemDept}>{item.dept}</Text>
                    <Text style={styles.itemCount}>{item.count} pcs</Text>
                  </View>
                ))}
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
  logCard: { padding: SPACING.m, marginBottom: 12, borderWidth: 0 },
  logTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  logCycle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 14 },
  logMeta: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 10, marginTop: 1 },
  qcBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  qcText: { fontFamily: FONTS.bold, fontSize: 10 },
  timeRow: { gap: 2, marginBottom: 8 },
  timeText: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 11 },
  itemsLabel: { fontFamily: FONTS.bold, color: COLORS.textSecondary, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase' as any, marginBottom: 4 },
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4 },
  itemName: { fontFamily: FONTS.medium, color: COLORS.text, fontSize: 12, flex: 1 },
  itemDept: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 10, width: 70 },
  itemCount: { fontFamily: FONTS.bold, color: COLORS.primary, fontSize: 11, width: 40, textAlign: 'right' },
});
