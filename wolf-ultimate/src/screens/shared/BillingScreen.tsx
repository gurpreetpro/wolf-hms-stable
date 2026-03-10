import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { IndianRupee, FileText, ChevronRight, CheckCircle, Clock, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';
import billingService from '../../services/billingService';

interface BillItem { id: string; patient_name: string; uhid: string; bed: string; total: number; paid: number; pending: number; status: 'open' | 'partial' | 'settled' | 'insurance_pending'; admission_date: string; items: { name: string; amount: number; category: string }[]; }

export const BillingScreen = () => {
    const { COLORS } = useTheme();
    const [filter, setFilter] = useState<'all' | 'open' | 'partial' | 'insurance_pending'>('all');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const styles = getStyles(COLORS);

    const [bills, setBills] = useState<BillItem[]>([]);
    const [loading, setLoading] = useState(false);

    const mockBills: BillItem[] = [
        { id: '1', patient_name: 'Rajesh Kumar', uhid: 'UHID-4521', bed: 'W1-5', total: 185000, paid: 50000, pending: 135000, status: 'partial', admission_date: '2026-02-28', items: [
            { name: 'Room Charges (5 days)', amount: 25000, category: 'Room' },
            { name: 'Lap. Cholecystectomy', amount: 80000, category: 'Surgery' },
            { name: 'Anaesthesia', amount: 20000, category: 'Surgery' },
            { name: 'Medications', amount: 12000, category: 'Pharmacy' },
            { name: 'Lab Tests', amount: 8000, category: 'Lab' },
            { name: 'OT Charges', amount: 15000, category: 'Surgery' },
            { name: 'Consumables', amount: 25000, category: 'Other' },
        ]},
        { id: '2', patient_name: 'Sunita Devi', uhid: 'UHID-4530', bed: 'W2-3', total: 320000, paid: 0, pending: 320000, status: 'insurance_pending', admission_date: '2026-02-25', items: [
            { name: 'Room Charges (7 days)', amount: 70000, category: 'Room' },
            { name: 'TKR Right Knee', amount: 150000, category: 'Surgery' },
            { name: 'Implants', amount: 60000, category: 'Surgery' },
            { name: 'Physiotherapy', amount: 10000, category: 'Other' },
            { name: 'Medications', amount: 15000, category: 'Pharmacy' },
            { name: 'Lab + Imaging', amount: 15000, category: 'Lab' },
        ]},
        { id: '3', patient_name: 'Meena Gupta', uhid: 'UHID-4510', bed: 'ICU-3', total: 95000, paid: 95000, pending: 0, status: 'settled', admission_date: '2026-03-01', items: [
            { name: 'ICU Charges (2 days)', amount: 40000, category: 'Room' },
            { name: 'Ventilator', amount: 20000, category: 'Other' },
            { name: 'Medications', amount: 18000, category: 'Pharmacy' },
            { name: 'Lab Tests', amount: 12000, category: 'Lab' },
            { name: 'Nursing Charges', amount: 5000, category: 'Other' },
        ]},
    ];

    useEffect(() => { loadBills(); }, []);

    const loadBills = async () => {
        try {
            setLoading(true);
            const data = await billingService.getBills();
            if (data.length > 0) {
                setBills(data.map((b: any) => ({
                    id: b.id, patient_name: b.patient_name, uhid: b.patient_id || 'N/A',
                    bed: 'N/A', total: b.total, paid: b.paid, pending: b.total - b.paid - b.discount,
                    status: b.status === 'pending' ? 'open' : b.status === 'paid' ? 'settled' : b.status,
                    admission_date: b.date, items: (b.items || []).map((i: any) => ({ name: i.description, amount: i.amount, category: i.category })),
                })));
            } else { setBills(mockBills); }
        } catch { setBills(mockBills); }
        finally { setLoading(false); }
    };

    const filtered = filter === 'all' ? bills : bills.filter(b => b.status === filter);
    const totalPending = bills.reduce((s, b) => s + b.pending, 0);

    const getStatusConfig = (s: string) => {
        switch (s) { case 'open': return { color: COLORS.warning, label: 'Open' }; case 'partial': return { color: COLORS.info, label: 'Partial' }; case 'settled': return { color: COLORS.success, label: 'Settled' }; case 'insurance_pending': return { color: '#8b5cf6', label: 'Insurance' }; default: return { color: COLORS.textMuted, label: s }; }
    };

    const formatCurrency = (n: number) => '₹' + n.toLocaleString('en-IN');

    return (
        <SafeAreaView style={styles.container}>
            <BackgroundOrb />
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.header}>
                    <IndianRupee size={24} color={COLORS.success} />
                    <Text style={styles.title}>Billing</Text>
                </View>

                <GlassCard style={styles.summaryCard}>
                    <View style={styles.summaryRow}>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Total Billed</Text>
                            <Text style={[styles.summaryValue, { color: COLORS.text }]}>{formatCurrency(bills.reduce((s, b) => s + b.total, 0))}</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Collected</Text>
                            <Text style={[styles.summaryValue, { color: COLORS.success }]}>{formatCurrency(bills.reduce((s, b) => s + b.paid, 0))}</Text>
                        </View>
                        <View style={styles.summaryItem}>
                            <Text style={styles.summaryLabel}>Pending</Text>
                            <Text style={[styles.summaryValue, { color: COLORS.error }]}>{formatCurrency(totalPending)}</Text>
                        </View>
                    </View>
                </GlassCard>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                    {(['all', 'open', 'partial', 'insurance_pending'] as const).map(f => {
                        const color = f === 'all' ? COLORS.primary : getStatusConfig(f).color;
                        return (
                            <TouchableOpacity key={f} style={[styles.filterChip, filter === f && { backgroundColor: color + '20', borderColor: color }]} onPress={() => setFilter(f)}>
                                <Text style={[styles.filterText, filter === f && { color }]}>{f === 'all' ? 'All' : getStatusConfig(f).label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {filtered.map(bill => {
                    const cfg = getStatusConfig(bill.status);
                    const expanded = expandedId === bill.id;
                    return (
                        <TouchableOpacity key={bill.id} onPress={() => setExpandedId(expanded ? null : bill.id)}>
                            <GlassCard style={[styles.billCard, { borderLeftWidth: 3, borderLeftColor: cfg.color }]}>
                                <View style={styles.billHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.billPatient}>{bill.patient_name}</Text>
                                        <Text style={styles.billMeta}>{bill.uhid} · {bill.bed} · Adm: {bill.admission_date}</Text>
                                    </View>
                                    <View style={styles.billRight}>
                                        <Text style={[styles.billTotal, { color: cfg.color }]}>{formatCurrency(bill.total)}</Text>
                                        <View style={[styles.statusBadge, { backgroundColor: cfg.color + '20' }]}>
                                            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                                        </View>
                                    </View>
                                </View>
                                {bill.pending > 0 && (
                                    <View style={styles.barWrap}>
                                        <View style={styles.barBg}>
                                            <View style={[styles.barFill, { width: `${(bill.paid / bill.total) * 100}%`, backgroundColor: COLORS.success }]} />
                                        </View>
                                        <Text style={styles.barText}>{formatCurrency(bill.paid)} / {formatCurrency(bill.total)}</Text>
                                    </View>
                                )}
                                {expanded && (
                                    <View style={styles.itemsList}>
                                        {bill.items.map((item, i) => (
                                            <View key={i} style={styles.itemRow}>
                                                <Text style={styles.itemName}>{item.name}</Text>
                                                <Text style={styles.itemAmount}>{formatCurrency(item.amount)}</Text>
                                            </View>
                                        ))}
                                    </View>
                                )}
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
    billCard: { marginHorizontal: SPACING.m, marginBottom: SPACING.m },
    billHeader: { flexDirection: 'row' },
    billPatient: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.text },
    billMeta: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 2 },
    billRight: { alignItems: 'flex-end' },
    billTotal: { fontSize: 16, fontFamily: FONTS.bold },
    statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, marginTop: 4 },
    statusText: { fontSize: 10, fontFamily: FONTS.bold },
    barWrap: { marginTop: SPACING.s },
    barBg: { height: 6, borderRadius: 3, backgroundColor: COLORS.surface },
    barFill: { height: 6, borderRadius: 3 },
    barText: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textMuted, marginTop: 2 },
    itemsList: { marginTop: SPACING.m, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.s },
    itemRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
    itemName: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textSecondary },
    itemAmount: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.text },
});
