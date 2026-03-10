import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Activity, Play, StopCircle, Settings, AlertOctagon } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, SHADOWS } from '../../../theme/theme';
import { GlassCard } from '../../../components/common/GlassCard';
import { BackgroundOrb } from '../../../components/common/BackgroundOrb';
import specialtyService, { DialysisSession } from '../../../services/specialtyService';

export const DialysisMonitoringScreen = ({ navigation }: any) => {
    const [sessions, setSessions] = useState<DialysisSession[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await specialtyService.getDialysisSessions();
            setSessions(data);
        } catch (error) {
            Alert.alert('Error', 'Failed to load sessions');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
             <LinearGradient
                colors={[COLORS.background, '#0c4a6e']} // Sky tint
                style={StyleSheet.absoluteFill}
            />
            <BackgroundOrb color={COLORS.primary} position="bottom-right" />

            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.header}>
                    <Text style={styles.title}>Dialysis Unit</Text>
                    <Text style={styles.subtitle}>Active Sessions</Text>
                </View>

                <ScrollView contentContainerStyle={{ padding: SPACING.m }}>
                    {loading ? (
                        <Activity color={COLORS.primary} />
                    ) : sessions.map(session => (
                        <GlassCard key={session.id} style={{ marginBottom: SPACING.m, borderColor: session.status === 'Active' ? COLORS.success : COLORS.border }}>
                            <View style={styles.cardHeader}>
                                <View>
                                    <Text style={styles.machineId}>Machine {session.machine_id}</Text>
                                    <Text style={styles.patientName}>{session.patient_name}</Text>
                                </View>
                                <View style={[styles.badge, { backgroundColor: session.status === 'Active' ? COLORS.success : COLORS.surfaceLight }]}>
                                    <Text style={styles.badgeText}>{session.status}</Text>
                                </View>
                            </View>

                            <View style={styles.metricsGrid}>
                                <View style={styles.metric}>
                                    <Text style={styles.metricLabel}>BP (Start)</Text>
                                    <Text style={styles.metricValue}>{session.bp_start}</Text>
                                </View>
                                <View style={styles.metric}>
                                    <Text style={styles.metricLabel}>Weight (kg)</Text>
                                    <Text style={styles.metricValue}>{session.weight_pre}</Text>
                                </View>
                                <View style={styles.metric}>
                                    <Text style={styles.metricLabel}>Time</Text>
                                    <Text style={styles.metricValue}>{Math.floor(session.duration_minutes / 60)}h {session.duration_minutes % 60}m</Text>
                                </View>
                            </View>

                            <View style={styles.controls}>
                                 <TouchableOpacity style={styles.controlBtn}>
                                     <Settings size={20} color={COLORS.textSecondary} />
                                 </TouchableOpacity>
                                 <TouchableOpacity style={[styles.controlBtn, { flex: 1, backgroundColor: COLORS.error + '20', borderColor: COLORS.error }]}>
                                     <AlertOctagon size={20} color={COLORS.error} />
                                     <Text style={[styles.controlText, { color: COLORS.error }]}>Report Alarm</Text>
                                 </TouchableOpacity>
                            </View>
                        </GlassCard>
                    ))}
                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { padding: SPACING.m },
    title: { fontFamily: FONTS.bold, fontSize: 24, color: COLORS.text },
    subtitle: { fontFamily: FONTS.medium, fontSize: 16, color: COLORS.textSecondary },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
    machineId: { fontFamily: FONTS.bold, fontSize: 14, color: COLORS.primary },
    patientName: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    badgeText: { fontFamily: FONTS.bold, fontSize: 12, color: '#fff' },
    metricsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16, backgroundColor: 'rgba(255,255,255,0.05)', padding: 12, borderRadius: 12 },
    metric: { alignItems: 'center' },
    metricLabel: { fontSize: 12, color: COLORS.textSecondary, marginBottom: 4 },
    metricValue: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.text },
    controls: { flexDirection: 'row', gap: 12 },
    controlBtn: { padding: 12, borderRadius: 12, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 },
    controlText: { fontFamily: FONTS.bold, fontSize: 12 }
});
