import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Activity, CheckCircle2, Clock, AlertTriangle, ChevronRight } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeContext';
import cssdService, { CSSDDashboardStats, SterilizationCycle } from '../../services/cssdService';

const getGreeting = (): string => {
  const h = new Date().getHours();
  return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
};

const CYCLE_COLORS: Record<string, string> = {
  RUNNING: '#3b82f6', COMPLETED: '#10b981', FAILED: '#ef4444', ABORTED: '#64748b',
};

export const CSSDHomeScreen = ({ navigation }: any) => {
  const user = useAuthStore(s => s.user);
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);
  const [stats, setStats] = useState<CSSDDashboardStats | null>(null);
  const [cycles, setCycles] = useState<SterilizationCycle[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [s, c] = await Promise.all([cssdService.getDashboard(), cssdService.getCycles()]);
      setStats(s); setCycles(c);
    } catch (e) { console.error(e); }
    finally { setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <View><Text style={styles.greeting}>{getGreeting()}</Text><Text style={styles.name}>{user?.name || 'CSSD Tech'}</Text></View>
          <TouchableOpacity style={styles.bellBtn} onPress={load}><Activity size={24} color={COLORS.text} /></TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}>
          {/* Banner */}
          <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.banner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.bannerTop}>
              <View style={[styles.liveDot, { backgroundColor: '#10b981' }]} /><Text style={styles.liveText}>STERILIZATION</Text>
              <Text style={styles.bannerValue}>{stats?.cycles_completed ?? 0}/{stats?.cycles_today ?? 0}</Text>
            </View>
            <Text style={styles.bannerTitle}>Cycles Completed</Text>
            <View style={styles.bannerChips}>
              <View style={styles.chip}><Activity size={12} color="#3b82f6" /><Text style={styles.chipText}>{stats?.cycles_running ?? 0} running</Text></View>
              <View style={styles.chip}><CheckCircle2 size={12} color="#10b981" /><Text style={styles.chipText}>{stats?.instruments_sterile ?? 0} sterile</Text></View>
              <View style={styles.chip}><Clock size={12} color="#f59e0b" /><Text style={styles.chipText}>{stats?.bi_pending ?? 0} BI pending</Text></View>
            </View>
          </LinearGradient>

          {/* Stats */}
          <View style={styles.statsGrid}>
            {[
              { label: 'Sterile', value: stats?.instruments_sterile ?? '—', color: '#10b981' },
              { label: 'Processing', value: stats?.instruments_processing ?? '—', color: '#3b82f6' },
              { label: 'To Issue', value: stats?.pending_issue ?? '—', color: '#f59e0b' },
              { label: 'BI Fail', value: stats?.bi_failed ?? '—', color: '#ef4444' },
            ].map((s, i) => (
              <GlassCard key={i} style={styles.statCard}>
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </GlassCard>
            ))}
          </View>

          {/* Quick Actions */}
          <Text style={styles.secTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            {[
              { label: 'Cycles', color: '#3b82f6', screen: 'SterilizationCycles' },
              { label: 'Instruments', color: '#10b981', screen: 'InstrumentTracking' },
              { label: 'Load Logs', color: '#8b5cf6', screen: 'LoadLogs' },
              { label: 'BI Results', color: '#ef4444', screen: 'BioIndicator' },
            ].map((a, i) => (
              <TouchableOpacity key={i} style={styles.actionCard} onPress={() => navigation.navigate(a.screen)}>
                <View style={[styles.actionDot, { backgroundColor: a.color }]} />
                <Text style={styles.actionLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Active Cycles */}
          <Text style={styles.secTitle}>Today's Cycles</Text>
          {cycles.map(cycle => (
            <GlassCard key={cycle.id} style={styles.cycleCard}>
              <View style={styles.cycleTop}>
                <View style={[styles.cycleDot, { backgroundColor: CYCLE_COLORS[cycle.status] }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.cycleName}>{cycle.autoclave_name}</Text>
                  <Text style={styles.cycleMeta}>{cycle.cycle_number} • {cycle.cycle_type}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: CYCLE_COLORS[cycle.status] + '20' }]}>
                  <Text style={[styles.statusText, { color: CYCLE_COLORS[cycle.status] }]}>{cycle.status}</Text>
                </View>
              </View>
              <View style={styles.paramRow}>
                <Text style={styles.paramText}>🌡️ {cycle.temperature}°C</Text>
                <Text style={styles.paramText}>⚡ {cycle.pressure} bar</Text>
                <Text style={styles.paramText}>⏱️ {cycle.duration_min} min</Text>
                <Text style={styles.paramText}>📦 {cycle.load_count} items</Text>
              </View>
              {cycle.bi_result && (
                <View style={[styles.biBadge, { backgroundColor: cycle.bi_result === 'PASS' ? '#10b98120' : '#ef444420' }]}>
                  <Text style={[styles.biText, { color: cycle.bi_result === 'PASS' ? '#10b981' : '#ef4444' }]}>BI: {cycle.bi_result}</Text>
                </View>
              )}
            </GlassCard>
          ))}
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
  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: SPACING.l },
  statCard: { flex: 1, padding: 12, alignItems: 'center', borderWidth: 0 },
  statValue: { fontFamily: FONTS.bold, fontSize: 24, marginBottom: 2 },
  statLabel: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 10 },
  secTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 18, marginBottom: SPACING.m },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: SPACING.l },
  actionCard: { flex: 1, alignItems: 'center', padding: 14, backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, gap: 8 },
  actionDot: { width: 10, height: 10, borderRadius: 5 },
  actionLabel: { fontFamily: FONTS.medium, color: COLORS.text, fontSize: 11, textAlign: 'center' },
  cycleCard: { padding: SPACING.m, marginBottom: 8, borderWidth: 0 },
  cycleTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  cycleDot: { width: 12, height: 12, borderRadius: 6 },
  cycleName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 14 },
  cycleMeta: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 10, marginTop: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontFamily: FONTS.bold, fontSize: 9 },
  paramRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 6 },
  paramText: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 11 },
  biBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  biText: { fontFamily: FONTS.bold, fontSize: 10 },
});
