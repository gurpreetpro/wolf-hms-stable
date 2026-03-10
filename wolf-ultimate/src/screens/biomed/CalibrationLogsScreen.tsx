import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, CheckCircle2, XCircle } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';

const CALIBRATION_DATA = [
  { id: 1, equipment: 'Patient Monitor (BME-005)', department: 'ICU', date: '2026-02-15', next_due: '2026-08-15', result: 'PASS', performed_by: 'Ravi Kumar', cert: 'CAL-2026-0201', params: [
    { name: 'HR Accuracy', expected: '±1 bpm', measured: '0.5 bpm', pass: true },
    { name: 'SpO2 Accuracy', expected: '±2%', measured: '1.5%', pass: true },
    { name: 'NIBP Accuracy', expected: '±3 mmHg', measured: '2 mmHg', pass: true },
    { name: 'Temperature', expected: '±0.1°C', measured: '0.08°C', pass: true },
  ]},
  { id: 2, equipment: 'Infusion Pump (BME-004)', department: 'NICU', date: '2026-01-10', next_due: '2026-07-10', result: 'ADJUSTED', performed_by: 'Suresh P.', cert: 'CAL-2026-0102', params: [
    { name: 'Flow Rate 10ml/h', expected: '±5%', measured: '4.8%', pass: true },
    { name: 'Flow Rate 100ml/h', expected: '±5%', measured: '6.2%', pass: false },
    { name: 'Occlusion Alarm', expected: '<300mmHg', measured: '280mmHg', pass: true },
    { name: 'Air Bubble Detect', expected: '50μL', measured: '45μL', pass: true },
  ]},
  { id: 3, equipment: 'Defibrillator (BME-003)', department: 'Emergency', date: '2026-02-20', next_due: '2026-08-20', result: 'PASS', performed_by: 'Ravi Kumar', cert: 'CAL-2026-0215', params: [
    { name: 'Energy 50J', expected: '±15%', measured: '8%', pass: true },
    { name: 'Energy 200J', expected: '±15%', measured: '12%', pass: true },
    { name: 'Charge Time', expected: '<10s', measured: '7.2s', pass: true },
  ]},
  { id: 4, equipment: 'Autoclave (BME-006)', department: 'CSSD', date: '2026-03-03', next_due: '2026-03-28', result: 'PASS', performed_by: 'Suresh P.', cert: 'CAL-2026-0303', params: [
    { name: 'Temperature', expected: '134°C ±2°C', measured: '134.5°C', pass: true },
    { name: 'Pressure', expected: '2.1 bar ±0.1', measured: '2.08 bar', pass: true },
    { name: 'Cycle Time', expected: '18 min ±1', measured: '17.8 min', pass: true },
  ]},
];

const RESULT_COLORS = { PASS: '#10b981', FAIL: '#ef4444', ADJUSTED: '#f59e0b' };

export const CalibrationLogsScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={22} color={COLORS.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Calibration Logs</Text>
            <Text style={styles.headerSub}>{CALIBRATION_DATA.length} records</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}>
          {CALIBRATION_DATA.map(log => {
            const rColor = RESULT_COLORS[log.result as keyof typeof RESULT_COLORS];
            return (
              <GlassCard key={log.id} style={styles.logCard}>
                <View style={styles.logTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.logName}>{log.equipment}</Text>
                    <Text style={styles.logMeta}>{log.department} • By {log.performed_by}</Text>
                  </View>
                  <View style={[styles.resultBadge, { backgroundColor: rColor + '20' }]}>
                    <Text style={[styles.resultText, { color: rColor }]}>{log.result}</Text>
                  </View>
                </View>
                <View style={styles.dateRow}>
                  <Text style={styles.dateText}>📅 {log.date}</Text>
                  <Text style={styles.dateText}>Next: {log.next_due}</Text>
                  <Text style={styles.certText}>📜 {log.cert}</Text>
                </View>
                <Text style={styles.paramLabel}>Parameters</Text>
                {log.params.map((p, i) => (
                  <View key={i} style={styles.paramRow}>
                    {p.pass ? <CheckCircle2 size={12} color="#10b981" /> : <XCircle size={12} color="#ef4444" />}
                    <Text style={styles.paramName}>{p.name}</Text>
                    <Text style={styles.paramVal}>{p.measured}</Text>
                    <Text style={[styles.paramExp, { color: p.pass ? '#10b981' : '#ef4444' }]}>{p.expected}</Text>
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
  logName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 14 },
  logMeta: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 10, marginTop: 1 },
  resultBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  resultText: { fontFamily: FONTS.bold, fontSize: 10 },
  dateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 8 },
  dateText: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 11 },
  certText: { fontFamily: FONTS.medium, color: COLORS.primary, fontSize: 11 },
  paramLabel: { fontFamily: FONTS.bold, color: COLORS.textSecondary, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase' as any, marginBottom: 4 },
  paramRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  paramName: { fontFamily: FONTS.medium, color: COLORS.text, fontSize: 12, flex: 1 },
  paramVal: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 12, width: 60, textAlign: 'right' },
  paramExp: { fontFamily: FONTS.regular, fontSize: 10, width: 70, textAlign: 'right' },
});
