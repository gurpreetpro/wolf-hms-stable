import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { DoorOpen, Clock, CheckCircle, Plus, Calendar, User } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';

interface WardPassEntry { id: string; patient_name: string; bed: string; reason: string; departure_time: string; expected_return: string; actual_return?: string; status: 'active' | 'returned' | 'overdue'; approved_by: string; }

export const WardPassScreen = () => {
    const { COLORS } = useTheme();
    const [patientName, setPatientName] = useState('');
    const [reason, setReason] = useState('');
    const [duration, setDuration] = useState('2 hours');
    const styles = getStyles(COLORS);

    const durations = ['1 hour', '2 hours', '4 hours', 'Half Day', 'Full Day', 'Overnight'];
    const reasons = ['Family Visit', 'Personal Work', 'Religious Activity', 'Hospital Transfer', 'Investigation Outside', 'Other'];

    const passes: WardPassEntry[] = [
        { id: '1', patient_name: 'Rajesh Kumar', bed: 'W1-5', reason: 'Family Visit', departure_time: '10:00', expected_return: '12:00', status: 'active', approved_by: 'Dr. Sharma' },
        { id: '2', patient_name: 'Meena Gupta', bed: 'W2-3', reason: 'Religious Activity', departure_time: '08:00', expected_return: '10:00', actual_return: '09:45', status: 'returned', approved_by: 'Dr. Nair' },
        { id: '3', patient_name: 'Gopal Das', bed: 'W1-8', reason: 'Investigation Outside', departure_time: '09:00', expected_return: '11:00', status: 'overdue', approved_by: 'Dr. Sharma' },
    ];

    const getStatusConfig = (s: string) => {
        switch (s) { case 'active': return { color: COLORS.info, label: 'Active' }; case 'returned': return { color: COLORS.success, label: 'Returned' }; case 'overdue': return { color: COLORS.error, label: 'Overdue' }; default: return { color: COLORS.textMuted, label: s }; }
    };

    return (
        <SafeAreaView style={styles.container}>
            <BackgroundOrb />
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.header}>
                    <DoorOpen size={24} color={COLORS.info} />
                    <Text style={styles.title}>Ward Pass</Text>
                    <View style={styles.countBadge}>
                        <Text style={styles.countText}>{passes.filter(p => p.status === 'active').length} active</Text>
                    </View>
                </View>

                {passes.map(pass => {
                    const cfg = getStatusConfig(pass.status);
                    return (
                        <GlassCard key={pass.id} style={[styles.passCard, pass.status === 'overdue' && { borderWidth: 1, borderColor: COLORS.error + '40' }]}>
                            <View style={styles.passHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.passName}>{pass.patient_name}</Text>
                                    <Text style={styles.passBed}>Bed: {pass.bed} · {pass.reason}</Text>
                                </View>
                                <View style={[styles.statusBadge, { backgroundColor: cfg.color + '20' }]}>
                                    <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                                </View>
                            </View>
                            <View style={styles.timeRow}>
                                <View style={styles.timeItem}>
                                    <Text style={styles.timeLabel}>Out</Text>
                                    <Text style={styles.timeValue}>{pass.departure_time}</Text>
                                </View>
                                <Text style={styles.timeArrow}>→</Text>
                                <View style={styles.timeItem}>
                                    <Text style={styles.timeLabel}>Due</Text>
                                    <Text style={[styles.timeValue, pass.status === 'overdue' && { color: COLORS.error }]}>{pass.expected_return}</Text>
                                </View>
                                {pass.actual_return && (
                                    <>
                                        <Text style={styles.timeArrow}>✓</Text>
                                        <View style={styles.timeItem}>
                                            <Text style={styles.timeLabel}>Back</Text>
                                            <Text style={[styles.timeValue, { color: COLORS.success }]}>{pass.actual_return}</Text>
                                        </View>
                                    </>
                                )}
                            </View>
                            <Text style={styles.approvedBy}>Approved by {pass.approved_by}</Text>
                            {pass.status === 'active' && (
                                <TouchableOpacity style={styles.returnBtn} onPress={() => Alert.alert('Return', `Mark ${pass.patient_name} as returned?`)}>
                                    <CheckCircle size={14} color={COLORS.success} />
                                    <Text style={[styles.returnBtnText, { color: COLORS.success }]}>Mark Returned</Text>
                                </TouchableOpacity>
                            )}
                        </GlassCard>
                    );
                })}

                <Text style={styles.sectionLabel}>ISSUE NEW PASS</Text>
                <View style={{ paddingHorizontal: SPACING.m }}>
                    <TextInput style={styles.input} placeholder="Patient name..." placeholderTextColor={COLORS.textMuted} value={patientName} onChangeText={setPatientName} />

                    <Text style={styles.fieldLabel}>REASON</Text>
                    <View style={styles.chipRow}>
                        {reasons.map(r => (
                            <TouchableOpacity key={r} style={[styles.chip, reason === r && styles.chipActive]} onPress={() => setReason(r)}>
                                <Text style={[styles.chipText, reason === r && styles.chipTextActive]}>{r}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.fieldLabel}>DURATION</Text>
                    <View style={styles.chipRow}>
                        {durations.map(d => (
                            <TouchableOpacity key={d} style={[styles.chip, duration === d && styles.chipActive]} onPress={() => setDuration(d)}>
                                <Text style={[styles.chipText, duration === d && styles.chipTextActive]}>{d}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <TouchableOpacity style={styles.issueBtn} onPress={() => { if (!patientName || !reason) { Alert.alert('Required', 'Patient and reason required'); return; } Alert.alert('Pass Issued', `${patientName} — ${reason} (${duration})`); }}>
                        <DoorOpen size={18} color="#fff" />
                        <Text style={styles.issueBtnText}>Issue Ward Pass</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const getStyles = (COLORS: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.l, paddingTop: SPACING.m, gap: SPACING.s },
    title: { fontSize: 24, fontFamily: FONTS.bold, color: COLORS.text, flex: 1 },
    countBadge: { backgroundColor: COLORS.info + '20', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
    countText: { fontSize: 12, fontFamily: FONTS.bold, color: COLORS.info },
    passCard: { marginHorizontal: SPACING.m, marginTop: SPACING.m },
    passHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    passName: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.text },
    passBed: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 2 },
    statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    statusText: { fontSize: 11, fontFamily: FONTS.bold },
    timeRow: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.m, gap: SPACING.m, justifyContent: 'center' },
    timeItem: { alignItems: 'center' },
    timeLabel: { fontSize: 10, fontFamily: FONTS.medium, color: COLORS.textMuted },
    timeValue: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.text, marginTop: 2 },
    timeArrow: { fontSize: 14, color: COLORS.textMuted },
    approvedBy: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textMuted, marginTop: SPACING.s },
    returnBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: SPACING.s, paddingVertical: 8, borderRadius: 10, backgroundColor: COLORS.success + '15', gap: 6 },
    returnBtnText: { fontSize: 13, fontFamily: FONTS.bold },
    sectionLabel: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.textMuted, letterSpacing: 1, marginTop: SPACING.xl, marginBottom: SPACING.s, marginHorizontal: SPACING.l },
    input: { backgroundColor: COLORS.surface, borderRadius: 12, padding: SPACING.m, color: COLORS.text, fontFamily: FONTS.regular, fontSize: 14, borderWidth: 1, borderColor: COLORS.border },
    fieldLabel: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.textMuted, letterSpacing: 1, marginTop: SPACING.m, marginBottom: 6 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.s },
    chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
    chipActive: { backgroundColor: COLORS.info + '20', borderColor: COLORS.info },
    chipText: { fontSize: 12, fontFamily: FONTS.medium, color: COLORS.textMuted },
    chipTextActive: { color: COLORS.info },
    issueBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.info, borderRadius: 14, paddingVertical: 14, marginTop: SPACING.l, gap: 8 },
    issueBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 16 },
});
