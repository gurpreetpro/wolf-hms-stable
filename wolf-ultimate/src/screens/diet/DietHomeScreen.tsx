import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { UtensilsCrossed, Users, ChevronRight, AlertTriangle, CheckCircle2, Clock } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeContext';
import dietService, { DietDashboardStats, DietPatient } from '../../services/dietService';

const getGreeting = (): string => {
  const h = new Date().getHours();
  return h < 12 ? 'Good Morning' : h < 17 ? 'Good Afternoon' : 'Good Evening';
};

const DIET_COLORS: Record<string, string> = {
  REGULAR: '#3b82f6', DIABETIC: '#f59e0b', RENAL: '#8b5cf6', CARDIAC: '#ef4444',
  SOFT: '#10b981', LIQUID: '#06b6d4', NBM: '#64748b', HIGH_PROTEIN: '#ec4899',
};

export const DietHomeScreen = ({ navigation }: any) => {
  const user = useAuthStore(s => s.user);
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);
  const [stats, setStats] = useState<DietDashboardStats | null>(null);
  const [patients, setPatients] = useState<DietPatient[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try {
      const [s, p] = await Promise.all([dietService.getDashboard(), dietService.getPatients()]);
      setStats(s); setPatients(p);
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
            <Text style={styles.name}>{user?.name || 'Dietitian'}</Text>
          </View>
          <TouchableOpacity style={styles.bellBtn} onPress={load}><UtensilsCrossed size={24} color={COLORS.text} /></TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}>
          {/* Banner */}
          <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.banner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={styles.bannerTop}>
              <View style={[styles.liveDot, { backgroundColor: '#10b981' }]} /><Text style={styles.liveText}>KITCHEN</Text>
              <Text style={styles.bannerValue}>{stats?.meals_delivered ?? 0}/{stats?.meals_today ?? 0}</Text>
            </View>
            <Text style={styles.bannerTitle}>Meals Delivered</Text>
            <View style={styles.bannerChips}>
              <View style={styles.chip}><Clock size={12} color="#f59e0b" /><Text style={styles.chipText}>{stats?.pending_orders ?? 0} pending</Text></View>
              <View style={styles.chip}><AlertTriangle size={12} color="#ef4444" /><Text style={styles.chipText}>{stats?.allergy_alerts ?? 0} allergy alerts</Text></View>
              <View style={styles.chip}><Users size={12} color="#8b5cf6" /><Text style={styles.chipText}>{stats?.npo_patients ?? 0} NPO/NBM</Text></View>
            </View>
          </LinearGradient>

          {/* Stats */}
          <View style={styles.statsGrid}>
            {[
              { label: 'Patients', value: stats?.active_patients ?? '—', color: '#3b82f6' },
              { label: 'Pending', value: stats?.pending_orders ?? '—', color: '#f59e0b' },
              { label: 'Delivered', value: stats?.meals_delivered ?? '—', color: '#10b981' },
              { label: 'NPO', value: stats?.npo_patients ?? '—', color: '#ef4444' },
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
              { label: 'Meal Plan', color: '#3b82f6', screen: 'MealPlanning' },
              { label: 'Kitchen', color: '#10b981', screen: 'KitchenOrders' },
              { label: 'Allergies', color: '#ef4444', screen: 'AllergyManagement' },
              { label: 'Analytics', color: '#8b5cf6', screen: 'NutritionAnalytics' },
            ].map((a, i) => (
              <TouchableOpacity key={i} style={styles.actionCard} onPress={() => navigation.navigate(a.screen)}>
                <View style={[styles.actionDot, { backgroundColor: a.color }]} />
                <Text style={styles.actionLabel}>{a.label}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Patient List */}
          <Text style={styles.secTitle}>Active Diet Patients</Text>
          {patients.filter(p => p.status !== 'DISCHARGED').map(p => (
            <GlassCard key={p.id} style={styles.patCard}>
              <View style={styles.patTop}>
                <View style={styles.avatarCircle}><Text style={styles.avatarText}>{p.name.charAt(0)}</Text></View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.patName}>{p.name}</Text>
                  <Text style={styles.patMeta}>{p.uhid} • {p.ward} {p.bed} • {p.diagnosis}</Text>
                </View>
                <ChevronRight size={16} color={COLORS.textMuted} />
              </View>
              <View style={styles.tagRow}>
                <View style={[styles.dietTag, { backgroundColor: (DIET_COLORS[p.diet_type] || '#3b82f6') + '20' }]}>
                  <Text style={[styles.dietText, { color: DIET_COLORS[p.diet_type] || '#3b82f6' }]}>{p.diet_type.replace('_', ' ')}</Text>
                </View>
                {p.calorie_target > 0 && <Text style={styles.calText}>{p.calorie_target} kcal</Text>}
                {p.allergies.length > 0 && (
                  <View style={styles.allergyTag}><AlertTriangle size={10} color="#ef4444" /><Text style={styles.allergyText}>{p.allergies.join(', ')}</Text></View>
                )}
                {p.status === 'NPO' && <View style={styles.npoTag}><Text style={styles.npoText}>⛔ NPO</Text></View>}
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
  patCard: { padding: SPACING.m, marginBottom: 8, borderWidth: 0 },
  patTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary + '20', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontFamily: FONTS.bold, color: COLORS.primary, fontSize: 16 },
  patName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 14 },
  patMeta: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 10, marginTop: 1 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, alignItems: 'center' },
  dietTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  dietText: { fontFamily: FONTS.bold, fontSize: 10 },
  calText: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 10 },
  allergyTag: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#ef444415', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  allergyText: { fontFamily: FONTS.bold, color: '#ef4444', fontSize: 9 },
  npoTag: { backgroundColor: '#64748b20', paddingHorizontal: 6, paddingVertical: 3, borderRadius: 6 },
  npoText: { fontFamily: FONTS.bold, color: '#64748b', fontSize: 9 },
});
