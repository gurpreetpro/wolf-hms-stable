import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, CheckCircle2, Circle, Clock, AlertTriangle,
  Sparkles, ChevronRight, Activity, Thermometer, Heart,
  Droplets, Wind,
} from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';

interface WardPatient {
  id: string;
  name: string;
  ward: string;
  bed: string;
  diagnosis: string;
  day: number; // admission day
  roundDone: boolean;
  priority: 'critical' | 'high' | 'normal';
  vitals: { hr: number; bp: string; spo2: number; temp: number; rr: number };
  aiInsight?: string;
}

const MOCK_PATIENTS: WardPatient[] = [
  {
    id: 'P001', name: 'Rajesh Kumar', ward: 'ICU', bed: '3',
    diagnosis: 'ARDS / Respiratory Failure', day: 4, roundDone: false, priority: 'critical',
    vitals: { hr: 112, bp: '90/60', spo2: 88, temp: 100.4, rr: 28 },
    aiInsight: '⚠️ SpO₂ trending down 6hrs. Consider intubation. Lactate was 4.2 on last ABG.',
  },
  {
    id: 'P004', name: 'Meena Sharma', ward: 'ICU', bed: '5',
    diagnosis: 'Sepsis, on vasopressors', day: 3, roundDone: false, priority: 'critical',
    vitals: { hr: 118, bp: '85/55', spo2: 94, temp: 102.1, rr: 24 },
    aiInsight: '⚠️ Norepinephrine dose increasing. Procalcitonin >10. Source: possible line infection.',
  },
  {
    id: 'P002', name: 'Sunita Devi', ward: 'Ward B', bed: '204',
    diagnosis: 'Acute Kidney Injury', day: 2, roundDone: false, priority: 'high',
    vitals: { hr: 88, bp: '140/90', spo2: 96, temp: 98.8, rr: 18 },
    aiInsight: 'Creatinine 4.2→4.8 in 12hrs. K+ 5.6. Consider urgent nephrology review + dialysis.',
  },
  {
    id: 'P003', name: 'Amit Patel', ward: 'Ward A', bed: '112',
    diagnosis: 'Post-op Cholecystectomy', day: 1, roundDone: true, priority: 'normal',
    vitals: { hr: 78, bp: '120/80', spo2: 98, temp: 101.2, rr: 16 },
    aiInsight: 'Low-grade fever Day 1 post-op — likely inflammatory. Monitor. If persists >48hrs, investigate wound/urine.',
  },
  {
    id: 'P005', name: 'Kavita Jain', ward: 'Ward A', bed: '106',
    diagnosis: 'Diabetic Ketoacidosis', day: 2, roundDone: false, priority: 'high',
    vitals: { hr: 96, bp: '110/70', spo2: 97, temp: 99.0, rr: 22 },
    aiInsight: 'Blood glucose trending down (420→280→190). Anion gap closing. Transition to subQ insulin when AG <12.',
  },
  {
    id: 'P006', name: 'Ravi Shankar', ward: 'Ward C', bed: '302',
    diagnosis: 'Community Acquired Pneumonia', day: 3, roundDone: true, priority: 'normal',
    vitals: { hr: 82, bp: '125/78', spo2: 95, temp: 99.6, rr: 20 },
  },
];

const getPriorityColor = (p: string) => {
  switch (p) {
    case 'critical': return '#ef4444';
    case 'high': return '#f59e0b';
    default: return '#22c55e';
  }
};

export const RmoWardRoundScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);

  const [patients, setPatients] = useState(MOCK_PATIENTS);
  const [refreshing, setRefreshing] = useState(false);
  const [showAi, setShowAi] = useState<string | null>(null);

  const pending = patients.filter(p => !p.roundDone);
  const completed = patients.filter(p => p.roundDone);

  const toggleAi = (id: string) => {
    setShowAi(showAi === id ? null : id);
  };

  const markRoundDone = (id: string) => {
    setPatients(prev => prev.map(p => p.id === id ? { ...p, roundDone: true } : p));
    navigation.navigate('RmoProgressNote', { patientId: id });
  };

  const renderVitalChip = (icon: React.ComponentType<any>, value: string, isAbnormal: boolean) => {
    const Icon = icon;
    return (
      <View style={[styles.vitalChip, isAbnormal && { backgroundColor: '#ef444415' }]}>
        <Icon size={12} color={isAbnormal ? '#ef4444' : COLORS.textMuted} />
        <Text style={[styles.vitalText, isAbnormal && { color: '#ef4444' }]}>{value}</Text>
      </View>
    );
  };

  const renderPatient = (patient: WardPatient) => {
    const { vitals } = patient;
    return (
      <GlassCard key={patient.id} style={styles.patientCard}>
        {/* Top: Status + Priority */}
        <View style={styles.topRow}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {patient.roundDone ? (
              <CheckCircle2 size={18} color="#22c55e" />
            ) : (
              <Circle size={18} color={COLORS.textMuted} />
            )}
            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(patient.priority) + '20' }]}>
              <View style={[styles.priorityDot, { backgroundColor: getPriorityColor(patient.priority) }]} />
              <Text style={[styles.priorityText, { color: getPriorityColor(patient.priority) }]}>
                {patient.priority.toUpperCase()}
              </Text>
            </View>
          </View>
          <Text style={styles.dayBadge}>Day {patient.day}</Text>
        </View>

        {/* Patient Info */}
        <Text style={styles.patientName}>{patient.name}</Text>
        <Text style={styles.patientMeta}>{patient.ward} • Bed {patient.bed} • {patient.diagnosis}</Text>

        {/* Vitals Row */}
        <View style={styles.vitalsRow}>
          {renderVitalChip(Heart, `${vitals.hr}`, vitals.hr > 100 || vitals.hr < 60)}
          {renderVitalChip(Activity, vitals.bp, false)}
          {renderVitalChip(Droplets, `${vitals.spo2}%`, vitals.spo2 < 92)}
          {renderVitalChip(Thermometer, `${vitals.temp}°F`, vitals.temp > 100)}
          {renderVitalChip(Wind, `${vitals.rr}`, vitals.rr > 22)}
        </View>

        {/* AI Insight Toggle */}
        {patient.aiInsight && (
          <>
            <TouchableOpacity onPress={() => toggleAi(patient.id)} style={styles.aiToggle}>
              <Sparkles size={14} color="#a78bfa" />
              <Text style={styles.aiToggleText}>
                {showAi === patient.id ? 'Hide AI Insight' : 'View AI Insight'}
              </Text>
            </TouchableOpacity>
            {showAi === patient.id && (
              <View style={styles.aiInsightBox}>
                <Text style={styles.aiInsightText}>{patient.aiInsight}</Text>
              </View>
            )}
          </>
        )}

        {/* Action Buttons */}
        {!patient.roundDone && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.roundBtn}
              onPress={() => markRoundDone(patient.id)}
            >
              <CheckCircle2 size={14} color={COLORS.primary} />
              <Text style={styles.roundBtnText}>Complete Round</Text>
            </TouchableOpacity>
          </View>
        )}
      </GlassCard>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Ward Rounds</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${(completed.length / patients.length) * 100}%` }]} />
          </View>
          <Text style={styles.progressText}>{completed.length}/{patients.length} completed</Text>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(false)} tintColor={COLORS.primary} />}
        >
          {/* Pending */}
          {pending.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>
                <Clock size={14} color={COLORS.textSecondary} /> Pending ({pending.length})
              </Text>
              {pending.map(renderPatient)}
            </>
          )}

          {/* Completed */}
          {completed.length > 0 && (
            <>
              <Text style={[styles.sectionTitle, { marginTop: SPACING.l }]}>
                Completed ({completed.length})
              </Text>
              {completed.map(renderPatient)}
            </>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const getStyles = (COLORS: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.m, paddingVertical: SPACING.s, marginTop: SPACING.s,
  },
  backBtn: { padding: 10, backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border },
  headerTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 20 },
  // Progress
  progressContainer: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: SPACING.m, marginBottom: SPACING.m,
  },
  progressBar: {
    flex: 1, height: 6, backgroundColor: COLORS.surface,
    borderRadius: 3, overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: '#22c55e', borderRadius: 3 },
  progressText: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 12 },
  sectionTitle: { fontFamily: FONTS.bold, color: COLORS.textSecondary, fontSize: 13, marginBottom: SPACING.s },
  // Patient Card
  patientCard: { marginBottom: 12, padding: SPACING.m, borderWidth: 0 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  priorityBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  priorityDot: { width: 6, height: 6, borderRadius: 3 },
  priorityText: { fontFamily: FONTS.bold, fontSize: 9, letterSpacing: 0.5 },
  dayBadge: { fontFamily: FONTS.medium, color: COLORS.textMuted, fontSize: 11, backgroundColor: COLORS.surface, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  patientName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16 },
  patientMeta: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  // Vitals
  vitalsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  vitalChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
    backgroundColor: COLORS.surface,
  },
  vitalText: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 11 },
  // AI
  aiToggle: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 },
  aiToggleText: { fontFamily: FONTS.medium, color: '#a78bfa', fontSize: 12 },
  aiInsightBox: {
    marginTop: 6, padding: 10, backgroundColor: '#312e8115',
    borderRadius: 12, borderLeftWidth: 3, borderLeftColor: '#8b5cf6',
  },
  aiInsightText: { fontFamily: FONTS.regular, color: COLORS.text, fontSize: 12, lineHeight: 18 },
  // Actions
  actionRow: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  roundBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14,
    backgroundColor: COLORS.primary + '15',
  },
  roundBtnText: { fontFamily: FONTS.bold, color: COLORS.primary, fontSize: 12 },
});
