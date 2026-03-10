import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bell, AlertTriangle, Heart, Thermometer, Pill, CheckCircle, X, Clock } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';
import communicationService from '../../services/communicationService';

interface ClinicalAlert { id: string; patient_name: string; bed: string; type: 'critical_vital' | 'medication' | 'lab_result' | 'deterioration' | 'fall_risk' | 'allergy'; message: string; severity: 'critical' | 'warning' | 'info'; time: string; acknowledged: boolean; }

export const ClinicalAlertsScreen = () => {
    const { COLORS } = useTheme();
    const [filter, setFilter] = useState<'all' | 'critical' | 'warning' | 'info'>('all');
    const mockAlerts: ClinicalAlert[] = [
        { id: '1', patient_name: 'Meena Gupta', bed: 'ICU-3', type: 'critical_vital', message: 'SpO2 dropped to 88% — Below threshold', severity: 'critical', time: '2 min ago', acknowledged: false },
        { id: '2', patient_name: 'Ravi Verma', bed: 'W2-12', type: 'deterioration', message: 'NEWS-2 Score increased from 3 → 7', severity: 'critical', time: '5 min ago', acknowledged: false },
        { id: '3', patient_name: 'Amit Patel', bed: 'W1-5', type: 'medication', message: 'Missed dose: Inj. Ceftriaxone 1g IV (Due 08:00)', severity: 'warning', time: '30 min ago', acknowledged: false },
        { id: '4', patient_name: 'Sunita Devi', bed: 'W1-8', type: 'lab_result', message: 'Critical lab: Potassium 6.2 mEq/L (HIGH)', severity: 'critical', time: '15 min ago', acknowledged: false },
        { id: '5', patient_name: 'Baby Arjun', bed: 'P-1', type: 'allergy', message: 'Allergy alert: Penicillin ordered — Patient allergic', severity: 'warning', time: '10 min ago', acknowledged: false },
        { id: '6', patient_name: 'Gopal Das', bed: 'W1-3', type: 'fall_risk', message: 'High fall risk — Bed rails not confirmed up', severity: 'info', time: '45 min ago', acknowledged: true },
    ];
    const [alerts, setAlerts] = useState<ClinicalAlert[]>(mockAlerts);

    useEffect(() => { loadAlerts(); }, []);

    const loadAlerts = async () => {
        try {
            const data = await communicationService.getAlerts();
            if (data.length > 0) {
                setAlerts(data.map((a: any) => ({
                    id: a.id, patient_name: a.patient_name || a.title,
                    bed: a.patient_id || '', type: a.type, message: a.message,
                    severity: a.severity, time: a.timestamp, acknowledged: a.acknowledged,
                })));
            }
        } catch { /* keep mock data */ }
    };
    const styles = getStyles(COLORS);

    const filtered = filter === 'all' ? alerts : alerts.filter(a => a.severity === filter);

    const acknowledge = (id: string) => setAlerts(prev => prev.map(a => a.id === id ? { ...a, acknowledged: true } : a));

    const getSeverityConfig = (s: string) => {
        switch (s) { case 'critical': return { color: COLORS.error, icon: AlertTriangle }; case 'warning': return { color: COLORS.warning, icon: Bell }; case 'info': return { color: COLORS.info, icon: Bell }; default: return { color: COLORS.textMuted, icon: Bell }; }
    };

    const getTypeIcon = (t: string) => {
        switch (t) { case 'critical_vital': return Heart; case 'medication': return Pill; case 'lab_result': return AlertTriangle; case 'deterioration': return Thermometer; default: return Bell; }
    };

    const unackCount = alerts.filter(a => !a.acknowledged).length;
    const critCount = alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length;

    return (
        <SafeAreaView style={styles.container}>
            <BackgroundOrb />
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.header}>
                    <Bell size={24} color={COLORS.error} />
                    <Text style={styles.title}>Clinical Alerts</Text>
                    {unackCount > 0 && <View style={styles.alertCount}><Text style={styles.alertCountText}>{unackCount}</Text></View>}
                </View>

                {critCount > 0 && (
                    <GlassCard style={[styles.critBanner, { borderColor: COLORS.error + '40' }]}>
                        <AlertTriangle size={18} color={COLORS.error} />
                        <Text style={[styles.critText, { color: COLORS.error }]}>{critCount} critical alert(s) require immediate attention</Text>
                    </GlassCard>
                )}

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                    {(['all', 'critical', 'warning', 'info'] as const).map(f => {
                        const color = f === 'all' ? COLORS.primary : getSeverityConfig(f).color;
                        const count = f === 'all' ? alerts.length : alerts.filter(a => a.severity === f).length;
                        return (
                            <TouchableOpacity key={f} style={[styles.filterChip, filter === f && { backgroundColor: color + '20', borderColor: color }]} onPress={() => setFilter(f)}>
                                <Text style={[styles.filterText, filter === f && { color }]}>{f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)} ({count})</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {filtered.map(alert => {
                    const sCfg = getSeverityConfig(alert.severity);
                    const TypeIcon = getTypeIcon(alert.type);
                    return (
                        <GlassCard key={alert.id} style={[styles.alertCard, { borderLeftWidth: 3, borderLeftColor: sCfg.color }, alert.acknowledged && { opacity: 0.5 }]}>
                            <View style={styles.alertRow}>
                                <View style={[styles.alertIcon, { backgroundColor: sCfg.color + '15' }]}>
                                    <TypeIcon size={18} color={sCfg.color} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <View style={styles.alertNameRow}>
                                        <Text style={styles.alertPatient}>{alert.patient_name}</Text>
                                        <Text style={styles.alertBed}>{alert.bed}</Text>
                                    </View>
                                    <Text style={styles.alertMsg}>{alert.message}</Text>
                                    <Text style={styles.alertTime}>{alert.time}</Text>
                                </View>
                            </View>
                            {!alert.acknowledged && (
                                <TouchableOpacity style={[styles.ackBtn, { backgroundColor: sCfg.color + '15' }]} onPress={() => acknowledge(alert.id)}>
                                    <CheckCircle size={14} color={sCfg.color} />
                                    <Text style={[styles.ackBtnText, { color: sCfg.color }]}>Acknowledge</Text>
                                </TouchableOpacity>
                            )}
                        </GlassCard>
                    );
                })}
            </ScrollView>
        </SafeAreaView>
    );
};

const getStyles = (COLORS: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.l, paddingTop: SPACING.m, gap: SPACING.s },
    title: { fontSize: 24, fontFamily: FONTS.bold, color: COLORS.text, flex: 1 },
    alertCount: { backgroundColor: COLORS.error, borderRadius: 12, minWidth: 24, height: 24, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
    alertCountText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12 },
    critBanner: { flexDirection: 'row', alignItems: 'center', marginHorizontal: SPACING.m, marginTop: SPACING.m, gap: SPACING.s, borderWidth: 1, paddingVertical: 10 },
    critText: { fontSize: 13, fontFamily: FONTS.bold, flex: 1 },
    filterRow: { paddingHorizontal: SPACING.m, paddingVertical: SPACING.m, gap: SPACING.s },
    filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
    filterText: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.textMuted },
    alertCard: { marginHorizontal: SPACING.m, marginBottom: SPACING.s },
    alertRow: { flexDirection: 'row' },
    alertIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.m },
    alertNameRow: { flexDirection: 'row', gap: SPACING.s, alignItems: 'center' },
    alertPatient: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.text },
    alertBed: { fontSize: 12, fontFamily: FONTS.medium, color: COLORS.textMuted, backgroundColor: COLORS.background, paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
    alertMsg: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 2 },
    alertTime: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textMuted, marginTop: 2 },
    ackBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 10, paddingVertical: 8, marginTop: SPACING.s, gap: 6 },
    ackBtnText: { fontSize: 13, fontFamily: FONTS.bold },
});
