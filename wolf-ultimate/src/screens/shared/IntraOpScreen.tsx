import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Activity, Heart, Thermometer, Clock, AlertTriangle, CheckCircle } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';

interface Vital { label: string; value: string; unit: string; color: string; icon: any; status: 'normal' | 'warning' | 'critical'; }
interface Event { time: string; event: string; by: string; type: 'info' | 'medication' | 'alert' | 'milestone'; }

export const IntraOpScreen = () => {
    const { COLORS } = useTheme();
    const [elapsed, setElapsed] = useState(47);
    const styles = getStyles(COLORS);

    useEffect(() => {
        const timer = setInterval(() => setElapsed(p => p + 1), 60000);
        return () => clearInterval(timer);
    }, []);

    const vitals: Vital[] = [
        { label: 'Heart Rate', value: '72', unit: 'bpm', color: '#ef4444', icon: Heart, status: 'normal' },
        { label: 'BP', value: '118/76', unit: 'mmHg', color: COLORS.info, icon: Activity, status: 'normal' },
        { label: 'SpO2', value: '99', unit: '%', color: COLORS.success, icon: Activity, status: 'normal' },
        { label: 'EtCO2', value: '35', unit: 'mmHg', color: '#f59e0b', icon: Activity, status: 'normal' },
        { label: 'Temp', value: '36.2', unit: '°C', color: '#8b5cf6', icon: Thermometer, status: 'normal' },
        { label: 'MAC', value: '1.1', unit: '', color: '#06b6d4', icon: Activity, status: 'normal' },
    ];

    const events: Event[] = [
        { time: '08:00', event: 'Patient wheeled in, WHO checklist done', by: 'OT Nurse', type: 'milestone' },
        { time: '08:05', event: 'Spinal anaesthesia administered (L3-L4)', by: 'Dr. Mehra', type: 'medication' },
        { time: '08:10', event: 'Sensory block confirmed T10', by: 'Dr. Mehra', type: 'info' },
        { time: '08:15', event: 'Incision — surgery started', by: 'Dr. Sharma', type: 'milestone' },
        { time: '08:20', event: 'Inj. Cefuroxime 1.5g IV administered', by: 'OT Nurse', type: 'medication' },
        { time: '08:30', event: 'BP drop to 90/60 — Fluid bolus 500ml NS', by: 'Dr. Mehra', type: 'alert' },
        { time: '08:35', event: 'BP recovered to 110/72', by: 'Dr. Mehra', type: 'info' },
        { time: '08:42', event: 'Specimen sent to pathology', by: 'OT Nurse', type: 'info' },
    ];

    const getEventColor = (t: string) => {
        switch (t) { case 'milestone': return COLORS.primary; case 'medication': return COLORS.info; case 'alert': return COLORS.error; default: return COLORS.textMuted; }
    };

    return (
        <SafeAreaView style={styles.container}>
            <BackgroundOrb />
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.header}>
                    <Activity size={24} color={COLORS.success} />
                    <View style={{ flex: 1 }}>
                        <Text style={styles.title}>Intra-Op Monitor</Text>
                        <Text style={styles.subtitle}>Lap. Cholecystectomy — OT-1</Text>
                    </View>
                    <View style={styles.timerBadge}>
                        <Clock size={14} color="#fff" />
                        <Text style={styles.timerText}>{elapsed} min</Text>
                    </View>
                </View>

                {/* Patient Info */}
                <GlassCard style={styles.patientCard}>
                    <Text style={styles.patientName}>Rajesh Kumar · 45y/M</Text>
                    <Text style={styles.patientMeta}>Surgeon: Dr. Sharma · Anaesthesia: Dr. Mehra (Spinal)</Text>
                </GlassCard>

                {/* Live Vitals */}
                <Text style={styles.sectionLabel}>LIVE VITALS</Text>
                <View style={styles.vitalsGrid}>
                    {vitals.map((v, i) => (
                        <GlassCard key={i} style={[styles.vitalCard, v.status === 'critical' && { borderColor: COLORS.error, borderWidth: 1 }]}>
                            <v.icon size={16} color={v.color} />
                            <Text style={[styles.vitalValue, { color: v.color }]}>{v.value}</Text>
                            <Text style={styles.vitalUnit}>{v.unit}</Text>
                            <Text style={styles.vitalLabel}>{v.label}</Text>
                        </GlassCard>
                    ))}
                </View>

                {/* Timeline */}
                <Text style={styles.sectionLabel}>INTRA-OP TIMELINE</Text>
                <View style={styles.timeline}>
                    {events.map((ev, i) => (
                        <View key={i} style={styles.timelineRow}>
                            <View style={styles.timelineLeft}>
                                <Text style={styles.timelineTime}>{ev.time}</Text>
                                <View style={[styles.timelineDot, { backgroundColor: getEventColor(ev.type) }]} />
                                {i < events.length - 1 && <View style={styles.timelineLine} />}
                            </View>
                            <GlassCard style={[styles.timelineCard, ev.type === 'alert' && { borderLeftWidth: 3, borderLeftColor: COLORS.error }]}>
                                <Text style={styles.timelineEvent}>{ev.event}</Text>
                                <Text style={styles.timelineBy}>{ev.by}</Text>
                            </GlassCard>
                        </View>
                    ))}
                </View>

                <View style={styles.actionRow}>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.info + '20' }]} onPress={() => Alert.alert('Add Event', 'Log medication, event, or alert')}>
                        <Text style={[styles.actionBtnText, { color: COLORS.info }]}>+ Add Event</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.error + '20' }]} onPress={() => Alert.alert('Alert', 'Report critical event')}>
                        <AlertTriangle size={14} color={COLORS.error} />
                        <Text style={[styles.actionBtnText, { color: COLORS.error }]}>Alert</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.success + '20' }]} onPress={() => Alert.alert('End', 'Mark surgery complete and transfer to PACU')}>
                        <CheckCircle size={14} color={COLORS.success} />
                        <Text style={[styles.actionBtnText, { color: COLORS.success }]}>End</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const getStyles = (COLORS: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.l, paddingTop: SPACING.m, gap: SPACING.s },
    title: { fontSize: 22, fontFamily: FONTS.bold, color: COLORS.text },
    subtitle: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.textSecondary },
    timerBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.success, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, gap: 4 },
    timerText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 14 },
    patientCard: { marginHorizontal: SPACING.m, marginTop: SPACING.m },
    patientName: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.text },
    patientMeta: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 4 },
    sectionLabel: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.textMuted, letterSpacing: 1, marginTop: SPACING.l, marginBottom: SPACING.s, marginHorizontal: SPACING.l },
    vitalsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.m, gap: SPACING.s },
    vitalCard: { width: '31%', alignItems: 'center', paddingVertical: SPACING.s },
    vitalValue: { fontSize: 22, fontFamily: FONTS.bold, marginTop: 4 },
    vitalUnit: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textMuted },
    vitalLabel: { fontSize: 10, fontFamily: FONTS.medium, color: COLORS.textSecondary, marginTop: 2 },
    timeline: { paddingHorizontal: SPACING.m },
    timelineRow: { flexDirection: 'row', marginBottom: 2 },
    timelineLeft: { width: 60, alignItems: 'center' },
    timelineTime: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.textMuted },
    timelineDot: { width: 10, height: 10, borderRadius: 5, marginTop: 4 },
    timelineLine: { width: 2, flex: 1, backgroundColor: COLORS.border, marginVertical: 2 },
    timelineCard: { flex: 1, marginLeft: SPACING.s, marginBottom: SPACING.s },
    timelineEvent: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.text },
    timelineBy: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textMuted, marginTop: 2 },
    actionRow: { flexDirection: 'row', paddingHorizontal: SPACING.m, marginTop: SPACING.m, gap: SPACING.s },
    actionBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 12, gap: 4 },
    actionBtnText: { fontSize: 13, fontFamily: FONTS.bold },
});
