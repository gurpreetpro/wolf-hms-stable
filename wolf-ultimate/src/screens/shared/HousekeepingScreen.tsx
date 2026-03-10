import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Sparkles, Clock, CheckCircle, AlertTriangle, Plus, BedDouble } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';

interface HKRequest { id: string; room: string; ward: string; task: string; priority: 'low' | 'medium' | 'high'; status: 'pending' | 'in_progress' | 'completed'; requested_by: string; requested_time: string; assigned_to?: string; }

export const HousekeepingScreen = () => {
    const { COLORS } = useTheme();
    const [selectedTask, setSelectedTask] = useState('');
    const [room, setRoom] = useState('');
    const [notes, setNotes] = useState('');
    const styles = getStyles(COLORS);

    const tasks = ['Room Cleaning', 'Bed Turnover', 'Terminal Disinfection', 'Spill Cleanup', 'Washroom Cleaning', 'Linen Change', 'Biohazard Cleanup', 'Floor Mopping'];

    const requests: HKRequest[] = [
        { id: '1', room: 'ICU-3', ward: 'ICU', task: 'Terminal Disinfection', priority: 'high', status: 'in_progress', requested_by: 'Nurse Priya', requested_time: '10:30 AM', assigned_to: 'Ramu' },
        { id: '2', room: 'W1-5', ward: 'Ward 1', task: 'Bed Turnover', priority: 'medium', status: 'pending', requested_by: 'Nurse Kavita', requested_time: '11:00 AM' },
        { id: '3', room: 'OT-1', ward: 'OT', task: 'Terminal Disinfection', priority: 'high', status: 'completed', requested_by: 'OT Nurse', requested_time: '09:00 AM', assigned_to: 'Suresh' },
        { id: '4', room: 'Emergency', ward: 'ER', task: 'Spill Cleanup', priority: 'high', status: 'pending', requested_by: 'Nurse Deepa', requested_time: '11:15 AM' },
        { id: '5', room: 'W2-8', ward: 'Ward 2', task: 'Linen Change', priority: 'low', status: 'completed', requested_by: 'Nurse Meera', requested_time: '08:30 AM', assigned_to: 'Ramu' },
    ];

    const getStatusConfig = (s: string) => {
        switch (s) { case 'pending': return { color: COLORS.warning, label: 'Pending' }; case 'in_progress': return { color: COLORS.info, label: 'In Progress' }; case 'completed': return { color: COLORS.success, label: 'Done' }; default: return { color: COLORS.textMuted, label: s }; }
    };

    const getPriorityColor = (p: string) => p === 'high' ? COLORS.error : p === 'medium' ? COLORS.warning : COLORS.textMuted;

    return (
        <SafeAreaView style={styles.container}>
            <BackgroundOrb />
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.header}>
                    <Sparkles size={24} color="#06b6d4" />
                    <Text style={styles.title}>Housekeeping</Text>
                </View>

                {/* Stats */}
                <View style={styles.statsRow}>
                    <GlassCard style={styles.statCard}>
                        <Text style={[styles.statValue, { color: COLORS.warning }]}>{requests.filter(r => r.status === 'pending').length}</Text>
                        <Text style={styles.statLabel}>Pending</Text>
                    </GlassCard>
                    <GlassCard style={styles.statCard}>
                        <Text style={[styles.statValue, { color: COLORS.info }]}>{requests.filter(r => r.status === 'in_progress').length}</Text>
                        <Text style={styles.statLabel}>Active</Text>
                    </GlassCard>
                    <GlassCard style={styles.statCard}>
                        <Text style={[styles.statValue, { color: COLORS.success }]}>{requests.filter(r => r.status === 'completed').length}</Text>
                        <Text style={styles.statLabel}>Done</Text>
                    </GlassCard>
                </View>

                <Text style={styles.sectionLabel}>ACTIVE REQUESTS</Text>
                {requests.map(req => {
                    const cfg = getStatusConfig(req.status);
                    return (
                        <GlassCard key={req.id} style={[styles.reqCard, { borderLeftWidth: 3, borderLeftColor: cfg.color }]}>
                            <View style={styles.reqHeader}>
                                <View style={{ flex: 1 }}>
                                    <View style={styles.reqNameRow}>
                                        <BedDouble size={14} color={COLORS.textMuted} />
                                        <Text style={styles.reqRoom}>{req.room}</Text>
                                        <Text style={styles.reqWard}>({req.ward})</Text>
                                    </View>
                                    <Text style={styles.reqTask}>{req.task}</Text>
                                </View>
                                <View style={styles.reqRight}>
                                    <View style={[styles.statusBadge, { backgroundColor: cfg.color + '20' }]}>
                                        <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                                    </View>
                                    <View style={[styles.priBadge, { backgroundColor: getPriorityColor(req.priority) + '20' }]}>
                                        <Text style={[styles.priText, { color: getPriorityColor(req.priority) }]}>{req.priority}</Text>
                                    </View>
                                </View>
                            </View>
                            <Text style={styles.reqMeta}>{req.requested_by} · {req.requested_time}{req.assigned_to ? ` · Assigned: ${req.assigned_to}` : ''}</Text>
                        </GlassCard>
                    );
                })}

                {/* Quick Request */}
                <Text style={styles.sectionLabel}>QUICK REQUEST</Text>
                <View style={{ paddingHorizontal: SPACING.m }}>
                    <View style={styles.chipRow}>
                        {tasks.map(t => (
                            <TouchableOpacity key={t} style={[styles.chip, selectedTask === t && styles.chipActive]} onPress={() => setSelectedTask(t)}>
                                <Text style={[styles.chipText, selectedTask === t && styles.chipTextActive]}>{t}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TextInput style={[styles.input, { marginTop: SPACING.m }]} placeholder="Room / Location..." placeholderTextColor={COLORS.textMuted} value={room} onChangeText={setRoom} />
                    <TouchableOpacity style={styles.submitBtn} onPress={() => { if (!selectedTask || !room) { Alert.alert('Required', 'Select task and room'); return; } Alert.alert('Requested', `${selectedTask} for ${room}`); }}>
                        <Sparkles size={18} color="#fff" />
                        <Text style={styles.submitBtnText}>Request Housekeeping</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const getStyles = (COLORS: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.l, paddingTop: SPACING.m, gap: SPACING.s },
    title: { fontSize: 24, fontFamily: FONTS.bold, color: COLORS.text },
    statsRow: { flexDirection: 'row', paddingHorizontal: SPACING.m, marginTop: SPACING.m, gap: SPACING.s },
    statCard: { flex: 1, alignItems: 'center', paddingVertical: SPACING.m },
    statValue: { fontSize: 24, fontFamily: FONTS.bold },
    statLabel: { fontSize: 11, fontFamily: FONTS.medium, color: COLORS.textMuted, marginTop: 2 },
    sectionLabel: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.textMuted, letterSpacing: 1, marginTop: SPACING.l, marginBottom: SPACING.s, marginHorizontal: SPACING.l },
    reqCard: { marginHorizontal: SPACING.m, marginBottom: SPACING.s },
    reqHeader: { flexDirection: 'row', justifyContent: 'space-between' },
    reqNameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    reqRoom: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.text },
    reqWard: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textSecondary },
    reqTask: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.textSecondary, marginTop: 2 },
    reqRight: { alignItems: 'flex-end', gap: 4 },
    statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    statusText: { fontSize: 11, fontFamily: FONTS.bold },
    priBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    priText: { fontSize: 9, fontFamily: FONTS.bold, textTransform: 'uppercase' },
    reqMeta: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textMuted, marginTop: SPACING.s },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.s },
    chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
    chipActive: { backgroundColor: '#06b6d4' + '20', borderColor: '#06b6d4' },
    chipText: { fontSize: 12, fontFamily: FONTS.medium, color: COLORS.textMuted },
    chipTextActive: { color: '#06b6d4' },
    input: { backgroundColor: COLORS.surface, borderRadius: 12, padding: SPACING.m, color: COLORS.text, fontFamily: FONTS.regular, fontSize: 14, borderWidth: 1, borderColor: COLORS.border },
    submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#06b6d4', borderRadius: 14, paddingVertical: 14, marginTop: SPACING.m, gap: 8 },
    submitBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 16 },
});
