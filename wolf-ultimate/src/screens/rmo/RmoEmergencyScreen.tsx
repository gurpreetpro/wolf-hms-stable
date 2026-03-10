import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, Sparkles, Clock, Send, AlertTriangle,
  Heart, Activity, Droplets, Thermometer, Wind, User,
  ArrowUpCircle,
} from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';

interface TriageResult {
  score: number; // 1-5
  category: string;
  suggestedDept: string;
  urgency: string;
  recommendations: string[];
}

const TRIAGE_COLORS: Record<number, { color: string; label: string }> = {
  1: { color: '#22c55e', label: 'Non-Urgent' },
  2: { color: '#3b82f6', label: 'Standard' },
  3: { color: '#f59e0b', label: 'Urgent' },
  4: { color: '#f97316', label: 'Very Urgent' },
  5: { color: '#ef4444', label: 'Immediate / Resuscitation' },
};

export const RmoEmergencyScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);

  const [patientName, setPatientName] = useState('');
  const [age, setAge] = useState('');
  const [gender, setGender] = useState<'M' | 'F' | 'O'>('M');
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [vitals, setVitals] = useState({ hr: '', bp_sys: '', bp_dia: '', spo2: '', temp: '', rr: '' });
  const [triaging, setTriaging] = useState(false);
  const [triageResult, setTriageResult] = useState<TriageResult | null>(null);
  const [initialOrders, setInitialOrders] = useState('');
  const [timerStart] = useState(Date.now());

  const handleAiTriage = () => {
    if (!chiefComplaint.trim()) {
      Alert.alert('Required', 'Please enter the chief complaint.');
      return;
    }
    setTriaging(true);
    setTimeout(() => {
      const isChestPain = chiefComplaint.toLowerCase().includes('chest');
      const isBreathing = chiefComplaint.toLowerCase().includes('breath') || chiefComplaint.toLowerCase().includes('dyspnea');
      const isTrauma = chiefComplaint.toLowerCase().includes('trauma') || chiefComplaint.toLowerCase().includes('accident');

      let result: TriageResult;
      if (isChestPain) {
        result = {
          score: 4, category: 'Cardiac',
          suggestedDept: 'Cardiology / Emergency Medicine',
          urgency: 'Immediate ECG + Troponin within 10 minutes',
          recommendations: ['12-lead ECG stat', 'Troponin I/T', 'IV access', 'Aspirin 325mg if no contraindication', 'Keep NPO', 'Attach cardiac monitor'],
        };
      } else if (isBreathing) {
        result = {
          score: 4, category: 'Respiratory',
          suggestedDept: 'Pulmonology / Emergency Medicine',
          urgency: 'Immediate oxygen + ABG',
          recommendations: ['O₂ via NRB mask', 'ABG stat', 'Chest X-ray portable', 'Nebulization PRN', 'SpO₂ continuous monitoring', 'Prepare for BiPAP/intubation'],
        };
      } else if (isTrauma) {
        result = {
          score: 5, category: 'Trauma',
          suggestedDept: 'Surgery / Trauma',
          urgency: 'IMMEDIATE — activate trauma protocol',
          recommendations: ['ATLS primary survey', 'IV access x 2 large bore', 'Cross-match 4 units PRBCs', 'FAST ultrasound', 'C-spine immobilization', 'CT if stable'],
        };
      } else {
        result = {
          score: 3, category: 'General',
          suggestedDept: 'Emergency Medicine',
          urgency: 'Attend within 30 minutes',
          recommendations: ['Obtain IV access', 'Basic blood work (CBC, BMP, LFT)', 'Monitor vitals q 15 min', 'Reassess in 30 minutes'],
        };
      }
      setTriageResult(result);
      setTriaging(false);
    }, 1200);
  };

  const handleSubmit = () => {
    if (!patientName.trim()) {
      Alert.alert('Required', 'Please enter patient name.');
      return;
    }
    const elapsed = Math.floor((Date.now() - timerStart) / 60000);
    Alert.alert(
      'Emergency Logged',
      `Patient ${patientName} triaged and registered.\nResponse time: ${elapsed} minutes.\n\nTriage Score: ${triageResult?.score ?? 'N/A'}`,
      [{ text: 'OK', onPress: () => navigation.goBack() }],
    );
  };

  const elapsedMinutes = Math.floor((Date.now() - timerStart) / 60000);

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
            <ArrowLeft size={22} color={COLORS.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Emergency Triage</Text>
          {/* Timer */}
          <View style={styles.timerBadge}>
            <Clock size={12} color="#ef4444" />
            <Text style={styles.timerText}>{elapsedMinutes}m</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 120 }}>
          {/* Patient Info */}
          <Text style={styles.label}>Patient</Text>
          <View style={styles.rowInputs}>
            <TextInput style={[styles.input, { flex: 2 }]} placeholder="Name" placeholderTextColor={COLORS.textMuted} value={patientName} onChangeText={setPatientName} />
            <TextInput style={[styles.input, { flex: 1 }]} placeholder="Age" placeholderTextColor={COLORS.textMuted} value={age} onChangeText={setAge} keyboardType="numeric" />
          </View>
          <View style={styles.genderRow}>
            {(['M', 'F', 'O'] as const).map(g => (
              <TouchableOpacity key={g} style={[styles.genderBtn, gender === g && styles.genderActive]} onPress={() => setGender(g)}>
                <Text style={[styles.genderText, gender === g && styles.genderTextActive]}>
                  {g === 'M' ? 'Male' : g === 'F' ? 'Female' : 'Other'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Chief Complaint */}
          <Text style={[styles.label, { marginTop: SPACING.m }]}>Chief Complaint</Text>
          <TextInput
            style={styles.textArea}
            placeholder="e.g., Chest pain, sudden onset, radiating to left arm, sweating..."
            placeholderTextColor={COLORS.textMuted}
            value={chiefComplaint}
            onChangeText={setChiefComplaint}
            multiline
            textAlignVertical="top"
          />

          {/* Quick Vitals */}
          <Text style={[styles.label, { marginTop: SPACING.m }]}>Vitals (Quick Entry)</Text>
          <View style={styles.vitalsGrid}>
            <View style={styles.vitalInput}>
              <Heart size={14} color="#ef4444" />
              <TextInput style={styles.vitalField} placeholder="HR" placeholderTextColor={COLORS.textMuted} value={vitals.hr} onChangeText={v => setVitals(p => ({ ...p, hr: v }))} keyboardType="numeric" />
            </View>
            <View style={styles.vitalInput}>
              <Activity size={14} color="#3b82f6" />
              <TextInput style={styles.vitalField} placeholder="Sys" placeholderTextColor={COLORS.textMuted} value={vitals.bp_sys} onChangeText={v => setVitals(p => ({ ...p, bp_sys: v }))} keyboardType="numeric" />
              <Text style={styles.vitalSlash}>/</Text>
              <TextInput style={[styles.vitalField, { width: 35 }]} placeholder="Dia" placeholderTextColor={COLORS.textMuted} value={vitals.bp_dia} onChangeText={v => setVitals(p => ({ ...p, bp_dia: v }))} keyboardType="numeric" />
            </View>
            <View style={styles.vitalInput}>
              <Droplets size={14} color="#22c55e" />
              <TextInput style={styles.vitalField} placeholder="SpO₂" placeholderTextColor={COLORS.textMuted} value={vitals.spo2} onChangeText={v => setVitals(p => ({ ...p, spo2: v }))} keyboardType="numeric" />
            </View>
            <View style={styles.vitalInput}>
              <Thermometer size={14} color="#f59e0b" />
              <TextInput style={styles.vitalField} placeholder="Temp" placeholderTextColor={COLORS.textMuted} value={vitals.temp} onChangeText={v => setVitals(p => ({ ...p, temp: v }))} keyboardType="numeric" />
            </View>
            <View style={styles.vitalInput}>
              <Wind size={14} color="#8b5cf6" />
              <TextInput style={styles.vitalField} placeholder="RR" placeholderTextColor={COLORS.textMuted} value={vitals.rr} onChangeText={v => setVitals(p => ({ ...p, rr: v }))} keyboardType="numeric" />
            </View>
          </View>

          {/* AI Triage Button */}
          <TouchableOpacity onPress={handleAiTriage} disabled={triaging}>
            <LinearGradient colors={['#312e81', '#1e1b4b']} style={styles.aiTriageBtn} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Sparkles size={18} color="#a78bfa" />
              <Text style={styles.aiTriageText}>
                {triaging ? 'AI Analyzing...' : 'AI Smart Triage'}
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* Triage Result */}
          {triageResult && (
            <View style={styles.triageResultContainer}>
              {/* Score Badge */}
              <View style={[styles.triageScoreBadge, { backgroundColor: TRIAGE_COLORS[triageResult.score].color }]}>
                <Text style={styles.triageScoreNum}>{triageResult.score}</Text>
                <Text style={styles.triageScoreLabel}>{TRIAGE_COLORS[triageResult.score].label}</Text>
              </View>

              <GlassCard style={styles.triageDetail}>
                <Text style={styles.triageDetailLabel}>Category: <Text style={styles.triageDetailValue}>{triageResult.category}</Text></Text>
                <Text style={styles.triageDetailLabel}>Department: <Text style={styles.triageDetailValue}>{triageResult.suggestedDept}</Text></Text>
                <Text style={[styles.triageDetailLabel, { color: '#ef4444', marginTop: 6 }]}>
                  <AlertTriangle size={12} color="#ef4444" /> {triageResult.urgency}
                </Text>

                <Text style={[styles.label, { marginTop: 12, marginBottom: 4 }]}>AI Recommendations</Text>
                {triageResult.recommendations.map((rec, i) => (
                  <Text key={i} style={styles.recItem}>• {rec}</Text>
                ))}
              </GlassCard>
            </View>
          )}

          {/* Initial Orders */}
          <Text style={[styles.label, { marginTop: SPACING.m }]}>Initial Orders</Text>
          <TextInput
            style={[styles.textArea, { minHeight: 60 }]}
            placeholder="Immediate orders: IV access, labs, meds..."
            placeholderTextColor={COLORS.textMuted}
            value={initialOrders}
            onChangeText={setInitialOrders}
            multiline
            textAlignVertical="top"
          />
        </ScrollView>

        {/* Submit + Escalate */}
        <View style={styles.submitContainer}>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <TouchableOpacity onPress={() => navigation.navigate('Escalation')} style={styles.escalateBtn}>
              <ArrowUpCircle size={18} color="#f59e0b" />
              <Text style={styles.escalateText}>Escalate</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSubmit} style={[styles.submitBtn, { flex: 2 }]}>
              <LinearGradient colors={['#ef4444', '#dc2626']} style={styles.submitGradient}>
                <Send size={18} color="#fff" />
                <Text style={styles.submitText}>Register Emergency</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
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
  timerBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12,
    backgroundColor: '#ef444420',
  },
  timerText: { fontFamily: FONTS.bold, color: '#ef4444', fontSize: 13 },
  label: { fontFamily: FONTS.bold, color: COLORS.textSecondary, fontSize: 12, textTransform: 'uppercase' as any, letterSpacing: 1, marginBottom: 8 },
  // Inputs
  rowInputs: { flexDirection: 'row', gap: 8 },
  input: {
    fontFamily: FONTS.regular, color: COLORS.text, fontSize: 14,
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 12,
    borderWidth: 1, borderColor: COLORS.border,
  },
  textArea: {
    fontFamily: FONTS.regular, color: COLORS.text, fontSize: 14,
    backgroundColor: COLORS.surface, borderRadius: 14, padding: 12,
    minHeight: 80, borderWidth: 1, borderColor: COLORS.border, lineHeight: 20,
  },
  genderRow: { flexDirection: 'row', gap: 8, marginTop: 8 },
  genderBtn: {
    flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: 14,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  genderActive: { backgroundColor: COLORS.primary + '20', borderColor: COLORS.primary },
  genderText: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 13 },
  genderTextActive: { color: COLORS.primary },
  // Vitals Grid
  vitalsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  vitalInput: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: COLORS.surface, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 8,
    borderWidth: 1, borderColor: COLORS.border,
  },
  vitalField: { fontFamily: FONTS.medium, color: COLORS.text, fontSize: 14, width: 40 },
  vitalSlash: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 14 },
  // AI Triage
  aiTriageBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    padding: 16, borderRadius: 16, marginTop: SPACING.m,
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)',
  },
  aiTriageText: { fontFamily: FONTS.bold, color: '#a78bfa', fontSize: 15 },
  // Triage Result
  triageResultContainer: { marginTop: SPACING.m },
  triageScoreBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    padding: 14, borderRadius: 16, marginBottom: 8,
  },
  triageScoreNum: { fontFamily: FONTS.bold, color: '#fff', fontSize: 28 },
  triageScoreLabel: { fontFamily: FONTS.bold, color: '#fff', fontSize: 16 },
  triageDetail: { padding: SPACING.m, borderWidth: 0 },
  triageDetailLabel: { fontFamily: FONTS.medium, color: COLORS.textSecondary, fontSize: 13, marginBottom: 2 },
  triageDetailValue: { fontFamily: FONTS.bold, color: COLORS.text },
  recItem: { fontFamily: FONTS.regular, color: COLORS.text, fontSize: 13, lineHeight: 20, paddingLeft: 4 },
  // Submit
  submitContainer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: SPACING.m, paddingBottom: 30, backgroundColor: COLORS.background,
  },
  escalateBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 20, borderWidth: 1, borderColor: '#f59e0b',
  },
  escalateText: { fontFamily: FONTS.bold, color: '#f59e0b', fontSize: 14 },
  submitBtn: { borderRadius: 20, overflow: 'hidden' },
  submitGradient: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 16,
  },
  submitText: { fontFamily: FONTS.bold, color: '#fff', fontSize: 16 },
});
