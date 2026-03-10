import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Stethoscope, AlertTriangle, Users, Clock, BedDouble,
  ArrowRight, Shield, Activity, ChevronRight, Phone,
  CalendarClock, Siren,
} from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeContext';
import rmoService, { RmoDashboardStats } from '../../services/rmoService';

// Time greeting
const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  if (hour < 21) return 'Good Evening';
  return 'On Night Duty';
};

// Shift badge color
const getShiftColor = (shift?: string) => {
  switch (shift) {
    case 'MORNING': return '#22c55e';
    case 'EVENING': return '#f59e0b';
    case 'NIGHT': return '#8b5cf6';
    default: return '#64748b';
  }
};

export const RmoHomeScreen = ({ navigation }: any) => {
  const user = useAuthStore(state => state.user);
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);

  const [stats, setStats] = useState<RmoDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = async () => {
    try {
      const data = await rmoService.getDashboard();
      setStats(data);
    } catch (error) {
      console.error('Failed to load RMO dashboard:', error);
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

  const currentShift = stats?.current_shift;

  // Quick Action Items
  const quickActions = [
    { icon: CalendarClock, label: 'Duty Roster', color: '#3b82f6', screen: 'DutyRoster' },
    { icon: Phone, label: 'Consultants', color: '#10b981', screen: 'ConsultantStatus' },
    { icon: Siren, label: 'Emergency', color: '#ef4444', screen: 'RmoEmergency' },
    { icon: Shield, label: 'Escalate', color: '#f59e0b', screen: 'Escalation' },
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
            <Text style={styles.name}>Dr. {user?.name || 'RMO'}</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn} onPress={loadDashboard}>
            <Stethoscope size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        >
          {/* Current Shift Banner */}
          {currentShift && (
            <LinearGradient
              colors={['#1e293b', '#0f172a']}
              style={styles.shiftBanner}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.shiftRow}>
                <View style={[styles.shiftBadge, { backgroundColor: getShiftColor(currentShift.shift_type) + '30' }]}>
                  <Clock size={16} color={getShiftColor(currentShift.shift_type)} />
                  <Text style={[styles.shiftBadgeText, { color: getShiftColor(currentShift.shift_type) }]}>
                    {currentShift.shift_type} SHIFT
                  </Text>
                </View>
                <Text style={styles.shiftTime}>
                  {currentShift.start_time} — {currentShift.end_time}
                </Text>
              </View>
              <Text style={styles.shiftDept}>{currentShift.department}</Text>
              <View style={styles.wardChips}>
                {stats?.assigned_wards.map((ward, i) => (
                  <View key={i} style={styles.wardChip}>
                    <BedDouble size={12} color="#94a3b8" />
                    <Text style={styles.wardChipText}>{ward}</Text>
                  </View>
                ))}
              </View>
            </LinearGradient>
          )}

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <GlassCard style={styles.statCard} intensity={60}>
              <View style={[styles.statIcon, { backgroundColor: '#ef444420' }]}>
                <AlertTriangle size={22} color="#ef4444" />
              </View>
              <Text style={styles.statValue}>{stats?.critical_patients ?? '—'}</Text>
              <Text style={styles.statLabel}>Critical</Text>
            </GlassCard>

            <GlassCard style={styles.statCard} intensity={60}>
              <View style={[styles.statIcon, { backgroundColor: '#3b82f620' }]}>
                <Users size={22} color="#3b82f6" />
              </View>
              <Text style={styles.statValue}>{stats?.total_patients ?? '—'}</Text>
              <Text style={styles.statLabel}>Patients</Text>
            </GlassCard>

            <GlassCard style={styles.statCard} intensity={60}>
              <View style={[styles.statIcon, { backgroundColor: '#f59e0b20' }]}>
                <Activity size={22} color="#f59e0b" />
              </View>
              <Text style={styles.statValue}>{stats?.pending_tasks ?? '—'}</Text>
              <Text style={styles.statLabel}>Tasks</Text>
            </GlassCard>

            <GlassCard style={styles.statCard} intensity={60}>
              <View style={[styles.statIcon, { backgroundColor: '#8b5cf620' }]}>
                <Shield size={22} color="#8b5cf6" />
              </View>
              <Text style={styles.statValue}>{stats?.active_escalations ?? '—'}</Text>
              <Text style={styles.statLabel}>Escalations</Text>
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

          {/* Priority Alert Section */}
          <Text style={[styles.sectionTitle, { marginTop: SPACING.l }]}>Priority Alerts</Text>
          <GlassCard style={styles.alertCard}>
            <View style={styles.alertRow}>
              <View style={[styles.alertDot, { backgroundColor: '#ef4444' }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.alertTitle}>ICU Bed 3 — Vitals Deteriorating</Text>
                <Text style={styles.alertSub}>SpO₂ dropped to 88%, BP falling</Text>
              </View>
              <ChevronRight size={18} color={COLORS.textSecondary} />
            </View>
          </GlassCard>
          <GlassCard style={styles.alertCard}>
            <View style={styles.alertRow}>
              <View style={[styles.alertDot, { backgroundColor: '#f59e0b' }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.alertTitle}>Ward B, Rm 204 — Lab Critical</Text>
                <Text style={styles.alertSub}>Creatinine 4.2, needs review</Text>
              </View>
              <ChevronRight size={18} color={COLORS.textSecondary} />
            </View>
          </GlassCard>
          <GlassCard style={styles.alertCard}>
            <View style={styles.alertRow}>
              <View style={[styles.alertDot, { backgroundColor: '#3b82f6' }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.alertTitle}>New Emergency — Casualty</Text>
                <Text style={styles.alertSub}>Chest pain, male, age 58</Text>
              </View>
              <ChevronRight size={18} color={COLORS.textSecondary} />
            </View>
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
  // Shift Banner
  shiftBanner: {
    borderRadius: 24, padding: 20, marginBottom: SPACING.l,
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)',
  },
  shiftRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  shiftBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20,
  },
  shiftBadgeText: { fontFamily: FONTS.bold, fontSize: 11, letterSpacing: 1 },
  shiftTime: { fontFamily: FONTS.medium, color: '#94a3b8', fontSize: 13 },
  shiftDept: { fontFamily: FONTS.bold, color: '#fff', fontSize: 20, marginBottom: 12 },
  wardChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  wardChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 10,
    paddingVertical: 5, borderRadius: 12,
  },
  wardChipText: { fontFamily: FONTS.medium, color: '#94a3b8', fontSize: 12 },
  // Stats Grid (2x2)
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
