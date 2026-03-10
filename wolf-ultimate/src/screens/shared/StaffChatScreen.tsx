import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, FlatList } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageCircle, Send, Search, Circle, Phone, Video } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';
import communicationService from '../../services/communicationService';

interface ChatThread { id: string; name: string; role: string; department: string; last_message: string; time: string; unread: number; online: boolean; avatar_color: string; }
interface Message { id: string; text: string; sender: 'me' | 'other'; time: string; }

export const StaffChatScreen = () => {
    const { COLORS } = useTheme();
    const [selectedThread, setSelectedThread] = useState<ChatThread | null>(null);
    const [messageText, setMessageText] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const styles = getStyles(COLORS);

    const [threads, setThreads] = useState<ChatThread[]>([]);

    const mockThreads: ChatThread[] = [
        { id: '1', name: 'Dr. Sharma', role: 'Surgeon', department: 'Surgery', last_message: 'Patient in W1-5 needs pre-op clearance', time: '2 min', unread: 2, online: true, avatar_color: '#ef4444' },
        { id: '2', name: 'Nurse Priya', role: 'Head Nurse', department: 'ICU', last_message: 'Vitals updated for Bed 3', time: '15 min', unread: 0, online: true, avatar_color: '#8b5cf6' },
        { id: '3', name: 'Dr. Mehra', role: 'Anaesthetist', department: 'Anaesthesia', last_message: 'OT-2 ready for next case', time: '30 min', unread: 1, online: false, avatar_color: '#3b82f6' },
        { id: '4', name: 'Lab Team', role: 'Group', department: 'Pathology', last_message: 'CBC results for UHID-4521 uploaded', time: '1 hr', unread: 0, online: true, avatar_color: '#10b981' },
        { id: '5', name: 'Nurse Kavita', role: 'Staff Nurse', department: 'Ward 2', last_message: 'Discharge meds ready for collection', time: '2 hr', unread: 0, online: false, avatar_color: '#f59e0b' },
    ];

    useEffect(() => { loadChannels(); }, []);

    const loadChannels = async () => {
        try {
            const data = await communicationService.getChannels();
            if (data.length > 0) {
                setThreads(data.map((ch: any) => ({
                    id: ch.id, name: ch.name, role: ch.type || 'Staff',
                    department: ch.members?.[0]?.role || '', last_message: ch.last_message || '',
                    time: ch.last_message_time || '', unread: ch.unread_count || 0,
                    online: false, avatar_color: '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0'),
                })));
            } else { setThreads(mockThreads); }
        } catch { setThreads(mockThreads); }
    };

    const messages: Message[] = [
        { id: '1', text: 'Hi, patient in W1-5 needs pre-op clearance for tomorrow', sender: 'other', time: '10:30' },
        { id: '2', text: 'Which procedure is planned?', sender: 'me', time: '10:31' },
        { id: '3', text: 'Lap Cholecystectomy. All labs are done.', sender: 'other', time: '10:32' },
        { id: '4', text: 'I\'ll review the reports and clear by evening', sender: 'me', time: '10:33' },
        { id: '5', text: 'Patient in W1-5 needs pre-op clearance', sender: 'other', time: '10:45' },
    ];

    const filtered = threads.filter(t => t.name.toLowerCase().includes(searchQuery.toLowerCase()));

    if (selectedThread) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.chatHeader}>
                    <TouchableOpacity onPress={() => setSelectedThread(null)}><Text style={styles.backBtn}>← Back</Text></TouchableOpacity>
                    <View style={[styles.avatar, { backgroundColor: selectedThread.avatar_color }]}>
                        <Text style={styles.avatarText}>{selectedThread.name[0]}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.chatName}>{selectedThread.name}</Text>
                        <Text style={styles.chatStatus}>{selectedThread.online ? '● Online' : '○ Offline'}</Text>
                    </View>
                    <TouchableOpacity style={styles.callBtn}><Phone size={18} color={COLORS.primary} /></TouchableOpacity>
                    <TouchableOpacity style={styles.callBtn}><Video size={18} color={COLORS.primary} /></TouchableOpacity>
                </View>
                <ScrollView contentContainerStyle={styles.messagesContainer}>
                    {messages.map(msg => (
                        <View key={msg.id} style={[styles.msgBubble, msg.sender === 'me' ? styles.msgMe : styles.msgOther]}>
                            <Text style={[styles.msgText, msg.sender === 'me' && { color: '#fff' }]}>{msg.text}</Text>
                            <Text style={[styles.msgTime, msg.sender === 'me' && { color: 'rgba(255,255,255,0.7)' }]}>{msg.time}</Text>
                        </View>
                    ))}
                </ScrollView>
                <View style={styles.inputRow}>
                    <TextInput style={styles.msgInput} placeholder="Type a message..." placeholderTextColor={COLORS.textMuted} value={messageText} onChangeText={setMessageText} />
                    <TouchableOpacity style={styles.sendBtn}><Send size={18} color="#fff" /></TouchableOpacity>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <BackgroundOrb />
            <View style={styles.header}>
                <MessageCircle size={24} color={COLORS.primary} />
                <Text style={styles.title}>Staff Chat</Text>
            </View>
            <View style={styles.searchRow}>
                <Search size={16} color={COLORS.textMuted} />
                <TextInput style={styles.searchInput} placeholder="Search staff..." placeholderTextColor={COLORS.textMuted} value={searchQuery} onChangeText={setSearchQuery} />
            </View>
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                {filtered.map(thread => (
                    <TouchableOpacity key={thread.id} onPress={() => setSelectedThread(thread)}>
                        <View style={styles.threadRow}>
                            <View style={[styles.avatar, { backgroundColor: thread.avatar_color }]}>
                                <Text style={styles.avatarText}>{thread.name[0]}</Text>
                                {thread.online && <View style={styles.onlineDot} />}
                            </View>
                            <View style={{ flex: 1 }}>
                                <View style={styles.threadNameRow}>
                                    <Text style={styles.threadName}>{thread.name}</Text>
                                    <Text style={styles.threadTime}>{thread.time}</Text>
                                </View>
                                <Text style={styles.threadRole}>{thread.role} · {thread.department}</Text>
                                <Text style={styles.threadMsg} numberOfLines={1}>{thread.last_message}</Text>
                            </View>
                            {thread.unread > 0 && (
                                <View style={styles.unreadBadge}><Text style={styles.unreadText}>{thread.unread}</Text></View>
                            )}
                        </View>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
};

const getStyles = (COLORS: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.l, paddingTop: SPACING.m, gap: SPACING.s },
    title: { fontSize: 24, fontFamily: FONTS.bold, color: COLORS.text },
    searchRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: SPACING.m, marginTop: SPACING.m, backgroundColor: COLORS.surface, borderRadius: 12, paddingHorizontal: SPACING.m, gap: 8 },
    searchInput: { flex: 1, paddingVertical: 10, color: COLORS.text, fontFamily: FONTS.regular, fontSize: 14 },
    threadRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.m, paddingVertical: SPACING.m, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    avatar: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.m },
    avatarText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 18 },
    onlineDot: { position: 'absolute', bottom: 0, right: 0, width: 12, height: 12, borderRadius: 6, backgroundColor: '#10b981', borderWidth: 2, borderColor: '#fff' },
    threadNameRow: { flexDirection: 'row', justifyContent: 'space-between' },
    threadName: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.text },
    threadTime: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textMuted },
    threadRole: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 1 },
    threadMsg: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textMuted, marginTop: 2 },
    unreadBadge: { backgroundColor: COLORS.primary, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
    unreadText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 11 },
    chatHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.m, paddingVertical: SPACING.s, borderBottomWidth: 1, borderBottomColor: COLORS.border, gap: SPACING.s },
    backBtn: { fontSize: 14, fontFamily: FONTS.medium, color: COLORS.primary },
    chatName: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.text },
    chatStatus: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textMuted },
    callBtn: { padding: 8 },
    messagesContainer: { padding: SPACING.m, gap: SPACING.s },
    msgBubble: { maxWidth: '80%', padding: SPACING.m, borderRadius: 16, marginBottom: 4 },
    msgMe: { alignSelf: 'flex-end', backgroundColor: COLORS.primary, borderBottomRightRadius: 4 },
    msgOther: { alignSelf: 'flex-start', backgroundColor: COLORS.surface, borderBottomLeftRadius: 4 },
    msgText: { fontSize: 14, fontFamily: FONTS.regular, color: COLORS.text },
    msgTime: { fontSize: 10, fontFamily: FONTS.regular, color: COLORS.textMuted, marginTop: 4, alignSelf: 'flex-end' },
    inputRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.m, paddingVertical: SPACING.s, borderTopWidth: 1, borderTopColor: COLORS.border, gap: SPACING.s },
    msgInput: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10, color: COLORS.text, fontFamily: FONTS.regular, fontSize: 14 },
    sendBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
});
