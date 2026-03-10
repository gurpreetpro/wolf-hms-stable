import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  FlaskConical, AlertTriangle, Clock, CheckCircle2,
  ArrowRight, Activity, ChevronRight, Search,
  ClipboardList, BarChart3, Microscope, TestTubes,
} from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeContext';
import labService, { LabDashboardStats } from '../../services/labService';

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  if (hour < 21) return 'Good Evening';
  return 'Night Shift';
};

export const LabHomeScreen = ({ navigation }: any) => {
  const user = useAuthStore(state => state.user);
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);

  const [stats, setStats] = useState<LabDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = async () => {
    try {
      const data = await labService.getDashboard();
      setStats(data);
    } catch (error) {
      console.error('Failed to load Lab dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { loadDashboard(); }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const quickActions = [
    { icon: Search, label: 'Scan Sample', color: '#3b82f6', screen: 'SampleWorklist' },
    { icon: ClipboardList, label: 'Enter Result', color: '#10b981', screen: 'ResultEntry' },
    { icon: AlertTriangle, label: 'Critical', color: '#ef4444', screen: 'CriticalValues' },
    { icon: BarChart3, label: 'QC Log', color: '#f59e0b', screen: 'QCCalibration' },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.background, COLORS.surface]}
        style={StyleSheet.absoluteFill}
      />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.name}>{user?.name || 'Lab Technician'}</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn} onPress={loadDashboard}>
            <FlaskConical size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        >
          {/* TAT Banner */}
          <LinearGradient
            colors={['#1e293b', '#0f172a']}
            style={styles.tatBanner}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.tatRow}>
              <View style={[styles.tatBadge, { backgroundColor: '#10b98130' }]}>
                <Clock size={16} color="#10b981" />
                <Text style={[styles.tatBadgeText, { color: '#10b981' }]}>
                  AVG TAT
                </Text>
              </View>
              <Text style={styles.tatValue}>
                {stats?.average_tat_minutes ?? '—'} min
              </Text>
            </View>
            <Text style={styles.tatLabel}>Today's Lab Performance</Text>
            <View style={styles.deptChips}>
              {stats?.departments.map((dept, i) => (
                <View key={i} style={styles.deptChip}>
                  <Microscope size={12} color="#94a3b8" />
                  <Text style={styles.deptChipText}>{dept.name}: {dept.pending}p / {dept.completed}c</Text>
                </View>
              ))}
            </View>
          </LinearGradient>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <GlassCard style={styles.statCard} intensity={60}>
              <View style={[styles.statIcon, { backgroundColor: '#f59e0b20' }]}>
                <TestTubes size={22} color="#f59e0b" />
              </View>
              <Text style={styles.statValue}>{stats?.pending_samples ?? '—'}</Text>
              <Text style={styles.statLabel}>Pending</Text>
            </GlassCard>

            <GlassCard style={styles.statCard} intensity={60}>
              <View style={[styles.statIcon, { backgroundColor: '#3b82f620' }]}>
                <Activity size={22} color="#3b82f6" />
              </View>
              <Text style={styles.statValue}>{stats?.in_progress ?? '—'}</Text>
              <Text style={styles.statLabel}>In Progress</Text>
            </GlassCard>

            <GlassCard style={styles.statCard} intensity={60}>
              <View style={[styles.statIcon, { backgroundColor: '#10b98120' }]}>
                <CheckCircle2 size={22} color="#10b981" />
              </View>
              <Text style={styles.statValue}>{stats?.completed_today ?? '—'}</Text>
              <Text style={styles.statLabel}>Completed</Text>
            </GlassCard>

            <GlassCard style={styles.statCard} intensity={60}>
              <View style={[styles.statIcon, { backgroundColor: '#ef444420' }]}>
                <AlertTriangle size={22} color="#ef4444" />
              </View>
              <Text style={styles.statValue}>{stats?.critical_alerts ?? '—'}</Text>
              <Text style={styles.statLabel}>Critical</Text>
            </GlassCard>
          </View>

          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            {quickActions.map((action, i) => (
              <TouchableOpacity
                key={i}
                style={styles.actionCard}
                onPress={() => navigation.navigate(action.screen)}
              >
                <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}>
                  <action.icon size={24} color={action.color} />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Pending Verification */}
          <Text style={[styles.sectionTitle, { marginTop: SPACING.l }]}>Needs Attention</Text>
          <GlassCard style={styles.alertCard}>
            <TouchableOpacity style={styles.alertRow} onPress={() => navigation.navigate('PathologistVerify')}>
              <View style={[styles.alertDot, { backgroundColor: '#8b5cf6' }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.alertTitle}>{stats?.pending_verification ?? 0} Results Pending Verification</Text>
                <Text style={styles.alertSub}>Senior pathologist approval required</Text>
              </View>
              <ChevronRight size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </GlassCard>
          <GlassCard style={styles.alertCard}>
            <TouchableOpacity style={styles.alertRow} onPress={() => navigation.navigate('QCCalibration')}>
              <View style={[styles.alertDot, { backgroundColor: '#f59e0b' }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.alertTitle}>{stats?.qc_pending ?? 0} QC Runs Pending</Text>
                <Text style={styles.alertSub}>Daily quality control not yet done</Text>
              </View>
              <ChevronRight size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </GlassCard>
          <GlassCard style={styles.alertCard}>
            <TouchableOpacity style={styles.alertRow} onPress={() => navigation.navigate('CriticalValues')}>
              <View style={[styles.alertDot, { backgroundColor: '#ef4444' }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.alertTitle}>{stats?.critical_alerts ?? 0} Critical Value Alerts</Text>
                <Text style={styles.alertSub}>Immediate physician notification required</Text>
              </View>
              <ChevronRight size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </GlassCard>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const getStyles = (COLORS: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'flex-start', paddingHorizontal: SPACING.m,
    paddingVertical: SPACING.s, marginTop: SPACING.m, marginBottom: SPACING.s,
  },
  greeting: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 14, marginBottom: 4 },
  name: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 28 },
  bellBtn: {
    padding: 12, backgroundColor: COLORS.surface, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border,
  },
  // TAT Banner
  tatBanner: {
    borderRadius: 24, padding: 20, marginBottom: SPACING.l,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  tatRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  tatBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  tatBadgeText: { fontFamily: FONTS.bold, fontSize: 11, letterSpacing: 1 },
  tatValue: { fontFamily: FONTS.bold, color: '#10b981', fontSize: 22 },
  tatLabel: { fontFamily: FONTS.bold, color: '#fff', fontSize: 20, marginBottom: 12 },
  deptChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  deptChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 10,
    paddingVertical: 5, borderRadius: 12,
  },
  deptChipText: { fontFamily: FONTS.medium, color: '#94a3b8', fontSize: 11 },
  // Stats Grid
  statsGrid: {
    flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: SPACING.l,
  },
  statCard: {
    width: '47%' as any, flexGrow: 1,
    padding: SPACING.m, alignItems: 'center', borderRadius: 20, borderWidth: 0,
  },
  statIcon: {
    width: 44, height: 44, borderRadius: 22,
    justifyContent: 'center', alignItems: 'center', marginBottom: 10,
  },
  statValue: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 28, marginBottom: 2 },
  statLabel: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 13 },
  // Quick Actions
  sectionTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 18, marginBottom: SPACING.m },
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: SPACING.l },
  actionCard: {
    flex: 1, alignItems: 'center', padding: SPACING.m,
    backgroundColor: COLORS.surface, borderRadius: 20,
    borderWidth: 1, borderColor: COLORS.border,
  },
  actionIcon: {
    width: 48, height: 48, borderRadius: 16,
    justifyContent: 'center', alignItems: 'center', marginBottom: 8,
  },
  actionLabel: { fontFamily: FONTS.medium, color: COLORS.text, fontSize: 12, textAlign: 'center' },
  // Alerts
  alertCard: { marginBottom: 10, padding: SPACING.m, borderWidth: 0 },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  alertDot: { width: 10, height: 10, borderRadius: 5 },
  alertTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 14 },
  alertSub: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
});
