import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Video, Mic, MicOff, VideoOff, PhoneOff, MessageSquare, Monitor, ScreenShare } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';
import supportService from '../../services/supportService';

interface TelehealthSession { id: string; patient_name: string; type: 'video' | 'audio'; scheduled_time: string; duration: string; status: 'upcoming' | 'in_progress' | 'completed'; reason: string; }

export const TelehealthScreen = () => {
    const { COLORS } = useTheme();
    const [inCall, setInCall] = useState(false);
    const [micOn, setMicOn] = useState(true);
    const [videoOn, setVideoOn] = useState(true);
    const styles = getStyles(COLORS);

    const [sessions, setSessions] = useState<TelehealthSession[]>([]);

    const mockSessions: TelehealthSession[] = [
        { id: '1', patient_name: 'Arun Mehta', type: 'video', scheduled_time: '11:00 AM', duration: '15 min', status: 'upcoming', reason: 'Follow-up: Post-surgery review' },
        { id: '2', patient_name: 'Neha Singh', type: 'video', scheduled_time: '11:30 AM', duration: '20 min', status: 'upcoming', reason: 'New Consult: Persistent cough' },
        { id: '3', patient_name: 'Ramesh Patel', type: 'audio', scheduled_time: '12:00 PM', duration: '10 min', status: 'upcoming', reason: 'Follow-up: Lab review' },
        { id: '4', patient_name: 'Sunita Devi', type: 'video', scheduled_time: '09:30 AM', duration: '15 min', status: 'completed', reason: 'Follow-up: Diabetes management' },
    ];

    useEffect(() => { loadSessions(); }, []);

    const loadSessions = async () => {
        try {
            const data = await supportService.getTelehealthSessions();
            if (data.length > 0) {
                setSessions(data.map((s: any) => ({
                    id: s.id, patient_name: s.patient_name,
                    type: 'video', scheduled_time: s.scheduled_time,
                    duration: s.duration_minutes ? `${s.duration_minutes} min` : '15 min',
                    status: s.status === 'scheduled' ? 'upcoming' : s.status,
                    reason: '',
                })));
            } else { setSessions(mockSessions); }
        } catch { setSessions(mockSessions); }
    };

    if (inCall) {
        return (
            <SafeAreaView style={[styles.container, { backgroundColor: '#000' }]}>
                <View style={styles.callView}>
                    <View style={styles.remoteVideo}>
                        <Text style={styles.callPatientName}>Arun Mehta</Text>
                        <Text style={styles.callTimer}>03:42</Text>
                    </View>
                    <View style={styles.selfVideo}>
                        <Text style={{ color: '#fff', fontSize: 12 }}>You</Text>
                    </View>
                    <View style={styles.callControls}>
                        <TouchableOpacity style={[styles.controlBtn, !micOn && styles.controlOff]} onPress={() => setMicOn(!micOn)}>
                            {micOn ? <Mic size={22} color="#fff" /> : <MicOff size={22} color="#fff" />}
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.controlBtn, !videoOn && styles.controlOff]} onPress={() => setVideoOn(!videoOn)}>
                            {videoOn ? <Video size={22} color="#fff" /> : <VideoOff size={22} color="#fff" />}
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.controlBtn} onPress={() => Alert.alert('Screen Share', 'Sharing screen...')}>
                            <Monitor size={22} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.controlBtn} onPress={() => Alert.alert('Chat', 'Open in-call chat')}>
                            <MessageSquare size={22} color="#fff" />
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.endCallBtn} onPress={() => setInCall(false)}>
                            <PhoneOff size={22} color="#fff" />
                        </TouchableOpacity>
                    </View>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <BackgroundOrb />
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.header}>
                    <Video size={24} color={COLORS.primary} />
                    <Text style={styles.title}>Telehealth</Text>
                </View>

                <Text style={styles.sectionLabel}>TODAY'S SESSIONS</Text>
                {sessions.map(s => (
                    <GlassCard key={s.id} style={[styles.sessionCard, s.status === 'completed' && { opacity: 0.6 }]}>
                        <View style={styles.sessionHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.sessionPatient}>{s.patient_name}</Text>
                                <Text style={styles.sessionReason}>{s.reason}</Text>
                            </View>
                            <View style={styles.sessionRight}>
                                <Text style={styles.sessionTime}>{s.scheduled_time}</Text>
                                <View style={[styles.typeBadge, { backgroundColor: s.type === 'video' ? COLORS.primary + '20' : COLORS.info + '20' }]}>
                                    {s.type === 'video' ? <Video size={12} color={COLORS.primary} /> : <Mic size={12} color={COLORS.info} />}
                                    <Text style={[styles.typeText, { color: s.type === 'video' ? COLORS.primary : COLORS.info }]}>{s.duration}</Text>
                                </View>
                            </View>
                        </View>
                        {s.status === 'upcoming' && (
                            <TouchableOpacity style={styles.joinBtn} onPress={() => setInCall(true)}>
                                <Video size={16} color="#fff" />
                                <Text style={styles.joinBtnText}>Join Call</Text>
                            </TouchableOpacity>
                        )}
                        {s.status === 'completed' && (
                            <Text style={[styles.completedText, { color: COLORS.success }]}>✓ Completed</Text>
                        )}
                    </GlassCard>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
};

const getStyles = (COLORS: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.l, paddingTop: SPACING.m, gap: SPACING.s },
    title: { fontSize: 24, fontFamily: FONTS.bold, color: COLORS.text },
    sectionLabel: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.textMuted, letterSpacing: 1, marginTop: SPACING.l, marginBottom: SPACING.s, marginHorizontal: SPACING.l },
    sessionCard: { marginHorizontal: SPACING.m, marginBottom: SPACING.m },
    sessionHeader: { flexDirection: 'row' },
    sessionPatient: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.text },
    sessionReason: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 2 },
    sessionRight: { alignItems: 'flex-end', gap: 4 },
    sessionTime: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.text },
    typeBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, gap: 4 },
    typeText: { fontSize: 11, fontFamily: FONTS.medium },
    joinBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderRadius: 10, paddingVertical: 10, marginTop: SPACING.m, gap: 6 },
    joinBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 14 },
    completedText: { fontSize: 13, fontFamily: FONTS.medium, marginTop: SPACING.s },
    callView: { flex: 1, justifyContent: 'space-between' },
    remoteVideo: { flex: 1, backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center', borderRadius: 0 },
    callPatientName: { color: '#fff', fontFamily: FONTS.bold, fontSize: 20 },
    callTimer: { color: 'rgba(255,255,255,0.7)', fontFamily: FONTS.medium, fontSize: 14, marginTop: 4 },
    selfVideo: { position: 'absolute', top: SPACING.l, right: SPACING.m, width: 100, height: 140, backgroundColor: '#2a2a3e', borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    callControls: { flexDirection: 'row', justifyContent: 'center', gap: SPACING.m, paddingVertical: SPACING.l, backgroundColor: 'rgba(0,0,0,0.8)' },
    controlBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
    controlOff: { backgroundColor: 'rgba(255,0,0,0.3)' },
    endCallBtn: { width: 50, height: 50, borderRadius: 25, backgroundColor: '#ef4444', justifyContent: 'center', alignItems: 'center' },
});
