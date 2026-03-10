import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShieldCheck, Plus, Clock, CheckCircle, X, FileText, Send } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';
import insuranceService from '../../services/insuranceService';

interface PreAuthRequest { id: string; patient_name: string; uhid: string; insurer: string; policy_no: string; procedure: string; estimated_cost: number; status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'query'; approved_amount?: number; remarks?: string; submitted_date: string; }

export const PreAuthScreen = () => {
    const { COLORS } = useTheme();
    const [tab, setTab] = useState<'requests' | 'new'>('requests');
    const [insurer, setInsurer] = useState('');
    const [procedure, setProcedure] = useState('');
    const styles = getStyles(COLORS);

    const insurers = ['Star Health', 'ICICI Lombard', 'HDFC Ergo', 'New India', 'United India', 'Bajaj Allianz', 'Max Bupa', 'Care Health', 'CGHS', 'ECHS', 'ESI'];

    const [requests, setRequests] = useState<PreAuthRequest[]>([]);

    const mockRequests: PreAuthRequest[] = [
        { id: 'PA-2026-042', patient_name: 'Rajesh Kumar', uhid: 'UHID-4521', insurer: 'Star Health', policy_no: 'SH-789456', procedure: 'Lap. Cholecystectomy', estimated_cost: 185000, status: 'approved', approved_amount: 150000, submitted_date: '2026-02-28', remarks: 'Room upgrade not covered' },
        { id: 'PA-2026-043', patient_name: 'Sunita Devi', uhid: 'UHID-4530', insurer: 'ICICI Lombard', policy_no: 'IL-654321', procedure: 'TKR Right Knee', estimated_cost: 320000, status: 'query', submitted_date: '2026-03-01', remarks: 'Need previous surgery records' },
        { id: 'PA-2026-044', patient_name: 'Arun Mehta', uhid: 'UHID-4535', insurer: 'CGHS', policy_no: 'CGHS-112233', procedure: 'CABG × 3', estimated_cost: 450000, status: 'submitted', submitted_date: '2026-03-02' },
        { id: 'PA-2026-045', patient_name: 'Neha Singh', uhid: 'UHID-4540', insurer: 'Max Bupa', policy_no: 'MB-998877', procedure: 'Hysterectomy (Lap)', estimated_cost: 120000, status: 'rejected', submitted_date: '2026-02-27', remarks: 'Pre-existing condition exclusion' },
    ];

    useEffect(() => { loadRequests(); }, []);

    const loadRequests = async () => {
        try {
            const data = await insuranceService.getPreAuthRequests();
            setRequests(data.length > 0 ? data.map((r: any) => ({
                id: r.id, patient_name: r.patient_name, uhid: r.patient_id || '',
                insurer: r.insurer, policy_no: r.policy_number || '',
                procedure: r.procedure, estimated_cost: r.estimated_cost,
                status: r.status, approved_amount: r.approved_amount,
                submitted_date: r.submitted_date, remarks: r.remarks,
            })) : mockRequests);
        } catch { setRequests(mockRequests); }
    };

    const getStatusConfig = (s: string) => {
        switch (s) { case 'draft': return { color: COLORS.textMuted, label: 'Draft' }; case 'submitted': return { color: COLORS.info, label: 'Submitted' }; case 'approved': return { color: COLORS.success, label: 'Approved' }; case 'rejected': return { color: COLORS.error, label: 'Rejected' }; case 'query': return { color: COLORS.warning, label: 'Query' }; default: return { color: COLORS.textMuted, label: s }; }
    };

    const formatCurrency = (n: number) => '₹' + n.toLocaleString('en-IN');

    return (
        <SafeAreaView style={styles.container}>
            <BackgroundOrb />
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.header}>
                    <ShieldCheck size={24} color={COLORS.primary} />
                    <Text style={styles.title}>Insurance Pre-Auth</Text>
                </View>

                <View style={styles.tabRow}>
                    <TouchableOpacity style={[styles.tab, tab === 'requests' && styles.tabActive]} onPress={() => setTab('requests')}>
                        <Text style={[styles.tabText, tab === 'requests' && styles.tabTextActive]}>Requests ({requests.length})</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.tab, tab === 'new' && styles.tabActive]} onPress={() => setTab('new')}>
                        <Plus size={14} color={tab === 'new' ? COLORS.primary : COLORS.textMuted} />
                        <Text style={[styles.tabText, tab === 'new' && styles.tabTextActive]}>New Request</Text>
                    </TouchableOpacity>
                </View>

                {tab === 'requests' ? (
                    <View style={{ paddingHorizontal: SPACING.m }}>
                        {requests.map(req => {
                            const cfg = getStatusConfig(req.status);
                            return (
                                <GlassCard key={req.id} style={[styles.reqCard, { borderLeftWidth: 3, borderLeftColor: cfg.color }]}>
                                    <View style={styles.reqHeader}>
                                        <Text style={styles.reqId}>{req.id}</Text>
                                        <View style={[styles.statusBadge, { backgroundColor: cfg.color + '20' }]}>
                                            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                                        </View>
                                    </View>
                                    <Text style={styles.reqPatient}>{req.patient_name} ({req.uhid})</Text>
                                    <Text style={styles.reqProcedure}>{req.procedure}</Text>
                                    <View style={styles.reqAmounts}>
                                        <Text style={styles.reqEstimate}>Est: {formatCurrency(req.estimated_cost)}</Text>
                                        {req.approved_amount && <Text style={[styles.reqApproved, { color: COLORS.success }]}>Approved: {formatCurrency(req.approved_amount)}</Text>}
                                    </View>
                                    <Text style={styles.reqInsurer}>{req.insurer} · {req.policy_no} · {req.submitted_date}</Text>
                                    {req.remarks && <Text style={[styles.reqRemarks, { color: req.status === 'rejected' ? COLORS.error : COLORS.warning }]}>⚠ {req.remarks}</Text>}
                                </GlassCard>
                            );
                        })}
                    </View>
                ) : (
                    <View style={{ paddingHorizontal: SPACING.m }}>
                        <TextInput style={styles.input} placeholder="Patient UHID..." placeholderTextColor={COLORS.textMuted} />
                        <Text style={styles.fieldLabel}>INSURER / TPA</Text>
                        <View style={styles.chipRow}>
                            {insurers.map(i => (
                                <TouchableOpacity key={i} style={[styles.chip, insurer === i && styles.chipActive]} onPress={() => setInsurer(i)}>
                                    <Text style={[styles.chipText, insurer === i && styles.chipTextActive]}>{i}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                        <TextInput style={[styles.input, { marginTop: SPACING.m }]} placeholder="Policy number..." placeholderTextColor={COLORS.textMuted} />
                        <TextInput style={[styles.input, { marginTop: SPACING.s }]} placeholder="Planned procedure..." placeholderTextColor={COLORS.textMuted} value={procedure} onChangeText={setProcedure} />
                        <TextInput style={[styles.input, { marginTop: SPACING.s }]} placeholder="Estimated cost (₹)..." placeholderTextColor={COLORS.textMuted} keyboardType="numeric" />
                        <TouchableOpacity style={styles.submitBtn} onPress={() => Alert.alert('Submitted', 'Pre-auth request sent to insurer')}>
                            <Send size={18} color="#fff" />
                            <Text style={styles.submitBtnText}>Submit Pre-Auth</Text>
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
    tab: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.s, paddingHorizontal: SPACING.m, borderRadius: 20, backgroundColor: COLORS.surface, gap: 6 },
    tabActive: { backgroundColor: COLORS.primary + '20', borderWidth: 1, borderColor: COLORS.primary + '40' },
    tabText: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.textMuted },
    tabTextActive: { color: COLORS.primary },
    reqCard: { marginTop: SPACING.m },
    reqHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    reqId: { fontSize: 12, fontFamily: FONTS.bold, color: COLORS.textMuted },
    statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    statusText: { fontSize: 11, fontFamily: FONTS.bold },
    reqPatient: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.text, marginTop: 4 },
    reqProcedure: { fontSize: 14, fontFamily: FONTS.medium, color: COLORS.textSecondary, marginTop: 2 },
    reqAmounts: { flexDirection: 'row', gap: SPACING.l, marginTop: SPACING.s },
    reqEstimate: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.text },
    reqApproved: { fontSize: 13, fontFamily: FONTS.bold },
    reqInsurer: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textMuted, marginTop: 4 },
    reqRemarks: { fontSize: 12, fontFamily: FONTS.bold, marginTop: 4 },
    input: { backgroundColor: COLORS.surface, borderRadius: 12, padding: SPACING.m, color: COLORS.text, fontFamily: FONTS.regular, fontSize: 14, borderWidth: 1, borderColor: COLORS.border, marginTop: SPACING.m },
    fieldLabel: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.textMuted, letterSpacing: 1, marginTop: SPACING.m, marginBottom: 6 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.s },
    chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
    chipActive: { backgroundColor: COLORS.primary + '20', borderColor: COLORS.primary },
    chipText: { fontSize: 12, fontFamily: FONTS.medium, color: COLORS.textMuted },
    chipTextActive: { color: COLORS.primary },
    submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 14, marginTop: SPACING.l, gap: 8 },
    submitBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 16 },
});
