import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowUpRight, Send, Clock, CheckCircle, AlertCircle, User, Plus } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';
import apiClient from '../../api/client';

interface Referral {
    id: string; patient_name: string; to_specialist: string; department: string;
    reason: string; status: 'pending' | 'accepted' | 'seen' | 'rejected'; created_date: string;
    notes?: string; priority: 'routine' | 'urgent';
}

export const ReferralScreen = () => {
    const { COLORS } = useTheme();
    const [tab, setTab] = useState<'list' | 'new'>('list');
    const [patientName, setPatientName] = useState('');
    const [department, setDepartment] = useState('');
    const [reason, setReason] = useState('');
    const [priority, setPriority] = useState<'routine' | 'urgent'>('routine');
    const styles = getStyles(COLORS);

    const departments = ['Cardiology', 'Neurology', 'Orthopaedics', 'Pulmonology', 'Nephrology', 'Gastroenterology', 'Oncology', 'ENT', 'Ophthalmology', 'Dermatology', 'Psychiatry', 'Surgery'];

    const referrals: Referral[] = [
        { id: '1', patient_name: 'Meena Gupta', to_specialist: 'Dr. Arun Kapoor', department: 'Cardiology', reason: 'New-onset atrial fibrillation on ECG. Needs cardiology opinion.', status: 'accepted', created_date: '2026-03-01', priority: 'urgent' },
        { id: '2', patient_name: 'Ravi Verma', to_specialist: 'Dr. Neha Singh', department: 'Orthopaedics', reason: 'Post-op wound not healing. ?dehiscence', status: 'seen', created_date: '2026-02-28', notes: 'Wound reviewed. Superficial SSI. Started wound care. F/U in 3 days.', priority: 'routine' },
        { id: '3', patient_name: 'Amit Patel', to_specialist: '', department: 'Neurology', reason: 'Recurrent headache with papilledema. R/O raised ICP.', status: 'pending', created_date: '2026-03-02', priority: 'urgent' },
        { id: '4', patient_name: 'Lakshmi Nair', to_specialist: 'Dr. Rajiv Menon', department: 'Nephrology', reason: 'Rising creatinine (3.2). Needs nephrology consult.', status: 'rejected', created_date: '2026-02-27', notes: 'Patient already under our care. Please continue current plan.', priority: 'routine' },
    ];

    const getStatusConfig = (s: string) => {
        switch (s) {
            case 'pending': return { color: COLORS.warning, icon: Clock, label: 'Pending' };
            case 'accepted': return { color: COLORS.info, icon: CheckCircle, label: 'Accepted' };
            case 'seen': return { color: COLORS.success, icon: CheckCircle, label: 'Seen' };
            case 'rejected': return { color: COLORS.error, icon: AlertCircle, label: 'Declined' };
            default: return { color: COLORS.textMuted, icon: Clock, label: s };
        }
    };

    const sendReferral = () => {
        if (!patientName || !department || !reason) { Alert.alert('Required', 'Patient, department, and reason are required'); return; }
        Alert.alert('Referral Sent', `Referral to ${department} for ${patientName}`);
        setPatientName(''); setDepartment(''); setReason(''); setPriority('routine');
        setTab('list');
    };

    return (
        <SafeAreaView style={styles.container}>
            <BackgroundOrb />
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.header}>
                    <ArrowUpRight size={24} color={COLORS.primary} />
                    <Text style={styles.title}>Referrals</Text>
                </View>

                <View style={styles.tabRow}>
                    <TouchableOpacity style={[styles.tabBtn, tab === 'list' && styles.tabActive]} onPress={() => setTab('list')}>
                        <Text style={[styles.tabText, tab === 'list' && styles.tabTextActive]}>My Referrals ({referrals.length})</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.tabBtn, tab === 'new' && styles.tabActive]} onPress={() => setTab('new')}>
                        <Plus size={14} color={tab === 'new' ? COLORS.primary : COLORS.textMuted} />
                        <Text style={[styles.tabText, tab === 'new' && styles.tabTextActive]}>New Referral</Text>
                    </TouchableOpacity>
                </View>

                {tab === 'list' ? (
                    <View style={{ paddingHorizontal: SPACING.m }}>
                        {referrals.map(ref => {
                            const cfg = getStatusConfig(ref.status);
                            return (
                                <GlassCard key={ref.id} style={[styles.refCard, { borderLeftWidth: 3, borderLeftColor: cfg.color }]}>
                                    <View style={styles.refHeader}>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.refPatient}>{ref.patient_name}</Text>
                                            <Text style={styles.refDept}>→ {ref.department} {ref.to_specialist ? `(${ref.to_specialist})` : ''}</Text>
                                        </View>
                                        <View style={styles.refRight}>
                                            <View style={[styles.statusBadge, { backgroundColor: cfg.color + '20' }]}>
                                                <cfg.icon size={12} color={cfg.color} />
                                                <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                                            </View>
                                            {ref.priority === 'urgent' && (
                                                <View style={[styles.priBadge, { backgroundColor: COLORS.error + '20' }]}>
                                                    <Text style={[styles.priText, { color: COLORS.error }]}>URGENT</Text>
                                                </View>
                                            )}
                                        </View>
                                    </View>
                                    <Text style={styles.refReason}>{ref.reason}</Text>
                                    {ref.notes && (
                                        <View style={styles.replyBox}>
                                            <Text style={styles.replyLabel}>Reply:</Text>
                                            <Text style={styles.replyText}>{ref.notes}</Text>
                                        </View>
                                    )}
                                    <Text style={styles.refDate}>{ref.created_date}</Text>
                                </GlassCard>
                            );
                        })}
                    </View>
                ) : (
                    <View style={{ paddingHorizontal: SPACING.m }}>
                        <View style={styles.field}>
                            <Text style={styles.fieldLabel}>PATIENT</Text>
                            <TextInput style={styles.input} value={patientName} onChangeText={setPatientName} placeholder="Patient name..." placeholderTextColor={COLORS.textMuted} />
                        </View>

                        <Text style={styles.fieldLabel}>REFER TO DEPARTMENT</Text>
                        <View style={styles.chipRow}>
                            {departments.map(d => (
                                <TouchableOpacity key={d} style={[styles.chip, department === d && styles.chipActive]} onPress={() => setDepartment(d)}>
                                    <Text style={[styles.chipText, department === d && styles.chipTextActive]}>{d}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.fieldLabel}>PRIORITY</Text>
                        <View style={styles.chipRow}>
                            {(['routine', 'urgent'] as const).map(p => (
                                <TouchableOpacity key={p} style={[styles.chip, priority === p && { backgroundColor: (p === 'urgent' ? COLORS.error : COLORS.info) + '20', borderColor: p === 'urgent' ? COLORS.error : COLORS.info }]} onPress={() => setPriority(p)}>
                                    <Text style={[styles.chipText, priority === p && { color: p === 'urgent' ? COLORS.error : COLORS.info }]}>{p.toUpperCase()}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.fieldLabel}>REASON FOR REFERRAL</Text>
                            <TextInput style={[styles.input, { minHeight: 80, textAlignVertical: 'top' }]} value={reason} onChangeText={setReason} placeholder="Clinical reason for referral..." placeholderTextColor={COLORS.textMuted} multiline />
                        </View>

                        <TouchableOpacity style={styles.sendBtn} onPress={sendReferral}>
                            <Send size={18} color="#fff" />
                            <Text style={styles.sendBtnText}>Send Referral</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const getStyles = (COLORS: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.l, paddingTop: SPACING.m, gap: SPACING.s },
    title: { fontSize: 24, fontFamily: FONTS.bold, color: COLORS.text },
    tabRow: { flexDirection: 'row', paddingHorizontal: SPACING.m, marginTop: SPACING.m, gap: SPACING.s },
    tabBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.s, paddingHorizontal: SPACING.m, borderRadius: 20, backgroundColor: COLORS.surface, gap: 6 },
    tabActive: { backgroundColor: COLORS.primary + '20', borderWidth: 1, borderColor: COLORS.primary + '40' },
    tabText: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.textMuted },
    tabTextActive: { color: COLORS.primary },
    refCard: { marginTop: SPACING.m },
    refHeader: { flexDirection: 'row', justifyContent: 'space-between' },
    refPatient: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.text },
    refDept: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.primary, marginTop: 2 },
    refRight: { alignItems: 'flex-end', gap: 4 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, gap: 4 },
    statusText: { fontSize: 11, fontFamily: FONTS.bold },
    priBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    priText: { fontSize: 9, fontFamily: FONTS.bold },
    refReason: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: SPACING.s, lineHeight: 18 },
    replyBox: { backgroundColor: COLORS.success + '10', borderRadius: 8, padding: SPACING.s, marginTop: SPACING.s },
    replyLabel: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.success },
    replyText: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.text, marginTop: 2 },
    refDate: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textMuted, marginTop: SPACING.s },
    field: { marginTop: SPACING.m },
    fieldLabel: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.textMuted, letterSpacing: 1, marginBottom: 6, marginTop: SPACING.m },
    input: { backgroundColor: COLORS.surface, borderRadius: 12, padding: SPACING.m, color: COLORS.text, fontFamily: FONTS.regular, fontSize: 14, borderWidth: 1, borderColor: COLORS.border },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.s },
    chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
    chipActive: { backgroundColor: COLORS.primary + '20', borderColor: COLORS.primary },
    chipText: { fontSize: 12, fontFamily: FONTS.medium, color: COLORS.textMuted },
    chipTextActive: { color: COLORS.primary },
    sendBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 14, marginTop: SPACING.l, gap: 8 },
    sendBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 16 },
});
