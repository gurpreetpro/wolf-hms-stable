import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Scan, Clock, CheckCircle2, AlertTriangle,
  ChevronRight, Zap, FileText, Radio,
} from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeContext';
import radiologyService, { RadiologyDashboardStats } from '../../services/radiologyService';

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

const MODALITIES = ['All', 'X-RAY', 'CT', 'MRI', 'USG', 'MAMMO'];

export const RadiologyHomeScreen = ({ navigation }: any) => {
  const user = useAuthStore(state => state.user);
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);
  const [stats, setStats] = useState<RadiologyDashboardStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [activeModality, setActiveModality] = useState('All');

  const load = async () => {
    try { setStats(await radiologyService.getDashboard()); }
    catch (e) { console.error(e); }
    finally { setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const quickActions = [
    { icon: Scan, label: 'Worklist', color: '#3b82f6', screen: 'ImagingWorklist' },
    { icon: FileText, label: 'Reports', color: '#10b981', screen: 'ReportAuthorization' },
    { icon: AlertTriangle, label: 'Critical', color: '#ef4444', screen: 'CriticalFinding' },
    { icon: Radio, label: 'Dose Log', color: '#8b5cf6', screen: 'RadiationDose' },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.name}>{user?.name || 'Radiologist'}</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn} onPress={load}>
            <Scan size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
        >
          {/* TAT Banner */}
          <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.banner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.bannerTop}>
              <View style={[styles.liveDot, { backgroundColor: '#3b82f6' }]} />
              <Text style={styles.liveText}>IMAGING</Text>
              <Text style={styles.bannerValue}>{stats?.in_progress ?? 0}</Text>
            </View>
            <Text style={styles.bannerTitle}>Studies In Progress</Text>
            <View style={styles.bannerChips}>
              <View style={styles.chip}><Clock size={12} color="#94a3b8" /><Text style={styles.chipText}>Avg TAT {stats?.avg_tat_min ?? 0}m</Text></View>
              <View style={styles.chip}><CheckCircle2 size={12} color="#10b981" /><Text style={styles.chipText}>{stats?.completed_today ?? 0} done today</Text></View>
              {(stats?.critical_findings ?? 0) > 0 && <View style={[styles.chip, { backgroundColor: '#ef444420' }]}><AlertTriangle size={12} color="#ef4444" /><Text style={[styles.chipText, { color: '#ef4444' }]}>{stats?.critical_findings} critical</Text></View>}
            </View>
          </LinearGradient>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <GlassCard style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#f59e0b20' }]}><Clock size={22} color="#f59e0b" /></View>
              <Text style={styles.statValue}>{stats?.pending_orders ?? '—'}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </GlassCard>
            <GlassCard style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#3b82f620' }]}><Scan size={22} color="#3b82f6" /></View>
              <Text style={styles.statValue}>{stats?.in_progress ?? '—'}</Text>
              <Text style={styles.statLabel}>In Progress</Text>
            </GlassCard>
            <GlassCard style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#10b98120' }]}><CheckCircle2 size={22} color="#10b981" /></View>
              <Text style={styles.statValue}>{stats?.completed_today ?? '—'}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </GlassCard>
            <GlassCard style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#8b5cf620' }]}><FileText size={22} color="#8b5cf6" /></View>
              <Text style={styles.statValue}>{stats?.pending_reports ?? '—'}</Text>
              <Text style={styles.statLabel}>To Report</Text>
            </GlassCard>
          </View>

          {/* Modality Chips */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.m }}>
            {MODALITIES.map(m => (
              <TouchableOpacity key={m} style={[styles.modChip, activeModality === m && styles.modChipActive]} onPress={() => setActiveModality(m)}>
                <Text style={[styles.modText, activeModality === m && styles.modTextActive]}>{m}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            {quickActions.map((a, i) => (
              <TouchableOpacity key={i} style={styles.actionCard} onPress={() => navigation.navigate(a.screen)}>
                <View style={[styles.actionIcon, { backgroundColor: a.color + '20' }]}><a.icon size={24} color={a.color} /></View>
                <Text style={styles.actionLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
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
  liveText: { fontFamily: FONTS.bold, color: '#3b82f6', fontSize: 11, letterSpacing: 1, flex: 1 },
  bannerValue: { fontFamily: FONTS.bold, color: '#3b82f6', fontSize: 28 },
  bannerTitle: { fontFamily: FONTS.bold, color: '#fff', fontSize: 20, marginBottom: 12 },
  bannerChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  chipText: { fontFamily: FONTS.medium, color: '#94a3b8', fontSize: 11 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: SPACING.l },
  statCard: { width: '47%' as any, flexGrow: 1, padding: SPACING.m, alignItems: 'center', borderRadius: 20, borderWidth: 0 },
  statIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 28, marginBottom: 2 },
  statLabel: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 13 },
  modChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, marginRight: 8 },
  modChipActive: { backgroundColor: '#3b82f620', borderColor: '#3b82f6' },
  modText: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 12 },
  modTextActive: { color: '#3b82f6', fontFamily: FONTS.bold },
  sectionTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 18, marginBottom: SPACING.m },
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: SPACING.l },
  actionCard: { flex: 1, alignItems: 'center', padding: SPACING.m, backgroundColor: COLORS.surface, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  actionIcon: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionLabel: { fontFamily: FONTS.medium, color: COLORS.text, fontSize: 11, textAlign: 'center' },
});
