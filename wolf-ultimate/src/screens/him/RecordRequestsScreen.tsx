import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, FileText } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';
import medRecordsService, { RecordRequest } from '../../services/medRecordsService';

const STATUS_CFG: Record<string, { color: string; label: string }> = {
  PENDING: { color: '#f59e0b', label: '⏳ Pending' }, RETRIEVED: { color: '#3b82f6', label: '📂 Retrieved' },
  ISSUED: { color: '#10b981', label: '📤 Issued' }, RETURNED: { color: '#8b5cf6', label: '✅ Returned' },
};
const PURPOSE_COLORS: Record<string, string> = { LEGAL: '#ef4444', INSURANCE: '#3b82f6', FOLLOW_UP: '#10b981', RESEARCH: '#8b5cf6', AUDIT: '#f59e0b', MLC: '#dc2626' };

export const RecordRequestsScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);
  const [requests, setRequests] = useState<RecordRequest[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try { setRequests(await medRecordsService.getRequests()); }
    catch (e) { console.error(e); } finally { setRefreshing(false); }
  };
  useEffect(() => { load(); }, []);

  const advance = (req: RecordRequest) => {
    const next: Record<string, string> = { PENDING: 'RETRIEVED', RETRIEVED: 'ISSUED', ISSUED: 'RETURNED' };
    const ns = next[req.status];
    if (!ns) return;
    Alert.alert('Update', `Move to ${ns}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Update', onPress: () => setRequests(prev => prev.map(r => r.id === req.id ? { ...r, status: ns as RecordRequest['status'] } : r)) },
    ]);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={22} color={COLORS.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Record Requests</Text>
            <Text style={styles.headerSub}>{requests.filter(r => r.status === 'PENDING').length} pending</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}>
          {requests.map(req => {
            const st = STATUS_CFG[req.status];
            const pColor = PURPOSE_COLORS[req.purpose] || '#3b82f6';
            return (
              <GlassCard key={req.id} style={[styles.reqCard, req.priority === 'URGENT' && { borderColor: '#ef444440', borderWidth: 1 }]}>
                <View style={styles.reqTop}>
                  <FileText size={16} color={pColor} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.reqName}>{req.patient_name}</Text>
                    <Text style={styles.reqMeta}>{req.mr_number} • {req.patient_uhid}</Text>
                  </View>
                  {req.priority === 'URGENT' && <View style={styles.urgentBadge}><Text style={styles.urgentText}>🚨 URGENT</Text></View>}
                  <View style={[styles.statusBadge, { backgroundColor: st.color + '20' }]}>
                    <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                  </View>
                </View>
                <View style={styles.detailGrid}>
                  <View style={styles.detailItem}><Text style={styles.dLabel}>Purpose</Text><View style={[styles.purposeBadge, { backgroundColor: pColor + '15' }]}><Text style={[styles.purposeText, { color: pColor }]}>{req.purpose}</Text></View></View>
                  <View style={styles.detailItem}><Text style={styles.dLabel}>By</Text><Text style={styles.dValue}>{req.requested_by}</Text></View>
                  <View style={styles.detailItem}><Text style={styles.dLabel}>Due</Text><Text style={styles.dValue}>{req.due_date}</Text></View>
                </View>
                {req.status !== 'RETURNED' && (
                  <TouchableOpacity style={styles.advanceBtn} onPress={() => advance(req)}>
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
  reqName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 15 },
  reqMeta: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 10, marginTop: 1 },
  urgentBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, backgroundColor: '#ef444420' },
  urgentText: { fontFamily: FONTS.bold, color: '#ef4444', fontSize: 9 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontFamily: FONTS.bold, fontSize: 10 },
  detailGrid: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  detailItem: { flex: 1, padding: 8, backgroundColor: COLORS.surface, borderRadius: 8, alignItems: 'center', gap: 2 },
  dLabel: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 9 },
  dValue: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 11 },
  purposeBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  purposeText: { fontFamily: FONTS.bold, fontSize: 9 },
  advanceBtn: { alignItems: 'center', paddingVertical: 10, borderRadius: 12, backgroundColor: COLORS.primary + '15', borderWidth: 1, borderColor: COLORS.primary + '30' },
  advanceText: { fontFamily: FONTS.bold, color: COLORS.primary, fontSize: 12 },
});
