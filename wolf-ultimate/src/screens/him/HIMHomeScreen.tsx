import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { FileText, Archive, Clock, AlertTriangle } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeContext';
import medRecordsService, { HIMDashboardStats, MedicalRecord } from '../../services/medRecordsService';

const getGreeting = (): string => {
  const h = new Date().getHours();
  return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
};

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: '#3b82f6', PENDING_CODING: '#f59e0b', CODED: '#10b981',
  FILED: '#8b5cf6', RETRIEVED: '#06b6d4', ARCHIVED: '#64748b',
};
const TYPE_COLORS: Record<string, string> = { IPD: '#ef4444', OPD: '#3b82f6', EMERGENCY: '#f59e0b', DAYCARE: '#10b981', MLC: '#dc2626' };

export const HIMHomeScreen = ({ navigation }: any) => {
  const user = useAuthStore(s => s.user);
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);
  const [stats, setStats] = useState<HIMDashboardStats | null>(null);
  const [records, setRecords] = useState<MedicalRecord[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [s, r] = await Promise.all([medRecordsService.getDashboard(), medRecordsService.getRecords()]);
      setStats(s); setRecords(r);
    } catch (e) { console.error(e); }
    finally { setRefreshing(false); }
  };
  useEffect(() => { load(); }, []);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <View><Text style={styles.greeting}>{getGreeting()}</Text><Text style={styles.name}>{user?.name || 'HIM Staff'}</Text></View>
          <TouchableOpacity style={styles.bellBtn} onPress={load}><Archive size={24} color={COLORS.text} /></TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}>
          {/* Banner */}
          <LinearGradient colors={['#1e1b4b', '#0f172a']} style={styles.banner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.bannerTop}>
              <FileText size={16} color="#8b5cf6" /><Text style={styles.liveText}>MEDICAL RECORDS</Text>
              <Text style={styles.bannerValue}>{stats?.total_records?.toLocaleString() ?? '—'}</Text>
            </View>
            <Text style={styles.bannerTitle}>Total Records</Text>
            <View style={styles.bannerChips}>
              <View style={styles.chip}><Clock size={12} color="#f59e0b" /><Text style={styles.chipText}>{stats?.pending_filing ?? 0} to file</Text></View>
              <View style={styles.chip}><AlertTriangle size={12} color="#ef4444" /><Text style={styles.chipText}>{stats?.pending_coding ?? 0} to code</Text></View>
              <View style={styles.chip}><FileText size={12} color="#3b82f6" /><Text style={styles.chipText}>{stats?.active_requests ?? 0} requests</Text></View>
            </View>
          </LinearGradient>

          {/* Stats */}
          <View style={styles.statsGrid}>
            {[
              { label: 'Filing', value: stats?.pending_filing ?? '—', color: '#f59e0b' },
              { label: 'Coding', value: stats?.pending_coding ?? '—', color: '#ef4444' },
              { label: 'Coded', value: stats?.coded_today ?? '—', color: '#10b981' },
              { label: 'MLC', value: stats?.mlc_pending ?? '—', color: '#dc2626' },
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
              { label: 'Requests', color: '#3b82f6', screen: 'RecordRequests' },
              { label: 'ICD Coding', color: '#8b5cf6', screen: 'ICDCoding' },
              { label: 'MLC Cases', color: '#ef4444', screen: 'MLCCases' },
              { label: 'Audit Trail', color: '#10b981', screen: 'AuditTrail' },
            ].map((a, i) => (
              <TouchableOpacity key={i} style={styles.actionCard} onPress={() => navigation.navigate(a.screen)}>
                <View style={[styles.actionDot, { backgroundColor: a.color }]} />
                <Text style={styles.actionLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Records */}
          <Text style={styles.secTitle}>Recent Records</Text>
          {records.map(rec => (
            <GlassCard key={rec.id} style={[styles.recCard, rec.type === 'MLC' && { borderColor: '#dc262640', borderWidth: 1 }]}>
              <View style={styles.recTop}>
                <View style={[styles.typeBadge, { backgroundColor: (TYPE_COLORS[rec.type] || '#3b82f6') + '20' }]}>
                  <Text style={[styles.typeText, { color: TYPE_COLORS[rec.type] || '#3b82f6' }]}>{rec.type}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.recName}>{rec.patient_name}</Text>
                  <Text style={styles.recMeta}>{rec.mr_number} • {rec.uhid}</Text>
                </View>
                <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[rec.status] || '#3b82f6') + '20' }]}>
                  <Text style={[styles.statusText, { color: STATUS_COLORS[rec.status] || '#3b82f6' }]}>{rec.status.replace('_', ' ')}</Text>
                </View>
              </View>
              <View style={styles.recDetail}>
                <Text style={styles.detailText}>{rec.department} • {rec.consultant}</Text>
                <Text style={styles.detailText}>📅 {rec.admission_date}{rec.discharge_date ? ` → ${rec.discharge_date}` : ' (Active)'}</Text>
                {rec.location && <Text style={styles.locText}>📍 {rec.location}</Text>}
                {rec.icd_codes && rec.icd_codes.length > 0 && <Text style={styles.icdText}>🏷️ {rec.icd_codes.join(', ')}</Text>}
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
  liveText: { fontFamily: FONTS.bold, color: '#8b5cf6', fontSize: 11, letterSpacing: 1, flex: 1 },
  bannerValue: { fontFamily: FONTS.bold, color: '#8b5cf6', fontSize: 24 },
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
  recCard: { padding: SPACING.m, marginBottom: 8, borderWidth: 0 },
  recTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  typeBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  typeText: { fontFamily: FONTS.bold, fontSize: 10 },
  recName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 14 },
  recMeta: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 10, marginTop: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontFamily: FONTS.bold, fontSize: 9 },
  recDetail: { gap: 2 },
  detailText: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 11 },
  locText: { fontFamily: FONTS.medium, color: '#8b5cf6', fontSize: 11 },
  icdText: { fontFamily: FONTS.medium, color: '#10b981', fontSize: 11 },
});
