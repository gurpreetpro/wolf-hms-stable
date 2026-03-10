import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Droplet, Clock } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';
import bloodBankService, { CrossMatchRequest } from '../../services/bloodBankService';

const STATUS_CFG: Record<string, { color: string; label: string }> = {
  PENDING: { color: '#f59e0b', label: '⏳ Pending' }, CROSS_MATCHING: { color: '#3b82f6', label: '🔬 Testing' },
  COMPATIBLE: { color: '#10b981', label: '✅ Compatible' }, ISSUED: { color: '#8b5cf6', label: '📤 Issued' },
  CANCELLED: { color: '#64748b', label: '❌ Cancelled' },
};

export const CrossMatchRequestsScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);
  const [requests, setRequests] = useState<CrossMatchRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try { setRequests(await bloodBankService.getCrossMatchRequests()); }
    catch (e) { console.error(e); } finally { setRefreshing(false); }
  };
  useEffect(() => { load(); }, []);

  const advanceStatus = (req: CrossMatchRequest) => {
    const next: Record<string, string> = { PENDING: 'CROSS_MATCHING', CROSS_MATCHING: 'COMPATIBLE', COMPATIBLE: 'ISSUED' };
    const ns = next[req.status];
    if (!ns) return;
    Alert.alert('Update', `Move ${req.patient_name} to ${ns}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Update', onPress: () => setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: ns as CrossMatchRequest['status'] } : r)) },
    ]);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={22} color={COLORS.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Cross-Match</Text>
            <Text style={styles.headerSub}>{requests.filter(r => r.status === 'PENDING').length} pending</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}>
          {requests.map(req => {
            const st = STATUS_CFG[req.status];
            return (
              <GlassCard key={req.id} style={styles.reqCard}>
                <View style={styles.reqTop}>
                  <View style={styles.bgCircle}><Text style={styles.bgText}>{req.blood_group}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reqName}>{req.patient_name}</Text>
                    <Text style={styles.reqMeta}>{req.patient_uhid} • {req.ward} {req.bed}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: st.color + '20' }]}>
                    <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                  </View>
                </View>
                <View style={styles.detailGrid}>
                  <View style={styles.detailItem}><Text style={styles.detailLabel}>Component</Text><Text style={styles.detailValue}>{req.component_needed}</Text></View>
                  <View style={styles.detailItem}><Text style={styles.detailLabel}>Units</Text><Text style={styles.detailValue}>{req.units_requested}</Text></View>
                  <View style={styles.detailItem}><Text style={styles.detailLabel}>By</Text><Text style={styles.detailValue}>{req.requested_by}</Text></View>
                </View>
                <Text style={styles.indication}>💉 {req.indication}</Text>
                {req.matched_bags && req.matched_bags.length > 0 && (
                  <Text style={styles.matchedText}>🔗 Matched: {req.matched_bags.join(', ')}</Text>
                )}
                {req.status !== 'ISSUED' && req.status !== 'CANCELLED' && (
                  <TouchableOpacity style={styles.advanceBtn} onPress={() => advanceStatus(req)}>
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
  reqCard: { padding: SPACING.m, marginBottom: 12, borderWidth: 0 },
  reqTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  bgCircle: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#ef444420', justifyContent: 'center', alignItems: 'center' },
  bgText: { fontFamily: FONTS.bold, color: '#ef4444', fontSize: 14 },
  reqName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 15 },
  reqMeta: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 10, marginTop: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontFamily: FONTS.bold, fontSize: 10 },
  detailGrid: { flexDirection: 'row', gap: 8, marginBottom: 6 },
  detailItem: { flex: 1, padding: 8, backgroundColor: COLORS.surface, borderRadius: 8, alignItems: 'center' },
  detailLabel: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 9, marginBottom: 2 },
  detailValue: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 12 },
  indication: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 12, marginBottom: 4 },
  matchedText: { fontFamily: FONTS.medium, color: '#10b981', fontSize: 11, marginBottom: 6 },
  advanceBtn: { alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: COLORS.primary + '15', borderWidth: 1, borderColor: COLORS.primary + '30', marginTop: 4 },
  advanceText: { fontFamily: FONTS.bold, color: COLORS.primary, fontSize: 12 },
});
