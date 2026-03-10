import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Clock, ChevronRight, AlertTriangle, Scan } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';
import radiologyService, { ImagingOrder } from '../../services/radiologyService';

const STATUS_CFG: Record<string, { color: string; label: string }> = {
  ORDERED: { color: '#f59e0b', label: 'Ordered' },
  SCHEDULED: { color: '#8b5cf6', label: 'Scheduled' },
  IN_PROGRESS: { color: '#3b82f6', label: 'In Progress' },
  COMPLETED: { color: '#10b981', label: 'Completed' },
  REPORTED: { color: '#06b6d4', label: 'Reported' },
  VERIFIED: { color: '#64748b', label: 'Verified' },
};

const PRIORITY_CFG: Record<string, { color: string }> = {
  STAT: { color: '#ef4444' },
  URGENT: { color: '#f59e0b' },
  ROUTINE: { color: '#10b981' },
};

const MODALITY_COLORS: Record<string, string> = {
  'X-RAY': '#3b82f6', CT: '#ef4444', MRI: '#8b5cf6', USG: '#10b981', MAMMOGRAPHY: '#ec4899', FLUOROSCOPY: '#f59e0b',
};

export const ImagingWorklistScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);
  const [orders, setOrders] = useState<ImagingOrder[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('ALL');

  const load = async () => {
    try { setOrders(await radiologyService.getWorklist()); }
    catch (e) { console.error(e); }
    finally { setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = orders.filter(o => filter === 'ALL' || o.status === filter);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={22} color={COLORS.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Imaging Worklist</Text>
            <Text style={styles.headerSub}>{orders.length} studies • {orders.filter(o => o.status === 'IN_PROGRESS').length} in progress</Text>
          </View>
        </View>

        {/* Status Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{ paddingHorizontal: SPACING.m, gap: 8 }}>
          {[{ key: 'ALL', label: 'All' }, { key: 'ORDERED', label: 'Ordered' }, { key: 'SCHEDULED', label: 'Scheduled' }, { key: 'IN_PROGRESS', label: 'In Prog' }, { key: 'COMPLETED', label: 'Done' }].map(f => (
            <TouchableOpacity key={f.key} style={[styles.filterChip, filter === f.key && styles.filterActive]} onPress={() => setFilter(f.key)}>
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView
          contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
        >
          {filtered.map(order => {
            const st = STATUS_CFG[order.status];
            const pr = PRIORITY_CFG[order.priority];
            const modColor = MODALITY_COLORS[order.modality] || COLORS.primary;
            return (
              <TouchableOpacity key={order.id} onPress={() => navigation.navigate('ScanPerform', { orderId: order.id })}>
                <GlassCard style={styles.orderCard}>
                  <View style={styles.orderTop}>
                    <View style={[styles.modBadge, { backgroundColor: modColor + '20' }]}>
                      <Text style={[styles.modText, { color: modColor }]}>{order.modality}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.orderPatient}>{order.patient_name}</Text>
                      <Text style={styles.orderMeta}>{order.accession_no} • {order.patient_uhid}</Text>
                    </View>
                    <View style={[styles.priorityBadge, { backgroundColor: pr.color + '20' }]}>
                      {order.priority === 'STAT' && <AlertTriangle size={10} color={pr.color} />}
                      <Text style={[styles.priorityText, { color: pr.color }]}>{order.priority}</Text>
                    </View>
                  </View>
                  <Text style={styles.studyDesc}>{order.study_description}</Text>
                  <View style={styles.orderDetail}>
                    <View style={[styles.statusBadge, { backgroundColor: st.color + '20' }]}>
                      <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                    </View>
                    <Text style={styles.deptText}>{order.ordering_doctor} • {order.department}</Text>
                    {order.contrast && <View style={styles.contrastBadge}><Text style={styles.contrastText}>💉 Contrast</Text></View>}
                    <ChevronRight size={14} color={COLORS.textMuted} />
                  </View>
                </GlassCard>
              </TouchableOpacity>
            );
          })}
          {filtered.length === 0 && (
            <View style={styles.emptyState}><Scan size={48} color={COLORS.textMuted} /><Text style={styles.emptyText}>No studies</Text></View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
};

const getStyles = (COLORS: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SPACING.m, paddingVertical: SPACING.s, marginTop: SPACING.m },
  backBtn: { padding: 10, backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border },
  headerTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 22 },
  headerSub: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  filterScroll: { marginBottom: 4, maxHeight: 42 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  filterActive: { backgroundColor: '#3b82f620', borderColor: '#3b82f6' },
  filterText: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 12 },
  filterTextActive: { color: '#3b82f6' },
  orderCard: { padding: SPACING.m, marginBottom: 10, borderWidth: 0 },
  orderTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  modBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  modText: { fontFamily: FONTS.bold, fontSize: 11 },
  orderPatient: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 15 },
  orderMeta: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 10, marginTop: 1 },
  priorityBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  priorityText: { fontFamily: FONTS.bold, fontSize: 10 },
  studyDesc: { fontFamily: FONTS.medium, color: COLORS.text, fontSize: 13, marginBottom: 8 },
  orderDetail: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontFamily: FONTS.bold, fontSize: 10 },
  deptText: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 11, flex: 1 },
  contrastBadge: { backgroundColor: '#ef444415', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  contrastText: { fontFamily: FONTS.bold, color: '#ef4444', fontSize: 9 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 18, marginTop: 16 },
});
