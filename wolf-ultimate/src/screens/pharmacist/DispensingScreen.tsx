import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, ShieldAlert, Send, Package, AlertTriangle, RotateCcw, Pill } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';
import pharmacyService, { PrescriptionItem } from '../../services/pharmacyService';

export const DispensingScreen = ({ navigation, route }: any) => {
  const { prescriptionId } = route?.params || { prescriptionId: 'RX-260303-0101' };
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);
  const [rx, setRx] = useState<PrescriptionItem | null>(null);
  const [dispensedQty, setDispensedQty] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const data = await pharmacyService.getPrescriptionDetail(prescriptionId);
        setRx(data);
        const initial: Record<string, number> = {};
        data.items.forEach((item, i) => { initial[`${i}`] = item.stock_available ? item.quantity : 0; });
        setDispensedQty(initial);
      } catch (error) { console.error('Failed to load prescription:', error); }
    };
    load();
  }, [prescriptionId]);

  const handleDispense = () => {
    if (!rx) return;
    const hasControlled = rx.items.some(i => i.is_controlled);
    Alert.alert('Confirm Dispensing',
      hasControlled ? '⚠️ Contains CONTROLLED SUBSTANCES. Logged in narcotics register. Proceed?' : 'Confirm dispensing?',
      [{ text: 'Cancel', style: 'cancel' }, {
        text: 'Dispense', onPress: async () => {
          setSubmitting(true);
          try {
            const items = rx.items.map((item, i) => ({ drug_name: item.drug_name, quantity: dispensedQty[`${i}`] || 0 }));
            await pharmacyService.dispensePrescription(prescriptionId, items);
            Alert.alert('✅ Dispensed', 'Prescription dispensed successfully.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
          } catch { Alert.alert('Error', 'Failed to dispense'); }
          finally { setSubmitting(false); }
        },
      }]
    );
  };

  if (!rx) return null;

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={22} color={COLORS.text} />
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Dispensing</Text>
            <Text style={styles.headerSub}>{prescriptionId}</Text>
          </View>
        </View>
        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 120 }}>
          <GlassCard style={styles.patientCard}>
            <Text style={styles.patientName}>{rx.patient_name}</Text>
            <Text style={styles.patientMeta}>{rx.patient_uhid} • {rx.age}/{rx.gender} • {rx.prescribing_doctor}</Text>
            <Text style={styles.patientSource}>{rx.source}{rx.ward_name ? ` • ${rx.ward_name}` : ''}{rx.bed_no ? ` • Bed ${rx.bed_no}` : ''}</Text>
          </GlassCard>

          <Text style={styles.sectionTitle}>Prescription Items ({rx.items.length})</Text>
          {rx.items.map((item, index) => (
            <GlassCard key={index} style={[styles.drugCard, item.is_controlled && styles.controlledBorder]}>
              <View style={styles.drugHeader}>
                <View style={styles.drugHeaderLeft}>
                  {item.is_controlled && <ShieldAlert size={16} color="#ef4444" />}
                  <Text style={styles.drugName}>{item.drug_name}</Text>
                </View>
                {!item.stock_available && (
                  <View style={styles.oosChip}><Package size={12} color="#f59e0b" /><Text style={styles.oosText}>Out of Stock</Text></View>
                )}
              </View>
              {item.generic_name && <Text style={styles.genericName}>{item.generic_name}</Text>}
              <View style={styles.drugDetails}>
                <View style={styles.detailChip}><Text style={styles.detailText}>{item.dosage}</Text></View>
                <View style={styles.detailChip}><Text style={styles.detailText}>{item.route}</Text></View>
                <View style={styles.detailChip}><Text style={styles.detailText}>{item.frequency}</Text></View>
                <View style={styles.detailChip}><Text style={styles.detailText}>{item.duration}</Text></View>
              </View>
              {item.interaction_warning && (
                <View style={styles.warningBar}><AlertTriangle size={14} color="#8b5cf6" /><Text style={styles.warningText}>{item.interaction_warning}</Text></View>
              )}
              <View style={styles.qtyRow}>
                <Text style={styles.qtyLabel}>Prescribed: {item.quantity}</Text>
                <View style={styles.qtyInput}>
                  <Text style={styles.qtyInputLabel}>Dispense:</Text>
                  <TextInput style={styles.qtyBox} value={String(dispensedQty[`${index}`] || 0)}
                    onChangeText={(v) => { const n = Number.parseInt(v, 10); if (!Number.isNaN(n)) setDispensedQty(prev => ({ ...prev, [`${index}`]: Math.min(n, item.quantity) })); }}
                    keyboardType="number-pad" selectTextOnFocus editable={item.stock_available} />
                </View>
              </View>
              {item.substitute_available && !item.stock_available && (
                <TouchableOpacity style={styles.substituteBtn}><RotateCcw size={14} color="#3b82f6" /><Text style={styles.substituteText}>Suggest Substitute</Text></TouchableOpacity>
              )}
            </GlassCard>
          ))}
          {rx.notes && (<><Text style={[styles.sectionTitle, { marginTop: SPACING.l }]}>Clinical Notes</Text><GlassCard style={styles.notesCard}><Text style={styles.notesText}>{rx.notes}</Text></GlassCard></>)}
          <TouchableOpacity style={[styles.submitBtn, submitting && { opacity: 0.6 }]} onPress={handleDispense} disabled={submitting}>
            <LinearGradient colors={['#10b981', '#059669']} style={styles.submitGradient}>
              <Send size={20} color="#fff" /><Text style={styles.submitText}>{submitting ? 'Dispensing...' : 'Confirm Dispensing'}</Text>
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
  patientCard: { padding: SPACING.m, marginBottom: SPACING.l, borderWidth: 0 },
  patientName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 18, marginBottom: 4 },
  patientMeta: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 13 },
  patientSource: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 12, marginTop: 2 },
  sectionTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 18, marginBottom: SPACING.m },
  drugCard: { padding: SPACING.m, marginBottom: 12, borderWidth: 0 },
  controlledBorder: { borderWidth: 1, borderColor: '#ef444430' },
  drugHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  drugHeaderLeft: { flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 },
  drugName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 15, flexShrink: 1 },
  genericName: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 12, marginBottom: 6, marginLeft: 22 },
  oosChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f59e0b20', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  oosText: { fontFamily: FONTS.bold, color: '#f59e0b', fontSize: 9 },
  drugDetails: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  detailChip: { backgroundColor: COLORS.surface, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border },
  detailText: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 11 },
  warningBar: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#8b5cf610', padding: 8, borderRadius: 8, marginBottom: 8 },
  warningText: { fontFamily: FONTS.medium, color: '#8b5cf6', fontSize: 12, flex: 1 },
  qtyRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  qtyLabel: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 13 },
  qtyInput: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  qtyInputLabel: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 12 },
  qtyBox: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16, backgroundColor: COLORS.surface, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4, minWidth: 50, textAlign: 'center', borderWidth: 1, borderColor: COLORS.border },
  substituteBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 8, paddingVertical: 6 },
  substituteText: { fontFamily: FONTS.medium, color: '#3b82f6', fontSize: 12 },
  notesCard: { padding: SPACING.m, borderWidth: 0 },
  notesText: { fontFamily: FONTS.regular, color: COLORS.text, fontSize: 14, lineHeight: 20 },
  submitBtn: { marginTop: SPACING.l, borderRadius: 20, overflow: 'hidden' },
  submitGradient: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 20 },
  submitText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 16 },
});
