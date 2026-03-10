import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, IndianRupee, Banknote, CreditCard, QrCode, CheckCircle2, Clock, Send } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';

interface ShiftSummary {
  cashCollected: number; cardCollected: number; upiCollected: number;
  totalReceipts: number; totalRefunds: number; discountsGiven: number;
  registrations: number; appointments: number;
}

const MOCK_SUMMARY: ShiftSummary = {
  cashCollected: 8400, cardCollected: 3200, upiCollected: 1000,
  totalReceipts: 28, totalRefunds: 2, discountsGiven: 600,
  registrations: 34, appointments: 42,
};

const RECENT_TXN = [
  { id: 1, patient: 'Rakesh Kumar', amount: 500, mode: 'CASH', time: '09:45 AM', type: 'Consultation' },
  { id: 2, patient: 'Anita Devi', amount: 300, mode: 'UPI', time: '09:30 AM', type: 'Follow-up' },
  { id: 3, patient: 'Vijay Singh', amount: 2500, mode: 'CARD', time: '09:15 AM', type: 'Health Checkup' },
  { id: 4, patient: 'Sunita Gupta', amount: 100, mode: 'CASH', time: '09:00 AM', type: 'Registration' },
  { id: 5, patient: 'Mohan Lal', amount: 500, mode: 'CASH', time: '08:45 AM', type: 'Consultation' },
];

const MODE_ICON: Record<string, any> = { CASH: Banknote, CARD: CreditCard, UPI: QrCode };

export const DayEndReconciliationScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);
  const [summary] = useState(MOCK_SUMMARY);
  const totalCollected = summary.cashCollected + summary.cardCollected + summary.upiCollected;

  const handleClose = () => {
    Alert.alert('Close Shift', `Submit day-end reconciliation?\n\nTotal: ₹${totalCollected}\nReceipts: ${summary.totalReceipts}\nRefunds: ${summary.totalRefunds}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Submit & Close', onPress: () => Alert.alert('✅ Shift Closed', 'Day-end report submitted to accounts.') },
    ]);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={22} color={COLORS.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Day-End Report</Text>
            <Text style={styles.headerSub}>Shift Reconciliation • Today</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 120 }}>
          {/* Total Banner */}
          <LinearGradient colors={['#1e293b', '#0f172a']} style={styles.totalBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <Text style={styles.totalLabel}>Total Collected</Text>
            <Text style={styles.totalValue}>₹{totalCollected.toLocaleString()}</Text>
            <View style={styles.modeRow}>
              <View style={styles.modeItem}><Banknote size={14} color="#10b981" /><Text style={styles.modeText}>Cash ₹{summary.cashCollected.toLocaleString()}</Text></View>
              <View style={styles.modeItem}><CreditCard size={14} color="#3b82f6" /><Text style={styles.modeText}>Card ₹{summary.cardCollected.toLocaleString()}</Text></View>
              <View style={styles.modeItem}><QrCode size={14} color="#8b5cf6" /><Text style={styles.modeText}>UPI ₹{summary.upiCollected.toLocaleString()}</Text></View>
            </View>
          </LinearGradient>

          {/* Stats Grid */}
          <View style={styles.statsGrid}>
            {[
              { label: 'Receipts', value: summary.totalReceipts, color: '#10b981' },
              { label: 'Refunds', value: summary.totalRefunds, color: '#ef4444' },
              { label: 'Discounts', value: `₹${summary.discountsGiven}`, color: '#f59e0b' },
              { label: 'Registrations', value: summary.registrations, color: '#3b82f6' },
            ].map((s, i) => (
              <GlassCard key={i} style={styles.statCard}>
                <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                <Text style={styles.statLabel}>{s.label}</Text>
              </GlassCard>
            ))}
          </View>

          {/* Recent Transactions */}
          <Text style={styles.secTitle}>Recent Transactions</Text>
          {RECENT_TXN.map(txn => {
            const ModeIcon = MODE_ICON[txn.mode] || Banknote;
            return (
              <GlassCard key={txn.id} style={styles.txnCard}>
                <View style={styles.txnRow}>
                  <View style={styles.txnIconWrap}><ModeIcon size={18} color={COLORS.primary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.txnPatient}>{txn.patient}</Text>
                    <Text style={styles.txnMeta}>{txn.type} • {txn.mode}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={styles.txnAmount}>₹{txn.amount}</Text>
                    <View style={styles.txnTimeRow}><Clock size={10} color={COLORS.textMuted} /><Text style={styles.txnTime}>{txn.time}</Text></View>
                  </View>
                </View>
              </GlassCard>
            );
          })}

          {/* Close Shift */}
          <TouchableOpacity style={styles.closeBtn} onPress={handleClose}>
            <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.closeGrad}>
              <Send size={20} color="#fff" /><Text style={styles.closeText}>Submit Day-End & Close Shift</Text>
            </LinearGradient>
          </TouchableOpacity>
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
  totalBanner: { borderRadius: 24, padding: 20, marginBottom: SPACING.l, borderWidth: 1, borderColor: 'rgba(255,255,255,0.05)' },
  totalLabel: { fontFamily: FONTS.medium, color: '#94a3b8', fontSize: 13, marginBottom: 4 },
  totalValue: { fontFamily: FONTS.bold, color: '#10b981', fontSize: 36, marginBottom: 12 },
  modeRow: { flexDirection: 'row', gap: 12 },
  modeItem: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: 'rgba(255,255,255,0.06)', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  modeText: { fontFamily: FONTS.medium, color: '#94a3b8', fontSize: 11 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: SPACING.l },
  statCard: { width: '47%' as any, flexGrow: 1, padding: 14, alignItems: 'center', borderWidth: 0 },
  statValue: { fontFamily: FONTS.bold, fontSize: 24, marginBottom: 4 },
  statLabel: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 12 },
  secTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16, marginBottom: SPACING.m },
  txnCard: { padding: 12, marginBottom: 8, borderWidth: 0 },
  txnRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  txnIconWrap: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.primary + '15', justifyContent: 'center', alignItems: 'center' },
  txnPatient: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 14 },
  txnMeta: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  txnAmount: { fontFamily: FONTS.bold, color: '#10b981', fontSize: 15 },
  txnTimeRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  txnTime: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 10 },
  closeBtn: { borderRadius: 20, overflow: 'hidden', marginTop: SPACING.l },
  closeGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 20 },
  closeText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 15 },
});
