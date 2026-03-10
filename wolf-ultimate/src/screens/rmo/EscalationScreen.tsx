import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, ArrowUpCircle, Sparkles, User, AlertTriangle,
  Clock, ChevronRight, Search,
} from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';
import rmoService, { ConsultantStatus } from '../../services/rmoService';

type Priority = 'ROUTINE' | 'URGENT' | 'CRITICAL';

const PRIORITY_CONFIG: Record<Priority, { color: string; label: string; sla: string }> = {
  ROUTINE: { color: '#3b82f6', label: 'Routine', sla: '60 min SLA' },
  URGENT: { color: '#f59e0b', label: 'Urgent', sla: '30 min SLA' },
  CRITICAL: { color: '#ef4444', label: 'Critical', sla: '15 min SLA' },
};

// Mock patient list for escalation
const MOCK_PATIENTS = [
  { id: 'P001', name: 'Rajesh Kumar', ward: 'ICU', bed: '3', diagnosis: 'Respiratory failure' },
  { id: 'P002', name: 'Sunita Devi', ward: 'Ward B', bed: '204', diagnosis: 'Acute kidney injury' },
  { id: 'P003', name: 'Amit Patel', ward: 'Ward A', bed: '112', diagnosis: 'Post-op cholecystectomy' },
  { id: 'P004', name: 'Meena Sharma', ward: 'ICU', bed: '5', diagnosis: 'Sepsis, on vasopressors' },
];

export const EscalationScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);

  const [selectedPatient, setSelectedPatient] = useState<typeof MOCK_PATIENTS[0] | null>(null);
  const [selectedConsultant, setSelectedConsultant] = useState<ConsultantStatus | null>(null);
  const [priority, setPriority] = useState<Priority>('URGENT');
  const [reason, setReason] = useState('');
  const [clinicalContext, setClinicalContext] = useState('');
  const [consultants, setConsultants] = useState<ConsultantStatus[]>([]);
  const [showPatientPicker, setShowPatientPicker] = useState(false);
  const [showConsultantPicker, setShowConsultantPicker] = useState(false);
  const [aiSuggesting, setAiSuggesting] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<string | null>(null);

  React.useEffect(() => {
    loadConsultants();
  }, []);

  const loadConsultants = async () => {
    const data = await rmoService.getConsultantStatus();
    setConsultants(data.filter(c => c.status !== 'OFF_DUTY'));
  };

  const handleAiPriority = () => {
    setAiSuggesting(true);
    setTimeout(() => {
      if (selectedPatient?.ward === 'ICU') {
        setPriority('CRITICAL');
        setAiSuggestion('AI recommends CRITICAL priority — ICU patient with acute condition. 15-minute SLA recommended.');
      } else {
        setPriority('URGENT');
        setAiSuggestion('AI recommends URGENT priority — Ward patient requiring specialist opinion within 30 minutes.');
      }
      setAiSuggesting(false);
    }, 1000);
  };

  const handleSubmit = () => {
    if (!selectedPatient) {
      Alert.alert('Required', 'Please select a patient.');
      return;
    }
    if (!selectedConsultant) {
      Alert.alert('Required', 'Please select a consultant to escalate to.');
      return;
    }
    if (!reason.trim()) {
      Alert.alert('Required', 'Please provide a reason for escalation.');
      return;
    }

    const config = PRIORITY_CONFIG[priority];
    Alert.alert(
      'Escalation Sent',
      `${config.label} escalation sent to ${selectedConsultant.name} for ${selectedPatient.name}.\n\nSLA: ${config.sla}`,
      [{ text: 'OK', onPress: () => navigation.goBack() }],
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Escalate to Consultant</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 120 }}>
          {/* Patient Selector */}
          <Text style={styles.label}>Patient</Text>
          <TouchableOpacity onPress={() => setShowPatientPicker(!showPatientPicker)}>
            <GlassCard style={styles.selector}>
              <User size={18} color={COLORS.textSecondary} />
              <Text style={[styles.selectorText, !selectedPatient && { color: COLORS.textMuted }]}>
                {selectedPatient ? `${selectedPatient.name} • ${selectedPatient.ward} Bed ${selectedPatient.bed}` : 'Select patient...'}
              </Text>
              <ChevronRight size={16} color={COLORS.textMuted} />
            </GlassCard>
          </TouchableOpacity>
          {showPatientPicker && (
            <View style={styles.picker}>
              {MOCK_PATIENTS.map(p => (
                <TouchableOpacity
                  key={p.id}
                  style={[styles.pickerItem, selectedPatient?.id === p.id && styles.pickerItemSelected]}
                  onPress={() => { setSelectedPatient(p); setShowPatientPicker(false); }}
                >
                  <Text style={styles.pickerName}>{p.name}</Text>
                  <Text style={styles.pickerSub}>{p.ward} Bed {p.bed} • {p.diagnosis}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Consultant Selector */}
          <Text style={[styles.label, { marginTop: SPACING.m }]}>Escalate To</Text>
          <TouchableOpacity onPress={() => setShowConsultantPicker(!showConsultantPicker)}>
            <GlassCard style={styles.selector}>
              <Search size={18} color={COLORS.textSecondary} />
              <Text style={[styles.selectorText, !selectedConsultant && { color: COLORS.textMuted }]}>
                {selectedConsultant ? `${selectedConsultant.name} (${selectedConsultant.department})` : 'Select consultant...'}
              </Text>
              <ChevronRight size={16} color={COLORS.textMuted} />
            </GlassCard>
          </TouchableOpacity>
          {showConsultantPicker && (
            <View style={styles.picker}>
              {consultants.map(c => (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.pickerItem, selectedConsultant?.id === c.id && styles.pickerItemSelected]}
                  onPress={() => { setSelectedConsultant(c); setShowConsultantPicker(false); }}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <Text style={styles.pickerName}>{c.name}</Text>
                    <View style={[styles.statusDot, { backgroundColor: c.status === 'AVAILABLE' ? '#22c55e' : c.status === 'ON_CALL' ? '#f59e0b' : '#8b5cf6' }]} />
                  </View>
                  <Text style={styles.pickerSub}>{c.department} • {c.specialty} • {c.status}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Priority Selector */}
          <Text style={[styles.label, { marginTop: SPACING.m }]}>Priority</Text>
          <View style={styles.priorityRow}>
            {(Object.keys(PRIORITY_CONFIG) as Priority[]).map(p => {
              const config = PRIORITY_CONFIG[p];
              const isSelected = priority === p;
              return (
                <TouchableOpacity
                  key={p}
                  style={[styles.priorityBtn, isSelected && { backgroundColor: config.color + '20', borderColor: config.color }]}
                  onPress={() => setPriority(p)}
                >
                  <View style={[styles.priorityDot, { backgroundColor: config.color }]} />
                  <View>
                    <Text style={[styles.priorityLabel, isSelected && { color: config.color }]}>{config.label}</Text>
                    <Text style={styles.prioritySla}>{config.sla}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* AI Priority Suggestion */}
          {selectedPatient && (
            <TouchableOpacity onPress={handleAiPriority} disabled={aiSuggesting}>
              <GlassCard style={styles.aiCard}>
                <Sparkles size={16} color="#a78bfa" />
                <Text style={styles.aiCardText}>
                  {aiSuggesting ? 'Analyzing clinical data...' : 'AI: Suggest Priority Level'}
                </Text>
              </GlassCard>
            </TouchableOpacity>
          )}
          {aiSuggestion && (
            <View style={styles.aiResult}>
              <AlertTriangle size={14} color="#a78bfa" />
              <Text style={styles.aiResultText}>{aiSuggestion}</Text>
            </View>
          )}

          {/* Reason */}
          <Text style={[styles.label, { marginTop: SPACING.m }]}>Reason for Escalation</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Why are you escalating? e.g., Desaturation despite BiPAP, need intubation decision..."
            placeholderTextColor={COLORS.textMuted}
            value={reason}
            onChangeText={setReason}
            multiline
            textAlignVertical="top"
          />

          {/* Clinical Context */}
          <Text style={[styles.label, { marginTop: SPACING.m }]}>Clinical Context (Optional)</Text>
          <TextInput
            style={[styles.textArea, { minHeight: 60 }]}
            placeholder="Recent vitals, labs, interventions..."
            placeholderTextColor={COLORS.textMuted}
            value={clinicalContext}
            onChangeText={setClinicalContext}
            multiline
            textAlignVertical="top"
          />
        </ScrollView>

        {/* Submit */}
        <View style={styles.submitContainer}>
          <TouchableOpacity onPress={handleSubmit} style={styles.submitBtn}>
            <LinearGradient
              colors={[PRIORITY_CONFIG[priority].color, PRIORITY_CONFIG[priority].color + 'cc']}
              style={styles.submitGradient}
            >
              <ArrowUpCircle size={18} color="#fff" />
              <Text style={styles.submitText}>Send {PRIORITY_CONFIG[priority].label} Escalation</Text>
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
  label: { fontFamily: FONTS.bold, color: COLORS.textSecondary, fontSize: 12, textTransform: 'uppercase' as any, letterSpacing: 1, marginBottom: 8 },
  // Selectors
  selector: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderWidth: 0 },
  selectorText: { fontFamily: FONTS.medium, color: COLORS.text, fontSize: 14, flex: 1 },
  picker: {
    backgroundColor: COLORS.surface, borderRadius: 16, marginTop: 4,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
  },
  pickerItem: { padding: 14, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  pickerItemSelected: { backgroundColor: COLORS.primary + '10' },
  pickerName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 14 },
  pickerSub: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 12, marginTop: 2 },
  statusDot: { width: 8, height: 8, borderRadius: 4 },
  // Priority
  priorityRow: { flexDirection: 'row', gap: 8 },
  priorityBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, borderRadius: 16,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  priorityDot: { width: 10, height: 10, borderRadius: 5 },
  priorityLabel: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 13 },
  prioritySla: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 10 },
  // AI
  aiCard: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    padding: 12, marginTop: SPACING.s, borderWidth: 0,
    backgroundColor: '#312e8120',
  },
  aiCardText: { fontFamily: FONTS.medium, color: '#a78bfa', fontSize: 13 },
  aiResult: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    padding: 12, marginTop: 4, backgroundColor: '#312e8115',
    borderRadius: 12,
  },
  aiResultText: { fontFamily: FONTS.regular, color: '#c4b5fd', fontSize: 12, flex: 1 },
  // Text Areas
  textArea: {
    fontFamily: FONTS.regular, color: COLORS.text, fontSize: 14,
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 14,
    minHeight: 80, borderWidth: 1, borderColor: COLORS.border,
    lineHeight: 20,
  },
  // Submit
  submitContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: SPACING.m, paddingBottom: 30, backgroundColor: COLORS.background,
  },
  submitBtn: { borderRadius: 20, overflow: 'hidden' },
  submitGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16,
  },
  submitText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 16 },
});
