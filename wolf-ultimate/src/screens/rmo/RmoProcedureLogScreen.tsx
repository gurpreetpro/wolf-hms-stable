import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, Switch } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, Send, ChevronDown, Clock, CheckCircle2,
  AlertTriangle,
} from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';

// Procedure types
const PROCEDURE_TYPES = [
  'Suturing', 'Urinary Catheter', 'IV Line Insertion', 'Central Line',
  'Wound Dressing', 'Intubation', 'Lumbar Puncture', 'Chest Tube',
  'Nasogastric Tube', 'Arterial Line', 'Splinting/Casting', 'Other',
];

const OUTCOMES = [
  { key: 'SUCCESSFUL', label: 'Successful', color: '#22c55e' },
  { key: 'PARTIAL', label: 'Partial', color: '#f59e0b' },
  { key: 'FAILED', label: 'Failed', color: '#ef4444' },
];

export const RmoProcedureLogScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);

  const [procedureType, setProcedureType] = useState('');
  const [showTypePicker, setShowTypePicker] = useState(false);
  const [description, setDescription] = useState('');
  const [outcome, setOutcome] = useState('SUCCESSFUL');
  const [complications, setComplications] = useState('');
  const [consentObtained, setConsentObtained] = useState(true);
  const [duration, setDuration] = useState('');
  const [patientName, setPatientName] = useState('');

  const handleSubmit = () => {
    if (!procedureType) {
      Alert.alert('Required', 'Please select a procedure type.');
      return;
    }
    if (!patientName.trim()) {
      Alert.alert('Required', 'Please enter patient name.');
      return;
    }
    Alert.alert(
      'Procedure Logged',
      `${procedureType} for ${patientName} logged successfully.`,
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
          <Text style={styles.headerTitle}>Log Procedure</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 120 }}>
          {/* Patient */}
          <Text style={styles.label}>Patient Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter patient name..."
            placeholderTextColor={COLORS.textMuted}
            value={patientName}
            onChangeText={setPatientName}
          />

          {/* Procedure Type */}
          <Text style={[styles.label, { marginTop: SPACING.m }]}>Procedure Type</Text>
          <TouchableOpacity onPress={() => setShowTypePicker(!showTypePicker)}>
            <GlassCard style={styles.selector}>
              <Text style={[styles.selectorText, !procedureType && { color: COLORS.textMuted }]}>
                {procedureType || 'Select procedure type...'}
              </Text>
              <ChevronDown size={16} color={COLORS.textMuted} />
            </GlassCard>
          </TouchableOpacity>
          {showTypePicker && (
            <View style={styles.picker}>
              {PROCEDURE_TYPES.map(type => (
                <TouchableOpacity
                  key={type}
                  style={[styles.pickerItem, procedureType === type && styles.pickerItemSelected]}
                  onPress={() => { setProcedureType(type); setShowTypePicker(false); }}
                >
                  <Text style={[styles.pickerText, procedureType === type && { color: COLORS.primary }]}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Description */}
          <Text style={[styles.label, { marginTop: SPACING.m }]}>Description / Notes</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Procedure details, technique, findings..."
            placeholderTextColor={COLORS.textMuted}
            value={description}
            onChangeText={setDescription}
            multiline
            textAlignVertical="top"
          />

          {/* Outcome */}
          <Text style={[styles.label, { marginTop: SPACING.m }]}>Outcome</Text>
          <View style={styles.outcomeRow}>
            {OUTCOMES.map(o => {
              const isActive = outcome === o.key;
              return (
                <TouchableOpacity
                  key={o.key}
                  style={[styles.outcomeBtn, isActive && { backgroundColor: o.color + '20', borderColor: o.color }]}
                  onPress={() => setOutcome(o.key)}
                >
                  {isActive ? <CheckCircle2 size={14} color={o.color} /> : null}
                  <Text style={[styles.outcomeText, isActive && { color: o.color }]}>{o.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Complications */}
          <Text style={[styles.label, { marginTop: SPACING.m }]}>Complications (if any)</Text>
          <TextInput
            style={[styles.input, { minHeight: 60 }]}
            placeholder="None, or describe complications..."
            placeholderTextColor={COLORS.textMuted}
            value={complications}
            onChangeText={setComplications}
            multiline
            textAlignVertical="top"
          />

          {/* Duration */}
          <Text style={[styles.label, { marginTop: SPACING.m }]}>Duration (minutes)</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g., 15"
            placeholderTextColor={COLORS.textMuted}
            value={duration}
            onChangeText={setDuration}
            keyboardType="numeric"
          />

          {/* Consent Toggle */}
          <View style={styles.consentRow}>
            <View>
              <Text style={styles.consentLabel}>Consent Obtained</Text>
              <Text style={styles.consentSub}>Patient/guardian verbal or written consent</Text>
            </View>
            <Switch
              value={consentObtained}
              onValueChange={setConsentObtained}
              trackColor={{ false: COLORS.border, true: '#22c55e40' }}
              thumbColor={consentObtained ? '#22c55e' : COLORS.textMuted}
            />
          </View>

          {!consentObtained && (
            <View style={styles.warningBox}>
              <AlertTriangle size={14} color="#ef4444" />
              <Text style={styles.warningText}>Proceeding without consent may have medicolegal implications. Document the reason.</Text>
            </View>
          )}
        </ScrollView>

        {/* Submit */}
        <View style={styles.submitContainer}>
          <TouchableOpacity onPress={handleSubmit} style={styles.submitBtn}>
            <LinearGradient colors={[COLORS.primary, COLORS.secondary || '#6366f1']} style={styles.submitGradient}>
              <Send size={18} color="#fff" />
              <Text style={styles.submitText}>Log Procedure</Text>
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
  // Inputs
  input: {
    fontFamily: FONTS.regular, color: COLORS.text, fontSize: 14,
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  textArea: {
    fontFamily: FONTS.regular, color: COLORS.text, fontSize: 14,
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 14,
    minHeight: 80, borderWidth: 1, borderColor: COLORS.border,
    lineHeight: 20,
  },
  // Selector
  selector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 14, borderWidth: 0 },
  selectorText: { fontFamily: FONTS.medium, color: COLORS.text, fontSize: 14 },
  picker: {
    backgroundColor: COLORS.surface, borderRadius: 16, marginTop: 4,
    borderWidth: 1, borderColor: COLORS.border, overflow: 'hidden',
    maxHeight: 250,
  },
  pickerItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  pickerItemSelected: { backgroundColor: COLORS.primary + '10' },
  pickerText: { fontFamily: FONTS.medium, color: COLORS.text, fontSize: 14 },
  // Outcome
  outcomeRow: { flexDirection: 'row', gap: 8 },
  outcomeBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, padding: 12, borderRadius: 16,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  outcomeText: { fontFamily: FONTS.bold, color: COLORS.textSecondary, fontSize: 13 },
  // Consent
  consentRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    marginTop: SPACING.l, padding: SPACING.m,
    backgroundColor: COLORS.surface, borderRadius: 16,
    borderWidth: 1, borderColor: COLORS.border,
  },
  consentLabel: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 14 },
  consentSub: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 11, marginTop: 2 },
  // Warning
  warningBox: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 8,
    marginTop: 8, padding: 12, backgroundColor: '#ef444415',
    borderRadius: 12, borderLeftWidth: 3, borderLeftColor: '#ef4444',
  },
  warningText: { fontFamily: FONTS.regular, color: '#ef4444', fontSize: 12, flex: 1 },
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
