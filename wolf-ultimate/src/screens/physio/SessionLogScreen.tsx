import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Clock, TrendingDown, CheckCircle2, AlertCircle } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';
import physioService, { SessionLog } from '../../services/physioService';

const STATUS_CFG: Record<string, { color: string; label: string }> = {
  COMPLETED: { color: '#10b981', label: 'Completed' },
  PARTIAL: { color: '#f59e0b', label: 'Partial' },
  CANCELLED: { color: '#ef4444', label: 'Cancelled' },
};

export const SessionLogScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);
  const [sessions, setSessions] = useState<SessionLog[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try { setSessions(await physioService.getSessions()); }
    catch (e) { console.error(e); }
    finally { setRefreshing(false); }
  };

  useEffect(() => { load(); }, []);

  const renderPainBar = (before: number, after: number) => {
    const reduction = before - after;
    const color = reduction > 2 ? '#10b981' : reduction > 0 ? '#f59e0b' : '#ef4444';
    return (
      <View style={styles.painRow}>
        <View style={styles.painItem}>
          <Text style={styles.painLabel}>Before</Text>
          <View style={[styles.painDot, { backgroundColor: '#ef4444' }]} />
          <Text style={[styles.painValue, { color: '#ef4444' }]}>{before}/10</Text>
        </View>
        <TrendingDown size={14} color={color} />
        <View style={styles.painItem}>
          <Text style={styles.painLabel}>After</Text>
          <View style={[styles.painDot, { backgroundColor: color }]} />
          <Text style={[styles.painValue, { color }]}>{after}/10</Text>
        </View>
        <View style={[styles.reductionBadge, { backgroundColor: color + '20' }]}>
          <Text style={[styles.reductionText, { color }]}>↓{reduction}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={22} color={COLORS.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Session Log</Text>
            <Text style={styles.headerSub}>{sessions.length} sessions recorded</Text>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}
        >
          {sessions.map(session => {
            const st = STATUS_CFG[session.status];
            return (
              <GlassCard key={session.id} style={styles.sessionCard}>
                <View style={styles.sessionTop}>
                  <View style={styles.avatarCircle}><Text style={styles.avatarText}>{session.patient_name.charAt(0)}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.sessionPatient}>{session.patient_name}</Text>
                    <Text style={styles.sessionMeta}>{session.patient_uhid} • {session.therapist}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: st.color + '20' }]}>
                    <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                  </View>
                </View>

                <View style={styles.metricsRow}>
                  <View style={styles.metricItem}><Clock size={12} color={COLORS.textMuted} /><Text style={styles.metricText}>{session.duration_min}min</Text></View>
                  <View style={styles.metricItem}><CheckCircle2 size={12} color="#10b981" /><Text style={styles.metricText}>{session.exercises_done} exercises</Text></View>
                  <Text style={styles.dateText}>{session.date}</Text>
                </View>

                {renderPainBar(session.pain_before, session.pain_after)}

                <View style={styles.notesBox}>
                  <Text style={styles.notesText}>{session.notes}</Text>
                </View>
              </GlassCard>
            );
          })}

          {sessions.length === 0 && (
            <View style={styles.emptyState}><AlertCircle size={48} color={COLORS.textMuted} /><Text style={styles.emptyText}>No sessions yet</Text></View>
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
  sessionCard: { padding: SPACING.m, marginBottom: 12, borderWidth: 0 },
  sessionTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  avatarCircle: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary + '20', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontFamily: FONTS.bold, color: COLORS.primary, fontSize: 16 },
  sessionPatient: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 15 },
  sessionMeta: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 11, marginTop: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontFamily: FONTS.bold, fontSize: 10 },
  metricsRow: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 10 },
  metricItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metricText: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 11 },
  dateText: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 11, marginLeft: 'auto' },
  painRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  painItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  painLabel: { fontFamily: FONTS.bold, color: COLORS.textSecondary, fontSize: 9, textTransform: 'uppercase' as any },
  painDot: { width: 8, height: 8, borderRadius: 4 },
  painValue: { fontFamily: FONTS.bold, fontSize: 13 },
  reductionBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginLeft: 'auto' },
  reductionText: { fontFamily: FONTS.bold, fontSize: 12 },
  notesBox: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 10, borderWidth: 1, borderColor: COLORS.border },
  notesText: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 12, lineHeight: 18 },
  emptyState: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyText: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 18 },
});
