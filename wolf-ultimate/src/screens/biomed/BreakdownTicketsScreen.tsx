import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, AlertTriangle, Clock, Wrench } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';
import biomedService, { MaintenanceTicket } from '../../services/biomedService';

const PRIORITY_COLORS = { LOW: '#3b82f6', MEDIUM: '#f59e0b', HIGH: '#ef4444', CRITICAL: '#7f1d1d' };
const STATUS_CFG: Record<string, { color: string; label: string }> = {
  OPEN: { color: '#ef4444', label: 'Open' }, IN_PROGRESS: { color: '#3b82f6', label: 'In Progress' },
  PARTS_AWAITED: { color: '#f59e0b', label: 'Parts Awaited' }, COMPLETED: { color: '#10b981', label: 'Completed' },
  CLOSED: { color: '#64748b', label: 'Closed' },
};
const TYPE_LABELS: Record<string, string> = { PREVENTIVE: '🛡️ PM', BREAKDOWN: '⚡ Breakdown', CORRECTIVE: '🔧 Corrective', CALIBRATION: '📏 Calibration' };

export const BreakdownTicketsScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);
  const [tickets, setTickets] = useState<MaintenanceTicket[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('ALL');

  const load = async () => {
    try { setTickets(await biomedService.getTickets()); }
    catch (e) { console.error(e); } finally { setRefreshing(false); }
  };
  useEffect(() => { load(); }, []);

  const filtered = tickets.filter(t => filter === 'ALL' || t.status === filter);

  const advanceStatus = (ticket: MaintenanceTicket) => {
    const next: Record<string, string> = { OPEN: 'IN_PROGRESS', IN_PROGRESS: 'COMPLETED', PARTS_AWAITED: 'IN_PROGRESS', COMPLETED: 'CLOSED' };
    const ns = next[ticket.status];
    if (!ns) return;
    Alert.alert('Update', `Move ${ticket.equipment_name} to ${ns}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Update', onPress: () => setTickets(prev => prev.map(t => t.id === ticket.id ? { ...t, status: ns as MaintenanceTicket['status'] } : t)) },
    ]);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={22} color={COLORS.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Maintenance Tickets</Text>
            <Text style={styles.headerSub}>{tickets.filter(t => t.status === 'OPEN' || t.status === 'IN_PROGRESS').length} active</Text>
          </View>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{ paddingHorizontal: SPACING.m, gap: 8 }}>
          {['ALL', 'OPEN', 'IN_PROGRESS', 'PARTS_AWAITED', 'COMPLETED'].map(f => (
            <TouchableOpacity key={f} style={[styles.filterChip, filter === f && styles.filterActive]} onPress={() => setFilter(f)}>
              <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f === 'ALL' ? 'All' : (STATUS_CFG[f]?.label || f)}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}>
          {filtered.map(ticket => {
            const st = STATUS_CFG[ticket.status];
            const pColor = PRIORITY_COLORS[ticket.priority];
            return (
              <GlassCard key={ticket.id} style={[styles.ticketCard, ticket.priority === 'CRITICAL' && { borderColor: '#ef444440', borderWidth: 1 }]}>
                <View style={styles.ticketTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.ticketName}>{ticket.equipment_name}</Text>
                    <Text style={styles.ticketMeta}>{ticket.asset_id} • {ticket.department}</Text>
                  </View>
                  <View style={[styles.priBadge, { backgroundColor: pColor + '20' }]}>
                    <Text style={[styles.priText, { color: pColor }]}>{ticket.priority}</Text>
                  </View>
                </View>
                <View style={styles.metaRow}>
                  <Text style={styles.typeLabel}>{TYPE_LABELS[ticket.type] || ticket.type}</Text>
                  <View style={[styles.statusBadge, { backgroundColor: st.color + '20' }]}>
                    <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                  </View>
                </View>
                <Text style={styles.descText}>{ticket.description}</Text>
                <View style={styles.infoRow}>
                  <Clock size={10} color={COLORS.textMuted} /><Text style={styles.infoText}>Reported: {ticket.reported_date} by {ticket.reported_by}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Wrench size={10} color={COLORS.textMuted} /><Text style={styles.infoText}>Assigned: {ticket.assigned_to}</Text>
                  {ticket.downtime_hours != null && <Text style={styles.downText}>⏱ {ticket.downtime_hours}h downtime</Text>}
                </View>
                {ticket.status !== 'CLOSED' && (
                  <TouchableOpacity style={styles.advanceBtn} onPress={() => advanceStatus(ticket)}>
                    <Text style={styles.advanceText}>Advance →</Text>
                  </TouchableOpacity>
                )}
              </GlassCard>
            );
          })}
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
  ticketCard: { padding: SPACING.m, marginBottom: 10, borderWidth: 0 },
  ticketTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 6 },
  ticketName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 15 },
  ticketMeta: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 11, marginTop: 1 },
  priBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  priText: { fontFamily: FONTS.bold, fontSize: 9 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  typeLabel: { fontFamily: FONTS.bold, color: COLORS.textSecondary, fontSize: 11 },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  statusText: { fontFamily: FONTS.bold, fontSize: 9 },
  descText: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 12, lineHeight: 18, marginBottom: 6 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 3 },
  infoText: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 10 },
  downText: { fontFamily: FONTS.bold, color: '#ef4444', fontSize: 10, marginLeft: 'auto' },
  advanceBtn: { alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: COLORS.primary + '15', borderWidth: 1, borderColor: COLORS.primary + '30', marginTop: 6 },
  advanceText: { fontFamily: FONTS.bold, color: COLORS.primary, fontSize: 12 },
});
