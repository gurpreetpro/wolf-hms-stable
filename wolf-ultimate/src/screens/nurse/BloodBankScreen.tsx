import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Droplets, Plus, Clock, CheckCircle, AlertTriangle, Syringe } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';

interface BloodRequest { id: string; patient_name: string; blood_group: string; component: string; units: number; status: 'pending' | 'crossmatched' | 'issued' | 'transfused'; priority: 'routine' | 'urgent' | 'emergency'; requested_date: string; }

export const BloodBankScreen = () => {
    const { COLORS } = useTheme();
    const [tab, setTab] = useState<'requests' | 'new'>('requests');
    const [selectedGroup, setSelectedGroup] = useState('');
    const [selectedComponent, setSelectedComponent] = useState('');
    const [units, setUnits] = useState(1);
    const styles = getStyles(COLORS);

    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const components = ['Whole Blood', 'PRBC', 'FFP', 'Platelets (RDP)', 'Platelets (SDP)', 'Cryoprecipitate'];

    const requests: BloodRequest[] = [
        { id: '1', patient_name: 'Meena Gupta', blood_group: 'B+', component: 'PRBC', units: 2, status: 'crossmatched', priority: 'urgent', requested_date: '2026-03-02' },
        { id: '2', patient_name: 'Ravi Verma', blood_group: 'O+', component: 'FFP', units: 4, status: 'issued', priority: 'routine', requested_date: '2026-03-01' },
        { id: '3', patient_name: 'Lakshmi Nair', blood_group: 'AB+', component: 'Platelets (SDP)', units: 1, status: 'pending', priority: 'emergency', requested_date: '2026-03-02' },
        { id: '4', patient_name: 'Gopal Das', blood_group: 'A-', component: 'PRBC', units: 1, status: 'transfused', priority: 'routine', requested_date: '2026-02-28' },
    ];

    const getStatusConfig = (s: string) => {
        switch (s) {
            case 'pending': return { color: COLORS.warning, label: 'Pending' };
            case 'crossmatched': return { color: COLORS.info, label: 'Cross-Matched' };
            case 'issued': return { color: COLORS.success, label: 'Issued' };
            case 'transfused': return { color: COLORS.primary, label: 'Transfused' };
            default: return { color: COLORS.textMuted, label: s };
        }
    };

    const getPriorityColor = (p: string) => p === 'emergency' ? COLORS.error : p === 'urgent' ? COLORS.warning : COLORS.textMuted;

    const submitRequest = () => {
        if (!selectedGroup || !selectedComponent) { Alert.alert('Required', 'Select blood group and component'); return; }
        Alert.alert('Request Sent', `${units} unit(s) ${selectedComponent} (${selectedGroup}) requested`);
        setSelectedGroup(''); setSelectedComponent(''); setUnits(1); setTab('requests');
    };

    return (
        <SafeAreaView style={styles.container}>
            <BackgroundOrb />
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.header}>
                    <Droplets size={24} color="#ef4444" />
                    <Text style={styles.title}>Blood Bank</Text>
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
                                        <Text style={styles.reqPatient}>{req.patient_name}</Text>
                                        <View style={[styles.statusBadge, { backgroundColor: cfg.color + '20' }]}>
                                            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.reqDetail}>
                                        <View style={[styles.groupBadge, { backgroundColor: '#ef4444' + '20' }]}>
                                            <Text style={[styles.groupText, { color: '#ef4444' }]}>{req.blood_group}</Text>
                                        </View>
                                        <Text style={styles.reqMeta}>{req.units} unit(s) {req.component}</Text>
                                        {req.priority !== 'routine' && (
                                            <View style={[styles.priBadge, { backgroundColor: getPriorityColor(req.priority) + '20' }]}>
                                                <Text style={[styles.priText, { color: getPriorityColor(req.priority) }]}>{req.priority.toUpperCase()}</Text>
                                            </View>
                                        )}
                                    </View>
                                </GlassCard>
                            );
                        })}
                    </View>
                ) : (
                    <View style={{ paddingHorizontal: SPACING.m }}>
                        <Text style={styles.sectionLabel}>BLOOD GROUP</Text>
                        <View style={styles.chipRow}>
                            {bloodGroups.map(g => (
                                <TouchableOpacity key={g} style={[styles.chip, selectedGroup === g && { backgroundColor: '#ef4444' + '20', borderColor: '#ef4444' }]} onPress={() => setSelectedGroup(g)}>
                                    <Text style={[styles.chipText, selectedGroup === g && { color: '#ef4444' }]}>{g}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.sectionLabel}>COMPONENT</Text>
                        <View style={styles.chipRow}>
                            {components.map(c => (
                                <TouchableOpacity key={c} style={[styles.chip, selectedComponent === c && styles.chipActive]} onPress={() => setSelectedComponent(c)}>
                                    <Text style={[styles.chipText, selectedComponent === c && styles.chipTextActive]}>{c}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.sectionLabel}>UNITS</Text>
                        <View style={styles.unitsRow}>
                            <TouchableOpacity style={styles.unitBtn} onPress={() => setUnits(Math.max(1, units - 1))}><Text style={styles.unitBtnText}>−</Text></TouchableOpacity>
                            <Text style={styles.unitValue}>{units}</Text>
                            <TouchableOpacity style={styles.unitBtn} onPress={() => setUnits(units + 1)}><Text style={styles.unitBtnText}>+</Text></TouchableOpacity>
                        </View>

                        <TouchableOpacity style={styles.submitBtn} onPress={submitRequest}>
                            <Syringe size={18} color="#fff" />
                            <Text style={styles.submitBtnText}>Submit Blood Request</Text>
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
    reqPatient: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.text },
    statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    statusText: { fontSize: 11, fontFamily: FONTS.bold },
    reqDetail: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: SPACING.s },
    groupBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    groupText: { fontSize: 12, fontFamily: FONTS.bold },
    reqMeta: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textSecondary, flex: 1 },
    priBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    priText: { fontSize: 9, fontFamily: FONTS.bold },
    sectionLabel: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.textMuted, letterSpacing: 1, marginTop: SPACING.l, marginBottom: SPACING.s },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.s },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
    chipActive: { backgroundColor: COLORS.primary + '20', borderColor: COLORS.primary },
    chipText: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.textMuted },
    chipTextActive: { color: COLORS.primary },
    unitsRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.m },
    unitBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.surface, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: COLORS.border },
    unitBtnText: { fontSize: 22, fontFamily: FONTS.bold, color: COLORS.text },
    unitValue: { fontSize: 28, fontFamily: FONTS.bold, color: COLORS.text },
    submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#ef4444', borderRadius: 14, paddingVertical: 14, marginTop: SPACING.l, gap: 8 },
    submitBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 16 },
});
