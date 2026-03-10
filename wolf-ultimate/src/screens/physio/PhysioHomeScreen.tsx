import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Activity, Users, ClipboardList, TrendingDown, CheckCircle2, ChevronRight, Calendar } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeContext';
import physioService, { PhysioDashboardStats, PhysioPatient } from '../../services/physioService';

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

export const PhysioHomeScreen = ({ navigation }: any) => {
  const user = useAuthStore(state => state.user);
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);
  const [stats, setStats] = useState<PhysioDashboardStats | null>(null);
  const [patients, setPatients] = useState<PhysioPatient[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [s, p] = await Promise.all([physioService.getDashboard(), physioService.getPatients()]);
      setStats(s); setPatients(p);
    } catch (e) { console.error(e); }
    finally { setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const todayPatients = patients.filter(p => p.status === 'ACTIVE' && p.next_session);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.name}>{user?.name || 'Physiotherapist'}</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn} onPress={load}>
            <Activity size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
        >
          {/* Banner */}
          <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.banner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.bannerTop}>
              <View style={[styles.liveDot, { backgroundColor: '#10b981' }]} /><Text style={styles.liveText}>REHAB</Text>
              <Text style={styles.bannerValue}>{stats?.sessions_today ?? 0}</Text>
            </View>
            <Text style={styles.bannerTitle}>Sessions Today</Text>
            <View style={styles.bannerChips}>
              <View style={styles.chip}><CheckCircle2 size={12} color="#10b981" /><Text style={styles.chipText}>{stats?.sessions_completed ?? 0} done</Text></View>
              <View style={styles.chip}><TrendingDown size={12} color="#3b82f6" /><Text style={styles.chipText}>Avg pain ↓ {stats?.avg_pain_reduction ?? 0}</Text></View>
              <View style={styles.chip}><Users size={12} color="#8b5cf6" /><Text style={styles.chipText}>{stats?.active_patients ?? 0} active</Text></View>
            </View>
          </LinearGradient>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            {[
              { label: 'Active', value: stats?.active_patients ?? '—', color: '#3b82f6', icon: Users },
              { label: 'Assessments', value: stats?.pending_assessments ?? '—', color: '#f59e0b', icon: ClipboardList },
              { label: 'Discharge Ready', value: stats?.discharge_ready ?? '—', color: '#10b981', icon: CheckCircle2 },
              { label: 'Pain ↓', value: stats?.avg_pain_reduction ? `${stats.avg_pain_reduction}` : '—', color: '#8b5cf6', icon: TrendingDown },
            ].map((s, i) => (
              <GlassCard key={i} style={styles.statCard}>
                <View style={[styles.statIcon, { backgroundColor: s.color + '20' }]}><s.icon size={20} color={s.color} /></View>
                <Text style={styles.statValue}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </GlassCard>
            ))}
          </View>

          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            {[
              { icon: ClipboardList, label: 'Exercise Rx', color: '#3b82f6', screen: 'ExercisePrescription' },
              { icon: Calendar, label: 'Session Log', color: '#10b981', screen: 'SessionLog' },
              { icon: Activity, label: 'Assessments', color: '#f59e0b', screen: 'ADLAssessment' },
              { icon: TrendingDown, label: 'Outcomes', color: '#8b5cf6', screen: 'OutcomeScoring' },
            ].map((a, i) => (
              <TouchableOpacity key={i} style={styles.actionCard} onPress={() => navigation.navigate(a.screen)}>
                <View style={[styles.actionIcon, { backgroundColor: a.color + '20' }]}><a.icon size={24} color={a.color} /></View>
                <Text style={styles.actionLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Today's Schedule */}
          <Text style={styles.sectionTitle}>Today's Schedule</Text>
          {todayPatients.map(patient => {
            const progress = patient.sessions_planned > 0 ? (patient.sessions_completed / patient.sessions_planned) * 100 : 0;
            return (
              <GlassCard key={patient.id} style={styles.patientCard}>
                <View style={styles.patTop}>
                  <View style={styles.avatarCircle}><Text style={styles.avatarText}>{patient.name.charAt(0)}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.patName}>{patient.name}</Text>
                    <Text style={styles.patDiag}>{patient.diagnosis}</Text>
                    <Text style={styles.patMeta}>{patient.uhid} • {patient.referring_doctor} • {patient.department}</Text>
                  </View>
                  <ChevronRight size={16} color={COLORS.textMuted} />
                </View>
                <View style={styles.progressRow}>
                  <Text style={styles.progressLabel}>{patient.sessions_completed}/{patient.sessions_planned} sessions</Text>
                  <Text style={styles.progressPct}>{Math.round(progress)}%</Text>
                </View>
                <View style={styles.barTrack}><View style={[styles.barFill, { width: `${progress}%` as any }]} /></View>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', paddingHorizontal: SPACING.m, paddingVertical: SPACING.s, marginTop: SPACING.m, marginBottom: SPACING.s },
  greeting: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 14, marginBottom: 4 },
  name: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 28 },
  bellBtn: { padding: 12, backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border },
  banner: { borderRadius: 24, padding: 20, marginBottom: SPACING.l, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  bannerTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  liveDot: { width: 8, height: 8, borderRadius: 4 },
  liveText: { fontFamily: FONTS.bold, color: '#10b981', fontSize: 11, letterSpacing: 1, flex: 1 },
  bannerValue: { fontFamily: FONTS.bold, color: '#10b981', fontSize: 28 },
  bannerTitle: { fontFamily: FONTS.bold, color: '#fff', fontSize: 20, marginBottom: 12 },
  bannerChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  chipText: { fontFamily: FONTS.medium, color: '#94a3b8', fontSize: 11 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: SPACING.l },
  statCard: { width: '47%' as any, flexGrow: 1, padding: SPACING.m, alignItems: 'center', borderRadius: 20, borderWidth: 0 },
  statIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 26, marginBottom: 2 },
  statLabel: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 12 },
  sectionTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 18, marginBottom: SPACING.m },
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: SPACING.l },
  actionCard: { flex: 1, alignItems: 'center', padding: SPACING.m, backgroundColor: COLORS.surface, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  actionIcon: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionLabel: { fontFamily: FONTS.medium, color: COLORS.text, fontSize: 11, textAlign: 'center' },
  patientCard: { padding: SPACING.m, marginBottom: 10, borderWidth: 0 },
  patTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  avatarCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: COLORS.primary + '20', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontFamily: FONTS.bold, color: COLORS.primary, fontSize: 18 },
  patName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 15 },
  patDiag: { fontFamily: FONTS.medium, color: '#f59e0b', fontSize: 12, marginTop: 1 },
  patMeta: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 10, marginTop: 1 },
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  progressLabel: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 11 },
  progressPct: { fontFamily: FONTS.bold, color: COLORS.primary, fontSize: 11 },
  barTrack: { height: 6, backgroundColor: COLORS.surface, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: '100%' as any, backgroundColor: COLORS.primary, borderRadius: 3 },
});
