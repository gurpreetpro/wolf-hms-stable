import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calendar, Clock, User, Scissors, Plus, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';
import otService from '../../services/otService';

interface OTCase { id: string; patient_name: string; procedure: string; surgeon: string; anaesthetist: string; ot_room: string; scheduled_time: string; duration_est: string; status: 'scheduled' | 'in_progress' | 'completed' | 'delayed' | 'cancelled'; priority: 'elective' | 'urgent' | 'emergency'; }

export const OTScheduleScreen = () => {
    const { COLORS } = useTheme();
    const [selectedDate, setSelectedDate] = useState('Today');
    const [selectedOT, setSelectedOT] = useState('All');
    const styles = getStyles(COLORS);

    const dates = ['Today', 'Tomorrow', 'Mar 4', 'Mar 5'];
    const otRooms = ['All', 'OT-1', 'OT-2', 'OT-3', 'OT-4'];

    const [cases, setCases] = useState<OTCase[]>([]);
    const [loading, setLoading] = useState(false);

    const mockCases: OTCase[] = [
        { id: '1', patient_name: 'Rajesh Kumar', procedure: 'Lap. Cholecystectomy', surgeon: 'Dr. Sharma', anaesthetist: 'Dr. Mehra', ot_room: 'OT-1', scheduled_time: '08:00', duration_est: '1h', status: 'completed', priority: 'elective' },
        { id: '2', patient_name: 'Sunita Devi', procedure: 'TKR (Right Knee)', surgeon: 'Dr. Gupta', anaesthetist: 'Dr. Mehra', ot_room: 'OT-2', scheduled_time: '09:00', duration_est: '2h', status: 'in_progress', priority: 'elective' },
        { id: '3', patient_name: 'Meena Gupta', procedure: 'Appendectomy (Lap)', surgeon: 'Dr. Sharma', anaesthetist: 'Dr. Reddy', ot_room: 'OT-1', scheduled_time: '10:30', duration_est: '45min', status: 'scheduled', priority: 'urgent' },
        { id: '4', patient_name: 'Priya Sharma', procedure: 'Emergency LSCS', surgeon: 'Dr. Nair', anaesthetist: 'Dr. Reddy', ot_room: 'OT-3', scheduled_time: '11:00', duration_est: '1h', status: 'scheduled', priority: 'emergency' },
        { id: '5', patient_name: 'Gopal Das', procedure: 'Hernioplasty (Mesh)', surgeon: 'Dr. Sharma', anaesthetist: 'Dr. Mehra', ot_room: 'OT-1', scheduled_time: '14:00', duration_est: '1.5h', status: 'scheduled', priority: 'elective' },
        { id: '6', patient_name: 'Vikram Singh', procedure: 'Carpal Tunnel Release', surgeon: 'Dr. Gupta', anaesthetist: 'Dr. Reddy', ot_room: 'OT-4', scheduled_time: '14:30', duration_est: '30min', status: 'delayed', priority: 'elective' },
    ];

    useEffect(() => {
        loadSchedule();
    }, []);

    const loadSchedule = async () => {
        try {
            setLoading(true);
            const data = await otService.getSchedule();
            setCases(data.length > 0 ? data.map((s: any) => ({
                id: s.id, patient_name: s.patient_name, procedure: s.procedure,
                surgeon: s.surgeon_name, anaesthetist: s.anaesthesia_type || 'TBD',
                ot_room: s.ot_name, scheduled_time: s.start_time,
                duration_est: s.end_time ? `${s.end_time}` : '1h',
                status: s.status, priority: 'elective',
            })) : mockCases);
        } catch { setCases(mockCases); }
        finally { setLoading(false); }
    };

    const filtered = cases.filter(c => selectedOT === 'All' || c.ot_room === selectedOT);

    const getStatusConfig = (s: string) => {
        switch (s) { case 'scheduled': return { color: COLORS.info, label: 'Scheduled' }; case 'in_progress': return { color: COLORS.success, label: 'In Progress' }; case 'completed': return { color: COLORS.primary, label: 'Done' }; case 'delayed': return { color: COLORS.warning, label: 'Delayed' }; case 'cancelled': return { color: COLORS.error, label: 'Cancelled' }; default: return { color: COLORS.textMuted, label: s }; }
    };
    const getPriorityConfig = (p: string) => {
        switch (p) { case 'emergency': return { color: COLORS.error, label: 'EMERGENCY' }; case 'urgent': return { color: COLORS.warning, label: 'URGENT' }; default: return { color: COLORS.textMuted, label: 'ELECTIVE' }; }
    };

    return (
        <SafeAreaView style={styles.container}>
            <BackgroundOrb />
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.header}>
                    <Scissors size={24} color={COLORS.primary} />
                    <Text style={styles.title}>OT Schedule</Text>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                    {dates.map(d => (
                        <TouchableOpacity key={d} style={[styles.dateChip, selectedDate === d && styles.dateActive]} onPress={() => setSelectedDate(d)}>
                            <Text style={[styles.dateText, selectedDate === d && styles.dateTextActive]}>{d}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                    {otRooms.map(r => (
                        <TouchableOpacity key={r} style={[styles.otChip, selectedOT === r && styles.otActive]} onPress={() => setSelectedOT(r)}>
                            <Text style={[styles.otText, selectedOT === r && styles.otTextActive]}>{r}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {/* Stats */}
                <View style={styles.statsRow}>
                    {[
                        { label: 'Total', value: cases.length, color: COLORS.text },
                        { label: 'In Progress', value: cases.filter(c => c.status === 'in_progress').length, color: COLORS.success },
                        { label: 'Pending', value: cases.filter(c => c.status === 'scheduled').length, color: COLORS.info },
                    ].map((s, i) => (
                        <GlassCard key={i} style={styles.statCard}>
                            <Text style={[styles.statValue, { color: s.color }]}>{s.value}</Text>
                            <Text style={styles.statLabel}>{s.label}</Text>
                        </GlassCard>
                    ))}
                </View>

                {filtered.map(c => {
                    const sCfg = getStatusConfig(c.status);
                    const pCfg = getPriorityConfig(c.priority);
                    return (
                        <TouchableOpacity key={c.id} onPress={() => Alert.alert(c.procedure, `Patient: ${c.patient_name}\nSurgeon: ${c.surgeon}\nAnaesthetist: ${c.anaesthetist}\n${c.ot_room} @ ${c.scheduled_time}\nEst: ${c.duration_est}`)}>
                            <GlassCard style={[styles.caseCard, c.status === 'in_progress' && { borderWidth: 1, borderColor: COLORS.success + '50' }]}>
                                <View style={styles.caseHeader}>
                                    <View style={styles.timeCol}>
                                        <Text style={styles.timeText}>{c.scheduled_time}</Text>
                                        <Text style={styles.otRoom}>{c.ot_room}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.caseName, c.status === 'completed' && { opacity: 0.5 }]}>{c.procedure}</Text>
                                        <Text style={styles.casePatient}>{c.patient_name}</Text>
                                        <View style={styles.caseDocRow}>
                                            <Text style={styles.caseDoc}>🔪 {c.surgeon}</Text>
                                            <Text style={styles.caseDoc}>💉 {c.anaesthetist}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.caseRight}>
                                        <View style={[styles.statusBadge, { backgroundColor: sCfg.color + '20' }]}>
                                            <Text style={[styles.statusText, { color: sCfg.color }]}>{sCfg.label}</Text>
                                        </View>
                                        {c.priority !== 'elective' && (
                                            <View style={[styles.priBadge, { backgroundColor: pCfg.color + '20' }]}>
                                                <Text style={[styles.priText, { color: pCfg.color }]}>{pCfg.label}</Text>
                                            </View>
                                        )}
                                        <Text style={styles.durationText}>{c.duration_est}</Text>
                                    </View>
                                </View>
                            </GlassCard>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </SafeAreaView>
    );
};

const getStyles = (COLORS: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.l, paddingTop: SPACING.m, gap: SPACING.s },
    title: { fontSize: 24, fontFamily: FONTS.bold, color: COLORS.text },
    filterRow: { paddingHorizontal: SPACING.m, paddingVertical: SPACING.s, gap: SPACING.s },
    dateChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface },
    dateActive: { backgroundColor: COLORS.primary + '20' },
    dateText: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.textMuted },
    dateTextActive: { color: COLORS.primary },
    otChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
    otActive: { backgroundColor: COLORS.secondary + '20', borderColor: COLORS.secondary },
    otText: { fontSize: 12, fontFamily: FONTS.medium, color: COLORS.textMuted },
    otTextActive: { color: COLORS.secondary },
    statsRow: { flexDirection: 'row', paddingHorizontal: SPACING.m, gap: SPACING.s, marginBottom: SPACING.s },
    statCard: { flex: 1, alignItems: 'center', paddingVertical: SPACING.s },
    statValue: { fontSize: 20, fontFamily: FONTS.bold },
    statLabel: { fontSize: 11, fontFamily: FONTS.medium, color: COLORS.textMuted },
    caseCard: { marginHorizontal: SPACING.m, marginBottom: SPACING.s },
    caseHeader: { flexDirection: 'row' },
    timeCol: { alignItems: 'center', marginRight: SPACING.m, minWidth: 44 },
    timeText: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.text },
    otRoom: { fontSize: 11, fontFamily: FONTS.medium, color: COLORS.textMuted, marginTop: 2 },
    caseName: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.text },
    casePatient: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 2 },
    caseDocRow: { flexDirection: 'row', gap: SPACING.m, marginTop: 4 },
    caseDoc: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textMuted },
    caseRight: { alignItems: 'flex-end', gap: 4, marginLeft: SPACING.s },
    statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    statusText: { fontSize: 10, fontFamily: FONTS.bold },
    priBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    priText: { fontSize: 9, fontFamily: FONTS.bold },
    durationText: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textMuted },
});
