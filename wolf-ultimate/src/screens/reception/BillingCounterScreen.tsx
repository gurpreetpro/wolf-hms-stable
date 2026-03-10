import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, IndianRupee, CreditCard, Banknote, QrCode, Printer, CheckCircle2 } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';

interface BillItem {
  id: number; description: string; amount: number; category: string;
}

const FEE_TEMPLATES: BillItem[] = [
  { id: 1, description: 'OPD Consultation Fee', amount: 500, category: 'Consultation' },
  { id: 2, description: 'Follow-up Visit', amount: 300, category: 'Consultation' },
  { id: 3, description: 'Emergency Registration', amount: 200, category: 'Registration' },
  { id: 4, description: 'Registration Fee (New)', amount: 100, category: 'Registration' },
  { id: 5, description: 'Health Checkup Package', amount: 2500, category: 'Package' },
  { id: 6, description: 'Medical Certificate', amount: 150, category: 'Certificate' },
];

export const BillingCounterScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);
  const [patientInfo, setPatientInfo] = useState('');
  const [selectedItems, setSelectedItems] = useState<BillItem[]>([]);
  const [discount, setDiscount] = useState('');
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'CARD' | 'UPI'>('CASH');

  const subtotal = selectedItems.reduce((s, i) => s + i.amount, 0);
  const discountAmt = Number(discount) || 0;
  const total = Math.max(0, subtotal - discountAmt);

  const toggleItem = (item: BillItem) => {
    setSelectedItems(prev =>
      prev.find(i => i.id === item.id) ? prev.filter(i => i.id !== item.id) : [...prev, item]
    );
  };

  const handleCollect = () => {
    if (!patientInfo.trim()) { Alert.alert('Required', 'Enter patient name or UHID.'); return; }
    if (selectedItems.length === 0) { Alert.alert('Required', 'Select at least one fee item.'); return; }
    Alert.alert('Collect Payment', `Collect ₹${total} via ${paymentMode} from ${patientInfo}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Collect & Print', onPress: () => { Alert.alert('✅ Payment Collected', `₹${total} received. Receipt generated.`); setSelectedItems([]); setPatientInfo(''); setDiscount(''); }},
    ]);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={22} color={COLORS.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Billing Counter</Text>
            <Text style={styles.headerSub}>OPD Fee Collection & Receipts</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 120 }}>
          {/* Patient */}
          <Text style={styles.secTitle}>Patient</Text>
          <View style={styles.patientRow}>
            <TextInput style={styles.patientInput} placeholder="Patient Name / UHID" placeholderTextColor={COLORS.textMuted} value={patientInfo} onChangeText={setPatientInfo} />
          </View>

          {/* Fee Items */}
          <Text style={[styles.secTitle, { marginTop: SPACING.l }]}>Fee Items</Text>
          <View style={styles.feeGrid}>
            {FEE_TEMPLATES.map(item => {
              const selected = selectedItems.some(i => i.id === item.id);
              return (
                <TouchableOpacity key={item.id} style={[styles.feeCard, selected && styles.feeCardActive]} onPress={() => toggleItem(item)}>
                  {selected && <CheckCircle2 size={16} color="#10b981" style={{ position: 'absolute', top: 8, right: 8 }} />}
                  <Text style={[styles.feeAmount, selected && { color: '#10b981' }]}>₹{item.amount}</Text>
                  <Text style={styles.feeDesc}>{item.description}</Text>
                  <Text style={styles.feeCat}>{item.category}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Bill Summary */}
          {selectedItems.length > 0 && (
            <GlassCard style={styles.summaryCard}>
              <Text style={styles.sumTitle}>Bill Summary</Text>
              {selectedItems.map(item => (
                <View key={item.id} style={styles.sumRow}>
                  <Text style={styles.sumItem}>{item.description}</Text>
                  <Text style={styles.sumAmt}>₹{item.amount}</Text>
                </View>
              ))}
              <View style={styles.divider} />
              <View style={styles.sumRow}>
                <Text style={styles.sumItem}>Subtotal</Text>
                <Text style={styles.sumAmt}>₹{subtotal}</Text>
              </View>
              <View style={styles.discountRow}>
                <Text style={styles.sumItem}>Discount</Text>
                <TextInput style={styles.discountInput} placeholder="0" placeholderTextColor={COLORS.textMuted} value={discount} onChangeText={setDiscount} keyboardType="numeric" />
              </View>
              <View style={[styles.sumRow, { marginTop: 8 }]}>
                <Text style={styles.totalLabel}>TOTAL</Text>
                <Text style={styles.totalAmt}>₹{total}</Text>
              </View>
            </GlassCard>
          )}

          {/* Payment Mode */}
          {selectedItems.length > 0 && (
            <>
              <Text style={[styles.secTitle, { marginTop: SPACING.l }]}>Payment Mode</Text>
              <View style={styles.payRow}>
                {([{ key: 'CASH' as const, icon: Banknote, label: 'Cash' }, { key: 'CARD' as const, icon: CreditCard, label: 'Card' }, { key: 'UPI' as const, icon: QrCode, label: 'UPI' }]).map(p => (
                  <TouchableOpacity key={p.key} style={[styles.payChip, paymentMode === p.key && styles.payChipActive]} onPress={() => setPaymentMode(p.key)}>
                    <p.icon size={20} color={paymentMode === p.key ? '#10b981' : COLORS.textMuted} />
                    <Text style={[styles.payText, paymentMode === p.key && styles.payTextActive]}>{p.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.collectBtn} onPress={handleCollect}>
                <LinearGradient colors={['#10b981', '#059669']} style={styles.collectGrad}>
                  <IndianRupee size={20} color="#fff" /><Text style={styles.collectText}>Collect ₹{total} & Print Receipt</Text>
                  <Printer size={18} color="#fff" />
                </LinearGradient>
              </TouchableOpacity>
            </>
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
  secTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16, marginBottom: SPACING.s },
  patientRow: { backgroundColor: COLORS.surface, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: COLORS.border },
  patientInput: { fontFamily: FONTS.regular, color: COLORS.text, fontSize: 14 },
  feeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: SPACING.l },
  feeCard: { width: '47%' as any, flexGrow: 1, padding: 14, borderRadius: 16, backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border, alignItems: 'center' },
  feeCardActive: { borderColor: '#10b981', backgroundColor: '#10b98108' },
  feeAmount: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 22, marginBottom: 4 },
  feeDesc: { fontFamily: FONTS.medium, color: COLORS.text, fontSize: 12, textAlign: 'center' },
  feeCat: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 10, marginTop: 2 },
  summaryCard: { padding: SPACING.m, borderWidth: 0 },
  sumTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16, marginBottom: 12 },
  sumRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 },
  sumItem: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 13 },
  sumAmt: { fontFamily: FONTS.medium, color: COLORS.text, fontSize: 13 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 8 },
  discountRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  discountInput: { fontFamily: FONTS.medium, color: '#ef4444', fontSize: 14, textAlign: 'right', width: 80, backgroundColor: COLORS.surface, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: COLORS.border },
  totalLabel: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16 },
  totalAmt: { fontFamily: FONTS.bold, color: '#10b981', fontSize: 22 },
  payRow: { flexDirection: 'row', gap: 10, marginBottom: SPACING.l },
  payChip: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 14, backgroundColor: COLORS.surface, borderWidth: 1.5, borderColor: COLORS.border },
  payChipActive: { borderColor: '#10b981', backgroundColor: '#10b98110' },
  payText: { fontFamily: FONTS.medium, color: COLORS.textMuted, fontSize: 13 },
  payTextActive: { color: '#10b981', fontFamily: FONTS.bold },
  collectBtn: { borderRadius: 20, overflow: 'hidden' },
  collectGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 20 },
  collectText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 15 },
});
