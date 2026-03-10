import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, Clock, CheckCircle2, AlertTriangle, XCircle,
  ChevronRight, Timer, RefreshCw, TrendingUp,
} from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';

// Escalation types
interface Escalation {
  id: number;
  patient_name: string;
  patient_ward: string;
  patient_bed: string;
  consultant_name: string;
  consultant_dept: string;
  reason: string;
  priority: 'ROUTINE' | 'URGENT' | 'CRITICAL';
  status: 'PENDING' | 'ACKNOWLEDGED' | 'IN_PROGRESS' | 'RESOLVED';
  escalated_at: string;
  acknowledged_at?: string;
  resolved_at?: string;
  response_notes?: string;
  sla_minutes: number;
}

// Mock data
const MOCK_ESCALATIONS: Escalation[] = [
  {
    id: 1, patient_name: 'Rajesh Kumar', patient_ward: 'ICU', patient_bed: '3',
    consultant_name: 'Dr. Rao', consultant_dept: 'Anaesthesia',
    reason: 'SpO₂ dropping below 85% despite BiPAP, need intubation decision',
    priority: 'CRITICAL', status: 'ACKNOWLEDGED',
    escalated_at: '2026-03-03T18:30:00Z', acknowledged_at: '2026-03-03T18:37:00Z',
    sla_minutes: 15,
  },
  {
    id: 2, patient_name: 'Sunita Devi', patient_ward: 'Ward B', patient_bed: '204',
    consultant_name: 'Dr. Singh', consultant_dept: 'Nephrology',
    reason: 'Creatinine rising to 4.2, need dialysis assessment',
    priority: 'URGENT', status: 'PENDING',
    escalated_at: '2026-03-03T17:45:00Z',
    sla_minutes: 30,
  },
  {
    id: 3, patient_name: 'Priya Nair', patient_ward: 'Ward A', patient_bed: '108',
    consultant_name: 'Dr. Gupta', consultant_dept: 'Surgery',
    reason: 'Pre-op clearance needed for emergency appendectomy',
    priority: 'URGENT', status: 'RESOLVED',
    escalated_at: '2026-03-03T14:00:00Z', acknowledged_at: '2026-03-03T14:12:00Z',
    resolved_at: '2026-03-03T14:45:00Z',
    response_notes: 'Cleared for surgery. Proceed with spinal anaesthesia. NPO confirmed.',
    sla_minutes: 30,
  },
  {
    id: 4, patient_name: 'Vikram Shah', patient_ward: 'ICU', patient_bed: '7',
    consultant_name: 'Dr. Verma', consultant_dept: 'Cardiology',
    reason: 'New onset AF with rapid ventricular rate, BP dropping',
    priority: 'CRITICAL', status: 'RESOLVED',
    escalated_at: '2026-03-03T10:15:00Z', acknowledged_at: '2026-03-03T10:18:00Z',
    resolved_at: '2026-03-03T10:50:00Z',
    response_notes: 'Start IV amiodarone 150mg bolus, follow with infusion. Will review in 1 hour.',
    sla_minutes: 15,
  },
  {
    id: 5, patient_name: 'Sanjay Mehta', patient_ward: 'Ward C', patient_bed: '301',
    consultant_name: 'Dr. Joshi', consultant_dept: 'Neurology',
    reason: 'New neurological deficit — left-sided weakness onset 2 hours ago',
    priority: 'CRITICAL', status: 'IN_PROGRESS',
    escalated_at: '2026-03-03T16:00:00Z', acknowledged_at: '2026-03-03T16:04:00Z',
    sla_minutes: 15,
  },
];

const getPriorityConfig = (p: string) => {
  switch (p) {
    case 'CRITICAL': return { color: '#ef4444', label: 'Critical' };
    case 'URGENT': return { color: '#f59e0b', label: 'Urgent' };
    default: return { color: '#3b82f6', label: 'Routine' };
  }
};

const getStatusConfig = (s: string) => {
  switch (s) {
    case 'PENDING': return { color: '#f59e0b', label: 'Pending', icon: Clock };
    case 'ACKNOWLEDGED': return { color: '#3b82f6', label: 'Acknowledged', icon: CheckCircle2 };
    case 'IN_PROGRESS': return { color: '#8b5cf6', label: 'In Progress', icon: Timer };
    case 'RESOLVED': return { color: '#22c55e', label: 'Resolved', icon: CheckCircle2 };
    default: return { color: '#64748b', label: s, icon: Clock };
  }
};

const getTimeDiff = (from: string, to?: string) => {
  const start = new Date(from).getTime();
  const end = to ? new Date(to).getTime() : Date.now();
  const mins = Math.floor((end - start) / 60000);
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

export const EscalationHistoryScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);

  const [escalations, setEscalations] = useState<Escalation[]>(MOCK_ESCALATIONS);
  const [filter, setFilter] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const filtered = filter ? escalations.filter(e => e.status === filter) : escalations;
  const active = escalations.filter(e => e.status !== 'RESOLVED');
  const resolved = escalations.filter(e => e.status === 'RESOLVED');

  // Stats
  const avgResponseTime = resolved.length > 0
    ? Math.round(resolved.reduce((sum, e) => {
        const diff = new Date(e.acknowledged_at!).getTime() - new Date(e.escalated_at).getTime();
        return sum + diff / 60000;
      }, 0) / resolved.length)
    : 0;

  const chips = [
    { key: null, label: 'All', count: escalations.length },
    { key: 'PENDING', label: 'Pending', count: escalations.filter(e => e.status === 'PENDING').length },
    { key: 'ACKNOWLEDGED', label: 'Active', count: active.length },
    { key: 'RESOLVED', label: 'Resolved', count: resolved.length },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Escalation History</Text>
          <View style={{ width: 44 }} />
        </View>

        {/* Stats Banner */}
        <LinearGradient colors={['#7c2d12', '#431407']} style={styles.statsBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <Text style={styles.statBigValue}>{active.length}</Text>
              <Text style={styles.statSmallLabel}>Active</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statBigValue}>{avgResponseTime}m</Text>
              <Text style={styles.statSmallLabel}>Avg Response</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statBigValue}>{resolved.length}</Text>
              <Text style={styles.statSmallLabel}>Resolved Today</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Filter Chips */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipRow}>
          {chips.map(chip => {
            const isActive = filter === chip.key;
            return (
              <TouchableOpacity
                key={chip.key ?? 'all'}
                style={[styles.chip, isActive && styles.chipActive]}
                onPress={() => setFilter(chip.key)}
              >
                <Text style={[styles.chipText, isActive && styles.chipTextActive]}>
                  {chip.label} ({chip.count})
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <ScrollView
          contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(false)} tintColor={COLORS.primary} />}
        >
          {filtered.map(esc => {
            const prConfig = getPriorityConfig(esc.priority);
            const stConfig = getStatusConfig(esc.status);
            const StatusIcon = stConfig.icon;
            const responseTime = esc.acknowledged_at
              ? getTimeDiff(esc.escalated_at, esc.acknowledged_at)
              : getTimeDiff(esc.escalated_at);
            const isOverSLA = !esc.acknowledged_at &&
              (Date.now() - new Date(esc.escalated_at).getTime()) / 60000 > esc.sla_minutes;

            return (
              <GlassCard key={esc.id} style={styles.escalationCard}>
                {/* Top Row: Priority + Status */}
                <View style={styles.topRow}>
                  <View style={[styles.priorityPill, { backgroundColor: prConfig.color + '20' }]}>
                    <View style={[styles.priorityDot, { backgroundColor: prConfig.color }]} />
                    <Text style={[styles.priorityText, { color: prConfig.color }]}>{prConfig.label}</Text>
                  </View>
                  <View style={[styles.statusPill, { backgroundColor: stConfig.color + '20' }]}>
                    <StatusIcon size={12} color={stConfig.color} />
                    <Text style={[styles.statusText, { color: stConfig.color }]}>{stConfig.label}</Text>
                  </View>
                </View>

                {/* Patient */}
                <Text style={styles.patientName}>{esc.patient_name}</Text>
                <Text style={styles.patientMeta}>{esc.patient_ward} Bed {esc.patient_bed} → {esc.consultant_name} ({esc.consultant_dept})</Text>
                <Text style={styles.reasonText}>{esc.reason}</Text>

                {/* Timeline */}
                <View style={styles.timeline}>
                  <View style={styles.timelineItem}>
                    <Clock size={12} color={COLORS.textMuted} />
                    <Text style={styles.timelineText}>Escalated: {new Date(esc.escalated_at).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                  {esc.acknowledged_at && (
                    <View style={styles.timelineItem}>
                      <CheckCircle2 size={12} color="#22c55e" />
                      <Text style={styles.timelineText}>Response: {responseTime}</Text>
                    </View>
                  )}
                  {isOverSLA && (
                    <View style={styles.timelineItem}>
                      <AlertTriangle size={12} color="#ef4444" />
                      <Text style={[styles.timelineText, { color: '#ef4444' }]}>SLA Breached ({esc.sla_minutes}m)</Text>
                    </View>
                  )}
                </View>

                {/* Response Notes */}
                {esc.response_notes && (
                  <View style={styles.responseBox}>
                    <Text style={styles.responseLabel}>Consultant Response:</Text>
                    <Text style={styles.responseText}>{esc.response_notes}</Text>
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
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.m, paddingVertical: SPACING.s, marginTop: SPACING.s,
  },
  backBtn: { padding: 10, backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border },
  headerTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 20 },
  // Stats Banner
  statsBanner: {
    marginHorizontal: SPACING.m, borderRadius: 20, padding: 16,
    marginBottom: SPACING.s, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  statsRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  statItem: { alignItems: 'center' },
  statBigValue: { fontFamily: FONTS.bold, color: '#fff', fontSize: 22 },
  statSmallLabel: { fontFamily: FONTS.medium, color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 2 },
  statDivider: { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.1)' },
  // Chips
  chipRow: { paddingHorizontal: SPACING.m, gap: 8, paddingVertical: SPACING.s },
  chip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  chipActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  chipText: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 12 },
  chipTextActive: { color: '#fff' },
  // Card
  escalationCard: { marginBottom: 12, padding: SPACING.m, borderWidth: 0 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  priorityPill: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  priorityDot: { width: 6, height: 6, borderRadius: 3 },
  priorityText: { fontFamily: FONTS.bold, fontSize: 10, textTransform: 'uppercase' as any },
  statusPill: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12 },
  statusText: { fontFamily: FONTS.bold, fontSize: 10, textTransform: 'uppercase' as any },
  patientName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16 },
  patientMeta: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  reasonText: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 13, marginTop: 6, lineHeight: 18 },
  // Timeline
  timeline: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 10 },
  timelineItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timelineText: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 11 },
  // Response
  responseBox: {
    marginTop: 10, padding: 10, backgroundColor: '#22c55e10',
    borderRadius: 12, borderLeftWidth: 3, borderLeftColor: '#22c55e',
  },
  responseLabel: { fontFamily: FONTS.bold, color: '#22c55e', fontSize: 11, marginBottom: 4 },
  responseText: { fontFamily: FONTS.regular, color: COLORS.text, fontSize: 13, lineHeight: 18 },
});
