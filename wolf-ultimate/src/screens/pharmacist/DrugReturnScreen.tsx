import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, RotateCcw, CheckCircle2, Clock, User, Package, AlertTriangle } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';

interface DrugReturnItem {
  id: number; drug_name: string; batch_no: string; quantity: number; unit: string;
  reason: 'EXPIRED' | 'DAMAGED' | 'RECALLED' | 'PATIENT_RETURN' | 'WARD_RETURN';
  returned_by: string; returned_at: string; mrp: number;
  status: 'PENDING' | 'APPROVED' | 'PROCESSED';
  ward_name?: string;
}

const REASON_CFG: Record<string, { color: string; label: string }> = {
  EXPIRED: { color: '#64748b', label: 'Expired' },
  DAMAGED: { color: '#f59e0b', label: 'Damaged' },
  RECALLED: { color: '#ef4444', label: 'Recalled' },
  PATIENT_RETURN: { color: '#3b82f6', label: 'Patient Return' },
  WARD_RETURN: { color: '#8b5cf6', label: 'Ward Return' },
};

const STATUS_CFG: Record<string, { color: string; label: string }> = {
  PENDING: { color: '#f59e0b', label: 'Pending' },
  APPROVED: { color: '#3b82f6', label: 'Approved' },
  PROCESSED: { color: '#10b981', label: 'Processed' },
};

const MOCK_RETURNS: DrugReturnItem[] = [
  { id: 1, drug_name: 'Ondansetron 4mg', batch_no: 'B-2025-O040', quantity: 25, unit: 'amps', reason: 'EXPIRED', returned_by: 'Pharm. Sunita', returned_at: '2026-03-05T09:00:00Z', mrp: 18, status: 'PENDING' },
  { id: 2, drug_name: 'Amoxicillin 500mg', batch_no: 'B-2025-A080', quantity: 100, unit: 'caps', reason: 'EXPIRED', returned_by: 'Ward Nurse Meena', returned_at: '2026-03-04T16:30:00Z', mrp: 5.5, status: 'APPROVED', ward_name: 'Ward A' },
  { id: 3, drug_name: 'Clopidogrel 75mg', batch_no: 'B-2026-C015', quantity: 30, unit: 'tabs', reason: 'RECALLED', returned_by: 'Pharm. Ravi', returned_at: '2026-03-04T14:00:00Z', mrp: 12, status: 'PENDING' },
  { id: 4, drug_name: 'Insulin Glargine 100IU', batch_no: 'B-2026-I010', quantity: 2, unit: 'pens', reason: 'DAMAGED', returned_by: 'Ward Nurse Priya', returned_at: '2026-03-05T08:20:00Z', mrp: 650, status: 'PENDING', ward_name: 'ICU' },
  { id: 5, drug_name: 'Metformin 500mg', batch_no: 'B-2026-D055', quantity: 10, unit: 'tabs', reason: 'PATIENT_RETURN', returned_by: 'Billing Counter', returned_at: '2026-03-05T09:15:00Z', mrp: 4.2, status: 'PENDING' },
  { id: 6, drug_name: 'Ciprofloxacin 500mg', batch_no: 'B-2025-C090', quantity: 50, unit: 'tabs', reason: 'WARD_RETURN', returned_by: 'Ward Nurse Anita', returned_at: '2026-03-04T12:00:00Z', mrp: 8, status: 'PROCESSED', ward_name: 'Ward B' },
];

export const DrugReturnScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);
  const [returns, setReturns] = useState(MOCK_RETURNS);

  const pending = returns.filter(r => r.status === 'PENDING').length;
  const totalValue = returns.filter(r => r.status === 'PENDING').reduce((s, r) => s + r.quantity * r.mrp, 0);

  const handleApprove = (item: DrugReturnItem) => {
    Alert.alert('Approve Return', `Approve return of ${item.quantity} ${item.unit} of ${item.drug_name}?\nValue: ₹${(item.quantity * item.mrp).toFixed(0)}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Approve', onPress: () => setReturns(prev => prev.map(r => r.id === item.id ? { ...r, status: 'APPROVED' as const } : r)) },
    ]);
  };

  const handleProcess = (item: DrugReturnItem) => {
    Alert.alert('Process Return', `Mark ${item.drug_name} as processed and update inventory?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Process', onPress: () => setReturns(prev => prev.map(r => r.id === item.id ? { ...r, status: 'PROCESSED' as const } : r)) },
    ]);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={22} color={COLORS.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Drug Returns</Text>
            <Text style={styles.headerSub}>{pending} pending • ₹{totalValue.toLocaleString()} value</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}>
          {returns.map(item => {
            const reason = REASON_CFG[item.reason];
            const status = STATUS_CFG[item.status];
            return (
              <GlassCard key={item.id} style={styles.returnCard}>
                <View style={styles.returnTop}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.returnDrug}>{item.drug_name}</Text>
                    <Text style={styles.returnMeta}>{item.batch_no} • {item.quantity} {item.unit}</Text>
                  </View>
                  <View style={[styles.badge, { backgroundColor: status.color + '20' }]}>
                    <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
                  </View>
                </View>

                <View style={styles.chipRow}>
                  <View style={[styles.reasonChip, { backgroundColor: reason.color + '15' }]}>
                    {item.reason === 'RECALLED' ? <AlertTriangle size={12} color={reason.color} /> : <RotateCcw size={12} color={reason.color} />}
                    <Text style={[styles.chipText, { color: reason.color }]}>{reason.label}</Text>
                  </View>
                  <Text style={styles.valueText}>₹{(item.quantity * item.mrp).toFixed(0)}</Text>
                </View>

                <View style={styles.infoRow}>
                  <User size={12} color={COLORS.textMuted} /><Text style={styles.infoText}>{item.returned_by}{item.ward_name ? ` • ${item.ward_name}` : ''}</Text>
                  <Clock size={12} color={COLORS.textMuted} /><Text style={styles.infoText}>{new Date(item.returned_at).toLocaleDateString()}</Text>
                </View>

                {item.status === 'PENDING' && (
                  <TouchableOpacity style={styles.approveBtn} onPress={() => handleApprove(item)}>
                    <CheckCircle2 size={16} color="#10b981" /><Text style={styles.approveBtnText}>Approve Return</Text>
                  </TouchableOpacity>
                )}
                {item.status === 'APPROVED' && (
                  <TouchableOpacity style={styles.processBtn} onPress={() => handleProcess(item)}>
                    <Package size={16} color="#3b82f6" /><Text style={styles.processBtnText}>Process & Update Stock</Text>
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
  returnCard: { padding: SPACING.m, marginBottom: 12, borderWidth: 0 },
  returnTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  returnDrug: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 15 },
  returnMeta: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  badge: { paddingHorizontal: 10, paddingVertical: 3, borderRadius: 10 },
  badgeText: { fontFamily: FONTS.bold, fontSize: 10, letterSpacing: 0.5 },
  chipRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  reasonChip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  chipText: { fontFamily: FONTS.bold, fontSize: 11 },
  valueText: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 14 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 10 },
  infoText: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 11, marginRight: 8 },
  approveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: '#10b98115', borderWidth: 1, borderColor: '#10b98130' },
  approveBtnText: { fontFamily: FONTS.bold, color: '#10b981', fontSize: 13 },
  processBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 12, backgroundColor: '#3b82f615', borderWidth: 1, borderColor: '#3b82f630' },
  processBtnText: { fontFamily: FONTS.bold, color: '#3b82f6', fontSize: 13 },
});
