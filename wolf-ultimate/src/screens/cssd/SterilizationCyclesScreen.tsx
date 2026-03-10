import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Activity } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';
import cssdService, { SterilizationCycle } from '../../services/cssdService';

const STATUS_COLORS: Record<string, { color: string; label: string }> = {
  RUNNING: { color: '#3b82f6', label: '🔄 Running' }, COMPLETED: { color: '#10b981', label: '✅ Done' },
  FAILED: { color: '#ef4444', label: '❌ Failed' }, ABORTED: { color: '#64748b', label: '⛔ Aborted' },
};
const TYPE_COLORS: Record<string, string> = { PREVAC: '#8b5cf6', GRAVITY: '#3b82f6', FLASH: '#f59e0b', LOW_TEMP: '#06b6d4' };

export const SterilizationCyclesScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);
  const [cycles, setCycles] = useState<SterilizationCycle[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const load = async () => {
    try { setCycles(await cssdService.getCycles()); }
    catch (e) { console.error(e); } finally { setRefreshing(false); }
  };
  useEffect(() => { load(); }, []);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={22} color={COLORS.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Sterilization Cycles</Text>
            <Text style={styles.headerSub}>{cycles.filter(c => c.status === 'RUNNING').length} running • {cycles.filter(c => c.status === 'COMPLETED').length} completed</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor={COLORS.primary} />}>
          {cycles.map(cycle => {
            const st = STATUS_COLORS[cycle.status];
            return (
              <GlassCard key={cycle.id} style={[styles.cycleCard, cycle.status === 'RUNNING' && { borderColor: '#3b82f640', borderWidth: 1 }]}>
                <View style={styles.cycleTop}>
                  {cycle.status === 'RUNNING' && <Activity size={16} color="#3b82f6" />}
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cycleName}>{cycle.autoclave_name}</Text>
                    <Text style={styles.cycleMeta}>{cycle.cycle_number}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: st.color + '20' }]}>
                    <Text style={[styles.statusText, { color: st.color }]}>{st.label}</Text>
                  </View>
                </View>
                <View style={[styles.typeBadge, { backgroundColor: (TYPE_COLORS[cycle.cycle_type] || '#3b82f6') + '15' }]}>
                  <Text style={[styles.typeText, { color: TYPE_COLORS[cycle.cycle_type] || '#3b82f6' }]}>{cycle.cycle_type}</Text>
                </View>
                <View style={styles.paramsGrid}>
                  <View style={styles.paramItem}><Text style={styles.paramLabel}>Temp</Text><Text style={styles.paramValue}>{cycle.temperature}°C</Text></View>
                  <View style={styles.paramItem}><Text style={styles.paramLabel}>Pressure</Text><Text style={styles.paramValue}>{cycle.pressure} bar</Text></View>
                  <View style={styles.paramItem}><Text style={styles.paramLabel}>Duration</Text><Text style={styles.paramValue}>{cycle.duration_min} min</Text></View>
                  <View style={styles.paramItem}><Text style={styles.paramLabel}>Load</Text><Text style={styles.paramValue}>{cycle.load_count} items</Text></View>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoText}>Operator: {cycle.operator}</Text>
                  <Text style={styles.infoText}>Start: {cycle.start_time.split('T')[1]?.slice(0, 5)}</Text>
                  {cycle.end_time && <Text style={styles.infoText}>End: {cycle.end_time.split('T')[1]?.slice(0, 5)}</Text>}
                </View>
                {cycle.bi_result && (
                  <View style={[styles.biBadge, { backgroundColor: cycle.bi_result === 'PASS' ? '#10b98120' : cycle.bi_result === 'FAIL' ? '#ef444420' : '#f59e0b20' }]}>
                    <Text style={[styles.biText, { color: cycle.bi_result === 'PASS' ? '#10b981' : cycle.bi_result === 'FAIL' ? '#ef4444' : '#f59e0b' }]}>BI Result: {cycle.bi_result}</Text>
                  </View>
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
  cycleCard: { padding: SPACING.m, marginBottom: 12, borderWidth: 0 },
  cycleTop: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 6 },
  cycleName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 15 },
  cycleMeta: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 10, marginTop: 1 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  statusText: { fontFamily: FONTS.bold, fontSize: 10 },
  typeBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 3, borderRadius: 8, marginBottom: 8 },
  typeText: { fontFamily: FONTS.bold, fontSize: 10 },
  paramsGrid: { flexDirection: 'row', gap: 8, marginBottom: 8 },
  paramItem: { flex: 1, alignItems: 'center', padding: 8, backgroundColor: COLORS.surface, borderRadius: 10 },
  paramLabel: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 9, marginBottom: 2 },
  paramValue: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 13 },
  infoRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 6 },
  infoText: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 11 },
  biBadge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  biText: { fontFamily: FONTS.bold, fontSize: 10 },
});
