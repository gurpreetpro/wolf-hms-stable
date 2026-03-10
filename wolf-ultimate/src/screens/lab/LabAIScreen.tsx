import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, Send, Microscope, Sparkles,
  AlertTriangle, BookOpen, FlaskConical, Zap,
} from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';

interface ChatMessage {
  id: number;
  role: 'user' | 'ai';
  content: string;
  timestamp: string;
}

const QUICK_PROMPTS = [
  { icon: AlertTriangle, label: 'Interpret abnormal LFT', prompt: 'Interpret this LFT result: Bilirubin 2.8, ALT 85, AST 72, ALP 110, Albumin 3.8. What clinical correlations should I flag?' },
  { icon: FlaskConical, label: 'Delta check failure', prompt: 'A patient\'s potassium jumped from 4.2 to 6.8 mEq/L in 6 hours. What could cause this and should I suspect a pre-analytical error?' },
  { icon: BookOpen, label: 'QC Westgard rules', prompt: 'Explain Westgard multi-rules for QC. My L2 Glucose QC result was 210 with mean 200 and SD 6. Which rules are violated?' },
  { icon: Zap, label: 'Critical value protocol', prompt: 'What is the NABH-recommended critical value notification protocol? Include turnaround time requirements and documentation steps.' },
];

export const LabAIScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 0, role: 'ai', timestamp: new Date().toISOString(),
      content: '🔬 Hello! I\'m your Lab AI Assistant powered by Gemini. I can help with:\n\n• **Result interpretation** — flag abnormal patterns\n• **Delta checks** — detect pre-analytical errors\n• **QC troubleshooting** — Westgard rule guidance\n• **Protocol queries** — NABH/CAP requirements\n• **Critical value guidance** — notification workflows\n\nHow can I assist you today?',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Date.now(), role: 'user', content: text.trim(),
      timestamp: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponses: Record<string, string> = {
        'lft': '📊 **LFT Interpretation:**\n\n• **Bilirubin 2.8 mg/dL** (↑ High) — Suggests hepatocellular injury or obstruction\n• **ALT 85 U/L** (↑ High) — Hepatocellular damage marker, ~1.5x ULN\n• **AST 72 U/L** (↑ High) — Lower than ALT → favors hepatitis over alcoholic injury\n• **ALP 110 U/L** — Within normal range\n• **Albumin 3.8 g/dL** — Normal → acute process, not chronic\n\n**🔍 Pattern:** Hepatocellular pattern (ALT > AST, elevated bilirubin, normal ALP)\n\n**⚠️ Recommend:** Rule out acute viral hepatitis (Hep A/B/C serology), drug-induced liver injury. Correlate with clinical history and repeat in 48-72h.',
        'potassium': '🔍 **Delta Check Analysis — K+ 4.2 → 6.8 mEq/L**\n\n**Pre-analytical errors to consider:**\n1. **Hemolysis** — Most common cause of falsely elevated K+. Check serum index.\n2. **Tourniquet time** — Prolonged >1 min can elevate K+ by 1-2 mEq/L\n3. **Fist clenching** — Can increase K+ by 1-2 mEq/L\n4. **Delayed separation** — >30 min causes K+ leakage from RBCs\n\n**If confirmed true elevation:**\n• ⚠️ **6.8 mEq/L is CRITICAL** — immediate physician notification required\n• Rule out: Acute kidney injury, rhabdomyolysis, metabolic acidosis, medication (ACEi, K-sparing diuretics)\n\n**🔄 Action:** Recommend recollection with careful technique. If hemolysis index is elevated, result is unreliable.',
        'westgard': '📏 **Westgard Multi-Rules — Your QC Analysis:**\n\nResult: 210 | Mean: 200 | SD: 6\nDeviation: (210-200)/6 = **1.67 SD**\n\n**Rule Check:**\n• ✅ **1-2s** — Warning rule (beyond ±2SD = 212). NOT violated at 210.\n• ✅ **1-3s** — Reject rule (beyond ±3SD = 218). NOT violated.\n• ⚠️ **Check 2-2s** — Are TWO consecutive runs beyond ±2SD in same direction? Compare with previous L2 run.\n• ⚠️ **Check R-4s** — Is L1 and L2 spread >4SD apart? Check your L1 result.\n\n**Status:** Individual result is within 2SD → ACCEPTABLE as standalone.\nHowever, **monitor trend** — if next run also trends high, 2-2s rule may trigger.\n\n**💡 Tip:** Run Levey-Jennings chart to visualize trend over last 20 runs.',
        'nabh': '📋 **NABH Critical Value Notification Protocol:**\n\n**Timeline Requirements:**\n• ⏱️ **30 minutes** maximum from result validation to physician notification\n• 📞 Direct verbal communication required (phone call preferred)\n• 🔄 **Read-back confirmation** mandatory from receiving clinician\n\n**Documentation Steps:**\n1. Record critical value with patient identifiers\n2. Note date/time of result validation\n3. Note date/time of notification attempt(s)\n4. Record **name of person notified**\n5. Record **read-back confirmation** (yes/no)\n6. If unable to reach ordering physician within 15 min, escalate to:\n   - Unit in-charge → Department head → Medical superintendent\n\n**Common Critical Values (Reference):**\n| Parameter | Low | High |\n|-----------|-----|------|\n| K+ | <2.5 | >6.5 mEq/L |\n| Na+ | <120 | >160 mEq/L |\n| Glucose | <40 | >500 mg/dL |\n| Hb | <5.0 | >20.0 g/dL |\n| Platelets | <20K | >1000K /μL |',
      };

      const lowerText = text.toLowerCase();
      let response = '🤖 I\'ll analyze that for you. Based on current laboratory best practices and clinical guidelines:\n\nThis requires further clinical correlation. I recommend:\n1. Verify pre-analytical conditions\n2. Check QC status of the analyzer\n3. Compare with previous results (delta check)\n4. Consult with the pathologist if abnormal patterns persist\n\nWould you like me to elaborate on any specific aspect?';

      if (lowerText.includes('lft') || lowerText.includes('liver')) response = aiResponses['lft'];
      else if (lowerText.includes('potassium') || lowerText.includes('delta')) response = aiResponses['potassium'];
      else if (lowerText.includes('westgard') || lowerText.includes('qc')) response = aiResponses['westgard'];
      else if (lowerText.includes('nabh') || lowerText.includes('critical value protocol') || lowerText.includes('notification protocol')) response = aiResponses['nabh'];

      const aiMsg: ChatMessage = {
        id: Date.now(), role: 'ai', content: response,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, aiMsg]);
      setLoading(false);
    }, 1500);
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
          <View style={{ flex: 1 }}>
            <View style={styles.headerRow}>
              <Microscope size={20} color="#0ea5e9" />
              <Text style={styles.headerTitle}>Lab AI Assistant</Text>
            </View>
            <Text style={styles.headerSub}>Powered by Gemini • Lab Diagnostics</Text>
          </View>
          <View style={styles.aiBadge}>
            <Sparkles size={14} color="#0ea5e9" />
          </View>
        </View>

        {/* Messages */}
        <ScrollView
          contentContainerStyle={{ padding: SPACING.m, paddingBottom: 20 }}
          style={{ flex: 1 }}
        >
          {messages.map(msg => (
            <View key={msg.id} style={[styles.msgRow, msg.role === 'user' && styles.msgRowUser]}>
              {msg.role === 'ai' && (
                <View style={styles.aiAvatar}>
                  <Microscope size={16} color="#0ea5e9" />
                </View>
              )}
              <View style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                <Text style={[styles.msgText, msg.role === 'user' && { color: '#fff' }]}>{msg.content}</Text>
              </View>
            </View>
          ))}

          {loading && (
            <View style={styles.msgRow}>
              <View style={styles.aiAvatar}>
                <Microscope size={16} color="#0ea5e9" />
              </View>
              <View style={styles.aiBubble}>
                <ActivityIndicator size="small" color="#0ea5e9" />
                <Text style={styles.typingText}>Analyzing...</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Quick Prompts */}
        {messages.length <= 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={styles.quickScroll}
            contentContainerStyle={{ paddingHorizontal: SPACING.m, gap: 8 }}
          >
            {QUICK_PROMPTS.map((qp, i) => (
              <TouchableOpacity
                key={i}
                style={styles.quickChip}
                onPress={() => sendMessage(qp.prompt)}
              >
                <qp.icon size={14} color="#0ea5e9" />
                <Text style={styles.quickText}>{qp.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* Input */}
        <View style={styles.inputRow}>
          <TextInput
            style={styles.input}
            placeholder="Ask about results, QC, protocols..."
            placeholderTextColor={COLORS.textMuted}
            value={input}
            onChangeText={setInput}
            multiline
            maxLength={1000}
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!input.trim() || loading) && { opacity: 0.4 }]}
            onPress={() => sendMessage(input)}
            disabled={!input.trim() || loading}
          >
            <Send size={20} color="#fff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </View>
  );
};

const getStyles = (COLORS: any) => StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: SPACING.m, paddingVertical: SPACING.s, marginTop: SPACING.m,
  },
  backBtn: {
    padding: 10, backgroundColor: COLORS.surface, borderRadius: 14,
    borderWidth: 1, borderColor: COLORS.border,
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 20 },
  headerSub: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  aiBadge: {
    padding: 8, backgroundColor: '#0ea5e920', borderRadius: 12,
    borderWidth: 1, borderColor: '#0ea5e940',
  },
  // Messages
  msgRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 14 },
  msgRowUser: { justifyContent: 'flex-end' },
  aiAvatar: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#0ea5e920', justifyContent: 'center', alignItems: 'center',
    marginTop: 4,
  },
  bubble: { maxWidth: '80%', borderRadius: 18, padding: 14 },
  aiBubble: {
    backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border,
    borderTopLeftRadius: 4,
  },
  userBubble: {
    backgroundColor: '#0ea5e9', borderTopRightRadius: 4,
  },
  msgText: { fontFamily: FONTS.regular, color: COLORS.text, fontSize: 14, lineHeight: 22 },
  typingText: { fontFamily: FONTS.medium, color: '#0ea5e9', fontSize: 13, marginLeft: 8 },
  // Quick prompts
  quickScroll: { maxHeight: 44, marginBottom: 8 },
  quickChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#0ea5e910', borderWidth: 1, borderColor: '#0ea5e930',
  },
  quickText: { fontFamily: FONTS.medium, color: '#0ea5e9', fontSize: 12 },
  // Input
  inputRow: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: SPACING.m, paddingVertical: SPACING.s,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  input: {
    flex: 1, fontFamily: FONTS.regular, color: COLORS.text, fontSize: 14,
    backgroundColor: COLORS.surface, borderRadius: 20, paddingHorizontal: 16,
    paddingVertical: 10, maxHeight: 100, borderWidth: 1, borderColor: COLORS.border,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: '#0ea5e9', justifyContent: 'center', alignItems: 'center',
  },
});
