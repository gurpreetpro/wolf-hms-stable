import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { HeartPulse, Clock, CheckCircle, AlertTriangle, TrendingUp, ArrowUpRight } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';

interface PACUPatient { id: string; name: string; procedure: string; arrival_time: string; aldrete_score: number; status: 'monitoring' | 'ready_discharge' | 'discharged'; vitals: { hr: string; bp: string; spo2: string; rr: string }; pain_score: number; nausea: boolean; }

export const PACUScreen = () => {
    const { COLORS } = useTheme();
    const styles = getStyles(COLORS);

    const [patients, setPatients] = useState<PACUPatient[]>([
        { id: '1', name: 'Rajesh Kumar', procedure: 'Lap. Cholecystectomy', arrival_time: '09:05', aldrete_score: 8, status: 'monitoring', vitals: { hr: '82', bp: '124/78', spo2: '98', rr: '16' }, pain_score: 3, nausea: false },
        { id: '2', name: 'Sunita Devi', procedure: 'TKR (Right)', arrival_time: '11:15', aldrete_score: 6, status: 'monitoring', vitals: { hr: '78', bp: '108/68', spo2: '96', rr: '14' }, pain_score: 5, nausea: true },
        { id: '3', name: 'Sita Ram', procedure: 'Hernioplasty', arrival_time: '08:00', aldrete_score: 10, status: 'ready_discharge', vitals: { hr: '72', bp: '118/76', spo2: '99', rr: '15' }, pain_score: 2, nausea: false },
    ]);

    const getAldreteColor = (s: number) => s >= 9 ? COLORS.success : s >= 7 ? COLORS.warning : COLORS.error;
    const getPainColor = (p: number) => p <= 3 ? COLORS.success : p <= 6 ? COLORS.warning : COLORS.error;

    const aldreteItems = [
        { label: 'Activity', desc: '0=None, 1=2 extremities, 2=4 extremities' },
        { label: 'Respiration', desc: '0=Apneic, 1=Dyspnea, 2=Deep breath/cough' },
        { label: 'Circulation', desc: '0=BP±50%, 1=BP±20-50%, 2=BP±20%' },
        { label: 'Consciousness', desc: '0=Unresponsive, 1=Arousable, 2=Fully awake' },
        { label: 'SpO2', desc: '0=<90%, 1=90-92%, 2=>92%' },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <BackgroundOrb />
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.header}>
                    <HeartPulse size={24} color={COLORS.error} />
                    <Text style={styles.title}>PACU Recovery</Text>
                    <View style={styles.countBadge}>
                        <Text style={styles.countText}>{patients.filter(p => p.status === 'monitoring').length} active</Text>
                    </View>
                </View>

                {/* Aldrete Reference */}
                <GlassCard style={styles.refCard}>
                    <Text style={styles.refTitle}>Modified Aldrete Score (discharge ≥9)</Text>
                    {aldreteItems.map((item, i) => (
                        <Text key={i} style={styles.refItem}>• {item.label}: {item.desc}</Text>
                    ))}
                </GlassCard>

                {patients.map(p => (
                    <GlassCard key={p.id} style={[styles.patientCard, p.status === 'ready_discharge' && { borderWidth: 1, borderColor: COLORS.success + '50' }]}>
                        <View style={styles.patientHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={styles.patientName}>{p.name}</Text>
                                <Text style={styles.patientProc}>{p.procedure}</Text>
                                <Text style={styles.patientTime}>Arrived: {p.arrival_time}</Text>
                            </View>
                            <View style={styles.scoreCol}>
                                <Text style={styles.scoreLabel}>Aldrete</Text>
                                <View style={[styles.scoreBadge, { backgroundColor: getAldreteColor(p.aldrete_score) + '20' }]}>
                                    <Text style={[styles.scoreValue, { color: getAldreteColor(p.aldrete_score) }]}>{p.aldrete_score}/10</Text>
                                </View>
                            </View>
                        </View>

                        {/* Vitals Row */}
                        <View style={styles.vitalsRow}>
                            {[
                                { label: 'HR', value: p.vitals.hr, unit: 'bpm' },
                                { label: 'BP', value: p.vitals.bp, unit: '' },
                                { label: 'SpO2', value: p.vitals.spo2, unit: '%' },
                                { label: 'RR', value: p.vitals.rr, unit: '/m' },
                            ].map((v, i) => (
                                <View key={i} style={styles.vitalItem}>
                                    <Text style={styles.vitalLabel}>{v.label}</Text>
                                    <Text style={styles.vitalValue}>{v.value}{v.unit}</Text>
                                </View>
                            ))}
                        </View>

                        {/* Pain + Nausea */}
                        <View style={styles.assessRow}>
                            <View style={styles.assessItem}>
                                <Text style={styles.assessLabel}>Pain</Text>
                                <Text style={[styles.assessValue, { color: getPainColor(p.pain_score) }]}>{p.pain_score}/10</Text>
                            </View>
                            <View style={styles.assessItem}>
                                <Text style={styles.assessLabel}>PONV</Text>
                                <Text style={[styles.assessValue, { color: p.nausea ? COLORS.warning : COLORS.success }]}>{p.nausea ? 'Yes' : 'No'}</Text>
                            </View>
                            <View style={{ flex: 1 }} />
                            {p.aldrete_score >= 9 ? (
                                <TouchableOpacity style={[styles.dischargeBtn, { backgroundColor: COLORS.success }]} onPress={() => Alert.alert('Discharge', `Transfer ${p.name} to ward?`)}>
                                    <ArrowUpRight size={14} color="#fff" />
                                    <Text style={styles.dischargeBtnText}>Discharge</Text>
                                </TouchableOpacity>
                            ) : (
                                <TouchableOpacity style={[styles.dischargeBtn, { backgroundColor: COLORS.info + '20' }]} onPress={() => Alert.alert('Re-assess', 'Update Aldrete score')}>
                                    <TrendingUp size={14} color={COLORS.info} />
                                    <Text style={[styles.dischargeBtnText, { color: COLORS.info }]}>Re-assess</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </GlassCard>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
};

const getStyles = (COLORS: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.l, paddingTop: SPACING.m, gap: SPACING.s },
    title: { fontSize: 24, fontFamily: FONTS.bold, color: COLORS.text, flex: 1 },
    countBadge: { backgroundColor: COLORS.error + '20', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
    countText: { fontSize: 12, fontFamily: FONTS.bold, color: COLORS.error },
    refCard: { marginHorizontal: SPACING.m, marginTop: SPACING.m },
    refTitle: { fontSize: 13, fontFamily: FONTS.bold, color: COLORS.text, marginBottom: SPACING.s },
    refItem: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textSecondary, lineHeight: 16 },
    patientCard: { marginHorizontal: SPACING.m, marginTop: SPACING.m },
    patientHeader: { flexDirection: 'row' },
    patientName: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.text },
    patientProc: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 2 },
    patientTime: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textMuted, marginTop: 2 },
    scoreCol: { alignItems: 'center' },
    scoreLabel: { fontSize: 10, fontFamily: FONTS.medium, color: COLORS.textMuted },
    scoreBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 4, marginTop: 2 },
    scoreValue: { fontSize: 16, fontFamily: FONTS.bold },
    vitalsRow: { flexDirection: 'row', marginTop: SPACING.m, gap: SPACING.s },
    vitalItem: { flex: 1, alignItems: 'center', backgroundColor: COLORS.background, borderRadius: 8, paddingVertical: 6 },
    vitalLabel: { fontSize: 10, fontFamily: FONTS.medium, color: COLORS.textMuted },
    vitalValue: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.text, marginTop: 2 },
    assessRow: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.m, gap: SPACING.l },
    assessItem: { alignItems: 'center' },
    assessLabel: { fontSize: 10, fontFamily: FONTS.medium, color: COLORS.textMuted },
    assessValue: { fontSize: 14, fontFamily: FONTS.bold, marginTop: 2 },
    dischargeBtn: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, gap: 4 },
    dischargeBtnText: { fontSize: 13, fontFamily: FONTS.bold, color: '#fff' },
});
