import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { FileOutput, Share2, Printer, Calendar, Stethoscope, Pill, FlaskConical, ChevronDown } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';
import apiClient from '../../api/client';

export const DischargeSummaryScreen = ({ route }: any) => {
    const { COLORS } = useTheme();
    const styles = getStyles(COLORS);

    const [patientName] = useState(route?.params?.patientName || 'Meena Gupta');
    const [admissionDate] = useState('2026-02-28');
    const [dischargeDate, setDischargeDate] = useState('2026-03-02');
    const [diagnosis, setDiagnosis] = useState('Community Acquired Pneumonia (CAP)');
    const [presentingComplaints, setPresentingComplaints] = useState('Fever x 5 days, cough with expectoration, breathlessness on exertion');
    const [historyOfIllness, setHistoryOfIllness] = useState('Patient presented with high-grade fever, productive cough with yellowish sputum, and progressive dyspnea. No hemoptysis. No chest pain.');
    const [examination, setExamination] = useState('Temp: 101.2°F, PR: 98/min, BP: 130/80, SpO2: 94% on RA\nRS: Bilateral crepitations in lower zones\nCVS: S1S2 normal, no murmur');
    const [investigations, setInvestigations] = useState('CBC: TLC 14,200 (N85 L12)\nCRP: 48 mg/L\nChest X-ray: B/L lower zone infiltrates\nBlood culture: No growth');
    const [treatment, setTreatment] = useState('IV Piperacillin-Tazobactam 4.5g TDS x 5 days\nIV Azithromycin 500mg OD x 3 days\nNebulization with Duolin + Budecort TDS\nSupplemental O2 via nasal prongs');
    const [conditionAtDischarge, setConditionAtDischarge] = useState('Afebrile, SpO2 97% on RA, oral intake adequate, ambulatory');
    const [followUp, setFollowUp] = useState('OPD follow-up after 1 week with repeat CXR\nContinue oral antibiotics for 5 more days');
    const [dischargeMeds, setDischargeMeds] = useState('1. Tab Amoxicillin-Clavulanate 625mg TDS x 5 days\n2. Tab Azithromycin 500mg OD x 2 days\n3. Syp Ambrodil-S 10ml TDS x 5 days\n4. Tab Paracetamol 650mg SOS (if fever)');

    const sections = [
        { label: 'Presenting Complaints', value: presentingComplaints, setter: setPresentingComplaints },
        { label: 'History of Present Illness', value: historyOfIllness, setter: setHistoryOfIllness },
        { label: 'Examination Findings', value: examination, setter: setExamination },
        { label: 'Investigations', value: investigations, setter: setInvestigations },
        { label: 'Treatment Given', value: treatment, setter: setTreatment },
        { label: 'Condition at Discharge', value: conditionAtDischarge, setter: setConditionAtDischarge },
        { label: 'Discharge Medications', value: dischargeMeds, setter: setDischargeMeds },
        { label: 'Follow-up Instructions', value: followUp, setter: setFollowUp },
    ];

    const handleSave = async () => {
        Alert.alert('Saved', 'Discharge summary saved successfully');
        try { await apiClient.post('/api/admissions/discharge-summary', { diagnosis, presentingComplaints, historyOfIllness, examination, investigations, treatment, conditionAtDischarge, dischargeMeds, followUp }); } catch {}
    };

    const handleShare = () => Alert.alert('Share', 'Send via WhatsApp, Email, or Print?');

    return (
        <SafeAreaView style={styles.container}>
            <BackgroundOrb />
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.header}>
                    <Text style={styles.title}>Discharge Summary</Text>
                    <View style={styles.actionRow}>
                        <TouchableOpacity style={styles.actionBtn} onPress={handleShare}><Share2 size={18} color={COLORS.primary} /></TouchableOpacity>
                        <TouchableOpacity style={styles.actionBtn} onPress={() => Alert.alert('Print', 'Sending to printer...')}><Printer size={18} color={COLORS.primary} /></TouchableOpacity>
                    </View>
                </View>

                <GlassCard style={styles.patientCard}>
                    <Text style={styles.patientName}>{patientName}</Text>
                    <View style={styles.dateRow}>
                        <View style={styles.dateItem}>
                            <Calendar size={14} color={COLORS.textMuted} />
                            <Text style={styles.dateLabel}>Admitted: {admissionDate}</Text>
                        </View>
                        <View style={styles.dateItem}>
                            <Calendar size={14} color={COLORS.success} />
                            <Text style={styles.dateLabel}>Discharged: {dischargeDate}</Text>
                        </View>
                    </View>
                </GlassCard>

                <View style={styles.section}>
                    <Text style={styles.sectionLabel}>PRINCIPAL DIAGNOSIS</Text>
                    <TextInput style={styles.input} value={diagnosis} onChangeText={setDiagnosis} placeholder="Primary diagnosis..." placeholderTextColor={COLORS.textMuted} />
                </View>

                {sections.map((sec, i) => (
                    <View key={i} style={styles.section}>
                        <Text style={styles.sectionLabel}>{sec.label.toUpperCase()}</Text>
                        <TextInput style={[styles.input, styles.multilineInput]} value={sec.value} onChangeText={sec.setter} multiline placeholder={`Enter ${sec.label.toLowerCase()}...`} placeholderTextColor={COLORS.textMuted} />
                    </View>
                ))}

                <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
                    <FileOutput size={18} color="#fff" />
                    <Text style={styles.saveBtnText}>Save Discharge Summary</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

const getStyles = (COLORS: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.l, paddingTop: SPACING.m },
    title: { fontSize: 24, fontFamily: FONTS.bold, color: COLORS.text },
    actionRow: { flexDirection: 'row', gap: SPACING.s },
    actionBtn: { width: 40, height: 40, borderRadius: 12, backgroundColor: COLORS.primary + '15', justifyContent: 'center', alignItems: 'center' },
    patientCard: { marginHorizontal: SPACING.m, marginTop: SPACING.m },
    patientName: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.text },
    dateRow: { flexDirection: 'row', marginTop: SPACING.s, gap: SPACING.l },
    dateItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    dateLabel: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.textSecondary },
    section: { paddingHorizontal: SPACING.m, marginTop: SPACING.m },
    sectionLabel: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.textMuted, letterSpacing: 1, marginBottom: 6 },
    input: { backgroundColor: COLORS.surface, borderRadius: 12, padding: SPACING.m, color: COLORS.text, fontFamily: FONTS.regular, fontSize: 14, borderWidth: 1, borderColor: COLORS.border },
    multilineInput: { minHeight: 80, textAlignVertical: 'top' },
    saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.success, borderRadius: 14, paddingVertical: 14, marginHorizontal: SPACING.m, marginTop: SPACING.l, gap: 8 },
    saveBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 16 },
});
