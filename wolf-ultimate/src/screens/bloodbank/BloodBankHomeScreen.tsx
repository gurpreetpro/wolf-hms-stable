import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Droplet, Clock, AlertTriangle, ChevronRight } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeContext';
import bloodBankService, { BloodBankDashboardStats, BloodUnit } from '../../services/bloodBankService';

const getGreeting = (): string => {
  const h = new Date().getHours();
  return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
};

const BG_COLORS: Record<string, string> = { 'A+': '#ef4444', 'A-': '#dc2626', 'B+': '#3b82f6', 'B-': '#2563eb', 'AB+': '#8b5cf6', 'AB-': '#7c3aed', 'O+': '#10b981', 'O-': '#059669' };
const STATUS_COLORS: Record<string, string> = { AVAILABLE: '#10b981', RESERVED: '#f59e0b', CROSS_MATCHED: '#3b82f6', ISSUED: '#8b5cf6', EXPIRED: '#ef4444', DISCARDED: '#64748b' };

export const BloodBankHomeScreen = ({ navigation }: any) => {
  const user = useAuthStore(s => s.user);
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);
  const [stats, setStats] = useState<BloodBankDashboardStats | null>(null);
  const [units, setUnits] = useState<BloodUnit[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [s, u] = await Promise.all([bloodBankService.getDashboard(), bloodBankService.getUnits()]);
      setStats(s); setUnits(u);
    } catch (e) { console.error(e); }
    finally { setRefreshing(false); }
  };
  useEffect(() => { load(); }, []);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <View><Text style={styles.greeting}>{getGreeting()}</Text><Text style={styles.name}>{user?.name || 'Blood Bank Tech'}</Text></View>
          <TouchableOpacity style={styles.bellBtn} onPress={load}><Droplet size={24} color="#ef4444" /></TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}>
          {/* Banner */}
          <LinearGradient colors={['#450a0a', '#1c1917']} style={styles.banner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.bannerTop}>
              <Droplet size={16} color="#ef4444" /><Text style={styles.liveText}>BLOOD BANK</Text>
              <Text style={styles.bannerValue}>{stats?.available ?? 0}/{stats?.total_units ?? 0}</Text>
            </View>
            <Text style={styles.bannerTitle}>Units Available</Text>
            <View style={styles.bannerChips}>
              <View style={styles.chip}><Clock size={12} color="#f59e0b" /><Text style={styles.chipText}>{stats?.expiring_soon ?? 0} expiring</Text></View>
              <View style={styles.chip}><AlertTriangle size={12} color="#3b82f6" /><Text style={styles.chipText}>{stats?.cross_match_pending ?? 0} cross-match</Text></View>
              <View style={styles.chip}><Droplet size={12} color="#10b981" /><Text style={styles.chipText}>{stats?.donations_today ?? 0} donations</Text></View>
            </View>
          </LinearGradient>

          {/* Stats */}
          <View style={styles.statsGrid}>
            {[
              { label: 'Available', value: stats?.available ?? '—', color: '#10b981' },
              { label: 'Reserved', value: stats?.reserved ?? '—', color: '#f59e0b' },
              { label: 'Issued', value: stats?.issued_today ?? '—', color: '#8b5cf6' },
              { label: 'Reactions', value: stats?.reactions_reported ?? '—', color: '#ef4444' },
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
              { label: 'Cross-match', color: '#3b82f6', screen: 'CrossMatchRequests' },
              { label: 'Donations', color: '#10b981', screen: 'DonationRecords' },
              { label: 'Components', color: '#8b5cf6', screen: 'ComponentSeparation' },
              { label: 'Reactions', color: '#ef4444', screen: 'TransfusionReactions' },
            ].map((a, i) => (
              <TouchableOpacity key={i} style={styles.actionCard} onPress={() => navigation.navigate(a.screen)}>
                <View style={[styles.actionDot, { backgroundColor: a.color }]} />
                <Text style={styles.actionLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Blood Inventory */}
          <Text style={styles.secTitle}>Current Inventory</Text>
          {units.map(unit => (
            <GlassCard key={unit.id} style={styles.unitCard}>
              <View style={styles.unitTop}>
                <View style={[styles.bgCircle, { backgroundColor: (BG_COLORS[unit.blood_group] || '#ef4444') + '20' }]}>
                  <Text style={[styles.bgText, { color: BG_COLORS[unit.blood_group] || '#ef4444' }]}>{unit.blood_group}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.unitName}>{unit.component}</Text>
                  <Text style={styles.unitMeta}>{unit.bag_number} • {unit.volume_ml}ml</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[unit.status] || '#3b82f6') + '20' }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLORS[unit.status] || '#3b82f6' }]}>{unit.status}</Text>
                </View>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailText}>📅 Collected: {unit.collection_date}</Text>
                <Text style={styles.detailText}>⏳ Expiry: {unit.expiry_date}</Text>
                <Text style={styles.detailText}>📍 {unit.storage_location}</Text>
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
  liveText: { fontFamily: FONTS.bold, color: '#ef4444', fontSize: 11, letterSpacing: 1, flex: 1 },
  bannerValue: { fontFamily: FONTS.bold, color: '#ef4444', fontSize: 28 },
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
  unitCard: { padding: SPACING.m, marginBottom: 8, borderWidth: 0 },
  unitTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  bgCircle: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center' },
  bgText: { fontFamily: FONTS.bold, fontSize: 14 },
  unitName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 14 },
  unitMeta: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 10, marginTop: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontFamily: FONTS.bold, fontSize: 9 },
  detailRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  detailText: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 10 },
});
