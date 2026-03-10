import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Calendar, CheckCircle2, Clock } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';

const SCHEDULE = [
  { id: 1, equipment: 'Ventilator (BME-001)', department: 'ICU', type: 'Quarterly PM', due: '2026-05-01', status: 'UPCOMING', tasks: ['Filter replacement', 'O2 sensor check', 'Battery test', 'Leak test'] },
  { id: 2, equipment: 'CT Scanner (BME-002)', department: 'Radiology', type: 'Quarterly PM', due: '2026-04-15', status: 'UPCOMING', tasks: ['X-ray tube check', 'Gantry alignment', 'SW update', 'Dose calibration'] },
  { id: 3, equipment: 'Defibrillator (BME-003)', department: 'Emergency', type: 'Quarterly PM', due: '2026-05-20', status: 'UPCOMING', tasks: ['Joule output test', 'Paddle inspection', 'ECG calibration', 'Battery capacity'] },
  { id: 4, equipment: 'Autoclave (BME-006)', department: 'CSSD', type: 'Monthly PM', due: '2026-03-28', status: 'DUE_SOON', tasks: ['Door gasket inspect', 'Pressure valve test', 'Chamber clean', 'Bi testing'] },
  { id: 5, equipment: 'Infusion Pump (BME-004)', department: 'NICU', type: 'Quarterly PM', due: '2026-04-10', status: 'UPCOMING', tasks: ['Flow rate accuracy', 'Alarm test', 'Occlusion test', 'Drop sensor check'] },
];

const STATUS_COLORS: Record<string, { color: string; label: string }> = {
  UPCOMING: { color: '#3b82f6', label: '📅 Upcoming' },
  DUE_SOON: { color: '#f59e0b', label: '⚠️ Due Soon' },
  OVERDUE: { color: '#ef4444', label: '🚨 Overdue' },
  COMPLETED: { color: '#10b981', label: '✅ Done' },
};

export const MaintenanceScheduleScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={22} color={COLORS.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>PM Schedule</Text>
            <Text style={styles.headerSub}>Preventive Maintenance Calendar</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}>
          {SCHEDULE.map(item => {
            const st = STATUS_COLORS[item.status];
            return (
              <GlassCard key={item.id} style={styles.schedCard}>
                <View style={styles.schedTop}>
                  <Calendar size={16} color={st.color} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.schedName}>{item.equipment}</Text>
                    <Text style={styles.schedMeta}>{item.department} • {item.type}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: st.color + '20' }]}>
                    <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                  </View>
                </View>
                <View style={styles.dueRow}>
                  <Clock size={12} color={COLORS.textMuted} /><Text style={styles.dueText}>Due: {item.due}</Text>
                </View>
                <Text style={styles.tasksLabel}>PM Checklist</Text>
                {item.tasks.map((task, i) => (
                  <View key={i} style={styles.taskItem}>
                    <CheckCircle2 size={12} color={COLORS.textMuted} />
                    <Text style={styles.taskText}>{task}</Text>
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
  schedCard: { padding: SPACING.m, marginBottom: 10, borderWidth: 0 },
  schedTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  schedName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 14 },
  schedMeta: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 10, marginTop: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontFamily: FONTS.bold, fontSize: 10 },
  dueRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 8 },
  dueText: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 12 },
  tasksLabel: { fontFamily: FONTS.bold, color: COLORS.textSecondary, fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase' as any, marginBottom: 4 },
  taskItem: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 },
  taskText: { fontFamily: FONTS.regular, color: COLORS.text, fontSize: 12 },
});
