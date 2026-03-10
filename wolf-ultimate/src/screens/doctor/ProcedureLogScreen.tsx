import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Zap, Plus, Calendar, User, Clock, Hash, ChevronDown } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';
import apiClient from '../../api/client';

interface Procedure {
    id: string; name: string; cpt_code: string; patient_name: string;
    date: string; surgeon: string; assistant?: string; duration_min: number;
    anaesthesia: string; notes?: string; status: 'completed' | 'scheduled';
}

export const ProcedureLogScreen = () => {
    const { COLORS } = useTheme();
    const [tab, setTab] = useState<'log' | 'history'>('history');
    const [procedureName, setProcedureName] = useState('');
    const [cptCode, setCptCode] = useState('');
    const [patientName, setPatientName] = useState('');
    const [duration, setDuration] = useState('');
    const [anaesthesia, setAnaesthesia] = useState('General');
    const [notes, setNotes] = useState('');
    const styles = getStyles(COLORS);

    const procedures: Procedure[] = [
        { id: '1', name: 'Laparoscopic Cholecystectomy', cpt_code: '47562', patient_name: 'Rajesh Kumar', date: '2026-03-02', surgeon: 'Dr. Sharma', assistant: 'Dr. Patel', duration_min: 45, anaesthesia: 'General', notes: 'Uneventful. 3-port technique. Gallbladder removed intact.', status: 'completed' },
        { id: '2', name: 'Total Knee Replacement (R)', cpt_code: '27447', patient_name: 'Sunita Devi', date: '2026-03-01', surgeon: 'Dr. Sharma', duration_min: 90, anaesthesia: 'Spinal', notes: 'Cemented prosthesis. Good alignment on intra-op X-ray.', status: 'completed' },
        { id: '3', name: 'Appendectomy (Laparoscopic)', cpt_code: '44970', patient_name: 'Vikram Singh', date: '2026-02-28', surgeon: 'Dr. Sharma', assistant: 'Dr. Gupta', duration_min: 35, anaesthesia: 'General', status: 'completed' },
        { id: '4', name: 'LSCS (Emergency)', cpt_code: '59620', patient_name: 'Priya Sharma', date: '2026-03-03', surgeon: 'Dr. Sharma', duration_min: 60, anaesthesia: 'Spinal', status: 'scheduled' },
    ];

    const anaesthesiaTypes = ['General', 'Spinal', 'Epidural', 'Local', 'Regional', 'Sedation'];

    const saveProcedure = () => {
        if (!procedureName || !patientName) { Alert.alert('Required', 'Procedure name and patient required'); return; }
        Alert.alert('Saved', `Procedure "${procedureName}" logged successfully`);
        setProcedureName(''); setCptCode(''); setPatientName(''); setDuration(''); setNotes('');
    };

    return (
        <SafeAreaView style={styles.container}>
            <BackgroundOrb />
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.header}>
                    <Zap size={24} color={COLORS.primary} />
                    <Text style={styles.title}>Procedures</Text>
                </View>

                <View style={styles.tabRow}>
                    <TouchableOpacity style={[styles.tab, tab === 'history' && styles.tabActive]} onPress={() => setTab('history')}>
                        <Text style={[styles.tabText, tab === 'history' && styles.tabTextActive]}>History ({procedures.length})</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.tab, tab === 'log' && styles.tabActive]} onPress={() => setTab('log')}>
                        <Plus size={14} color={tab === 'log' ? COLORS.primary : COLORS.textMuted} />
                        <Text style={[styles.tabText, tab === 'log' && styles.tabTextActive]}>Log New</Text>
                    </TouchableOpacity>
                </View>

                {tab === 'history' ? (
                    <View style={{ paddingHorizontal: SPACING.m }}>
                        {procedures.map(proc => (
                            <GlassCard key={proc.id} style={[styles.procCard, proc.status === 'scheduled' && { borderColor: COLORS.warning + '40', borderWidth: 1 }]}>
                                <View style={styles.procHeader}>
                                    <Text style={styles.procName}>{proc.name}</Text>
                                    <View style={[styles.statusBadge, { backgroundColor: (proc.status === 'completed' ? COLORS.success : COLORS.warning) + '20' }]}>
                                        <Text style={[styles.statusText, { color: proc.status === 'completed' ? COLORS.success : COLORS.warning }]}>
                                            {proc.status === 'completed' ? 'Done' : 'Scheduled'}
                                        </Text>
                                    </View>
                                </View>
                                <View style={styles.procMeta}>
                                    <View style={styles.metaItem}><Hash size={12} color={COLORS.textMuted} /><Text style={styles.metaText}>CPT: {proc.cpt_code}</Text></View>
                                    <View style={styles.metaItem}><User size={12} color={COLORS.textMuted} /><Text style={styles.metaText}>{proc.patient_name}</Text></View>
                                    <View style={styles.metaItem}><Calendar size={12} color={COLORS.textMuted} /><Text style={styles.metaText}>{proc.date}</Text></View>
                                    <View style={styles.metaItem}><Clock size={12} color={COLORS.textMuted} /><Text style={styles.metaText}>{proc.duration_min} min · {proc.anaesthesia}</Text></View>
                                </View>
                                {proc.notes && <Text style={styles.procNotes}>{proc.notes}</Text>}
                            </GlassCard>
                        ))}
                    </View>
                ) : (
                    <View style={{ paddingHorizontal: SPACING.m }}>
                        {[
                            { label: 'PROCEDURE NAME', value: procedureName, setter: setProcedureName, placeholder: 'e.g. Laparoscopic Cholecystectomy' },
                            { label: 'CPT / ICD CODE', value: cptCode, setter: setCptCode, placeholder: 'e.g. 47562' },
                            { label: 'PATIENT NAME', value: patientName, setter: setPatientName, placeholder: 'Patient name...' },
                            { label: 'DURATION (MINUTES)', value: duration, setter: setDuration, placeholder: 'e.g. 45', keyboard: 'numeric' as const },
                        ].map((field, i) => (
                            <View key={i} style={styles.field}>
                                <Text style={styles.fieldLabel}>{field.label}</Text>
                                <TextInput style={styles.input} value={field.value} onChangeText={field.setter} placeholder={field.placeholder} placeholderTextColor={COLORS.textMuted} keyboardType={field.keyboard || 'default'} />
                            </View>
                        ))}

                        <Text style={styles.fieldLabel}>ANAESTHESIA TYPE</Text>
                        <View style={styles.chipRow}>
                            {anaesthesiaTypes.map(a => (
                                <TouchableOpacity key={a} style={[styles.chip, anaesthesia === a && styles.chipActive]} onPress={() => setAnaesthesia(a)}>
                                    <Text style={[styles.chipText, anaesthesia === a && styles.chipTextActive]}>{a}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <View style={styles.field}>
                            <Text style={styles.fieldLabel}>OPERATIVE NOTES</Text>
                            <TextInput style={[styles.input, { minHeight: 100, textAlignVertical: 'top' }]} value={notes} onChangeText={setNotes} placeholder="Describe the procedure..." placeholderTextColor={COLORS.textMuted} multiline />
                        </View>

                        <TouchableOpacity style={styles.saveBtn} onPress={saveProcedure}>
                            <Zap size={18} color="#fff" />
                            <Text style={styles.saveBtnText}>Log Procedure</Text>
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
    procCard: { marginTop: SPACING.m },
    procHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    procName: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.text, flex: 1, marginRight: SPACING.s },
    statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    statusText: { fontSize: 11, fontFamily: FONTS.bold },
    procMeta: { marginTop: SPACING.s, gap: 4 },
    metaItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    metaText: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textSecondary },
    procNotes: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: SPACING.s, paddingTop: SPACING.s, borderTopWidth: 1, borderTopColor: COLORS.border, lineHeight: 18 },
    field: { marginTop: SPACING.m },
    fieldLabel: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.textMuted, letterSpacing: 1, marginBottom: 6 },
    input: { backgroundColor: COLORS.surface, borderRadius: 12, padding: SPACING.m, color: COLORS.text, fontFamily: FONTS.regular, fontSize: 14, borderWidth: 1, borderColor: COLORS.border },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.s, marginBottom: SPACING.s },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
    chipActive: { backgroundColor: COLORS.primary + '20', borderColor: COLORS.primary },
    chipText: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.textMuted },
    chipTextActive: { color: COLORS.primary },
    saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 14, marginTop: SPACING.l, gap: 8 },
    saveBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 16 },
});
