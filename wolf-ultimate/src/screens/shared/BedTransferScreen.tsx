import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeftRight, BedDouble, ChevronRight, Clock, CheckCircle, X } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';

interface Transfer { id: string; patient_name: string; from_bed: string; from_ward: string; to_bed: string; to_ward: string; reason: string; status: 'pending' | 'approved' | 'completed' | 'rejected'; requested_by: string; requested_date: string; }

export const BedTransferScreen = () => {
    const { COLORS } = useTheme();
    const [fromWard, setFromWard] = useState('');
    const [toBed, setToBed] = useState('');
    const [reason, setReason] = useState('');
    const styles = getStyles(COLORS);

    const wards = ['ICU', 'CCU', 'General Ward 1', 'General Ward 2', 'Paediatric', 'Maternity', 'Surgical', 'Private Room'];

    const transfers: Transfer[] = [
        { id: '1', patient_name: 'Meena Gupta', from_bed: 'ICU-3', from_ward: 'ICU', to_bed: 'W1-5', to_ward: 'General Ward 1', reason: 'Step-down: clinically stable, off O2', status: 'approved', requested_by: 'Dr. Sharma', requested_date: '2026-03-02' },
        { id: '2', patient_name: 'Ravi Verma', from_bed: 'W2-12', from_ward: 'General Ward 2', to_bed: 'ICU-1', to_ward: 'ICU', reason: 'Deteriorating: SpO2 dropping, needs ventilator', status: 'pending', requested_by: 'Nurse Priya', requested_date: '2026-03-02' },
        { id: '3', patient_name: 'Sita Ram', from_bed: 'W1-1', from_ward: 'General Ward 1', to_bed: 'PR-2', to_ward: 'Private Room', reason: 'Patient request for private room', status: 'completed', requested_by: 'Nurse Kavita', requested_date: '2026-03-01' },
    ];

    const getStatusConfig = (s: string) => {
        switch (s) { case 'pending': return { color: COLORS.warning, label: 'Pending' }; case 'approved': return { color: COLORS.info, label: 'Approved' }; case 'completed': return { color: COLORS.success, label: 'Done' }; case 'rejected': return { color: COLORS.error, label: 'Rejected' }; default: return { color: COLORS.textMuted, label: s }; }
    };

    return (
        <SafeAreaView style={styles.container}>
            <BackgroundOrb />
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.header}>
                    <ArrowLeftRight size={24} color={COLORS.info} />
                    <Text style={styles.title}>Bed Transfer</Text>
                </View>

                <Text style={styles.sectionLabel}>ACTIVE TRANSFERS</Text>
                {transfers.map(t => {
                    const cfg = getStatusConfig(t.status);
                    return (
                        <GlassCard key={t.id} style={[styles.transferCard, { borderLeftWidth: 3, borderLeftColor: cfg.color }]}>
                            <View style={styles.transferHeader}>
                                <Text style={styles.transferPatient}>{t.patient_name}</Text>
                                <View style={[styles.statusBadge, { backgroundColor: cfg.color + '20' }]}>
                                    <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                                </View>
                            </View>
                            <View style={styles.transferFlow}>
                                <View style={styles.bedBox}>
                                    <BedDouble size={14} color={COLORS.error} />
                                    <Text style={styles.bedLabel}>{t.from_bed}</Text>
                                    <Text style={styles.wardLabel}>{t.from_ward}</Text>
                                </View>
                                <ArrowLeftRight size={16} color={COLORS.textMuted} />
                                <View style={styles.bedBox}>
                                    <BedDouble size={14} color={COLORS.success} />
                                    <Text style={styles.bedLabel}>{t.to_bed}</Text>
                                    <Text style={styles.wardLabel}>{t.to_ward}</Text>
                                </View>
                            </View>
                            <Text style={styles.transferReason}>{t.reason}</Text>
                            <Text style={styles.transferMeta}>By {t.requested_by} · {t.requested_date}</Text>
                            {t.status === 'pending' && (
                                <View style={styles.actionRow}>
                                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.success + '20' }]} onPress={() => Alert.alert('Approved')}>
                                        <CheckCircle size={14} color={COLORS.success} /><Text style={[styles.actionText, { color: COLORS.success }]}>Approve</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.error + '20' }]} onPress={() => Alert.alert('Rejected')}>
                                        <X size={14} color={COLORS.error} /><Text style={[styles.actionText, { color: COLORS.error }]}>Reject</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </GlassCard>
                    );
                })}

                <Text style={styles.sectionLabel}>REQUEST NEW TRANSFER</Text>
                <View style={{ paddingHorizontal: SPACING.m }}>
                    <Text style={styles.fieldLabel}>TRANSFER TO WARD</Text>
                    <View style={styles.chipRow}>
                        {wards.map(w => (
                            <TouchableOpacity key={w} style={[styles.chip, fromWard === w && styles.chipActive]} onPress={() => setFromWard(w)}>
                                <Text style={[styles.chipText, fromWard === w && styles.chipTextActive]}>{w}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <TextInput style={[styles.input, { marginTop: SPACING.m }]} placeholder="Target bed number..." placeholderTextColor={COLORS.textMuted} value={toBed} onChangeText={setToBed} />
                    <TextInput style={[styles.input, { marginTop: SPACING.s, minHeight: 60, textAlignVertical: 'top' }]} placeholder="Reason for transfer..." placeholderTextColor={COLORS.textMuted} value={reason} onChangeText={setReason} multiline />
                    <TouchableOpacity style={styles.submitBtn} onPress={() => Alert.alert('Transfer Requested', 'Awaiting approval')}>
                        <ArrowLeftRight size={18} color="#fff" />
                        <Text style={styles.submitBtnText}>Request Transfer</Text>
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
    sectionLabel: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.textMuted, letterSpacing: 1, marginTop: SPACING.l, marginBottom: SPACING.s, marginHorizontal: SPACING.l },
    transferCard: { marginHorizontal: SPACING.m, marginBottom: SPACING.m },
    transferHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    transferPatient: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.text },
    statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    statusText: { fontSize: 11, fontFamily: FONTS.bold },
    transferFlow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: SPACING.m, marginTop: SPACING.m, paddingVertical: SPACING.s, backgroundColor: COLORS.background, borderRadius: 12 },
    bedBox: { alignItems: 'center', gap: 2 },
    bedLabel: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.text },
    wardLabel: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textSecondary },
    transferReason: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: SPACING.s },
    transferMeta: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textMuted, marginTop: 4 },
    actionRow: { flexDirection: 'row', marginTop: SPACING.m, gap: SPACING.s },
    actionBtn: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center', paddingVertical: 8, borderRadius: 10, gap: 6 },
    actionText: { fontSize: 13, fontFamily: FONTS.bold },
    fieldLabel: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.textMuted, letterSpacing: 1, marginBottom: 6 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.s },
    chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
    chipActive: { backgroundColor: COLORS.info + '20', borderColor: COLORS.info },
    chipText: { fontSize: 12, fontFamily: FONTS.medium, color: COLORS.textMuted },
    chipTextActive: { color: COLORS.info },
    input: { backgroundColor: COLORS.surface, borderRadius: 12, padding: SPACING.m, color: COLORS.text, fontFamily: FONTS.regular, fontSize: 14, borderWidth: 1, borderColor: COLORS.border },
    submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.info, borderRadius: 14, paddingVertical: 14, marginTop: SPACING.l, gap: 8 },
    submitBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 16 },
});
