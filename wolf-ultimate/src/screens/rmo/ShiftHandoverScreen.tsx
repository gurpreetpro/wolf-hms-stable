import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, Send, Sparkles, AlertTriangle, Clock,
  Users, ChevronDown, ChevronUp, CheckCircle2,
} from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';
import { useAuthStore } from '../../store/authStore';

// SBAR Sections
interface SBARData {
  situation: string;
  background: string;
  assessment: string;
  recommendation: string;
}

// Mock critical patients for handover
const MOCK_CRITICAL_PATIENTS = [
  { id: 'P001', name: 'Rajesh Kumar', ward: 'ICU', bed: '3', issue: 'SpO₂ 88%, on BiPAP, trending down', priority: 'critical' },
  { id: 'P002', name: 'Sunita Devi', ward: 'Ward B', bed: '204', issue: 'Creatinine 4.2, nephrology consulted', priority: 'urgent' },
  { id: 'P003', name: 'Amit Patel', ward: 'Ward A', bed: '112', issue: 'Post-op Day 1, febrile 101.2°F', priority: 'monitor' },
];

const MOCK_PENDING_TASKS = [
  { id: 1, task: 'Repeat ABG for ICU Bed 3 at 22:00', status: 'pending' },
  { id: 2, task: 'IV antibiotics due for Ward A Rm 112 at 20:00', status: 'pending' },
  { id: 3, task: 'Await CT report for Ward B Rm 204', status: 'waiting' },
  { id: 4, task: 'Consent form pending for Ward A Rm 108 (surgery tomorrow)', status: 'pending' },
];

const getPriorityColor = (p: string) => {
  switch (p) {
    case 'critical': return '#ef4444';
    case 'urgent': return '#f59e0b';
    case 'monitor': return '#3b82f6';
    default: return '#64748b';
  }
};

export const ShiftHandoverScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);
  const user = useAuthStore(state => state.user);

  const [sbar, setSbar] = useState<SBARData>({
    situation: '',
    background: '',
    assessment: '',
    recommendation: '',
  });
  const [expandedSection, setExpandedSection] = useState<string | null>('situation');
  const [generating, setGenerating] = useState(false);

  const handleAIGenerate = async () => {
    setGenerating(true);
    // Simulate AI generation
    setTimeout(() => {
      setSbar({
        situation: 'Evening shift handover. 24 patients across Ward A, Ward B, and ICU. 3 critical patients require close monitoring. 1 active escalation pending consultant response.',
        background: 'Ward A: 10 patients (2 post-op, 1 febrile). Ward B: 8 patients (1 acute kidney injury under nephrology review). ICU: 6 patients (1 on BiPAP with declining SpO₂, 2 on ventilators stable).',
        assessment: 'ICU Bed 3 is highest priority — SpO₂ trending down despite BiPAP, may need intubation. Ward B Rm 204 creatinine rising, nephrology consulted but not yet responded. Ward A Rm 112 post-op fever may indicate surgical site infection.',
        recommendation: 'Monitor ICU Bed 3 ABG at 22:00. If SpO₂ drops below 85%, escalate to Dr. Rao (Anaesthesia). Follow up with nephrology for Ward B Rm 204. Start empirical antibiotics for Ward A Rm 112 if fever persists.',
      });
      setGenerating(false);
    }, 1500);
  };

  const handleSubmit = () => {
    if (!sbar.situation.trim()) {
      Alert.alert('Required', 'Please fill in at least the Situation field.');
      return;
    }
    Alert.alert('Handover Submitted', 'Your shift handover has been recorded and sent to the incoming RMO.', [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
  };

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const sbarSections = [
    { key: 'situation', label: 'S — Situation', placeholder: 'What is happening right now? Current patient load, shift summary...', color: '#ef4444' },
    { key: 'background', label: 'B — Background', placeholder: 'Clinical context: ward status, ongoing cases, recent admissions/discharges...', color: '#f59e0b' },
    { key: 'assessment', label: 'A — Assessment', placeholder: 'Your clinical assessment of critical patients, concerns, and priorities...', color: '#3b82f6' },
    { key: 'recommendation', label: 'R — Recommendation', placeholder: 'What needs to be done? Pending tasks, follow-ups, escalations...', color: '#22c55e' },
  ];

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Shift Handover</Text>
          <TouchableOpacity onPress={handleAIGenerate} style={[styles.backBtn, { backgroundColor: '#8b5cf620' }]}>
            <Sparkles size={20} color="#8b5cf6" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 120 }}>
          {/* AI Generate Banner */}
          <TouchableOpacity onPress={handleAIGenerate} disabled={generating}>
            <LinearGradient colors={['#312e81', '#1e1b4b']} style={styles.aiBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Sparkles size={20} color="#a78bfa" />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.aiBannerTitle}>
                  {generating ? 'Generating AI Summary...' : 'AI Auto-Generate SBAR'}
                </Text>
                <Text style={styles.aiBannerSub}>Let AI summarize your shift from clinical data</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* SBAR Sections */}
          {sbarSections.map(section => {
            const isExpanded = expandedSection === section.key;
            return (
              <View key={section.key} style={styles.sbarSection}>
                <TouchableOpacity onPress={() => toggleSection(section.key)} style={styles.sbarHeader}>
                  <View style={[styles.sbarDot, { backgroundColor: section.color }]} />
                  <Text style={styles.sbarLabel}>{section.label}</Text>
                  <View style={{ flex: 1 }} />
                  {sbar[section.key as keyof SBARData] ? (
                    <CheckCircle2 size={16} color="#22c55e" />
                  ) : null}
                  {isExpanded ? (
                    <ChevronUp size={18} color={COLORS.textSecondary} />
                  ) : (
                    <ChevronDown size={18} color={COLORS.textSecondary} />
                  )}
                </TouchableOpacity>
                {isExpanded && (
                  <TextInput
                    style={styles.sbarInput}
                    placeholder={section.placeholder}
                    placeholderTextColor={COLORS.textMuted}
                    value={sbar[section.key as keyof SBARData]}
                    onChangeText={text => setSbar(prev => ({ ...prev, [section.key]: text }))}
                    multiline
                    textAlignVertical="top"
                  />
                )}
              </View>
            );
          })}

          {/* Critical Patients */}
          <Text style={[styles.sectionTitle, { marginTop: SPACING.l }]}>Critical Patients</Text>
          {MOCK_CRITICAL_PATIENTS.map(patient => (
            <GlassCard key={patient.id} style={styles.patientCard}>
              <View style={styles.patientRow}>
                <View style={[styles.priorityBar, { backgroundColor: getPriorityColor(patient.priority) }]} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.patientName}>{patient.name}</Text>
                  <Text style={styles.patientLocation}>{patient.ward} • Bed {patient.bed}</Text>
                  <Text style={styles.patientIssue}>{patient.issue}</Text>
                </View>
              </View>
            </GlassCard>
          ))}

          {/* Pending Tasks */}
          <Text style={[styles.sectionTitle, { marginTop: SPACING.l }]}>Pending Tasks</Text>
          {MOCK_PENDING_TASKS.map(task => (
            <GlassCard key={task.id} style={styles.taskCard}>
              <View style={styles.taskRow}>
                <Clock size={14} color={task.status === 'waiting' ? '#f59e0b' : COLORS.textSecondary} />
                <Text style={styles.taskText}>{task.task}</Text>
              </View>
            </GlassCard>
          ))}
        </ScrollView>

        {/* Submit Button */}
        <View style={styles.submitContainer}>
          <TouchableOpacity onPress={handleSubmit} style={styles.submitBtn}>
            <LinearGradient colors={[COLORS.primary, COLORS.secondary || '#6366f1']} style={styles.submitGradient}>
              <Send size={18} color="#fff" />
              <Text style={styles.submitText}>Submit Handover</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

const getStyles = (COLORS: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: SPACING.m, paddingVertical: SPACING.s, marginTop: SPACING.s,
  },
  backBtn: { padding: 10, backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border },
  headerTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 20 },
  // AI Banner
  aiBanner: {
    flexDirection: 'row', alignItems: 'center', padding: 16,
    borderRadius: 20, marginBottom: SPACING.l,
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)',
  },
  aiBannerTitle: { fontFamily: FONTS.bold, color: '#a78bfa', fontSize: 14 },
  aiBannerSub: { fontFamily: FONTS.regular, color: 'rgba(255,255,255,0.5)', fontSize: 12, marginTop: 2 },
  // SBAR
  sbarSection: {
    backgroundColor: COLORS.surface, borderRadius: 16,
    marginBottom: 8, overflow: 'hidden',
    borderWidth: 1, borderColor: COLORS.border,
  },
  sbarHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14,
  },
  sbarDot: { width: 8, height: 8, borderRadius: 4 },
  sbarLabel: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 14 },
  sbarInput: {
    fontFamily: FONTS.regular, color: COLORS.text, fontSize: 14,
    paddingHorizontal: 14, paddingBottom: 14, minHeight: 80,
    lineHeight: 20,
  },
  sectionTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16, marginBottom: SPACING.s },
  // Critical Patients
  patientCard: { marginBottom: 8, padding: 0, borderWidth: 0, overflow: 'hidden' },
  patientRow: { flexDirection: 'row' },
  priorityBar: { width: 4, borderRadius: 0 },
  patientName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 14, paddingLeft: 12, paddingTop: 10 },
  patientLocation: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 12, paddingLeft: 12, marginTop: 2 },
  patientIssue: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 12, paddingLeft: 12, paddingBottom: 10, marginTop: 2 },
  // Tasks
  taskCard: { marginBottom: 6, padding: 12, borderWidth: 0 },
  taskRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  taskText: { fontFamily: FONTS.regular, color: COLORS.text, fontSize: 13, flex: 1 },
  // Submit
  submitContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: SPACING.m, paddingBottom: 30,
    backgroundColor: COLORS.background,
  },
  submitBtn: { borderRadius: 20, overflow: 'hidden' },
  submitGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16,
  },
  submitText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 16 },
});
