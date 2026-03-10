import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, FileText, Send, AlertTriangle } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';

const TEMPLATES: Record<string, { findings: string; impression: string; recommendation: string }> = {
  'CT Chest': {
    findings: 'No pulmonary embolism identified. Lung parenchyma is clear bilaterally. No pleural effusion. Mediastinal structures are normal. No lymphadenopathy. Heart size is normal. Aorta and great vessels are unremarkable.',
    impression: 'Negative CT pulmonary angiography. No evidence of pulmonary embolism.',
    recommendation: 'Clinical correlation recommended. Consider D-dimer follow-up if clinical suspicion persists.',
  },
  'Chest X-Ray': {
    findings: 'Heart size is within normal limits. Lungs are clear bilaterally with no focal consolidation, effusion, or pneumothorax. Trachea is midline. Bony thorax is intact.',
    impression: 'Normal chest radiograph.',
    recommendation: 'No follow-up imaging required.',
  },
  'MRI Brain': {
    findings: 'No acute infarct on diffusion-weighted imaging. No intracranial hemorrhage. Ventricles are normal in size and configuration. No mass lesion or midline shift. Grey-white matter differentiation is preserved.',
    impression: 'Unremarkable MRI of the brain. No evidence of space-occupying lesion.',
    recommendation: 'EEG correlation recommended for seizure workup.',
  },
};

export const RadiologyReportScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);
  const [selectedTemplate, setSelectedTemplate] = useState('CT Chest');
  const template = TEMPLATES[selectedTemplate];
  const [findings, setFindings] = useState(template.findings);
  const [impression, setImpression] = useState(template.impression);
  const [recommendation, setRecommendation] = useState(template.recommendation);
  const [isCritical, setIsCritical] = useState(false);
  const [reportStatus, setReportStatus] = useState<'DRAFT' | 'FINAL'>('DRAFT');

  const applyTemplate = (key: string) => {
    setSelectedTemplate(key);
    const t = TEMPLATES[key];
    setFindings(t.findings);
    setImpression(t.impression);
    setRecommendation(t.recommendation);
  };

  const handleSubmit = (status: 'DRAFT' | 'FINAL') => {
    if (!findings.trim() || !impression.trim()) {
      Alert.alert('Required', 'Findings and Impression are mandatory.'); return;
    }
    Alert.alert(status === 'DRAFT' ? 'Save Draft' : 'Submit Final Report',
      `${status === 'FINAL' ? 'This will be sent for authorization.' : 'Draft will be saved.'}${isCritical ? '\n\n⚠️ CRITICAL FINDING flagged — ordering physician will be notified.' : ''}`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: status === 'DRAFT' ? 'Save' : 'Submit', onPress: () => {
          setReportStatus(status);
          Alert.alert(status === 'DRAFT' ? '📝 Draft Saved' : '✅ Report Submitted', status === 'FINAL' ? 'Sent for radiologist authorization.' : 'You can continue editing later.');
        }},
      ]);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={22} color={COLORS.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={styles.headerTitle}>Radiology Report</Text>
            <Text style={styles.headerSub}>RAD-260305-001 • Rakesh Kumar</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: reportStatus === 'FINAL' ? '#10b98120' : '#f59e0b20' }]}>
            <Text style={[styles.statusText, { color: reportStatus === 'FINAL' ? '#10b981' : '#f59e0b' }]}>{reportStatus}</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 120 }}>
          {/* Template Selector */}
          <Text style={styles.secTitle}>Report Template</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: SPACING.m }}>
            {Object.keys(TEMPLATES).map(key => (
              <TouchableOpacity key={key} style={[styles.templateChip, selectedTemplate === key && styles.templateActive]} onPress={() => applyTemplate(key)}>
                <Text style={[styles.templateText, selectedTemplate === key && styles.templateTextActive]}>{key}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Findings */}
          <GlassCard style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>FINDINGS *</Text>
            <TextInput style={styles.fieldInput} value={findings} onChangeText={setFindings} multiline textAlignVertical="top" placeholder="Describe findings..." placeholderTextColor={COLORS.textMuted} />
          </GlassCard>

          {/* Impression */}
          <GlassCard style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>IMPRESSION *</Text>
            <TextInput style={styles.fieldInput} value={impression} onChangeText={setImpression} multiline textAlignVertical="top" placeholder="Summary impression..." placeholderTextColor={COLORS.textMuted} />
          </GlassCard>

          {/* Recommendation */}
          <GlassCard style={styles.fieldCard}>
            <Text style={styles.fieldLabel}>RECOMMENDATION</Text>
            <TextInput style={[styles.fieldInput, { minHeight: 60 }]} value={recommendation} onChangeText={setRecommendation} multiline textAlignVertical="top" placeholder="Follow-up suggestions..." placeholderTextColor={COLORS.textMuted} />
          </GlassCard>

          {/* Critical Finding Toggle */}
          <TouchableOpacity style={[styles.criticalToggle, isCritical && styles.criticalActive]} onPress={() => setIsCritical(!isCritical)}>
            <AlertTriangle size={18} color={isCritical ? '#ef4444' : COLORS.textMuted} />
            <Text style={[styles.criticalText, isCritical && { color: '#ef4444', fontFamily: FONTS.bold }]}>
              {isCritical ? '⚠️ CRITICAL FINDING — Physician will be notified' : 'Mark as Critical Finding'}
            </Text>
          </TouchableOpacity>

          {/* Actions */}
          <View style={styles.actionRow}>
            <TouchableOpacity style={styles.draftBtn} onPress={() => handleSubmit('DRAFT')}>
              <FileText size={18} color={COLORS.primary} /><Text style={styles.draftText}>Save Draft</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.finalBtn} onPress={() => handleSubmit('FINAL')}>
              <LinearGradient colors={['#10b981', '#059669']} style={styles.finalGrad}>
                <Send size={18} color="#fff" /><Text style={styles.finalText}>Submit Final</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
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
  statusBadge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
  statusText: { fontFamily: FONTS.bold, fontSize: 11 },
  secTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16, marginBottom: SPACING.s },
  templateChip: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 14, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, marginRight: 8 },
  templateActive: { backgroundColor: '#3b82f620', borderColor: '#3b82f6' },
  templateText: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 12 },
  templateTextActive: { color: '#3b82f6', fontFamily: FONTS.bold },
  fieldCard: { padding: SPACING.m, marginBottom: SPACING.m, borderWidth: 0 },
  fieldLabel: { fontFamily: FONTS.bold, color: COLORS.textSecondary, fontSize: 11, letterSpacing: 0.5, marginBottom: 8 },
  fieldInput: { fontFamily: FONTS.regular, color: COLORS.text, fontSize: 14, lineHeight: 22, minHeight: 80, backgroundColor: COLORS.surface, borderRadius: 12, padding: 12, borderWidth: 1, borderColor: COLORS.border },
  criticalToggle: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 14, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, marginBottom: SPACING.l },
  criticalActive: { backgroundColor: '#ef444410', borderColor: '#ef444450' },
  criticalText: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 13, flex: 1 },
  actionRow: { flexDirection: 'row', gap: 12 },
  draftBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 16, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.primary },
  draftText: { fontFamily: FONTS.bold, color: COLORS.primary, fontSize: 14 },
  finalBtn: { flex: 1, borderRadius: 16, overflow: 'hidden' },
  finalGrad: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 14, borderRadius: 16 },
  finalText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 14 },
});
