import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, PlayCircle, CheckCircle2, AlertTriangle, Zap } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';

// Mock order for demo
const DEMO_ORDER = {
  accession_no: 'RAD-260305-001', patient_name: 'Rakesh Kumar', patient_uhid: 'UHID-5001',
  modality: 'CT', study_description: 'CT Chest with Contrast', body_part: 'Chest',
  priority: 'STAT', ordering_doctor: 'Dr. Sharma', department: 'Cardiology',
  contrast: true, contrast_agent: 'Iohexol 100mL',
  clinical_history: 'Suspected pulmonary embolism. SOB, chest pain, D-dimer elevated.',
};

export const ScanPerformScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);
  const [scanStarted, setScanStarted] = useState(false);
  const [scanComplete, setScanComplete] = useState(false);
  const [kvp, setKvp] = useState('120');
  const [mA, setMA] = useState('250');
  const [doseMgy, setDoseMgy] = useState('');
  const [contrastReaction, setContrastReaction] = useState('NONE');
  const [techNotes, setTechNotes] = useState('');

  const handleStart = () => {
    Alert.alert('Start Scan', `Begin ${DEMO_ORDER.study_description}?`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Start', onPress: () => setScanStarted(true) },
    ]);
  };

  const handleComplete = () => {
    if (!doseMgy.trim()) { Alert.alert('Required', 'Enter radiation dose (mGy).'); return; }
    Alert.alert('Complete Scan', 'Mark study as completed and send for reporting?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Complete', onPress: () => { setScanComplete(true); Alert.alert('✅ Scan Completed', 'Study sent to radiologist for reporting.'); }},
    ]);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={22} color={COLORS.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Perform Scan</Text>
            <Text style={styles.headerSub}>{DEMO_ORDER.accession_no}</Text>
          </View>
          <View style={[styles.priorityBadge, { backgroundColor: '#ef444420' }]}>
            <AlertTriangle size={12} color="#ef4444" />
            <Text style={[styles.priorityText, { color: '#ef4444' }]}>{DEMO_ORDER.priority}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 120 }}>
          {/* Patient & Study Info */}
          <GlassCard style={styles.infoCard}>
            <View style={styles.infoRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.patientName}>{DEMO_ORDER.patient_name}</Text>
                <Text style={styles.patientMeta}>{DEMO_ORDER.patient_uhid} • {DEMO_ORDER.ordering_doctor} • {DEMO_ORDER.department}</Text>
              </View>
              <View style={[styles.modBadge, { backgroundColor: '#ef444420' }]}>
                <Text style={[styles.modText, { color: '#ef4444' }]}>{DEMO_ORDER.modality}</Text>
              </View>
            </View>
            <View style={styles.divider} />
            <Text style={styles.studyTitle}>{DEMO_ORDER.study_description}</Text>
            <Text style={styles.bodyPart}>Body Part: {DEMO_ORDER.body_part}</Text>
            {DEMO_ORDER.clinical_history && (
              <View style={styles.historyBox}>
                <Text style={styles.historyLabel}>Clinical History</Text>
                <Text style={styles.historyText}>{DEMO_ORDER.clinical_history}</Text>
              </View>
            )}
          </GlassCard>

          {/* Contrast Info */}
          {DEMO_ORDER.contrast && (
            <GlassCard style={styles.contrastCard}>
              <Text style={styles.contrastTitle}>💉 Contrast Agent</Text>
              <Text style={styles.contrastAgent}>{DEMO_ORDER.contrast_agent}</Text>
              <Text style={styles.secLabel}>Contrast Reaction</Text>
              <View style={styles.reactionRow}>
                {['NONE', 'MILD', 'MODERATE', 'SEVERE'].map(r => (
                  <TouchableOpacity key={r} style={[styles.reactionChip, contrastReaction === r && styles.reactionActive, r === 'SEVERE' && contrastReaction === r && { backgroundColor: '#ef444420', borderColor: '#ef4444' }]} onPress={() => setContrastReaction(r)}>
                    <Text style={[styles.reactionText, contrastReaction === r && { color: r === 'SEVERE' ? '#ef4444' : '#10b981' }]}>{r}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </GlassCard>
          )}

          {/* Scan Parameters */}
          {scanStarted && !scanComplete && (
            <GlassCard style={styles.paramsCard}>
              <Text style={styles.paramsTitle}>⚙️ Scan Parameters</Text>
              <View style={styles.paramsRow}>
                <View style={styles.paramField}>
                  <Text style={styles.paramLabel}>kVp</Text>
                  <TextInput style={styles.paramInput} value={kvp} onChangeText={setKvp} keyboardType="numeric" />
                </View>
                <View style={styles.paramField}>
                  <Text style={styles.paramLabel}>mA</Text>
                  <TextInput style={styles.paramInput} value={mA} onChangeText={setMA} keyboardType="numeric" />
                </View>
                <View style={styles.paramField}>
                  <Text style={styles.paramLabel}>Dose (mGy) *</Text>
                  <TextInput style={styles.paramInput} value={doseMgy} onChangeText={setDoseMgy} keyboardType="numeric" placeholder="0.0" placeholderTextColor={COLORS.textMuted} />
                </View>
              </View>
              <Text style={styles.paramLabel}>Tech Notes</Text>
              <TextInput style={[styles.paramInput, { height: 60, textAlignVertical: 'top' }]} value={techNotes} onChangeText={setTechNotes} placeholder="Optional notes..." placeholderTextColor={COLORS.textMuted} multiline />
            </GlassCard>
          )}

          {/* Action Buttons */}
          {!scanStarted && (
            <TouchableOpacity style={styles.actionBtn} onPress={handleStart}>
              <LinearGradient colors={['#3b82f6', '#2563eb']} style={styles.actionGrad}>
                <PlayCircle size={22} color="#fff" /><Text style={styles.actionText}>Start Scan</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {scanStarted && !scanComplete && (
            <TouchableOpacity style={styles.actionBtn} onPress={handleComplete}>
              <LinearGradient colors={['#10b981', '#059669']} style={styles.actionGrad}>
                <CheckCircle2 size={22} color="#fff" /><Text style={styles.actionText}>Complete & Send for Reporting</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}

          {scanComplete && (
            <GlassCard style={[styles.infoCard, { borderColor: '#10b98140' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                <CheckCircle2 size={24} color="#10b981" />
                <Text style={[styles.studyTitle, { color: '#10b981' }]}>Scan Completed — Sent for Reporting</Text>
              </View>
            </GlassCard>
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
  priorityBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10 },
  priorityText: { fontFamily: FONTS.bold, fontSize: 11 },
  infoCard: { padding: SPACING.m, marginBottom: SPACING.m, borderWidth: 0 },
  infoRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  patientName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 18 },
  patientMeta: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  modBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  modText: { fontFamily: FONTS.bold, fontSize: 13 },
  divider: { height: 1, backgroundColor: COLORS.border, marginVertical: 10 },
  studyTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16, marginBottom: 4 },
  bodyPart: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 13, marginBottom: 8 },
  historyBox: { backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  historyLabel: { fontFamily: FONTS.bold, color: COLORS.textSecondary, fontSize: 11, letterSpacing: 0.5, marginBottom: 4, textTransform: 'uppercase' as any },
  historyText: { fontFamily: FONTS.regular, color: COLORS.text, fontSize: 13, lineHeight: 20 },
  contrastCard: { padding: SPACING.m, marginBottom: SPACING.m, borderWidth: 0 },
  contrastTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 15, marginBottom: 6 },
  contrastAgent: { fontFamily: FONTS.medium, color: '#ef4444', fontSize: 14, marginBottom: 12 },
  secLabel: { fontFamily: FONTS.bold, color: COLORS.textSecondary, fontSize: 11, letterSpacing: 0.5, marginBottom: 6, textTransform: 'uppercase' as any },
  reactionRow: { flexDirection: 'row', gap: 8 },
  reactionChip: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 10, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
  reactionActive: { backgroundColor: '#10b98115', borderColor: '#10b981' },
  reactionText: { fontFamily: FONTS.bold, color: COLORS.textSecondary, fontSize: 11 },
  paramsCard: { padding: SPACING.m, marginBottom: SPACING.m, borderWidth: 0 },
  paramsTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 15, marginBottom: 12 },
  paramsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  paramField: { flex: 1 },
  paramLabel: { fontFamily: FONTS.bold, color: COLORS.textSecondary, fontSize: 11, letterSpacing: 0.5, marginBottom: 4, textTransform: 'uppercase' as any },
  paramInput: { fontFamily: FONTS.regular, color: COLORS.text, fontSize: 14, backgroundColor: COLORS.surface, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: COLORS.border },
  actionBtn: { borderRadius: 20, overflow: 'hidden', marginTop: SPACING.s },
  actionGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 16, borderRadius: 20 },
  actionText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 16 },
});
