import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity, RefreshControl, Alert, Vibration } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Phone, SkipForward, RotateCcw, Clock, UserCheck, Users, Hash, ChevronRight, Plus } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';
import apiClient from '../../api/client';

interface QueueItem {
    id: string; token_number: number; patient_name: string; age: number; gender: string;
    phone?: string; status: 'waiting' | 'called' | 'in_consultation' | 'completed' | 'skipped';
    visit_type: string; arrival_time: string; uhid?: string;
}

export const OPDQueueScreen = ({ navigation }: any) => {
    const { COLORS } = useTheme();
    const [queue, setQueue] = useState<QueueItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentToken, setCurrentToken] = useState<number>(0);
    const styles = getStyles(COLORS);

    useEffect(() => { loadQueue(); }, []);

    const loadQueue = async () => {
        setLoading(true);
        try {
            const res = await apiClient.get('/api/opd/queue/today');
            setQueue(res.data?.queue || getDemoData());
        } catch { setQueue(getDemoData()); }
        finally { setLoading(false); }
    };

    const getDemoData = (): QueueItem[] => [
        { id: '1', token_number: 1, patient_name: 'Rajesh Kumar', age: 45, gender: 'M', status: 'completed', visit_type: 'Follow-up', arrival_time: '09:00', uhid: 'WH-2024-001' },
        { id: '2', token_number: 2, patient_name: 'Priya Sharma', age: 32, gender: 'F', status: 'completed', visit_type: 'New', arrival_time: '09:15', uhid: 'WH-2024-002' },
        { id: '3', token_number: 3, patient_name: 'Amit Patel', age: 58, gender: 'M', status: 'in_consultation', visit_type: 'Follow-up', arrival_time: '09:30', uhid: 'WH-2024-003', phone: '9876543210' },
        { id: '4', token_number: 4, patient_name: 'Sunita Devi', age: 67, gender: 'F', status: 'waiting', visit_type: 'New', arrival_time: '09:45', uhid: 'WH-2024-004' },
        { id: '5', token_number: 5, patient_name: 'Vikram Singh', age: 29, gender: 'M', status: 'waiting', visit_type: 'Emergency', arrival_time: '10:00', uhid: 'WH-2024-005' },
        { id: '6', token_number: 6, patient_name: 'Lakshmi Nair', age: 41, gender: 'F', status: 'waiting', visit_type: 'Follow-up', arrival_time: '10:15' },
        { id: '7', token_number: 7, patient_name: 'Gopal Das', age: 55, gender: 'M', status: 'waiting', visit_type: 'New', arrival_time: '10:30' },
        { id: '8', token_number: 8, patient_name: 'Meera Joshi', age: 38, gender: 'F', status: 'skipped', visit_type: 'Follow-up', arrival_time: '10:00' },
    ];

    const callNext = async () => {
        const next = queue.find(q => q.status === 'waiting');
        if (!next) { Alert.alert('Queue Empty', 'No more patients waiting.'); return; }
        Vibration.vibrate(100);
        setQueue(prev => prev.map(q => 
            q.id === next.id ? { ...q, status: 'called' as const } : 
            q.status === 'in_consultation' ? { ...q, status: 'completed' as const } : q
        ));
        setCurrentToken(next.token_number);
        try { await apiClient.post(`/api/opd/queue/call/${next.id}`); } catch {}
    };

    const skipPatient = async (id: string) => {
        setQueue(prev => prev.map(q => q.id === id ? { ...q, status: 'skipped' as const } : q));
        try { await apiClient.post(`/api/opd/queue/skip/${id}`); } catch {}
    };

    const recallPatient = async (id: string) => {
        setQueue(prev => prev.map(q => q.id === id ? { ...q, status: 'waiting' as const } : q));
        try { await apiClient.post(`/api/opd/queue/recall/${id}`); } catch {}
    };

    const startConsultation = async (item: QueueItem) => {
        setQueue(prev => prev.map(q => q.id === item.id ? { ...q, status: 'in_consultation' as const } : q));
        navigation.navigate('PatientDetail', { patientId: item.id, patientName: item.patient_name });
    };

    const waiting = queue.filter(q => q.status === 'waiting').length;
    const completed = queue.filter(q => q.status === 'completed').length;
    const current = queue.find(q => q.status === 'in_consultation' || q.status === 'called');

    const getStatusColor = (s: string) => {
        switch (s) {
            case 'waiting': return COLORS.textMuted;
            case 'called': return COLORS.warning;
            case 'in_consultation': return COLORS.success;
            case 'completed': return COLORS.primary;
            case 'skipped': return COLORS.error;
            default: return COLORS.textMuted;
        }
    };

    const getVisitColor = (v: string) => v === 'Emergency' ? COLORS.error : v === 'New' ? COLORS.info : COLORS.textMuted;

    return (
        <SafeAreaView style={styles.container}>
            <BackgroundOrb />
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>OPD Queue</Text>
                    <Text style={styles.subtitle}>{waiting} waiting · {completed} done · {queue.length} total</Text>
                </View>
                <TouchableOpacity style={styles.addBtn} onPress={() => Alert.alert('Walk-in', 'Add walk-in patient via reception')}>
                    <Plus size={20} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Current Token Display */}
            <GlassCard style={styles.currentCard}>
                <View style={styles.currentRow}>
                    <View>
                        <Text style={styles.currentLabel}>CURRENT TOKEN</Text>
                        <Text style={styles.currentToken}>#{current?.token_number || '—'}</Text>
                        <Text style={styles.currentName}>{current?.patient_name || 'None'}</Text>
                    </View>
                    <TouchableOpacity style={styles.callNextBtn} onPress={callNext}>
                        <Phone size={18} color="#fff" />
                        <Text style={styles.callNextText}>Call Next</Text>
                    </TouchableOpacity>
                </View>
            </GlassCard>

            {/* Stats Row */}
            <View style={styles.statsRow}>
                {[
                    { icon: Clock, label: 'Waiting', value: waiting, color: COLORS.warning },
                    { icon: UserCheck, label: 'Done', value: completed, color: COLORS.success },
                    { icon: Users, label: 'Total', value: queue.length, color: COLORS.info },
                ].map((s, i) => (
                    <GlassCard key={i} style={styles.statCard}>
                        <s.icon size={16} color={s.color} />
                        <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                        <Text style={styles.statLabel}>{s.label}</Text>
                    </GlassCard>
                ))}
            </View>

            <FlatList
                data={queue}
                keyExtractor={item => item.id}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={loadQueue} tintColor={COLORS.primary} />}
                contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}
                renderItem={({ item }) => (
                    <TouchableOpacity onPress={() => item.status === 'called' || item.status === 'waiting' ? startConsultation(item) : null}>
                        <GlassCard style={[styles.queueCard, item.status === 'in_consultation' && { borderColor: COLORS.success, borderWidth: 1 }]}>
                            <View style={styles.queueRow}>
                                <View style={[styles.tokenCircle, { backgroundColor: getStatusColor(item.status) + '20' }]}>
                                    <Text style={[styles.tokenNum, { color: getStatusColor(item.status) }]}>#{item.token_number}</Text>
                                </View>
                                <View style={styles.queueInfo}>
                                    <View style={styles.nameRow}>
                                        <Text style={[styles.patientName, item.status === 'completed' && { opacity: 0.5 }]}>{item.patient_name}</Text>
                                        <View style={[styles.visitBadge, { backgroundColor: getVisitColor(item.visit_type) + '20' }]}>
                                            <Text style={[styles.visitText, { color: getVisitColor(item.visit_type) }]}>{item.visit_type}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.patientMeta}>{item.age}y · {item.gender} · {item.arrival_time} {item.uhid ? `· ${item.uhid}` : ''}</Text>
                                </View>
                                <View style={styles.queueActions}>
                                    {item.status === 'waiting' && (
                                        <TouchableOpacity style={styles.skipBtn} onPress={() => skipPatient(item.id)}>
                                            <SkipForward size={14} color={COLORS.warning} />
                                        </TouchableOpacity>
                                    )}
                                    {item.status === 'skipped' && (
                                        <TouchableOpacity style={styles.recallBtn} onPress={() => recallPatient(item.id)}>
                                            <RotateCcw size={14} color={COLORS.info} />
                                        </TouchableOpacity>
                                    )}
                                    {(item.status === 'waiting' || item.status === 'called') && (
                                        <ChevronRight size={16} color={COLORS.textMuted} />
                                    )}
                                </View>
                            </View>
                        </GlassCard>
                    </TouchableOpacity>
                )}
            />
        </SafeAreaView>
    );
};

const getStyles = (COLORS: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.l, paddingTop: SPACING.m },
    title: { fontSize: 28, fontFamily: FONTS.bold, color: COLORS.text },
    subtitle: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.textSecondary, marginTop: 2 },
    addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
    currentCard: { marginHorizontal: SPACING.m, marginTop: SPACING.m, borderWidth: 1, borderColor: COLORS.primary + '30' },
    currentRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    currentLabel: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.textMuted, letterSpacing: 1 },
    currentToken: { fontSize: 36, fontFamily: FONTS.extraBold, color: COLORS.primary, marginTop: 2 },
    currentName: { fontSize: 14, fontFamily: FONTS.medium, color: COLORS.textSecondary },
    callNextBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.success, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 10, gap: 6 },
    callNextText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 14 },
    statsRow: { flexDirection: 'row', paddingHorizontal: SPACING.m, marginTop: SPACING.m, gap: SPACING.s },
    statCard: { flex: 1, alignItems: 'center', paddingVertical: SPACING.s },
    statValue: { fontSize: 20, fontFamily: FONTS.bold, marginTop: 4 },
    statLabel: { fontSize: 11, fontFamily: FONTS.medium, color: COLORS.textMuted, marginTop: 2 },
    queueCard: { marginBottom: SPACING.s },
    queueRow: { flexDirection: 'row', alignItems: 'center' },
    tokenCircle: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.m },
    tokenNum: { fontSize: 14, fontFamily: FONTS.bold },
    queueInfo: { flex: 1 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    patientName: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.text },
    visitBadge: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
    visitText: { fontSize: 10, fontFamily: FONTS.bold },
    patientMeta: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 2 },
    queueActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    skipBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.warning + '20', justifyContent: 'center', alignItems: 'center' },
    recallBtn: { width: 32, height: 32, borderRadius: 16, backgroundColor: COLORS.info + '20', justifyContent: 'center', alignItems: 'center' },
});
