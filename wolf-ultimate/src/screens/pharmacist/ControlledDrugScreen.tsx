import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ShieldAlert, Lock, FileText, CheckCircle2, Clock, User } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';

interface ControlledDrugEntry {
  id: number; drug_name: string; schedule: string; batch_no: string;
  opening_balance: number; received: number; dispensed: number; closing_balance: number;
  unit: string; last_verified_by: string; last_verified_at: string;
  discrepancy: boolean; location: string;
}

const MOCK_REGISTER: ControlledDrugEntry[] = [
  { id: 1, drug_name: 'Morphine Sulfate 10mg/mL', schedule: 'Schedule H1', batch_no: 'B-2026-N005', opening_balance: 10, received: 5, dispensed: 7, closing_balance: 8, unit: 'amps', last_verified_by: 'Pharm. Sunita', last_verified_at: '2026-03-05T08:00:00Z', discrepancy: false, location: 'Narcotics Safe A' },
  { id: 2, drug_name: 'Midazolam 5mg/mL', schedule: 'Schedule H', batch_no: 'B-2026-N009', opening_balance: 20, received: 0, dispensed: 5, closing_balance: 15, unit: 'amps', last_verified_by: 'Pharm. Sunita', last_verified_at: '2026-03-05T08:00:00Z', discrepancy: false, location: 'Narcotics Safe A' },
  { id: 3, drug_name: 'Fentanyl 100mcg/2mL', schedule: 'Schedule H1', batch_no: 'B-2026-N012', opening_balance: 8, received: 0, dispensed: 3, closing_balance: 4, unit: 'amps', last_verified_by: 'Pharm. Ravi', last_verified_at: '2026-03-05T07:45:00Z', discrepancy: true, location: 'Narcotics Safe B' },
  { id: 4, drug_name: 'Diazepam 10mg/2mL', schedule: 'Schedule H', batch_no: 'B-2026-N015', opening_balance: 15, received: 10, dispensed: 8, closing_balance: 17, unit: 'amps', last_verified_by: 'Pharm. Sunita', last_verified_at: '2026-03-05T08:00:00Z', discrepancy: false, location: 'Narcotics Safe A' },
  { id: 5, drug_name: 'Tramadol 50mg', schedule: 'Schedule H', batch_no: 'B-2026-N020', opening_balance: 50, received: 0, dispensed: 12, closing_balance: 38, unit: 'tabs', last_verified_by: 'Pharm. Ravi', last_verified_at: '2026-03-05T07:45:00Z', discrepancy: false, location: 'Controlled Cabinet' },
];

export const ControlledDrugScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);
  const [entries] = useState(MOCK_REGISTER);

  const discrepancies = entries.filter(e => e.discrepancy).length;
  const totalBalance = entries.reduce((s, e) => s + e.closing_balance, 0);

  const handleVerify = (entry: ControlledDrugEntry) => {
    Alert.alert('✅ Verify Balance', `Confirm physical count of ${entry.drug_name}: ${entry.closing_balance} ${entry.unit}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Verified', onPress: () => Alert.alert('Verified', 'Balance count confirmed and logged.') },
    ]);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={22} color={COLORS.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Controlled Substances</Text>
            <Text style={styles.headerSub}>Narcotics Register • NDPS Act Compliance</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}>
          {/* Summary */}
          <View style={styles.summaryRow}>
            <GlassCard style={[styles.summaryCard, { borderLeftWidth: 3, borderLeftColor: '#8b5cf6' }]}>
              <Lock size={18} color="#8b5cf6" />
              <Text style={[styles.sumVal, { color: '#8b5cf6' }]}>{entries.length}</Text>
              <Text style={styles.sumLabel}>Substances</Text>
            </GlassCard>
            <GlassCard style={[styles.summaryCard, { borderLeftWidth: 3, borderLeftColor: '#10b981' }]}>
              <FileText size={18} color="#10b981" />
              <Text style={[styles.sumVal, { color: '#10b981' }]}>{totalBalance}</Text>
              <Text style={styles.sumLabel}>Total Units</Text>
            </GlassCard>
            <GlassCard style={[styles.summaryCard, { borderLeftWidth: 3, borderLeftColor: discrepancies > 0 ? '#ef4444' : '#10b981' }]}>
              <ShieldAlert size={18} color={discrepancies > 0 ? '#ef4444' : '#10b981'} />
              <Text style={[styles.sumVal, { color: discrepancies > 0 ? '#ef4444' : '#10b981' }]}>{discrepancies}</Text>
              <Text style={styles.sumLabel}>Discrepancy</Text>
            </GlassCard>
          </View>

          {/* Register Entries */}
          {entries.map(entry => (
            <GlassCard key={entry.id} style={[styles.entryCard, entry.discrepancy && styles.discrepancyBorder]}>
              <View style={styles.entryTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.entryDrug}>{entry.drug_name}</Text>
                  <Text style={styles.entrySchedule}>{entry.schedule} • {entry.batch_no}</Text>
                </View>
                {entry.discrepancy && (
                  <View style={styles.discBadge}><ShieldAlert size={12} color="#ef4444" /><Text style={styles.discText}>DISCREPANCY</Text></View>
                )}
              </View>

              {/* Balance Table */}
              <View style={styles.balTable}>
                <View style={styles.balRow}>
                  <Text style={styles.balHeader}>Opening</Text>
                  <Text style={styles.balHeader}>Received</Text>
                  <Text style={styles.balHeader}>Dispensed</Text>
                  <Text style={[styles.balHeader, { color: COLORS.text }]}>Closing</Text>
                </View>
                <View style={styles.balRow}>
                  <Text style={styles.balVal}>{entry.opening_balance}</Text>
                  <Text style={[styles.balVal, { color: '#10b981' }]}>+{entry.received}</Text>
                  <Text style={[styles.balVal, { color: '#f59e0b' }]}>-{entry.dispensed}</Text>
                  <Text style={[styles.balVal, { fontFamily: FONTS.bold, color: entry.discrepancy ? '#ef4444' : COLORS.text }]}>{entry.closing_balance} {entry.unit}</Text>
                </View>
              </View>

              <View style={styles.entryFooter}>
                <View style={styles.footerInfo}>
                  <User size={12} color={COLORS.textMuted} /><Text style={styles.footerText}>{entry.last_verified_by}</Text>
                  <Clock size={12} color={COLORS.textMuted} /><Text style={styles.footerText}>{new Date(entry.last_verified_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</Text>
                </View>
                <TouchableOpacity style={styles.verifyBtn} onPress={() => handleVerify(entry)}>
                  <CheckCircle2 size={14} color="#10b981" /><Text style={styles.verifyText}>Verify</Text>
                </TouchableOpacity>
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
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SPACING.m, paddingVertical: SPACING.s, marginTop: SPACING.m },
  backBtn: { padding: 10, backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border },
  headerTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 22 },
  headerSub: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: SPACING.l },
  summaryCard: { flex: 1, padding: SPACING.m, alignItems: 'center', gap: 6, borderWidth: 0 },
  sumVal: { fontFamily: FONTS.bold, fontSize: 24 },
  sumLabel: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 11 },
  entryCard: { padding: SPACING.m, marginBottom: 12, borderWidth: 0 },
  discrepancyBorder: { borderWidth: 1, borderColor: '#ef444440' },
  entryTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  entryDrug: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 15 },
  entrySchedule: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  discBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#ef444420', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  discText: { fontFamily: FONTS.bold, color: '#ef4444', fontSize: 9, letterSpacing: 0.5 },
  balTable: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 10, marginBottom: 10 },
  balRow: { flexDirection: 'row', justifyContent: 'space-around' },
  balHeader: { fontFamily: FONTS.bold, color: COLORS.textMuted, fontSize: 10, textTransform: 'uppercase' as any, letterSpacing: 0.5, textAlign: 'center', flex: 1 },
  balVal: { fontFamily: FONTS.medium, color: COLORS.text, fontSize: 15, textAlign: 'center', flex: 1, marginTop: 4 },
  entryFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  footerInfo: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  footerText: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 11 },
  verifyBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#10b98115', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: '#10b98130' },
  verifyText: { fontFamily: FONTS.bold, color: '#10b981', fontSize: 12 },
});
