import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
  ArrowLeft, Send, Sparkles, User, Bot, Stethoscope,
  Pill, FlaskConical, AlertTriangle, Clipboard, RotateCcw,
} from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';

// Quick action prompts
const QUICK_PROMPTS = [
  { icon: Stethoscope, label: 'Differential', prompt: 'Give me top 5 differential diagnoses for a patient presenting with' },
  { icon: Pill, label: 'Drug Info', prompt: 'What are the drug interactions and contraindications for' },
  { icon: FlaskConical, label: 'Lab Interpret', prompt: 'Interpret these lab results for me:' },
  { icon: AlertTriangle, label: 'Emergency', prompt: 'What is the emergency protocol for' },
  { icon: Clipboard, label: 'Guidelines', prompt: 'What are the latest clinical guidelines for management of' },
];

interface ChatMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

// Mock AI responses
const getAiResponse = (userMsg: string): string => {
  const lower = userMsg.toLowerCase();

  if (lower.includes('differential') || lower.includes('diagnosis')) {
    return '**Top Differential Diagnoses:**\n\n' +
      '1. **Acute Coronary Syndrome** (85%) — chest pain radiating to arm, diaphoresis\n' +
      '   🔬 Order: Troponin, ECG, CXR\n\n' +
      '2. **Pulmonary Embolism** (60%) — sudden onset, tachycardia, risk factors\n' +
      '   🔬 Order: D-dimer, CT-PA\n\n' +
      '3. **Aortic Dissection** (35%) — tearing pain, BP differential\n' +
      '   🔬 Order: CT Angiography\n\n' +
      '4. **Pneumothorax** (20%) — unilateral, sudden\n' +
      '   🔬 Order: CXR\n\n' +
      '5. **GERD / Musculoskeletal** (15%) — positional, reproducible\n\n' +
      '⚠️ **Red Flags:** Hemodynamic instability, syncope, asymmetric BP > 20mmHg';
  }

  if (lower.includes('drug') || lower.includes('interaction') || lower.includes('medication')) {
    return '**Drug Interaction Analysis:**\n\n' +
      '🔴 **CRITICAL:** Warfarin + NSAIDs\n' +
      '→ Increased bleeding risk. Avoid concurrent use. Use Paracetamol instead.\n\n' +
      '🟠 **MAJOR:** Metformin + IV Contrast\n' +
      '→ Risk of lactic acidosis. Hold Metformin 48hrs before/after contrast.\n\n' +
      '🟡 **MODERATE:** ACE Inhibitor + Potassium supplements\n' +
      '→ Risk of hyperkalemia. Monitor K+ levels closely.\n\n' +
      '💡 **Recommendation:** Switch NSAID to Paracetamol 650mg QID. Monitor INR within 3 days.';
  }

  if (lower.includes('lab') || lower.includes('result') || lower.includes('interpret')) {
    return '**Lab Interpretation:**\n\n' +
      '📊 **CBC:** WBC 15.2 (↑ — suggests infection/inflammation)\n' +
      '  Hb 10.2 (↓ — mild anemia, check iron/B12/folate)\n' +
      '  Platelets 180 (normal)\n\n' +
      '📊 **Renal Panel:** Creatinine 4.2 (↑↑ — Stage 4 CKD / AKI)\n' +
      '  BUN 68 (↑ — correlates with renal impairment)\n' +
      '  K+ 5.8 (↑ — hyperkalemia, needs urgent management)\n\n' +
      '⚠️ **Critical Action:**\n' +
      '1. Urgent ECG for hyperkalemia\n' +
      '2. IV Calcium Gluconate if ECG changes\n' +
      '3. Insulin + Dextrose to shift K+ intracellularly\n' +
      '4. Nephrology consult for possible dialysis';
  }

  if (lower.includes('emergency') || lower.includes('protocol') || lower.includes('code')) {
    return '**Emergency Protocol:**\n\n' +
      '🚨 **Step 1:** Activate Code Blue / call for help\n' +
      '🫁 **Step 2:** Assess ABCs (Airway, Breathing, Circulation)\n' +
      '💓 **Step 3:** Begin CPR if pulseless (30:2 ratio)\n' +
      '⚡ **Step 4:** Attach defibrillator/AED — shock if shockable rhythm\n' +
      '💉 **Step 5:** IV/IO access — Adrenaline 1mg q3-5min\n' +
      '📋 **Step 6:** Identify reversible causes (4Hs and 4Ts)\n\n' +
      '**4Hs:** Hypoxia, Hypovolemia, Hypo/Hyperkalemia, Hypothermia\n' +
      '**4Ts:** Tension pneumothorax, Tamponade, Toxins, Thrombosis';
  }

  if (lower.includes('guideline') || lower.includes('management') || lower.includes('protocol')) {
    return '**Clinical Guidelines Summary:**\n\n' +
      '📋 **Sepsis (Surviving Sepsis 2021):**\n' +
      '• Hour-1 bundle: Measure lactate, blood cultures before antibiotics\n' +
      '• IV broad-spectrum antibiotics within 1 hour\n' +
      '• 30ml/kg crystalloid for hypotension/lactate ≥4\n' +
      '• Vasopressors for MAP <65 despite fluid resuscitation\n' +
      '• Reassess volume status and tissue perfusion frequently\n\n' +
      '💡 **Key Metrics:**\n' +
      '• Target MAP ≥65 mmHg\n' +
      '• Lactate clearance >10% in 2-4hrs\n' +
      '• Urine output ≥0.5 ml/kg/hr';
  }

  return '**Clinical Assistant:**\n\n' +
    'I can help you with:\n\n' +
    '🩺 **Differential Diagnosis** — symptom analysis\n' +
    '💊 **Drug Interactions** — safety checks\n' +
    '🔬 **Lab Interpretation** — abnormal values\n' +
    '🚨 **Emergency Protocols** — step-by-step\n' +
    '📋 **Clinical Guidelines** — evidence-based\n' +
    '📝 **Documentation** — note generation\n\n' +
    'Try asking me something specific about your patient!';
};

export const RmoClinicalAssistantScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);
  const scrollRef = useRef<ScrollView>(null);

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 0, role: 'assistant', timestamp: new Date(),
      content: '👋 **Hello, Doctor!** I\'m your AI Clinical Co-Pilot.\n\nI can assist with:\n• Differential diagnoses\n• Drug interaction checks\n• Lab interpretation\n• Emergency protocols\n• Clinical guidelines\n\nHow can I help you today?',
    },
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  const sendMessage = (text?: string) => {
    const msgText = text || input.trim();
    if (!msgText) return;

    const userMsg: ChatMessage = {
      id: messages.length, role: 'user', content: msgText, timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: messages.length + 1, role: 'assistant',
        content: getAiResponse(msgText), timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsTyping(false);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }, 1200);
  };

  const clearChat = () => {
    setMessages([{
      id: 0, role: 'assistant', timestamp: new Date(),
      content: '🔄 Chat cleared. How can I help you?',
    }]);
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
          <View style={styles.headerCenter}>
            <View style={styles.headerIcon}>
              <Sparkles size={16} color="#a78bfa" />
            </View>
            <View>
              <Text style={styles.headerTitle}>AI Clinical Co-Pilot</Text>
              <Text style={styles.headerSub}>Powered by Gemini</Text>
            </View>
          </View>
          <TouchableOpacity onPress={clearChat} style={styles.backBtn}>
            <RotateCcw size={18} color={COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Quick Prompts */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.promptRow}>
          {QUICK_PROMPTS.map((qp) => {
            const Icon = qp.icon;
            return (
              <TouchableOpacity key={qp.label} style={styles.promptChip} onPress={() => sendMessage(qp.prompt)}>
                <Icon size={12} color="#a78bfa" />
                <Text style={styles.promptText}>{qp.label}</Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={{ padding: SPACING.m, paddingBottom: 20 }}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map(msg => (
            <View key={msg.id} style={[styles.msgRow, msg.role === 'user' && styles.msgRowUser]}>
              {msg.role === 'assistant' && (
                <View style={styles.avatarAi}>
                  <Sparkles size={14} color="#a78bfa" />
                </View>
              )}
              <GlassCard style={[
                styles.msgBubble,
                msg.role === 'user' ? styles.userBubble : styles.aiBubble,
              ]}>
                <Text style={[styles.msgText, msg.role === 'user' && { color: '#fff' }]}>{msg.content}</Text>
                <Text style={[styles.msgTime, msg.role === 'user' && { color: 'rgba(255,255,255,0.5)' }]}>
                  {msg.timestamp.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </GlassCard>
              {msg.role === 'user' && (
                <View style={styles.avatarUser}>
                  <User size={14} color="#3b82f6" />
                </View>
              )}
            </View>
          ))}

          {isTyping && (
            <View style={styles.msgRow}>
              <View style={styles.avatarAi}>
                <Sparkles size={14} color="#a78bfa" />
              </View>
              <GlassCard style={[styles.msgBubble, styles.aiBubble]}>
                <Text style={styles.typingText}>Analyzing clinical data...</Text>
              </GlassCard>
            </View>
          )}
        </ScrollView>

        {/* Input Bar */}
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={styles.inputBar}>
            <TextInput
              style={styles.textInput}
              placeholder="Ask me anything clinical..."
              placeholderTextColor={COLORS.textMuted}
              value={input}
              onChangeText={setInput}
              onSubmitEditing={() => sendMessage()}
              returnKeyType="send"
              multiline
            />
            <TouchableOpacity
              onPress={() => sendMessage()}
              style={[styles.sendBtn, !input.trim() && { opacity: 0.4 }]}
              disabled={!input.trim()}
            >
              <LinearGradient colors={['#7c3aed', '#6366f1']} style={styles.sendGradient}>
                <Send size={18} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
          <Text style={styles.disclaimer}>AI suggestions are advisory only. Always apply clinical judgement.</Text>
        </KeyboardAvoidingView>
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
  headerCenter: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerIcon: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#7c3aed20', justifyContent: 'center', alignItems: 'center',
  },
  headerTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16 },
  headerSub: { fontFamily: FONTS.regular, color: '#a78bfa', fontSize: 10 },
  // Quick Prompts
  promptRow: { paddingHorizontal: SPACING.m, gap: 8, paddingVertical: 8 },
  promptChip: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#312e8120', borderWidth: 1, borderColor: 'rgba(167,139,250,0.15)',
  },
  promptText: { fontFamily: FONTS.medium, color: '#a78bfa', fontSize: 12 },
  // Messages
  msgRow: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-end', gap: 8 },
  msgRowUser: { justifyContent: 'flex-end' },
  avatarAi: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#7c3aed20',
    justifyContent: 'center', alignItems: 'center',
  },
  avatarUser: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: '#3b82f620',
    justifyContent: 'center', alignItems: 'center',
  },
  msgBubble: { maxWidth: '78%', padding: 12, borderWidth: 0 },
  userBubble: { backgroundColor: '#3b82f6', borderBottomRightRadius: 4 },
  aiBubble: { borderBottomLeftRadius: 4 },
  msgText: { fontFamily: FONTS.regular, color: COLORS.text, fontSize: 13, lineHeight: 20 },
  msgTime: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 9, textAlign: 'right', marginTop: 4 },
  typingText: { fontFamily: FONTS.medium, color: '#a78bfa', fontSize: 13, fontStyle: 'italic' },
  // Input
  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: SPACING.m, paddingVertical: 10,
    backgroundColor: COLORS.surface,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  textInput: {
    flex: 1, fontFamily: FONTS.regular, color: COLORS.text, fontSize: 14,
    backgroundColor: COLORS.background, borderRadius: 20, paddingHorizontal: 16,
    paddingVertical: 10, maxHeight: 100,
    borderWidth: 1, borderColor: COLORS.border,
  },
  sendBtn: { borderRadius: 20, overflow: 'hidden' },
  sendGradient: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  disclaimer: {
    fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 9,
    textAlign: 'center', paddingBottom: 6,
  },
});
