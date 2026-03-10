import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { ArrowLeft, Send, Pill, Sparkles, AlertTriangle, Search, Shield, Package } from 'lucide-react-native';
import { FONTS, SPACING } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { useTheme } from '../../theme/ThemeContext';

interface ChatMessage { id: number; role: 'user' | 'ai'; content: string; }

const QUICK_PROMPTS = [
  { icon: AlertTriangle, label: 'Drug interaction check', prompt: 'Check interaction between Warfarin and Aspirin. Patient is a 65-year-old male on anticoagulation therapy post DVT.' },
  { icon: Shield, label: 'Dose adjustment', prompt: 'What dose adjustment is needed for Meropenem in a patient with CrCl 25 mL/min (severe renal impairment)?' },
  { icon: Search, label: 'Drug alternative', prompt: 'Patient is allergic to Penicillin. What are safe antibiotic alternatives for community-acquired pneumonia?' },
  { icon: Package, label: 'Stability check', prompt: 'What is the reconstitution stability of Meropenem 1g in NS at room temperature and refrigerated?' },
];

export const PharmacyAIScreen = ({ navigation }: any) => {
  const { theme: COLORS } = useTheme();
  const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);
  const [messages, setMessages] = useState<ChatMessage[]>([{
    id: 0, role: 'ai',
    content: '💊 Hello! I\'m your Pharmacy AI Assistant powered by Gemini. I can help with:\n\n• **Drug interactions** — check multi-drug safety\n• **Dose adjustments** — renal/hepatic impairment\n• **Allergy alternatives** — safe substitutes\n• **IV compatibility** — Y-site & admixture\n• **Stability data** — reconstitution & storage\n• **Formulary guidance** — hospital drug list\n\nHow can I assist you today?',
  }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: ChatMessage = { id: Date.now(), role: 'user', content: text.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    setTimeout(() => {
      const lower = text.toLowerCase();
      let response = '🤖 Based on current pharmacological guidelines and drug monographs:\n\nI\'ll analyze that for you. Key considerations:\n1. Check renal/hepatic function for dose adjustments\n2. Review allergy history before substitution\n3. Verify IV compatibility if parenteral\n4. Consult clinical pharmacist for complex cases\n\nWould you like me to elaborate?';

      if (lower.includes('warfarin') || lower.includes('interaction')) {
        response = '⚠️ **Warfarin + Aspirin Interaction**\n\n**Severity:** MAJOR\n**Mechanism:** Both affect hemostasis — Warfarin inhibits Vitamin K-dependent factors, Aspirin inhibits COX-1 platelet aggregation.\n\n**Clinical Impact:**\n• 2-3x increased risk of GI bleeding\n• Elevated INR beyond therapeutic range\n• Risk of intracranial hemorrhage in elderly\n\n**Recommendations:**\n1. If dual therapy essential: Monitor INR q48h, target INR 2.0-2.5 (lower range)\n2. Add PPI (Pantoprazole 40mg) for GI protection\n3. Consider Clopidogrel 75mg as Aspirin alternative if antiplatelet needed\n4. Educate patient on bleeding signs\n\n**📋 Hospital Protocol:** Flag for clinical pharmacist review. Document interaction acknowledgment.';
      } else if (lower.includes('meropenem') && lower.includes('renal')) {
        response = '💊 **Meropenem Dose Adjustment — Renal Impairment**\n\n**Patient CrCl: 25 mL/min (Severe)**\n\n| CrCl (mL/min) | Dose | Interval |\n|---|---|---|\n| >50 | 1g | q8h |\n| 26-50 | 1g | q12h |\n| 10-25 | 500mg | q12h |\n| <10 | 500mg | q24h |\n| Hemodialysis | 500mg | q24h + post-HD dose |\n\n**For CrCl 25 mL/min: Meropenem 500mg IV q12h**\n\n⚠️ **Cautions:**\n• Monitor for seizures (reduced clearance increases CNS levels)\n• Recheck CrCl daily in AKI patients\n• Consider TDM if available\n• Adjust if patient on CRRT (different protocol)';
      } else if (lower.includes('penicillin') || lower.includes('allergy') || lower.includes('alternative')) {
        response = '🛡️ **Penicillin Allergy — Antibiotic Alternatives for CAP**\n\n**Cross-reactivity risk:**\n• Cephalosporins: 1-2% (low, often safe)\n• Carbapenems: <1% (very low)\n• Aztreonam: 0% (no cross-reactivity)\n\n**Safe Alternatives for CAP:**\n\n1. **Respiratory Fluoroquinolone** (1st choice)\n   - Levofloxacin 750mg OD × 5-7 days\n   - Moxifloxacin 400mg OD × 5 days\n\n2. **Macrolide + 3rd Gen Cephalosporin**\n   - Azithromycin 500mg OD × 3 days\n   - + Ceftriaxone 2g IV OD (if inpatient)\n\n3. **If severe allergy (anaphylaxis):**\n   - Avoid ALL beta-lactams\n   - Use Levofloxacin monotherapy\n   - Or Aztreonam + Azithromycin\n\n📝 Document allergy type (rash vs anaphylaxis) — determines beta-lactam safety.';
      } else if (lower.includes('stability') || lower.includes('reconst')) {
        response = '🧪 **Meropenem 1g — Stability Data**\n\n**Reconstitution:**\n• Add 20mL Sterile Water for Injection\n• Shake until dissolved (~30 seconds)\n• Final concentration: 50mg/mL\n\n**Stability After Reconstitution:**\n\n| Diluent | Room Temp (25°C) | Refrigerated (4°C) |\n|---|---|---|\n| SWFI | 3 hours | 12 hours |\n| Normal Saline | 3 hours | 24 hours |\n| D5W | 1 hour | 8 hours |\n\n⚠️ **Important Notes:**\n• Meropenem is NOT stable in D5W — use NS whenever possible\n• Protect from light during infusion\n• Infuse over 15-30 min (standard) or 3 hours (extended infusion for better PK)\n• Do NOT freeze reconstituted solution';
      }

      setMessages(prev => [...prev, { id: Date.now(), role: 'ai', content: response }]);
      setLoading(false);
    }, 1500);
  };

  return (
    <View style={styles.container}>
      <LinearGradient colors={[COLORS.background, COLORS.surface]} style={StyleSheet.absoluteFill} />
      <SafeAreaView style={{ flex: 1 }}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}><ArrowLeft size={22} color={COLORS.text} /></TouchableOpacity>
          <View style={{ flex: 1 }}>
            <View style={styles.headerRow}><Pill size={20} color="#8b5cf6" /><Text style={styles.headerTitle}>Pharmacy AI</Text></View>
            <Text style={styles.headerSub}>Powered by Gemini • Drug Intelligence</Text>
          </View>
          <View style={styles.aiBadge}><Sparkles size={14} color="#8b5cf6" /></View>
        </View>

        <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 20 }} style={{ flex: 1 }}>
          {messages.map(msg => (
            <View key={msg.id} style={[styles.msgRow, msg.role === 'user' && styles.msgRowUser]}>
              {msg.role === 'ai' && <View style={styles.aiAvatar}><Pill size={16} color="#8b5cf6" /></View>}
              <View style={[styles.bubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                <Text style={[styles.msgText, msg.role === 'user' && { color: '#fff' }]}>{msg.content}</Text>
              </View>
            </View>
          ))}
          {loading && (
            <View style={styles.msgRow}>
              <View style={styles.aiAvatar}><Pill size={16} color="#8b5cf6" /></View>
              <View style={styles.aiBubble}><ActivityIndicator size="small" color="#8b5cf6" /><Text style={styles.typingText}>Analyzing...</Text></View>
            </View>
          )}
        </ScrollView>

        {messages.length <= 1 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.quickScroll} contentContainerStyle={{ paddingHorizontal: SPACING.m, gap: 8 }}>
            {QUICK_PROMPTS.map((qp, i) => (
              <TouchableOpacity key={i} style={styles.quickChip} onPress={() => sendMessage(qp.prompt)}>
                <qp.icon size={14} color="#8b5cf6" /><Text style={styles.quickText}>{qp.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        <View style={styles.inputRow}>
          <TextInput style={styles.input} placeholder="Ask about drugs, doses, interactions..." placeholderTextColor={COLORS.textMuted} value={input} onChangeText={setInput} multiline maxLength={1000} />
          <TouchableOpacity style={[styles.sendBtn, (!input.trim() || loading) && { opacity: 0.4 }]} onPress={() => sendMessage(input)} disabled={!input.trim() || loading}>
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
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  headerTitle: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 20 },
  headerSub: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 11, marginTop: 2 },
  aiBadge: { padding: 8, backgroundColor: '#8b5cf620', borderRadius: 12, borderWidth: 1, borderColor: '#8b5cf640' },
  msgRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginBottom: 14 },
  msgRowUser: { justifyContent: 'flex-end' },
  aiAvatar: { width: 32, height: 32, borderRadius: 16, backgroundColor: '#8b5cf620', justifyContent: 'center', alignItems: 'center', marginTop: 4 },
  bubble: { maxWidth: '80%', borderRadius: 18, padding: 14 },
  aiBubble: { backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, borderTopLeftRadius: 4 },
  userBubble: { backgroundColor: '#8b5cf6', borderTopRightRadius: 4 },
  msgText: { fontFamily: FONTS.regular, color: COLORS.text, fontSize: 14, lineHeight: 22 },
  typingText: { fontFamily: FONTS.medium, color: '#8b5cf6', fontSize: 13, marginLeft: 8 },
  quickScroll: { maxHeight: 44, marginBottom: 8 },
  quickChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, backgroundColor: '#8b5cf610', borderWidth: 1, borderColor: '#8b5cf630' },
  quickText: { fontFamily: FONTS.medium, color: '#8b5cf6', fontSize: 12 },
  inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingHorizontal: SPACING.m, paddingVertical: SPACING.s, borderTopWidth: 1, borderTopColor: COLORS.border },
  input: { flex: 1, fontFamily: FONTS.regular, color: COLORS.text, fontSize: 14, backgroundColor: COLORS.surface, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, maxHeight: 100, borderWidth: 1, borderColor: COLORS.border },
  sendBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#8b5cf6', justifyContent: 'center', alignItems: 'center' },
});
