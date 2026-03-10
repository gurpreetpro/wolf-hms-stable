import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShieldCheck, Package, Clock, CheckCircle, AlertTriangle, ScanLine, Hash } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';

interface CSSDItem { id: string; item_name: string; set_type: string; batch_no: string; status: 'dirty' | 'processing' | 'sterilized' | 'dispatched'; ward: string; expiry_date?: string; sterilization_method: string; }

export const CSSDScreen = () => {
    const { COLORS } = useTheme();
    const [filter, setFilter] = useState<'all' | 'dirty' | 'processing' | 'sterilized' | 'dispatched'>('all');
    const styles = getStyles(COLORS);

    const items: CSSDItem[] = [
        { id: '1', item_name: 'General Surgery Set', set_type: 'Instrument Set', batch_no: 'CSSD-2026-0451', status: 'sterilized', ward: 'OT-1', expiry_date: '2026-03-09', sterilization_method: 'Steam (Autoclave)' },
        { id: '2', item_name: 'Lap Choly Set', set_type: 'Instrument Set', batch_no: 'CSSD-2026-0452', status: 'processing', ward: 'OT-2', sterilization_method: 'Steam (Autoclave)' },
        { id: '3', item_name: 'Suture Tray', set_type: 'Procedure Tray', batch_no: 'CSSD-2026-0453', status: 'dispatched', ward: 'Emergency', expiry_date: '2026-03-08', sterilization_method: 'ETO Gas' },
        { id: '4', item_name: 'Central Line Kit', set_type: 'Single-Use Pack', batch_no: 'CSSD-2026-0454', status: 'dirty', ward: 'ICU', sterilization_method: 'Plasma' },
        { id: '5', item_name: 'Ortho Drill Set', set_type: 'Instrument Set', batch_no: 'CSSD-2026-0455', status: 'sterilized', ward: 'OT-3', expiry_date: '2026-03-07', sterilization_method: 'Steam (Autoclave)' },
    ];

    const filtered = filter === 'all' ? items : items.filter(i => i.status === filter);

    const getStatusConfig = (s: string) => {
        switch (s) { case 'dirty': return { color: COLORS.error, label: 'Dirty / Received' }; case 'processing': return { color: COLORS.warning, label: 'Processing' }; case 'sterilized': return { color: COLORS.success, label: 'Sterilized' }; case 'dispatched': return { color: COLORS.info, label: 'Dispatched' }; default: return { color: COLORS.textMuted, label: s }; }
    };

    return (
        <SafeAreaView style={styles.container}>
            <BackgroundOrb />
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.header}>
                    <ShieldCheck size={24} color="#8b5cf6" />
                    <Text style={styles.title}>CSSD Tracking</Text>
                </View>

                {/* Status Stats */}
                <View style={styles.statsRow}>
                    {[
                        { status: 'dirty' as const, count: items.filter(i => i.status === 'dirty').length },
                        { status: 'processing' as const, count: items.filter(i => i.status === 'processing').length },
                        { status: 'sterilized' as const, count: items.filter(i => i.status === 'sterilized').length },
                        { status: 'dispatched' as const, count: items.filter(i => i.status === 'dispatched').length },
                    ].map(s => {
                        const cfg = getStatusConfig(s.status);
                        return (
                            <TouchableOpacity key={s.status} style={[styles.statCard, filter === s.status && { borderWidth: 1, borderColor: cfg.color }]} onPress={() => setFilter(filter === s.status ? 'all' : s.status)}>
                                <Text style={[styles.statValue, { color: cfg.color }]}>{s.count}</Text>
                                <Text style={styles.statLabel}>{cfg.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                {filtered.map(item => {
                    const cfg = getStatusConfig(item.status);
                    return (
                        <GlassCard key={item.id} style={[styles.itemCard, { borderLeftWidth: 3, borderLeftColor: cfg.color }]}>
                            <View style={styles.itemHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.itemName}>{item.item_name}</Text>
                                    <Text style={styles.itemType}>{item.set_type}</Text>
                                </View>
                                <View style={[styles.statusBadge, { backgroundColor: cfg.color + '20' }]}>
                                    <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                                </View>
                            </View>
                            <View style={styles.metaRow}>
                                <View style={styles.metaItem}><Hash size={12} color={COLORS.textMuted} /><Text style={styles.metaText}>{item.batch_no}</Text></View>
                                <View style={styles.metaItem}><Package size={12} color={COLORS.textMuted} /><Text style={styles.metaText}>{item.ward}</Text></View>
                            </View>
                            <Text style={styles.methodText}>{item.sterilization_method}{item.expiry_date ? ` · Exp: ${item.expiry_date}` : ''}</Text>
                        </GlassCard>
                    );
                })}

                <TouchableOpacity style={styles.scanBtn} onPress={() => Alert.alert('Scan', 'Scan barcode to track instrument')}>
                    <ScanLine size={18} color="#fff" />
                    <Text style={styles.scanBtnText}>Scan Barcode</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

const getStyles = (COLORS: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.l, paddingTop: SPACING.m, gap: SPACING.s },
    title: { fontSize: 24, fontFamily: FONTS.bold, color: COLORS.text },
    statsRow: { flexDirection: 'row', paddingHorizontal: SPACING.m, marginTop: SPACING.m, gap: SPACING.s },
    statCard: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 12, paddingVertical: SPACING.m, alignItems: 'center' },
    statValue: { fontSize: 20, fontFamily: FONTS.bold },
    statLabel: { fontSize: 10, fontFamily: FONTS.medium, color: COLORS.textMuted, marginTop: 2, textAlign: 'center' },
    itemCard: { marginHorizontal: SPACING.m, marginTop: SPACING.m },
    itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    itemName: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.text },
    itemType: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 2 },
    statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    statusText: { fontSize: 11, fontFamily: FONTS.bold },
    metaRow: { flexDirection: 'row', gap: SPACING.l, marginTop: SPACING.s },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    metaText: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textSecondary },
    methodText: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textMuted, marginTop: 4 },
    scanBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#8b5cf6', borderRadius: 14, paddingVertical: 14, marginHorizontal: SPACING.m, marginTop: SPACING.l, gap: 8 },
    scanBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 16 },
});
