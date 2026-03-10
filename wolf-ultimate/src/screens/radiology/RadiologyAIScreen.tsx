import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Send, Scan, Sparkles } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';

interface Message { role: 'user' | 'ai'; content: string; }

const QUICK_PROMPTS = [
  { label: '🔍 Differential Dx', prompt: 'Given a ring-enhancing lesion in the right temporal lobe on MRI with surrounding edema, what is the differential diagnosis and recommended next steps?' },
  { label: '📐 BI-RADS', prompt: 'How do I classify mammography findings using the BI-RADS scoring system? Provide a quick reference table.' },
  { label: '💊 Contrast Protocol', prompt: 'What is the standard contrast protocol for CT pulmonary angiography? Include contrast agent, volume, flow rate, and timing.' },
  { label: '⚡ Dose Optimization', prompt: 'What are the key strategies for radiation dose optimization in pediatric CT imaging?' },
];

const AI_RESPONSES: Record<string, string> = {
  'differential': `## Differential Diagnosis — Ring-Enhancing Lesion (Temporal Lobe)

**Most Likely:**
1. **Primary CNS Neoplasm** (Glioblastoma) — Most common in adults >50y
2. **Brain Metastasis** — Especially if known primary malignancy
3. **Brain Abscess** — Ring enhancement with restricted diffusion on DWI

**Less Likely:**
4. Tumefactive MS — Incomplete ring enhancement, younger patients
5. Radiation necrosis — If prior RT history
6. Lymphoma — Typically homogeneous enhancement in immunocompetent

**Recommended Next Steps:**
- MR Spectroscopy (choline/NAA ratio)
- Perfusion-weighted imaging (rCBV)
- Chest/Abdomen CT for primary if metastasis suspected
- Neurosurgery consultation for possible biopsy`,

  'bi-rads': `## BI-RADS Classification Quick Reference

| Category | Assessment | Management |
|----------|-----------|------------|
| **0** | Incomplete | Additional imaging needed |
| **1** | Negative | Routine screening |
| **2** | Benign | Routine screening |
| **3** | Probably Benign | 6-month follow-up |
| **4a** | Low Suspicion | Biopsy (2-10% malignancy) |
| **4b** | Moderate Suspicion | Biopsy (10-50%) |
| **4c** | High Suspicion | Biopsy (50-95%) |
| **5** | Highly Suggestive | Biopsy (>95%) |
| **6** | Known Malignancy | Surgical excision |

**Key Descriptors:** Mass shape, margins, density, calcifications (morphology & distribution), architectural distortion.`,

  'contrast': `## CT Pulmonary Angiography — Contrast Protocol

**Standard Protocol:**
- **Agent:** Iohexol 350 mgI/mL (or Iodixanol 320)
- **Volume:** 60-80 mL (weight-based: 1-1.5 mL/kg)
- **Flow Rate:** 4-5 mL/sec via 18G or larger IV
- **Saline Chase:** 30-40 mL at same flow rate

**Timing:**
- Bolus tracking at main pulmonary artery
- Trigger threshold: 100-120 HU
- Scan delay: 4-6 seconds post-trigger

**Contraindications Check:**
- Creatinine/eGFR (eGFR <30 → relative CI)
- Allergy history → pre-medication protocol
- Metformin → hold 48h post-contrast if eGFR <45`,

  'dose': `## Pediatric CT Dose Optimization

**Key Strategies:**
1. **ALARA Principle** — As Low As Reasonably Achievable
2. **Weight-based protocols** — kVp and mAs adjusted per body habitus
3. **Reduce kVp** — 80 kVp for children <40kg (vs 120 for adults)
4. **Automatic Exposure Control (AEC)** — Use tube current modulation
5. **Iterative Reconstruction** — Allows 30-50% dose reduction vs FBP
6. **Limit scan length** — Only scan the indicated region
7. **Avoid multiphase** — Single phase unless clinically necessary

**Reference DRL (Diagnostic Reference Levels):**
| Age | CT Head (mGy) | CT Chest (mGy) | CT Abdomen (mGy) |
|-----|--------------|----------------|-------------------|
| 0-1y | 25 | 3.5 | 5 |
| 1-5y | 30 | 5 | 7 |
| 5-10y | 40 | 7 | 10 |
| 10-15y | 50 | 10 | 14 |`,
};

export const RadiologyAIScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { role: 'user', content: text };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    setTimeout(() => {
      const lower = text.toLowerCase();
      let response = 'I can help with radiology image interpretation, differential diagnoses, protocols, dose optimization, and BI-RADS classification. Please ask a specific question about your imaging study.';
      if (lower.includes('differential') || lower.includes('ring-enhancing') || lower.includes('lesion')) response = AI_RESPONSES['differential'];
      else if (lower.includes('bi-rads') || lower.includes('mammog')) response = AI_RESPONSES['bi-rads'];
      else if (lower.includes('contrast') || lower.includes('protocol') || lower.includes('ctpa')) response = AI_RESPONSES['contrast'];
      else if (lower.includes('dose') || lower.includes('pediatric') || lower.includes('optimization')) response = AI_RESPONSES['dose'];

      setMessages(prev => [...prev, { role: 'ai', content: response }]);
      setLoading(false);
    }, 1200);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={22} color={COLORS.text} /></TouchableOpacity>
          <View style={styles.aiTitle}>
            <Sparkles size={20} color="#06b6d4" />
            <Text style={styles.headerTitle}>Radiology AI</Text>
          </View>
          <View style={styles.gemBadge}><Text style={styles.gemText}>Gemini</Text></View>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 140 }}>
          {messages.length === 0 && (
            <View style={styles.welcomeBox}>
              <Scan size={40} color="#06b6d4" />
              <Text style={styles.welcomeTitle}>Radiology AI Assistant</Text>
              <Text style={styles.welcomeSub}>Ask about differentials, protocols, dose optimization, BI-RADS scoring, and image interpretation</Text>
            </View>
          )}

          {messages.length === 0 && (
            <View style={styles.prompts}>
              {QUICK_PROMPTS.map((p, i) => (
                <TouchableOpacity key={i} style={styles.promptCard} onPress={() => sendMessage(p.prompt)}>
                  <Text style={styles.promptLabel}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {messages.map((msg, idx) => (
            <View key={idx} style={[styles.msgRow, msg.role === 'user' && styles.msgRowUser]}>
              <GlassCard style={[styles.msgBubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                <Text style={[styles.msgText, msg.role === 'user' && { color: '#fff' }]}>{msg.content}</Text>
              </GlassCard>
            </View>
          ))}

          {loading && (
            <View style={styles.loadingRow}>
              <ActivityIndicator color="#06b6d4" size="small" />
              <Text style={styles.loadingText}>Analyzing...</Text>
            </View>
          )}
        </ScrollView>

        <View style={styles.inputBar}>
          <TextInput style={styles.inputField} value={input} onChangeText={setInput} placeholder="Ask about imaging..." placeholderTextColor={COLORS.textMuted} onSubmitEditing={() => sendMessage(input)} returnKeyType="send" />
          <TouchableOpacity style={styles.sendBtn} onPress={() => sendMessage(input)}>
            <Send size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

const getStyles = (COLORS: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: SPACING.m, paddingVertical: SPACING.s, marginTop: SPACING.m },
  backBtn: { padding: 10, backgroundColor: COLORS.surface, borderRadius: 14, borderWidth: 1, borderColor: COLORS.border },
  aiTitle: { flexDirection: 'row', alignItems: 'center', gap: 8, flex: 1 },
  headerTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 22 },
  gemBadge: { backgroundColor: '#06b6d420', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  gemText: { fontFamily: FONTS.bold, color: '#06b6d4', fontSize: 11 },
  welcomeBox: { alignItems: 'center', paddingVertical: 30, gap: 12 },
  welcomeTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 22 },
  welcomeSub: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 13, textAlign: 'center', lineHeight: 20 },
  prompts: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: SPACING.l },
  promptCard: { width: '47%' as any, flexGrow: 1, padding: 14, borderRadius: 16, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  promptLabel: { fontFamily: FONTS.medium, color: COLORS.text, fontSize: 13, textAlign: 'center' },
  msgRow: { marginBottom: 12, alignItems: 'flex-start' },
  msgRowUser: { alignItems: 'flex-end' },
  msgBubble: { maxWidth: '88%' as any, padding: 14, borderWidth: 0 },
  userBubble: { backgroundColor: '#06b6d4', borderRadius: 18, borderBottomRightRadius: 4 },
  aiBubble: { borderRadius: 18, borderBottomLeftRadius: 4 },
  msgText: { fontFamily: FONTS.regular, color: COLORS.text, fontSize: 13, lineHeight: 20 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 12 },
  loadingText: { fontFamily: FONTS.medium, color: '#06b6d4', fontSize: 13 },
  inputBar: { position: 'absolute', bottom: 30, left: SPACING.m, right: SPACING.m, flexDirection: 'row', alignItems: 'center', gap: 8 },
  inputField: { flex: 1, fontFamily: FONTS.regular, color: COLORS.text, fontSize: 14, backgroundColor: COLORS.surface, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 12, borderWidth: 1, borderColor: COLORS.border },
  sendBtn: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#06b6d4', justifyContent: 'center', alignItems: 'center' },
});
