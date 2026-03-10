import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Clock, CheckCircle2, Users, Phone, XCircle, PlayCircle } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';
import receptionService, { TokenItem } from '../../services/receptionService';

const STATUS_CFG: Record<string, { color: string; label: string; icon: any }> = {
  WAITING: { color: '#f59e0b', label: 'Waiting', icon: Clock },
  IN_CONSULTATION: { color: '#3b82f6', label: 'In Consult', icon: PlayCircle },
  COMPLETED: { color: '#10b981', label: 'Done', icon: CheckCircle2 },
  NO_SHOW: { color: '#ef4444', label: 'No Show', icon: XCircle },
  CANCELLED: { color: '#64748b', label: 'Cancelled', icon: XCircle },
};

const TYPE_CFG: Record<string, { color: string; label: string }> = {
  WALK_IN: { color: '#f59e0b', label: 'Walk-in' },
  SCHEDULED: { color: '#3b82f6', label: 'Scheduled' },
  FOLLOW_UP: { color: '#8b5cf6', label: 'Follow-up' },
};

export const TokenQueueScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);
  const [tokens, setTokens] = useState<TokenItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('ALL');

  const load = async () => {
    try { setTokens(await receptionService.getTokenQueue()); }
    catch (e) { console.error(e); }
    finally { setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const filtered = tokens.filter(t => filter === 'ALL' || t.status === filter);
  const waitingCount = tokens.filter(t => t.status === 'WAITING').length;
  const inConsult = tokens.filter(t => t.status === 'IN_CONSULTATION').length;

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={22} color={COLORS.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Token Queue</Text>
            <Text style={styles.headerSub}>{waitingCount} waiting • {inConsult} in consultation</Text>
          </View>
        </View>

        {/* Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll} contentContainerStyle={{ paddingHorizontal: SPACING.m, gap: 8 }}>
          {[{ key: 'ALL', label: 'All' }, { key: 'WAITING', label: 'Waiting' }, { key: 'IN_CONSULTATION', label: 'In Consult' }, { key: 'COMPLETED', label: 'Done' }].map(f => (
            <TouchableOpacity key={f.key} style={[styles.filterChip, filter === f.key && styles.filterActive]} onPress={() => setFilter(f.key)}>
              <Text style={[styles.filterText, filter === f.key && styles.filterTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <ScrollView
          contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
        >
          {filtered.map(token => {
            const st = STATUS_CFG[token.status];
            const tp = TYPE_CFG[token.appointment_type];
            const StIcon = st.icon;
            return (
              <GlassCard key={token.id} style={styles.tokenCard}>
                <View style={styles.tokenTop}>
                  <View style={styles.tokenBadge}>
                    <Text style={styles.tokenNo}>{token.token_no}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.tokenPatient}>{token.patient_name}</Text>
                    <Text style={styles.tokenMeta}>{token.patient_uhid} • {token.doctor_name}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: st.color + '20' }]}>
                    <StIcon size={12} color={st.color} />
                    <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                  </View>
                </View>

                <View style={styles.tokenDetail}>
                  <View style={[styles.typeBadge, { backgroundColor: tp.color + '15' }]}>
                    <Text style={[styles.typeText, { color: tp.color }]}>{tp.label}</Text>
                  </View>
                  <Text style={styles.deptText}>{token.department}</Text>
                  {token.status === 'WAITING' && token.estimated_wait != null && (
                    <View style={styles.waitChip}>
                      <Clock size={11} color="#f59e0b" />
                      <Text style={styles.waitText}>~{token.estimated_wait}m</Text>
                    </View>
                  )}
                  {token.position != null && token.status === 'WAITING' && (
                    <Text style={styles.posText}>#{token.position}</Text>
                  )}
                </View>

                {token.status === 'WAITING' && (
                  <View style={styles.actionRow}>
                    <TouchableOpacity style={styles.callBtn} onPress={() => receptionService.callToken(token.id)}>
                      <Phone size={14} color="#10b981" /><Text style={styles.callText}>Call Patient</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => receptionService.cancelToken(token.id)}>
                      <XCircle size={14} color="#ef4444" /><Text style={styles.cancelText}>No Show</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </GlassCard>
            );
          })}
          {filtered.length === 0 && (
            <View style={styles.emptyState}><Users size={48} color={COLORS.textMuted} /><Text style={styles.emptyText}>No tokens</Text></View>
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
  filterActive: { backgroundColor: COLORS.primary + '20', borderColor: COLORS.primary },
  filterText: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 12 },
  filterTextActive: { color: COLORS.primary },
  tokenCard: { padding: SPACING.m, marginBottom: 12, borderWidth: 0 },
  tokenTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  tokenBadge: { width: 48, height: 48, borderRadius: 14, backgroundColor: COLORS.primary + '15', justifyContent: 'center', alignItems: 'center' },
  tokenNo: { fontFamily: FONTS.bold, color: COLORS.primary, fontSize: 14 },
  tokenPatient: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 15 },
  tokenMeta: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontFamily: FONTS.bold, fontSize: 10 },
  tokenDetail: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 8 },
  typeBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  typeText: { fontFamily: FONTS.bold, fontSize: 10 },
  deptText: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 12 },
  waitChip: { flexDirection: 'row', alignItems: 'center', gap: 3 },
  waitText: { fontFamily: FONTS.medium, color: '#f59e0b', fontSize: 11 },
  posText: { fontFamily: FONTS.bold, color: COLORS.textMuted, fontSize: 12 },
  actionRow: { flexDirection: 'row', gap: 10, paddingTop: 8, borderTopWidth: 1, borderTopColor: COLORS.border },
  callBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: '#10b98115', borderWidth: 1, borderColor: '#10b98130' },
  callText: { fontFamily: FONTS.bold, color: '#10b981', fontSize: 12 },
  cancelBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#ef444415', borderWidth: 1, borderColor: '#ef444430' },
  cancelText: { fontFamily: FONTS.bold, color: '#ef4444', fontSize: 12 },
  emptyState: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 18, marginTop: 16 },
});
