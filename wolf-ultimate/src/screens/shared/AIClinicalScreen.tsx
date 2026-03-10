import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Brain, Send, Sparkles, Stethoscope, Pill, FileText } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';

interface ChatMessage { id: string; role: 'user' | 'ai'; text: string; }

export const AIClinicalScreen = () => {
    const { COLORS } = useTheme();
    const [query, setQuery] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([
        { id: '0', role: 'ai', text: 'Hello Doctor! I\'m your AI Clinical Assistant. I can help with:\n\n• Differential diagnosis suggestions\n• Drug dosage calculations\n• Lab value interpretation\n• Clinical guideline summaries\n• ICD-10 code lookup\n\nHow can I help you today?' },
    ]);
    const styles = getStyles(COLORS);

    const quickActions = [
        { label: 'DDx Helper', icon: Stethoscope, color: '#ef4444', prompt: 'Help me with differential diagnosis for: ' },
        { label: 'Drug Dose', icon: Pill, color: '#3b82f6', prompt: 'Calculate dosage for: ' },
        { label: 'Lab Interpret', icon: FileText, color: '#10b981', prompt: 'Interpret these lab values: ' },
        { label: 'Guidelines', icon: Sparkles, color: '#8b5cf6', prompt: 'Summarize clinical guidelines for: ' },
    ];

    const sendMessage = (text: string) => {
        if (!text.trim()) return;
        const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text };
        setMessages(prev => [...prev, userMsg]);
        setQuery('');

        // Simulated AI response
        setTimeout(() => {
            const responses: Record<string, string> = {
                default: '🤖 I\'m analyzing your query. In a production environment, this would connect to a medical AI model.\n\n**Note:** AI suggestions are for clinical decision support only. Always apply clinical judgement.\n\n*Feature coming soon with GPT-4 Medical integration.*',
            };
            const aiMsg: ChatMessage = { id: (Date.now() + 1).toString(), role: 'ai', text: responses.default };
            setMessages(prev => [...prev, aiMsg]);
        }, 1000);
    };

    return (
        <SafeAreaView style={styles.container}>
            <BackgroundOrb />
            <View style={styles.header}>
                <Brain size={24} color="#8b5cf6" />
                <Text style={styles.title}>AI Clinical Assistant</Text>
                <View style={styles.betaBadge}><Text style={styles.betaText}>BETA</Text></View>
            </View>

            <ScrollView contentContainerStyle={styles.chatArea}>
                {messages.map(msg => (
                    <View key={msg.id} style={[styles.msgBubble, msg.role === 'user' ? styles.userBubble : styles.aiBubble]}>
                        {msg.role === 'ai' && <Brain size={16} color="#8b5cf6" style={{ marginBottom: 4 }} />}
                        <Text style={[styles.msgText, msg.role === 'user' && { color: '#fff' }]}>{msg.text}</Text>
                    </View>
                ))}
            </ScrollView>

            {messages.length <= 1 && (
                <View style={styles.quickRow}>
                    {quickActions.map((qa, i) => (
                        <TouchableOpacity key={i} style={[styles.quickBtn, { borderColor: qa.color + '40' }]} onPress={() => { setQuery(qa.prompt); }}>
                            <qa.icon size={16} color={qa.color} />
                            <Text style={[styles.quickText, { color: qa.color }]}>{qa.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            )}

            <View style={styles.inputRow}>
                <TextInput style={styles.input} placeholder="Ask a clinical question..." placeholderTextColor={COLORS.textMuted} value={query} onChangeText={setQuery} multiline />
                <TouchableOpacity style={styles.sendBtn} onPress={() => sendMessage(query)}>
                    <Send size={18} color="#fff" />
                </TouchableOpacity>
            </View>

            <Text style={styles.disclaimer}>⚠ AI suggestions are for decision support only. Always verify with clinical judgement.</Text>
        </SafeAreaView>
    );
};

const getStyles = (COLORS: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.l, paddingTop: SPACING.m, gap: SPACING.s },
    title: { fontSize: 22, fontFamily: FONTS.bold, color: COLORS.text, flex: 1 },
    betaBadge: { backgroundColor: '#8b5cf6' + '20', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
    betaText: { color: '#8b5cf6', fontSize: 10, fontFamily: FONTS.bold },
    chatArea: { padding: SPACING.m, gap: SPACING.s, flexGrow: 1 },
    msgBubble: { maxWidth: '85%', padding: SPACING.m, borderRadius: 16, marginBottom: 4 },
    userBubble: { alignSelf: 'flex-end', backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
    aiBubble: { alignSelf: 'flex-start', backgroundColor: COLORS.surface, borderBottomLeftRadius: 4, borderWidth: 1, borderColor: '#8b5cf6' + '20' },
    msgText: { fontSize: 14, fontFamily: FONTS.regular, color: COLORS.text, lineHeight: 20 },
    quickRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.m, gap: SPACING.s, marginBottom: SPACING.s },
    quickBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1, backgroundColor: COLORS.surface },
    quickText: { fontSize: 12, fontFamily: FONTS.medium },
    inputRow: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: SPACING.m, paddingVertical: SPACING.s, gap: SPACING.s },
    input: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: COLORS.text, fontFamily: FONTS.regular, fontSize: 14, maxHeight: 100, borderWidth: 1, borderColor: COLORS.border },
    sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#8b5cf6', justifyContent: 'center', alignItems: 'center' },
    disclaimer: { fontSize: 10, fontFamily: FONTS.regular, color: COLORS.textMuted, textAlign: 'center', paddingBottom: SPACING.s, paddingHorizontal: SPACING.l },
});
