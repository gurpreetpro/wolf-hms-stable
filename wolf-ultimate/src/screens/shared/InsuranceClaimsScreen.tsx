import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Receipt, Clock, CheckCircle, AlertTriangle, IndianRupee, FileText } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';
import insuranceService from '../../services/insuranceService';

interface Claim { id: string; patient_name: string; uhid: string; insurer: string; pre_auth_id: string; claim_amount: number; approved_amount: number; settled_amount?: number; status: 'documents_pending' | 'submitted' | 'under_review' | 'approved' | 'settled' | 'rejected' | 'partial'; discharge_date: string; tat_days: number; }

export const InsuranceClaimsScreen = () => {
    const { COLORS } = useTheme();
    const [filter, setFilter] = useState<'all' | 'documents_pending' | 'submitted' | 'under_review' | 'settled'>('all');
    const styles = getStyles(COLORS);

    const [claims, setClaims] = useState<Claim[]>([]);

    const mockClaims: Claim[] = [
        { id: 'CLM-2026-031', patient_name: 'Meena Gupta', uhid: 'UHID-4510', insurer: 'Star Health', pre_auth_id: 'PA-2026-038', claim_amount: 95000, approved_amount: 90000, settled_amount: 90000, status: 'settled', discharge_date: '2026-02-28', tat_days: 2 },
        { id: 'CLM-2026-032', patient_name: 'Rajesh Kumar', uhid: 'UHID-4521', insurer: 'Star Health', pre_auth_id: 'PA-2026-042', claim_amount: 185000, approved_amount: 150000, status: 'submitted', discharge_date: '2026-03-02', tat_days: 0 },
        { id: 'CLM-2026-033', patient_name: 'Sunita Devi', uhid: 'UHID-4530', insurer: 'ICICI Lombard', pre_auth_id: 'PA-2026-043', claim_amount: 320000, approved_amount: 0, status: 'documents_pending', discharge_date: '', tat_days: 0 },
        { id: 'CLM-2026-034', patient_name: 'Gopal Das', uhid: 'UHID-4515', insurer: 'New India', pre_auth_id: 'PA-2026-039', claim_amount: 65000, approved_amount: 50000, settled_amount: 50000, status: 'partial', discharge_date: '2026-02-25', tat_days: 5 },
    ];

    useEffect(() => { loadClaims(); }, []);

    const loadClaims = async () => {
        try {
            const data = await insuranceService.getClaims();
            if (data.length > 0) {
                setClaims(data.map((c: any) => ({
                    id: c.id, patient_name: c.patient_name, uhid: c.claim_number || '',
                    insurer: c.insurer, pre_auth_id: c.admission_id || '',
                    claim_amount: c.claimed_amount, approved_amount: c.approved_amount || 0,
                    settled_amount: c.settled_amount, status: c.status,
                    discharge_date: c.submission_date || '', tat_days: c.tat_days || 0,
                })));
            } else { setClaims(mockClaims); }
        } catch { setClaims(mockClaims); }
    };

    const filtered = filter === 'all' ? claims : claims.filter(c => c.status === filter);
    const totalClaimed = claims.reduce((s, c) => s + c.claim_amount, 0);
    const totalSettled = claims.reduce((s, c) => s + (c.settled_amount || 0), 0);

    const getStatusConfig = (s: string) => {
        switch (s) { case 'documents_pending': return { color: COLORS.warning, label: 'Docs Pending' }; case 'submitted': return { color: COLORS.info, label: 'Submitted' }; case 'under_review': return { color: '#8b5cf6', label: 'Under Review' }; case 'approved': return { color: COLORS.success, label: 'Approved' }; case 'settled': return { color: COLORS.success, label: 'Settled' }; case 'rejected': return { color: COLORS.error, label: 'Rejected' }; case 'partial': return { color: '#f59e0b', label: 'Partial' }; default: return { color: COLORS.textMuted, label: s }; }
    };

    const formatCurrency = (n: number) => '₹' + n.toLocaleString('en-IN');

    return (
        <SafeAreaView style={styles.container}>
            <BackgroundOrb />
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.header}>
                    <Receipt size={24} color={COLORS.success} />
                    <Text style={styles.title}>Insurance Claims</Text>
                </View>

                <GlassCard style={styles.summaryCard}>
                    <View style={styles.summaryRow}>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Claims</Text>
                            <Text style={[styles.summaryValue, { color: COLORS.text }]}>{claims.length}</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Claimed</Text>
                            <Text style={[styles.summaryValue, { color: COLORS.info }]}>{formatCurrency(totalClaimed)}</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Settled</Text>
                            <Text style={[styles.summaryValue, { color: COLORS.success }]}>{formatCurrency(totalSettled)}</Text>
                        </View>
                    </View>
                </GlassCard>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                    {(['all', 'documents_pending', 'submitted', 'under_review', 'settled'] as const).map(f => {
                        const color = f === 'all' ? COLORS.primary : getStatusConfig(f).color;
                        return (
                            <TouchableOpacity key={f} style={[styles.filterChip, filter === f && { backgroundColor: color + '20', borderColor: color }]} onPress={() => setFilter(f)}>
                                <Text style={[styles.filterText, filter === f && { color }]}>{f === 'all' ? 'All' : getStatusConfig(f).label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {filtered.map(claim => {
                    const cfg = getStatusConfig(claim.status);
                    return (
                        <TouchableOpacity key={claim.id} onPress={() => Alert.alert(claim.id, `Patient: ${claim.patient_name}\nInsurer: ${claim.insurer}\nPre-Auth: ${claim.pre_auth_id}\nClaimed: ${formatCurrency(claim.claim_amount)}\nApproved: ${formatCurrency(claim.approved_amount)}\n${claim.settled_amount ? `Settled: ${formatCurrency(claim.settled_amount)}` : ''}`)}>
                            <GlassCard style={[styles.claimCard, { borderLeftWidth: 3, borderLeftColor: cfg.color }]}>
                                <View style={styles.claimHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.claimId}>{claim.id}</Text>
                                        <Text style={styles.claimPatient}>{claim.patient_name}</Text>
                                    </View>
                                    <View style={[styles.statusBadge, { backgroundColor: cfg.color + '20' }]}>
                                        <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                                    </View>
                                </View>
                                <Text style={styles.claimInsurer}>{claim.insurer} · PA: {claim.pre_auth_id}</Text>
                                <View style={styles.amountRow}>
                                    <Text style={styles.amountLabel}>Claimed: <Text style={{ color: COLORS.text }}>{formatCurrency(claim.claim_amount)}</Text></Text>
                                    {claim.settled_amount ? (
                                        <Text style={styles.amountLabel}>Settled: <Text style={{ color: COLORS.success }}>{formatCurrency(claim.settled_amount)}</Text></Text>
                                    ) : claim.approved_amount > 0 ? (
                                        <Text style={styles.amountLabel}>Approved: <Text style={{ color: COLORS.info }}>{formatCurrency(claim.approved_amount)}</Text></Text>
                                    ) : null}
                                </View>
                                {claim.tat_days > 0 && <Text style={styles.tatText}>TAT: {claim.tat_days} days</Text>}
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
    summaryCard: { marginHorizontal: SPACING.m, marginTop: SPACING.m },
    summaryRow: { flexDirection: 'row' },
    summaryItem: { flex: 1, alignItems: 'center' },
    summaryLabel: { fontSize: 11, fontFamily: FONTS.medium, color: COLORS.textMuted },
    summaryValue: { fontSize: 16, fontFamily: FONTS.bold, marginTop: 4 },
    filterRow: { paddingHorizontal: SPACING.m, paddingVertical: SPACING.m, gap: SPACING.s },
    filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
    filterText: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.textMuted },
    claimCard: { marginHorizontal: SPACING.m, marginBottom: SPACING.m },
    claimHeader: { flexDirection: 'row', alignItems: 'flex-start' },
    claimId: { fontSize: 12, fontFamily: FONTS.bold, color: COLORS.textMuted },
    claimPatient: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.text, marginTop: 2 },
    statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    statusText: { fontSize: 10, fontFamily: FONTS.bold },
    claimInsurer: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 4 },
    amountRow: { flexDirection: 'row', gap: SPACING.l, marginTop: SPACING.s },
    amountLabel: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textMuted },
    tatText: { fontSize: 11, fontFamily: FONTS.medium, color: COLORS.textMuted, marginTop: 4 },
});
