import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, AlertTriangle, Shield, CheckCircle2, ChevronDown, Pill } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';

interface InteractionAlert {
  id: number; prescription_id: string; patient_name: string; patient_uhid: string;
  drug_a: string; drug_b: string; severity: 'MAJOR' | 'MODERATE' | 'MINOR';
  description: string; recommendation: string;
  status: 'PENDING' | 'ACKNOWLEDGED' | 'OVERRIDDEN';
  prescribing_doctor: string;
}

interface AllergySafety {
  id: number; patient_name: string; patient_uhid: string; drug_name: string;
  allergy: string; severity: 'HIGH' | 'MODERATE'; status: 'PENDING' | 'BLOCKED';
}

const SEV_CFG: Record<string, { color: string; label: string }> = {
  MAJOR: { color: '#ef4444', label: 'Major' },
  MODERATE: { color: '#f59e0b', label: 'Moderate' },
  MINOR: { color: '#64748b', label: 'Minor' },
};

const MOCK_INTERACTIONS: InteractionAlert[] = [
  { id: 1, prescription_id: 'RX-260305-0201', patient_name: 'Sunil Verma', patient_uhid: 'UHID-3001', drug_a: 'Warfarin 5mg', drug_b: 'Aspirin 75mg', severity: 'MAJOR', description: 'Increased risk of bleeding. Both drugs affect coagulation pathways. Combined use significantly elevates hemorrhagic risk.', recommendation: 'Consider INR monitoring every 48h. Reduce Warfarin dose or substitute Aspirin with Clopidogrel if antiplatelet needed.', status: 'PENDING', prescribing_doctor: 'Dr. Sharma' },
  { id: 2, prescription_id: 'RX-260305-0202', patient_name: 'Meena Gupta', patient_uhid: 'UHID-3002', drug_a: 'Metformin 500mg', drug_b: 'IV Contrast Media', severity: 'MAJOR', description: 'Risk of lactic acidosis. Metformin should be withheld 48h before and after IV contrast administration.', recommendation: 'Withhold Metformin 48h pre/post contrast. Monitor renal function. Resume only if eGFR > 30 mL/min.', status: 'PENDING', prescribing_doctor: 'Dr. Patel' },
  { id: 3, prescription_id: 'RX-260305-0198', patient_name: 'Ramesh Tiwari', patient_uhid: 'UHID-3003', drug_a: 'Atorvastatin 40mg', drug_b: 'Clarithromycin 500mg', severity: 'MODERATE', description: 'CYP3A4 inhibition. Clarithromycin increases statin levels, raising risk of rhabdomyolysis.', recommendation: 'Consider Azithromycin as alternative. If must co-prescribe, limit Atorvastatin to 20mg and monitor CK levels.', status: 'ACKNOWLEDGED', prescribing_doctor: 'Dr. Singh' },
  { id: 4, prescription_id: 'RX-260305-0205', patient_name: 'Kavita Nair', patient_uhid: 'UHID-3004', drug_a: 'Fluoxetine 20mg', drug_b: 'Tramadol 50mg', severity: 'MAJOR', description: 'Serotonin syndrome risk. Both drugs increase serotonergic activity. Combined use can cause potentially fatal serotonin toxicity.', recommendation: 'AVOID combination. Substitute Tramadol with non-serotonergic analgesic (e.g., Paracetamol, Ibuprofen).', status: 'PENDING', prescribing_doctor: 'Dr. Reddy' },
];

const MOCK_ALLERGIES: AllergySafety[] = [
  { id: 1, patient_name: 'Arjun Mehta', patient_uhid: 'UHID-2005', drug_name: 'Amoxicillin 500mg', allergy: 'Penicillin allergy (documented)', severity: 'HIGH', status: 'BLOCKED' },
  { id: 2, patient_name: 'Priya Nair', patient_uhid: 'UHID-2004', drug_name: 'Ibuprofen 400mg', allergy: 'NSAID sensitivity (urticaria)', severity: 'MODERATE', status: 'PENDING' },
];

export const ClinicalPharmacyScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);
  const [interactions] = useState(MOCK_INTERACTIONS);
  const [allergies] = useState(MOCK_ALLERGIES);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const pendingInt = interactions.filter(i => i.status === 'PENDING').length;
  const majorInt = interactions.filter(i => i.severity === 'MAJOR').length;

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={22} color={COLORS.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Clinical Pharmacy</Text>
            <Text style={styles.headerSub}>Drug Interactions & Safety Alerts</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}>
          {/* Summary */}
          <View style={styles.summaryRow}>
            <GlassCard style={[styles.sumCard, { borderLeftWidth: 3, borderLeftColor: '#ef4444' }]}>
              <Text style={[styles.sumVal, { color: '#ef4444' }]}>{pendingInt}</Text>
              <Text style={styles.sumLabel}>Pending Review</Text>
            </GlassCard>
            <GlassCard style={[styles.sumCard, { borderLeftWidth: 3, borderLeftColor: '#f59e0b' }]}>
              <Text style={[styles.sumVal, { color: '#f59e0b' }]}>{majorInt}</Text>
              <Text style={styles.sumLabel}>Major Alerts</Text>
            </GlassCard>
            <GlassCard style={[styles.sumCard, { borderLeftWidth: 3, borderLeftColor: '#8b5cf6' }]}>
              <Text style={[styles.sumVal, { color: '#8b5cf6' }]}>{allergies.length}</Text>
              <Text style={styles.sumLabel}>Allergy Flags</Text>
            </GlassCard>
          </View>

          {/* Allergy Alerts */}
          {allergies.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>🛡️ Allergy Safety</Text>
              {allergies.map(a => (
                <GlassCard key={a.id} style={[styles.allergyCard, { borderLeftWidth: 3, borderLeftColor: a.severity === 'HIGH' ? '#ef4444' : '#f59e0b' }]}>
                  <View style={styles.allergyRow}>
                    <Shield size={18} color={a.severity === 'HIGH' ? '#ef4444' : '#f59e0b'} />
                    <View style={{ flex: 1 }}>
                      <Text style={styles.allergyDrug}>{a.drug_name} → {a.patient_name}</Text>
                      <Text style={styles.allergyDetail}>{a.allergy}</Text>
                    </View>
                    <View style={[styles.allergyBadge, { backgroundColor: a.status === 'BLOCKED' ? '#ef444420' : '#f59e0b20' }]}>
                      <Text style={[styles.allergyBadgeText, { color: a.status === 'BLOCKED' ? '#ef4444' : '#f59e0b' }]}>{a.status}</Text>
                    </View>
                  </View>
                </GlassCard>
              ))}
            </>
          )}

          {/* Interaction Alerts */}
          <Text style={[styles.sectionTitle, { marginTop: SPACING.l }]}>⚠️ Drug Interactions ({interactions.length})</Text>
          {interactions.map(item => {
            const sev = SEV_CFG[item.severity];
            const expanded = expandedId === item.id;
            return (
              <TouchableOpacity key={item.id} onPress={() => setExpandedId(expanded ? null : item.id)}>
                <GlassCard style={[styles.intCard, item.severity === 'MAJOR' && styles.majorBorder]}>
                  <View style={styles.intTop}>
                    <View style={[styles.sevBadge, { backgroundColor: sev.color + '20' }]}>
                      <AlertTriangle size={12} color={sev.color} />
                      <Text style={[styles.sevText, { color: sev.color }]}>{sev.label}</Text>
                    </View>
                    {item.status === 'ACKNOWLEDGED' && <CheckCircle2 size={16} color="#10b981" />}
                    <ChevronDown size={16} color={COLORS.textMuted} style={expanded ? { transform: [{ rotate: '180deg' }] } : {}} />
                  </View>

                  <View style={styles.drugPair}>
                    <View style={styles.drugChip}><Pill size={12} color={sev.color} /><Text style={styles.drugChipText}>{item.drug_a}</Text></View>
                    <Text style={[styles.interactionX, { color: sev.color }]}>✕</Text>
                    <View style={styles.drugChip}><Pill size={12} color={sev.color} /><Text style={styles.drugChipText}>{item.drug_b}</Text></View>
                  </View>

                  <Text style={styles.intPatient}>{item.patient_name} • {item.patient_uhid} • {item.prescribing_doctor}</Text>

                  {expanded && (
                    <View style={styles.expandedBlock}>
                      <Text style={styles.expandLabel}>Interaction:</Text>
                      <Text style={styles.expandText}>{item.description}</Text>
                      <Text style={[styles.expandLabel, { marginTop: 8 }]}>Recommendation:</Text>
                      <Text style={[styles.expandText, { color: '#10b981' }]}>{item.recommendation}</Text>
                    </View>
                  )}
                </GlassCard>
              </TouchableOpacity>
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
  summaryRow: { flexDirection: 'row', gap: 10, marginBottom: SPACING.l },
  sumCard: { flex: 1, padding: SPACING.m, alignItems: 'center', borderWidth: 0 },
  sumVal: { fontFamily: FONTS.bold, fontSize: 24 },
  sumLabel: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 10, marginTop: 4, textAlign: 'center' },
  sectionTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16, marginBottom: SPACING.m },
  // Allergy
  allergyCard: { padding: 12, marginBottom: 10, borderWidth: 0 },
  allergyRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  allergyDrug: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 13 },
  allergyDetail: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  allergyBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  allergyBadgeText: { fontFamily: FONTS.bold, fontSize: 9 },
  // Interaction
  intCard: { padding: SPACING.m, marginBottom: 12, borderWidth: 0 },
  majorBorder: { borderWidth: 1, borderColor: '#ef444430' },
  intTop: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  sevBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, flex: 1 },
  sevText: { fontFamily: FONTS.bold, fontSize: 11 },
  drugPair: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' },
  drugChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: COLORS.surface, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border },
  drugChipText: { fontFamily: FONTS.medium, color: COLORS.text, fontSize: 12 },
  interactionX: { fontFamily: FONTS.bold, fontSize: 16 },
  intPatient: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 11 },
  expandedBlock: { backgroundColor: COLORS.surface, borderRadius: 10, padding: 12, marginTop: 10 },
  expandLabel: { fontFamily: FONTS.bold, color: COLORS.textSecondary, fontSize: 11, textTransform: 'uppercase' as any, letterSpacing: 0.5, marginBottom: 4 },
  expandText: { fontFamily: FONTS.regular, color: COLORS.text, fontSize: 13, lineHeight: 20 },
});
