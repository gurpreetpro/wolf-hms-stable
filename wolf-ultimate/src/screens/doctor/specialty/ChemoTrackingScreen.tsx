import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Activity, Clock, AlertTriangle, CheckCircle2, Droplets, Thermometer, Wind } from 'lucide-react-native';
import { COLORS, FONTS, SPACING, SHADOWS } from '../../../theme/theme';
import { GlassCard } from '../../../components/common/GlassCard';
import { BackgroundOrb } from '../../../components/common/BackgroundOrb';
import specialtyService, { ChemoSession } from '../../../services/specialtyService';

export const ChemoTrackingScreen = ({ navigation }: any) => {
    const [sessions, setSessions] = useState<ChemoSession[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        try {
            const data = await specialtyService.getChemoSchedule();
            setSessions(data);
        } catch (error) {
            Alert.alert('Error', 'Failed to load schedule');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
             <LinearGradient
                colors={[COLORS.background, '#312e81']} // Indigo tint
                style={StyleSheet.absoluteFill}
            />
            <BackgroundOrb color={COLORS.secondary} position="top-right" />

            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.header}>
                    <Text style={styles.title}>Oncology Day Care</Text>
                    <Text style={styles.subtitle}>Chemotherapy Administration</Text>
                </View>

                <ScrollView contentContainerStyle={{ padding: SPACING.m }}>
                    {loading ? (
                        <Activity color={COLORS.primary} />
                    ) : sessions.map(session => (
                        <GlassCard key={session.id} style={{ marginBottom: SPACING.m }}>
                            <View style={styles.cardHeader}>
                                <View>
                                    <Text style={styles.patientName}>{session.patient_name}</Text>
                                    <Text style={styles.protocol}>{session.protocol_name} • Cycle {session.cycle_number}</Text>
                                </View>
                                <View style={[styles.badge, { backgroundColor: session.status === 'In Progress' ? COLORS.primary : COLORS.surfaceLight }]}>
                                    <Text style={styles.badgeText}>{session.status}</Text>
                                </View>
                            </View>

                            <View style={styles.drugSection}>
                                <Droplets size={18} color={COLORS.secondary} />
                                <Text style={styles.drugInfo}>{session.drug_name} ({session.dosage})</Text>
                            </View>

                            {session.status === 'In Progress' && (
                                <View style={styles.actionRow}>
                                    <TouchableOpacity style={styles.vitalBtn}>
                                        <Thermometer size={16} color={COLORS.text} />
                                        <Text style={styles.btnText}>Log Vitals</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.vitalBtn, { backgroundColor: COLORS.error + '20', borderColor: COLORS.error }]}>
                                        <AlertTriangle size={16} color={COLORS.error} />
                                        <Text style={[styles.btnText, { color: COLORS.error }]}>Reaction</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                             <View style={styles.footer}>
                                   <Clock size={14} color={COLORS.textMuted} />
                                   <Text style={styles.timeText}>Started: {new Date(session.start_time).toLocaleTimeString()}</Text>
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
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    patientName: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text },
    protocol: { fontFamily: FONTS.regular, fontSize: 14, color: COLORS.textSecondary },
    badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
    badgeText: { fontFamily: FONTS.bold, fontSize: 12, color: '#fff' },
    drugSection: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, backgroundColor: 'rgba(0,0,0,0.2)', padding: 12, borderRadius: 8 },
    drugInfo: { fontFamily: FONTS.medium, color: COLORS.text, marginLeft: 8 },
    actionRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
    vitalBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 10, borderRadius: 8, backgroundColor: COLORS.surfaceLight, gap: 8, borderWidth: 1, borderColor: COLORS.border },
    btnText: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 12 },
    footer: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
    timeText: { fontFamily: FONTS.regular, fontSize: 12, color: COLORS.textMuted, marginLeft: 8 }
});
