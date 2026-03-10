import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  UserPlus, Clock, CheckCircle2, Users,
  ChevronRight, IndianRupee, Zap, CalendarPlus,
  Search, ListOrdered,
} from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeContext';
import receptionService, { ReceptionDashboardStats } from '../../services/receptionService';

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
};

export const ReceptionHomeScreen = ({ navigation }: any) => {
  const user = useAuthStore(state => state.user);
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);
  const [stats, setStats] = useState<ReceptionDashboardStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try { setStats(await receptionService.getDashboard()); }
    catch (e) { console.error(e); }
    finally { setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const quickActions = [
    { icon: UserPlus, label: 'New Patient', color: '#3b82f6', screen: 'PatientRegistration' },
    { icon: ListOrdered, label: 'Token Queue', color: '#10b981', screen: 'TokenQueue' },
    { icon: CalendarPlus, label: 'Book Appt', color: '#8b5cf6', screen: 'AppointmentBooking' },
    { icon: Search, label: 'Patient Search', color: '#f59e0b', screen: 'PatientSearch' },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.name}>{user?.name || 'Reception'}</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn} onPress={load}>
            <Users size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
        >
          {/* Live Queue Banner */}
          <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.banner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.bannerTop}>
              <View style={[styles.liveDot, { backgroundColor: '#10b981' }]} />
              <Text style={styles.liveText}>LIVE QUEUE</Text>
              <Text style={styles.bannerValue}>{stats?.active_in_queue ?? 0}</Text>
            </View>
            <Text style={styles.bannerTitle}>Patients Waiting</Text>
            <View style={styles.bannerChips}>
              <View style={styles.chip}><Clock size={12} color="#94a3b8" /><Text style={styles.chipText}>Avg {stats?.avg_wait_time_min ?? 0}m wait</Text></View>
              <View style={styles.chip}><CheckCircle2 size={12} color="#10b981" /><Text style={styles.chipText}>{stats?.tokens_issued ?? 0} tokens today</Text></View>
              <View style={styles.chip}><IndianRupee size={12} color="#f59e0b" /><Text style={styles.chipText}>₹{stats?.revenue_collected?.toLocaleString() ?? 0}</Text></View>
            </View>
          </LinearGradient>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <GlassCard style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#3b82f620' }]}><UserPlus size={22} color="#3b82f6" /></View>
              <Text style={styles.statValue}>{stats?.registrations_today ?? '—'}</Text>
              <Text style={styles.statLabel}>Registered</Text>
            </GlassCard>
            <GlassCard style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#10b98120' }]}><ListOrdered size={22} color="#10b981" /></View>
              <Text style={styles.statValue}>{stats?.tokens_issued ?? '—'}</Text>
              <Text style={styles.statLabel}>Tokens</Text>
            </GlassCard>
            <GlassCard style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#f59e0b20' }]}><Zap size={22} color="#f59e0b" /></View>
              <Text style={styles.statValue}>{stats?.walk_ins ?? '—'}</Text>
              <Text style={styles.statLabel}>Walk-ins</Text>
            </GlassCard>
            <GlassCard style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#ef444420' }]}><Clock size={22} color="#ef4444" /></View>
              <Text style={styles.statValue}>{stats?.no_shows ?? '—'}</Text>
              <Text style={styles.statLabel}>No Shows</Text>
            </GlassCard>
          </View>

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

          {/* Department Queue Summary */}
          <Text style={[styles.sectionTitle, { marginTop: SPACING.l }]}>Department Queues</Text>
          {[
            { dept: 'Cardiology', doctor: 'Dr. Sharma', waiting: 2, inConsult: 1 },
            { dept: 'Medicine', doctor: 'Dr. Patel', waiting: 3, inConsult: 1 },
            { dept: 'Orthopedics', doctor: 'Dr. Reddy', waiting: 1, inConsult: 0 },
            { dept: 'ENT', doctor: 'Dr. Singh', waiting: 0, inConsult: 0 },
          ].map((d, i) => (
            <TouchableOpacity key={i} onPress={() => navigation.navigate('TokenQueue')}>
              <GlassCard style={styles.deptCard}>
                <View style={styles.deptRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.deptName}>{d.dept}</Text>
                    <Text style={styles.deptDoctor}>{d.doctor}</Text>
                  </View>
                  <View style={styles.deptStats}>
                    <View style={[styles.deptBadge, { backgroundColor: d.waiting > 0 ? '#f59e0b20' : '#10b98120' }]}>
                      <Text style={[styles.deptBadgeText, { color: d.waiting > 0 ? '#f59e0b' : '#10b981' }]}>{d.waiting} waiting</Text>
                    </View>
                    {d.inConsult > 0 && <View style={[styles.deptBadge, { backgroundColor: '#3b82f620' }]}><Text style={[styles.deptBadgeText, { color: '#3b82f6' }]}>1 in</Text></View>}
                  </View>
                  <ChevronRight size={16} color={COLORS.textMuted} />
                </View>
              </GlassCard>
            </TouchableOpacity>
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
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: SPACING.l },
  statCard: { width: '47%' as any, flexGrow: 1, padding: SPACING.m, alignItems: 'center', borderRadius: 20, borderWidth: 0 },
  statIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 28, marginBottom: 2 },
  statLabel: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 13 },
  sectionTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 18, marginBottom: SPACING.m },
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: SPACING.l },
  actionCard: { flex: 1, alignItems: 'center', padding: SPACING.m, backgroundColor: COLORS.surface, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  actionIcon: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionLabel: { fontFamily: FONTS.medium, color: COLORS.text, fontSize: 11, textAlign: 'center' },
  deptCard: { padding: 14, marginBottom: 8, borderWidth: 0 },
  deptRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  deptName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 14 },
  deptDoctor: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  deptStats: { flexDirection: 'row', gap: 6 },
  deptBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  deptBadgeText: { fontFamily: FONTS.bold, fontSize: 10 },
});
