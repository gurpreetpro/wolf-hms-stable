import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, Send, Sparkles, Heart, Activity, Thermometer,
  Droplets, Wind, ChevronDown, ChevronUp,
} from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';

// Note types
type NoteType = 'PROGRESS' | 'ROUND' | 'INTERIM' | 'NIGHT_UPDATE';

const NOTE_TYPES: { key: NoteType; label: string; color: string }[] = [
  { key: 'ROUND', label: 'Ward Round', color: '#3b82f6' },
  { key: 'PROGRESS', label: 'Progress', color: '#22c55e' },
  { key: 'INTERIM', label: 'Interim', color: '#f59e0b' },
  { key: 'NIGHT_UPDATE', label: 'Night Update', color: '#8b5cf6' },
];

// Mock vitals (auto-populated)
const MOCK_VITALS = {
  hr: 88, bp_sys: 120, bp_dia: 80, spo2: 96, temp: 99.2, rr: 18,
  recorded_at: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
};

export const RmoProgressNoteScreen = ({ navigation, route }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);

  const [noteType, setNoteType] = useState<NoteType>('ROUND');
  const [content, setContent] = useState('');
  const [orders, setOrders] = useState('');
  const [showVitals, setShowVitals] = useState(true);
  const [aiScribing, setAiScribing] = useState(false);

  const handleAiScribe = () => {
    setAiScribing(true);
    setTimeout(() => {
      setContent(
        'Patient reviewed during ward round. Alert and oriented.\n\n' +
        'SUBJECTIVE: Complains of mild abdominal discomfort, no nausea/vomiting. Tolerating oral feeds.\n\n' +
        'OBJECTIVE: Vitals stable — HR 88, BP 120/80, SpO₂ 96%, Temp 99.2°F. Abdomen soft, wound site clean, no erythema. Drain output minimal (20ml serous). Bowel sounds present.\n\n' +
        'ASSESSMENT: Post-op Day 1 — progressing well. Low-grade fever likely inflammatory. No signs of surgical site infection currently.\n\n' +
        'PLAN: Continue current antibiotics. Encourage ambulation. Remove drain if output <30ml in next 12hrs. Monitor temperature — if >100.4°F at 24hrs, send wound swab + blood culture.'
      );
      setOrders('1. Continue IV Ceftriaxone 1g BD\n2. Paracetamol 650mg SOS for fever\n3. Encourage ambulation\n4. Drain removal assessment at 6am\n5. Repeat CBC + CRP tomorrow');
      setAiScribing(false);
    }, 1500);
  };

  const handleSubmit = () => {
    if (!content.trim()) {
      Alert.alert('Required', 'Please add note content.');
      return;
    }
    Alert.alert('Note Saved', `${NOTE_TYPES.find(n => n.key === noteType)?.label} note saved successfully.`, [
      { text: 'OK', onPress: () => navigation.goBack() },
    ]);
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
          <Text style={styles.headerTitle}>Progress Note</Text>
          <TouchableOpacity onPress={handleAiScribe} style={[styles.backBtn, { backgroundColor: '#8b5cf620' }]}>
            <Sparkles size={20} color="#8b5cf6" />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 120 }}>
          {/* Note Type Selector */}
          <Text style={styles.label}>Note Type</Text>
          <View style={styles.typeRow}>
            {NOTE_TYPES.map(nt => {
              const isActive = noteType === nt.key;
              return (
                <TouchableOpacity
                  key={nt.key}
                  style={[styles.typeChip, isActive && { backgroundColor: nt.color + '20', borderColor: nt.color }]}
                  onPress={() => setNoteType(nt.key)}
                >
                  <Text style={[styles.typeText, isActive && { color: nt.color }]}>{nt.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* AI Scribe Banner */}
          <TouchableOpacity onPress={handleAiScribe} disabled={aiScribing}>
            <LinearGradient colors={['#312e81', '#1e1b4b']} style={styles.aiBanner} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Sparkles size={18} color="#a78bfa" />
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={styles.aiBannerTitle}>
                  {aiScribing ? 'AI Writing Note...' : 'AI Ward Round Scribe'}
                </Text>
                <Text style={styles.aiBannerSub}>Auto-generate structured note from patient data</Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Auto-Populated Vitals */}
          <TouchableOpacity onPress={() => setShowVitals(!showVitals)}>
            <View style={styles.vitalsHeader}>
              <Text style={styles.label}>Current Vitals (Auto-populated)</Text>
              {showVitals ? <ChevronUp size={16} color={COLORS.textMuted} /> : <ChevronDown size={16} color={COLORS.textMuted} />}
            </View>
          </TouchableOpacity>
          {showVitals && (
            <GlassCard style={styles.vitalsCard}>
              <View style={styles.vitalsGrid}>
                <View style={styles.vitalItem}>
                  <Heart size={14} color="#ef4444" />
                  <Text style={styles.vitalValue}>{MOCK_VITALS.hr}</Text>
                  <Text style={styles.vitalUnit}>bpm</Text>
                </View>
                <View style={styles.vitalItem}>
                  <Activity size={14} color="#3b82f6" />
                  <Text style={styles.vitalValue}>{MOCK_VITALS.bp_sys}/{MOCK_VITALS.bp_dia}</Text>
                  <Text style={styles.vitalUnit}>mmHg</Text>
                </View>
                <View style={styles.vitalItem}>
                  <Droplets size={14} color="#22c55e" />
                  <Text style={styles.vitalValue}>{MOCK_VITALS.spo2}%</Text>
                  <Text style={styles.vitalUnit}>SpO₂</Text>
                </View>
                <View style={styles.vitalItem}>
                  <Thermometer size={14} color="#f59e0b" />
                  <Text style={styles.vitalValue}>{MOCK_VITALS.temp}</Text>
                  <Text style={styles.vitalUnit}>°F</Text>
                </View>
                <View style={styles.vitalItem}>
                  <Wind size={14} color="#8b5cf6" />
                  <Text style={styles.vitalValue}>{MOCK_VITALS.rr}</Text>
                  <Text style={styles.vitalUnit}>RR</Text>
                </View>
              </View>
              <Text style={styles.vitalsTime}>Recorded at {MOCK_VITALS.recorded_at}</Text>
            </GlassCard>
          )}

          {/* Note Content */}
          <Text style={[styles.label, { marginTop: SPACING.m }]}>Clinical Note</Text>
          <TextInput
            style={styles.textArea}
            placeholder="Type your clinical observations, examination findings, assessment, and plan..."
            placeholderTextColor={COLORS.textMuted}
            value={content}
            onChangeText={setContent}
            multiline
            textAlignVertical="top"
          />

          {/* Orders */}
          <Text style={[styles.label, { marginTop: SPACING.m }]}>Orders Given</Text>
          <TextInput
            style={[styles.textArea, { minHeight: 80 }]}
            placeholder="Medication orders, investigations, nursing instructions..."
            placeholderTextColor={COLORS.textMuted}
            value={orders}
            onChangeText={setOrders}
            multiline
            textAlignVertical="top"
          />
        </ScrollView>

        {/* Submit */}
        <View style={styles.submitContainer}>
          <TouchableOpacity onPress={handleSubmit} style={styles.submitBtn}>
            <LinearGradient colors={[COLORS.primary, COLORS.secondary || '#6366f1']} style={styles.submitGradient}>
              <Send size={18} color="#fff" />
              <Text style={styles.submitText}>Save Note</Text>
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
  // Type Selector
  typeRow: { flexDirection: 'row', gap: 8, marginBottom: SPACING.m, flexWrap: 'wrap' },
  typeChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 16,
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
  },
  typeText: { fontFamily: FONTS.bold, color: COLORS.textSecondary, fontSize: 12 },
  // AI Banner
  aiBanner: {
    flexDirection: 'row', alignItems: 'center', padding: 14,
    borderRadius: 16, marginBottom: SPACING.m,
    borderWidth: 1, borderColor: 'rgba(167,139,250,0.2)',
  },
  aiBannerTitle: { fontFamily: FONTS.bold, color: '#a78bfa', fontSize: 13 },
  aiBannerSub: { fontFamily: FONTS.regular, color: 'rgba(255,255,255,0.4)', fontSize: 11, marginTop: 2 },
  // Vitals
  vitalsHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  vitalsCard: { padding: SPACING.m, borderWidth: 0, marginBottom: SPACING.s },
  vitalsGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  vitalItem: { alignItems: 'center', gap: 4 },
  vitalValue: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16 },
  vitalUnit: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 10 },
  vitalsTime: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 10, textAlign: 'center', marginTop: 8 },
  // Text Areas
  textArea: {
    fontFamily: FONTS.regular, color: COLORS.text, fontSize: 14,
    backgroundColor: COLORS.surface, borderRadius: 16, padding: 14,
    minHeight: 120, borderWidth: 1, borderColor: COLORS.border,
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
