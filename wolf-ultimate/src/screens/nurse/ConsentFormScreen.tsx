import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileSignature, Check, Clock, ChevronRight, Eye, Download } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';

interface ConsentForm { id: string; patient_name: string; form_type: string; status: 'pending' | 'signed' | 'declined'; witness?: string; signed_date?: string; }

export const ConsentFormScreen = () => {
    const { COLORS } = useTheme();
    const [selectedType, setSelectedType] = useState('');
    const styles = getStyles(COLORS);

    const consentTypes = [
        'Surgery / Procedure', 'General (Admission)', 'Blood Transfusion', 'Anaesthesia', 'High-Risk Procedure',
        'Against Medical Advice (AMA/LAMA)', 'Organ Donation', 'Clinical Trial / Research', 'DNR / Advance Directive',
        'HIV / Hepatitis Testing', 'Photography / Recording',
    ];

    const forms: ConsentForm[] = [
        { id: '1', patient_name: 'Meena Gupta', form_type: 'Surgery / Procedure', status: 'signed', witness: 'Nurse Priya', signed_date: '2026-03-01' },
        { id: '2', patient_name: 'Ravi Verma', form_type: 'Blood Transfusion', status: 'pending' },
        { id: '3', patient_name: 'Amit Patel', form_type: 'General (Admission)', status: 'signed', witness: 'Nurse Kavita', signed_date: '2026-02-28' },
        { id: '4', patient_name: 'Baby Arjun', form_type: 'High-Risk Procedure', status: 'declined' },
        { id: '5', patient_name: 'Gopal Das', form_type: 'Against Medical Advice (AMA/LAMA)', status: 'pending' },
    ];

    const getStatusConfig = (s: string) => {
        switch (s) { case 'pending': return { color: COLORS.warning, label: 'Pending' }; case 'signed': return { color: COLORS.success, label: 'Signed' }; case 'declined': return { color: COLORS.error, label: 'Declined' }; default: return { color: COLORS.textMuted, label: s }; }
    };

    return (
        <SafeAreaView style={styles.container}>
            <BackgroundOrb />
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.header}>
                    <FileSignature size={24} color={COLORS.primary} />
                    <Text style={styles.title}>Consent Forms</Text>
                </View>

                <Text style={styles.sectionLabel}>FORM TYPES</Text>
                <View style={styles.chipRow}>
                    {consentTypes.map(t => (
                        <TouchableOpacity key={t} style={[styles.chip, selectedType === t && styles.chipActive]} onPress={() => setSelectedType(selectedType === t ? '' : t)}>
                            <Text style={[styles.chipText, selectedType === t && styles.chipTextActive]}>{t}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <Text style={styles.sectionLabel}>RECENT FORMS</Text>
                {forms.filter(f => !selectedType || f.form_type === selectedType).map(form => {
                    const cfg = getStatusConfig(form.status);
                    return (
                        <TouchableOpacity key={form.id} onPress={() => form.status === 'pending' ? Alert.alert('Consent', `Open digital consent form for ${form.patient_name}?\n\nType: ${form.form_type}`, [{ text: 'Cancel' }, { text: 'Open', onPress: () => {} }]) : null}>
                            <GlassCard style={styles.formCard}>
                                <View style={styles.formRow}>
                                    <View style={[styles.statusDot, { backgroundColor: cfg.color }]} />
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.formPatient}>{form.patient_name}</Text>
                                        <Text style={styles.formType}>{form.form_type}</Text>
                                        {form.witness && <Text style={styles.formMeta}>Witness: {form.witness} · {form.signed_date}</Text>}
                                    </View>
                                    <View style={[styles.statusBadge, { backgroundColor: cfg.color + '20' }]}>
                                        <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                                    </View>
                                </View>
                            </GlassCard>
                        </TouchableOpacity>
                    );
                })}

                <TouchableOpacity style={styles.newBtn} onPress={() => Alert.alert('New Consent', 'Select patient and form type to generate')}>
                    <FileSignature size={18} color="#fff" />
                    <Text style={styles.newBtnText}>Generate New Consent Form</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

const getStyles = (COLORS: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.l, paddingTop: SPACING.m, gap: SPACING.s },
    title: { fontSize: 24, fontFamily: FONTS.bold, color: COLORS.text },
    sectionLabel: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.textMuted, letterSpacing: 1, marginTop: SPACING.l, marginBottom: SPACING.s, marginHorizontal: SPACING.l },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.s, paddingHorizontal: SPACING.m },
    chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
    chipActive: { backgroundColor: COLORS.primary + '20', borderColor: COLORS.primary },
    chipText: { fontSize: 12, fontFamily: FONTS.medium, color: COLORS.textMuted },
    chipTextActive: { color: COLORS.primary },
    formCard: { marginHorizontal: SPACING.m, marginBottom: SPACING.s },
    formRow: { flexDirection: 'row', alignItems: 'center' },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: SPACING.m },
    formPatient: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.text },
    formType: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 2 },
    formMeta: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textMuted, marginTop: 2 },
    statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    statusText: { fontSize: 11, fontFamily: FONTS.bold },
    newBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 14, marginHorizontal: SPACING.m, marginTop: SPACING.l, gap: 8 },
    newBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 16 },
});
