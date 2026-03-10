import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Pill, AlertTriangle, Clock, CheckCircle2,
  ChevronRight, Activity, Package, ShieldAlert,
  IndianRupee, Zap, ClipboardList, Search,
} from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeContext';
import pharmacyService, { PharmacyDashboardStats } from '../../services/pharmacyService';

const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  if (hour < 21) return 'Good Evening';
  return 'Night Shift';
};

export const PharmacistHomeScreen = ({ navigation }: any) => {
  const user = useAuthStore(state => state.user);
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);

  const [stats, setStats] = useState<PharmacyDashboardStats | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadDashboard = async () => {
    try {
      const data = await pharmacyService.getDashboard();
      setStats(data);
    } catch (error) {
      console.error('Failed to load Pharmacy dashboard:', error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => { loadDashboard(); }, []);

  const onRefresh = () => { setRefreshing(true); loadDashboard(); };

  const quickActions = [
    { icon: ClipboardList, label: 'Rx Queue', color: '#3b82f6', screen: 'PrescriptionQueue' },
    { icon: Search, label: 'Dispense', color: '#10b981', screen: 'Dispensing' },
    { icon: ShieldAlert, label: 'Controlled', color: '#ef4444', screen: 'ControlledDrug' },
    { icon: Package, label: 'Inventory', color: '#f59e0b', screen: 'DrugInventory' },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()}</Text>
            <Text style={styles.name}>{user?.name || 'Pharmacist'}</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn} onPress={loadDashboard}>
            <Pill size={24} color={COLORS.text} />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
        >
          {/* Revenue Banner */}
          <LinearGradient
            colors={['#1e293b', '#0f172a']}
            style={styles.revBanner}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          >
            <View style={styles.revRow}>
              <View style={[styles.revBadge, { backgroundColor: '#10b98130' }]}>
                <IndianRupee size={14} color="#10b981" />
                <Text style={[styles.revBadgeText, { color: '#10b981' }]}>TODAY</Text>
              </View>
              <Text style={styles.revValue}>₹{stats?.revenue_today?.toLocaleString() ?? '—'}</Text>
            </View>
            <Text style={styles.revLabel}>Pharmacy Revenue</Text>
            <View style={styles.revChips}>
              <View style={styles.revChip}>
                <CheckCircle2 size={12} color="#94a3b8" />
                <Text style={styles.revChipText}>{stats?.dispensed_today ?? 0} dispensed</Text>
              </View>
              <View style={styles.revChip}>
                <Clock size={12} color="#94a3b8" />
                <Text style={styles.revChipText}>{stats?.pending_prescriptions ?? 0} pending</Text>
              </View>
              <View style={styles.revChip}>
                <Zap size={12} color="#f59e0b" />
                <Text style={styles.revChipText}>{stats?.stat_orders ?? 0} STAT</Text>
              </View>
            </View>
          </LinearGradient>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            <GlassCard style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#f59e0b20' }]}>
                <ClipboardList size={22} color="#f59e0b" />
              </View>
              <Text style={styles.statValue}>{stats?.pending_prescriptions ?? '—'}</Text>
              <Text style={styles.statLabel}>Pending Rx</Text>
            </GlassCard>
            <GlassCard style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#10b98120' }]}>
                <CheckCircle2 size={22} color="#10b981" />
              </View>
              <Text style={styles.statValue}>{stats?.dispensed_today ?? '—'}</Text>
              <Text style={styles.statLabel}>Dispensed</Text>
            </GlassCard>
            <GlassCard style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#ef444420' }]}>
                <AlertTriangle size={22} color="#ef4444" />
              </View>
              <Text style={styles.statValue}>{stats?.out_of_stock_items ?? '—'}</Text>
              <Text style={styles.statLabel}>Out of Stock</Text>
            </GlassCard>
            <GlassCard style={styles.statCard}>
              <View style={[styles.statIcon, { backgroundColor: '#8b5cf620' }]}>
                <ShieldAlert size={22} color="#8b5cf6" />
              </View>
              <Text style={styles.statValue}>{stats?.controlled_pending ?? '—'}</Text>
              <Text style={styles.statLabel}>Controlled</Text>
            </GlassCard>
          </View>

          {/* Quick Actions */}
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.actionsRow}>
            {quickActions.map((action, i) => (
              <TouchableOpacity key={i} style={styles.actionCard} onPress={() => navigation.navigate(action.screen)}>
                <View style={[styles.actionIcon, { backgroundColor: action.color + '20' }]}>
                  <action.icon size={24} color={action.color} />
                </View>
                <Text style={styles.actionLabel}>{action.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Alerts */}
          <Text style={[styles.sectionTitle, { marginTop: SPACING.l }]}>Needs Attention</Text>
          <GlassCard style={styles.alertCard}>
            <TouchableOpacity style={styles.alertRow} onPress={() => navigation.navigate('DrugInventory')}>
              <View style={[styles.alertDot, { backgroundColor: '#ef4444' }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.alertTitle}>{stats?.out_of_stock_items ?? 0} Items Out of Stock</Text>
                <Text style={styles.alertSub}>Procurement action required</Text>
              </View>
              <ChevronRight size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </GlassCard>
          <GlassCard style={styles.alertCard}>
            <TouchableOpacity style={styles.alertRow} onPress={() => navigation.navigate('DrugInventory')}>
              <View style={[styles.alertDot, { backgroundColor: '#f59e0b' }]} />
              <View style={{ flex: 1 }}>
                <Text style={styles.alertTitle}>{stats?.expiring_soon ?? 0} Items Expiring Soon</Text>
                <Text style={styles.alertSub}>Within 30 days — review and return</Text>
              </View>
              <ChevronRight size={18} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </GlassCard>
          {(stats?.interaction_alerts ?? 0) > 0 && (
            <GlassCard style={styles.alertCard}>
              <TouchableOpacity style={styles.alertRow} onPress={() => navigation.navigate('ClinicalPharmacy')}>
                <View style={[styles.alertDot, { backgroundColor: '#8b5cf6' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertTitle}>{stats?.interaction_alerts} Drug Interaction Alert</Text>
                  <Text style={styles.alertSub}>Review flagged prescriptions</Text>
                </View>
                <ChevronRight size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </GlassCard>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const getStyles = (COLORS: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start',
    paddingHorizontal: SPACING.m, paddingVertical: SPACING.s, marginTop: SPACING.m, marginBottom: SPACING.s,
  },
  greeting: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 14, marginBottom: 4 },
  name: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 28 },
  bellBtn: { padding: 12, backgroundColor: COLORS.surface, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border },
  // Revenue Banner
  revBanner: { borderRadius: 24, padding: 20, marginBottom: SPACING.l, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  revRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  revBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 },
  revBadgeText: { fontFamily: FONTS.bold, fontSize: 11, letterSpacing: 1 },
  revValue: { fontFamily: FONTS.bold, color: '#10b981', fontSize: 22 },
  revLabel: { fontFamily: FONTS.bold, color: '#fff', fontSize: 20, marginBottom: 12 },
  revChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  revChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  revChipText: { fontFamily: FONTS.medium, color: '#94a3b8', fontSize: 11 },
  // Stats Grid
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: SPACING.l },
  statCard: { width: '47%' as any, flexGrow: 1, padding: SPACING.m, alignItems: 'center', borderRadius: 20, borderWidth: 0 },
  statIcon: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 10 },
  statValue: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 28, marginBottom: 2 },
  statLabel: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 13 },
  // Quick Actions
  sectionTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 18, marginBottom: SPACING.m },
  actionsRow: { flexDirection: 'row', gap: 12, marginBottom: SPACING.l },
  actionCard: { flex: 1, alignItems: 'center', padding: SPACING.m, backgroundColor: COLORS.surface, borderRadius: 20, borderWidth: 1, borderColor: COLORS.border },
  actionIcon: { width: 48, height: 48, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginBottom: 8 },
  actionLabel: { fontFamily: FONTS.medium, color: COLORS.text, fontSize: 12, textAlign: 'center' },
  // Alerts
  alertCard: { marginBottom: 10, padding: SPACING.m, borderWidth: 0 },
  alertRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  alertDot: { width: 10, height: 10, borderRadius: 5 },
  alertTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 14 },
  alertSub: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
});
