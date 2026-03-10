import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Wrench, CheckCircle2, AlertTriangle, Clock, ChevronRight } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeContext';
import biomedService, { BiomedDashboardStats, Equipment } from '../../services/biomedService';

const getGreeting = (): string => {
  const h = new Date().getHours();
  return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
};

const STATUS_COLORS: Record<string, string> = {
  OPERATIONAL: '#10b981', UNDER_MAINTENANCE: '#f59e0b', BREAKDOWN: '#ef4444', DECOMMISSIONED: '#64748b',
};

export const BiomedHomeScreen = ({ navigation }: any) => {
  const user = useAuthStore(s => s.user);
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);
  const [stats, setStats] = useState<BiomedDashboardStats | null>(null);
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [s, e] = await Promise.all([biomedService.getDashboard(), biomedService.getEquipment()]);
      setStats(s); setEquipment(e);
    } catch (e) { console.error(e); }
    finally { setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.name}>{user?.name || 'Biomed Engineer'}</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn} onPress={load}><Wrench size={24} color={COLORS.text} /></TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}>
          {/* Banner */}
          <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.banner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.bannerTop}>
              <View style={[styles.liveDot, { backgroundColor: '#10b981' }]} /><Text style={styles.liveText}>EQUIPMENT</Text>
              <Text style={styles.bannerValue}>{stats?.operational ?? 0}/{stats?.total_equipment ?? 0}</Text>
            </View>
            <Text style={styles.bannerTitle}>Operational</Text>
            <View style={styles.bannerChips}>
              <View style={styles.chip}><AlertTriangle size={12} color="#ef4444" /><Text style={styles.chipText}>{stats?.breakdowns ?? 0} breakdowns</Text></View>
              <View style={styles.chip}><Clock size={12} color="#f59e0b" /><Text style={styles.chipText}>{stats?.overdue_pm ?? 0} overdue PM</Text></View>
              <View style={styles.chip}><Wrench size={12} color="#3b82f6" /><Text style={styles.chipText}>{stats?.open_tickets ?? 0} open tickets</Text></View>
            </View>
          </LinearGradient>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            {[
              { label: 'Total', value: stats?.total_equipment ?? '—', color: '#3b82f6' },
              { label: 'Maintenance', value: stats?.under_maintenance ?? '—', color: '#f59e0b' },
              { label: 'Cal Due', value: stats?.calibrations_due ?? '—', color: '#8b5cf6' },
              { label: 'AMC Exp', value: stats?.amc_expiring ?? '—', color: '#ef4444' },
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
              { label: 'Tickets', color: '#ef4444', screen: 'BreakdownTickets' },
              { label: 'Schedule', color: '#3b82f6', screen: 'MaintenanceSchedule' },
              { label: 'Calibration', color: '#8b5cf6', screen: 'CalibrationLogs' },
              { label: 'AMC', color: '#10b981', screen: 'AMCDashboard' },
            ].map((a, i) => (
              <TouchableOpacity key={i} style={styles.actionCard} onPress={() => navigation.navigate(a.screen)}>
                <View style={[styles.actionDot, { backgroundColor: a.color }]} />
                <Text style={styles.actionLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Equipment List */}
          <Text style={styles.secTitle}>Equipment Status</Text>
          {equipment.map(eq => (
            <GlassCard key={eq.id} style={styles.eqCard}>
              <View style={styles.eqTop}>
                <View style={[styles.statusDot, { backgroundColor: STATUS_COLORS[eq.status] }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.eqName}>{eq.name}</Text>
                  <Text style={styles.eqMeta}>{eq.asset_id} • {eq.manufacturer} {eq.model}</Text>
                  <Text style={styles.eqLoc}>{eq.department} — {eq.location}</Text>
                </View>
                <ChevronRight size={16} color={COLORS.textMuted} />
              </View>
              <View style={styles.tagRow}>
                <View style={[styles.statusTag, { backgroundColor: STATUS_COLORS[eq.status] + '20' }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLORS[eq.status] }]}>{eq.status.replace('_', ' ')}</Text>
                </View>
                <Text style={styles.pmText}>Next PM: {eq.next_pm}</Text>
                {eq.amc_vendor && <Text style={styles.amcText}>AMC: {eq.amc_vendor}</Text>}
              </View>
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
  eqCard: { padding: SPACING.m, marginBottom: 8, borderWidth: 0 },
  eqTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  statusDot: { width: 12, height: 12, borderRadius: 6 },
  eqName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 15 },
  eqMeta: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 10, marginTop: 1 },
  eqLoc: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 10, marginTop: 1 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  statusTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontFamily: FONTS.bold, fontSize: 9 },
  pmText: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 10 },
  amcText: { fontFamily: FONTS.medium, color: '#10b981', fontSize: 10 },
});
