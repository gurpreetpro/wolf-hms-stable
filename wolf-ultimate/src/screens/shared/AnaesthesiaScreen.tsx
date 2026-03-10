import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Syringe, Clock, Plus, CheckCircle, Activity } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';

interface AnaesthesiaEntry { time: string; parameter: string; value: string; type: 'drug' | 'vital' | 'event'; }

export const AnaesthesiaScreen = () => {
    const { COLORS } = useTheme();
    const [asaClass, setAsaClass] = useState('II');
    const [airway, setAirway] = useState('Mallampati II');
    const [technique, setTechnique] = useState('General');
    const styles = getStyles(COLORS);

    const asaOptions = ['I', 'II', 'III', 'IV', 'V', 'VI'];
    const airwayOptions = ['Mallampati I', 'Mallampati II', 'Mallampati III', 'Mallampati IV'];
    const techniques = ['General', 'Spinal', 'Epidural', 'Combined (CSE)', 'Regional Block', 'MAC / Sedation', 'Local'];

    const entries: AnaesthesiaEntry[] = [
        { time: '08:00', parameter: 'Pre-induction vitals', value: 'HR 78, BP 128/82, SpO2 99%', type: 'vital' },
        { time: '08:02', parameter: 'Inj. Glycopyrrolate', value: '0.2mg IV', type: 'drug' },
        { time: '08:03', parameter: 'Inj. Midazolam', value: '1mg IV', type: 'drug' },
        { time: '08:05', parameter: 'Inj. Fentanyl', value: '100mcg IV', type: 'drug' },
        { time: '08:07', parameter: 'Inj. Propofol', value: '120mg IV', type: 'drug' },
        { time: '08:08', parameter: 'Inj. Atracurium', value: '30mg IV', type: 'drug' },
        { time: '08:09', parameter: 'Intubation', value: 'ETT 7.5, Grade I, 1st attempt', type: 'event' },
        { time: '08:10', parameter: 'Post-intubation', value: 'HR 68, BP 108/68, SpO2 100%, EtCO2 32', type: 'vital' },
        { time: '08:10', parameter: 'Maintenance', value: 'O2 + N2O + Sevoflurane 1.5%', type: 'drug' },
        { time: '08:30', parameter: 'Vitals', value: 'HR 72, BP 118/76, SpO2 99%, EtCO2 35', type: 'vital' },
    ];

    const getEntryColor = (t: string) => t === 'drug' ? COLORS.info : t === 'vital' ? COLORS.success : COLORS.warning;

    return (
        <SafeAreaView style={styles.container}>
            <BackgroundOrb />
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.header}>
                    <Syringe size={24} color="#8b5cf6" />
                    <Text style={styles.title}>Anaesthesia Record</Text>
                </View>

                {/* Patient + Config */}
                <GlassCard style={styles.configCard}>
                    <Text style={styles.configTitle}>Rajesh Kumar · 45y/M · 72kg</Text>

                    <Text style={styles.fieldLabel}>ASA CLASS</Text>
                    <View style={styles.chipRow}>
                        {asaOptions.map(a => (
                            <TouchableOpacity key={a} style={[styles.chip, asaClass === a && { backgroundColor: '#8b5cf6' + '20', borderColor: '#8b5cf6' }]} onPress={() => setAsaClass(a)}>
                                <Text style={[styles.chipText, asaClass === a && { color: '#8b5cf6' }]}>{a}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.fieldLabel}>AIRWAY</Text>
                    <View style={styles.chipRow}>
                        {airwayOptions.map(a => (
                            <TouchableOpacity key={a} style={[styles.chip, airway === a && styles.chipActive]} onPress={() => setAirway(a)}>
                                <Text style={[styles.chipText, airway === a && styles.chipTextActive]}>{a}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    <Text style={styles.fieldLabel}>TECHNIQUE</Text>
                    <View style={styles.chipRow}>
                        {techniques.map(t => (
                            <TouchableOpacity key={t} style={[styles.chip, technique === t && { backgroundColor: COLORS.success + '20', borderColor: COLORS.success }]} onPress={() => setTechnique(t)}>
                                <Text style={[styles.chipText, technique === t && { color: COLORS.success }]}>{t}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </GlassCard>

                {/* Record */}
                <Text style={styles.sectionLabel}>ANAESTHESIA LOG</Text>
                {entries.map((e, i) => (
                    <View key={i} style={styles.entryRow}>
                        <Text style={styles.entryTime}>{e.time}</Text>
                        <View style={[styles.entryDot, { backgroundColor: getEntryColor(e.type) }]} />
                        <View style={{ flex: 1 }}>
                            <Text style={[styles.entryParam, { color: getEntryColor(e.type) }]}>{e.parameter}</Text>
                            <Text style={styles.entryValue}>{e.value}</Text>
                        </View>
                    </View>
                ))}

                <TouchableOpacity style={styles.addBtn} onPress={() => Alert.alert('Add Entry', 'Log drug, vital, or event')}>
                    <Plus size={18} color="#fff" />
                    <Text style={styles.addBtnText}>Add Entry</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

const getStyles = (COLORS: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.l, paddingTop: SPACING.m, gap: SPACING.s },
    title: { fontSize: 24, fontFamily: FONTS.bold, color: COLORS.text },
    configCard: { marginHorizontal: SPACING.m, marginTop: SPACING.m },
    configTitle: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.text, marginBottom: SPACING.m },
    fieldLabel: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.textMuted, letterSpacing: 1, marginTop: SPACING.m, marginBottom: 6 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.s },
    chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
    chipActive: { backgroundColor: COLORS.primary + '20', borderColor: COLORS.primary },
    chipText: { fontSize: 12, fontFamily: FONTS.medium, color: COLORS.textMuted },
    chipTextActive: { color: COLORS.primary },
    sectionLabel: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.textMuted, letterSpacing: 1, marginTop: SPACING.l, marginBottom: SPACING.s, marginHorizontal: SPACING.l },
    entryRow: { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: SPACING.m, paddingVertical: 8, gap: SPACING.s },
    entryTime: { fontSize: 12, fontFamily: FONTS.bold, color: COLORS.textMuted, width: 44 },
    entryDot: { width: 8, height: 8, borderRadius: 4, marginTop: 4 },
    entryParam: { fontSize: 13, fontFamily: FONTS.bold },
    entryValue: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 1 },
    addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#8b5cf6', borderRadius: 14, paddingVertical: 14, marginHorizontal: SPACING.m, marginTop: SPACING.l, gap: 8 },
    addBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 16 },
});
