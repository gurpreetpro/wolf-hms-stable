import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Wrench, CheckCircle, AlertTriangle, XCircle, Clock, Plus, Clipboard } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';

interface Equipment { id: string; name: string; location: string; serial_no: string; status: 'working' | 'maintenance' | 'broken' | 'calibration_due'; last_checked: string; next_maintenance?: string; checked_by?: string; }

export const EquipmentScreen = () => {
    const { COLORS } = useTheme();
    const [filter, setFilter] = useState<'all' | 'working' | 'maintenance' | 'broken' | 'calibration_due'>('all');
    const styles = getStyles(COLORS);

    const equipment: Equipment[] = [
        { id: '1', name: 'Ventilator (Drager Savina)', location: 'ICU-2', serial_no: 'VNT-0042', status: 'working', last_checked: '2026-03-01', checked_by: 'BME Team', next_maintenance: '2026-04-01' },
        { id: '2', name: 'Cardiac Monitor', location: 'ICU-3', serial_no: 'CM-0118', status: 'working', last_checked: '2026-02-28', checked_by: 'Nurse Priya' },
        { id: '3', name: 'Infusion Pump (B.Braun)', location: 'Ward 1', serial_no: 'IP-0067', status: 'calibration_due', last_checked: '2026-01-15', next_maintenance: '2026-03-02' },
        { id: '4', name: 'Syringe Pump', location: 'OT-1', serial_no: 'SP-0023', status: 'maintenance', last_checked: '2026-02-25', checked_by: 'BME Team' },
        { id: '5', name: 'Defibrillator', location: 'Emergency', serial_no: 'DF-0009', status: 'working', last_checked: '2026-03-02', checked_by: 'Nurse Kavita' },
        { id: '6', name: 'Suction Machine', location: 'Ward 2', serial_no: 'SM-0031', status: 'broken', last_checked: '2026-02-20' },
        { id: '7', name: 'Pulse Oximeter', location: 'Ward 1', serial_no: 'PO-0055', status: 'working', last_checked: '2026-03-01', checked_by: 'Nurse Priya' },
    ];

    const filtered = filter === 'all' ? equipment : equipment.filter(e => e.status === filter);

    const getStatusConfig = (s: string) => {
        switch (s) { case 'working': return { color: COLORS.success, icon: CheckCircle, label: 'Working' }; case 'maintenance': return { color: COLORS.warning, icon: Clock, label: 'In Maintenance' }; case 'broken': return { color: COLORS.error, icon: XCircle, label: 'Broken' }; case 'calibration_due': return { color: '#f59e0b', icon: AlertTriangle, label: 'Calibration Due' }; default: return { color: COLORS.textMuted, icon: Clock, label: s }; }
    };

    const working = equipment.filter(e => e.status === 'working').length;
    const issues = equipment.filter(e => e.status !== 'working').length;

    return (
        <SafeAreaView style={styles.container}>
            <BackgroundOrb />
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.header}>
                    <Wrench size={24} color="#f97316" />
                    <View>
                        <Text style={styles.title}>Equipment</Text>
                        <Text style={styles.subtitle}>{working} working · {issues} issues</Text>
                    </View>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
                    {(['all', 'working', 'maintenance', 'broken', 'calibration_due'] as const).map(f => {
                        const cfg = f === 'all' ? { color: COLORS.primary, label: 'All' } : getStatusConfig(f);
                        return (
                            <TouchableOpacity key={f} style={[styles.filterChip, filter === f && { backgroundColor: cfg.color + '20', borderColor: cfg.color }]} onPress={() => setFilter(f)}>
                                <Text style={[styles.filterText, filter === f && { color: cfg.color }]}>{cfg.label}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                {filtered.map(eq => {
                    const cfg = getStatusConfig(eq.status);
                    return (
                        <GlassCard key={eq.id} style={styles.eqCard}>
                            <View style={styles.eqRow}>
                                <View style={[styles.statusIcon, { backgroundColor: cfg.color + '15' }]}>
                                    <cfg.icon size={18} color={cfg.color} />
                                </View>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.eqName}>{eq.name}</Text>
                                    <Text style={styles.eqMeta}>{eq.location} · SN: {eq.serial_no}</Text>
                                    <Text style={styles.eqChecked}>Checked: {eq.last_checked} {eq.checked_by ? `by ${eq.checked_by}` : ''}</Text>
                                    {eq.next_maintenance && <Text style={[styles.eqMaint, { color: eq.status === 'calibration_due' ? '#f59e0b' : COLORS.textMuted }]}>Next: {eq.next_maintenance}</Text>}
                                </View>
                                {eq.status !== 'working' && (
                                    <TouchableOpacity style={[styles.reportBtn, { backgroundColor: cfg.color + '15' }]} onPress={() => Alert.alert('Report', `Report issue for ${eq.name}`)}>
                                        <Clipboard size={14} color={cfg.color} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </GlassCard>
                    );
                })}

                <TouchableOpacity style={styles.addBtn} onPress={() => Alert.alert('Checklist', 'Start daily equipment checklist')}>
                    <Clipboard size={18} color="#fff" />
                    <Text style={styles.addBtnText}>Daily Equipment Checklist</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

const getStyles = (COLORS: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.l, paddingTop: SPACING.m, gap: SPACING.s },
    title: { fontSize: 24, fontFamily: FONTS.bold, color: COLORS.text },
    subtitle: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.textSecondary, marginTop: 2 },
    filterRow: { paddingHorizontal: SPACING.m, paddingVertical: SPACING.m, gap: SPACING.s },
    filterChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
    filterText: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.textMuted },
    eqCard: { marginHorizontal: SPACING.m, marginBottom: SPACING.s },
    eqRow: { flexDirection: 'row', alignItems: 'center' },
    statusIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.m },
    eqName: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.text },
    eqMeta: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 2 },
    eqChecked: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textMuted, marginTop: 2 },
    eqMaint: { fontSize: 11, fontFamily: FONTS.medium, marginTop: 2 },
    reportBtn: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f97316', borderRadius: 14, paddingVertical: 14, marginHorizontal: SPACING.m, marginTop: SPACING.l, gap: 8 },
    addBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 16 },
});
