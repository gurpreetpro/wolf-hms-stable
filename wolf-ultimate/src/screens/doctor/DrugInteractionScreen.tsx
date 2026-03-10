import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ShieldAlert, Search, AlertTriangle, CheckCircle, Info, Plus, X } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';
import apiClient from '../../api/client';

interface Drug { name: string; dose: string; }
interface Interaction { drug1: string; drug2: string; severity: 'major' | 'moderate' | 'minor'; description: string; recommendation: string; }

export const DrugInteractionScreen = () => {
    const { COLORS } = useTheme();
    const [drugs, setDrugs] = useState<Drug[]>([
        { name: 'Warfarin', dose: '5mg OD' },
        { name: 'Aspirin', dose: '150mg OD' },
    ]);
    const [newDrug, setNewDrug] = useState('');
    const styles = getStyles(COLORS);

    const interactions: Interaction[] = [
        { drug1: 'Warfarin', drug2: 'Aspirin', severity: 'major', description: 'Increased risk of bleeding. NSAIDs including aspirin can increase the anticoagulant effect of warfarin and increase GI bleeding risk.', recommendation: 'Avoid combination if possible. If co-prescribed, monitor INR frequently and watch for signs of bleeding.' },
        { drug1: 'Metformin', drug2: 'Contrast Dye', severity: 'major', description: 'Risk of lactic acidosis. Iodinated contrast media can impair renal function, leading to metformin accumulation.', recommendation: 'Hold metformin 48h before and after contrast administration. Check renal function before resuming.' },
        { drug1: 'ACE Inhibitor', drug2: 'Potassium', severity: 'moderate', description: 'Risk of hyperkalemia. ACE inhibitors reduce aldosterone, decreasing potassium excretion.', recommendation: 'Monitor serum potassium. Avoid potassium supplements unless hypokalemia documented.' },
        { drug1: 'Ciprofloxacin', drug2: 'Antacids', severity: 'minor', description: 'Reduced absorption. Aluminum/magnesium antacids chelate fluoroquinolones.', recommendation: 'Space administration by at least 2 hours.' },
    ];

    const addDrug = () => {
        if (!newDrug.trim()) return;
        setDrugs(prev => [...prev, { name: newDrug.trim(), dose: '' }]);
        setNewDrug('');
    };

    const removeDrug = (index: number) => setDrugs(prev => prev.filter((_, i) => i !== index));

    const checkInteractions = async () => {
        Alert.alert('Checking...', `Checking ${drugs.length} drugs for interactions`);
        try { await apiClient.post('/api/ai/drug-interactions', { drugs: drugs.map(d => d.name) }); } catch {}
    };

    const getSeverityConfig = (s: string) => {
        switch (s) {
            case 'major': return { color: COLORS.error, icon: AlertTriangle, label: 'MAJOR' };
            case 'moderate': return { color: COLORS.warning, icon: Info, label: 'MODERATE' };
            case 'minor': return { color: COLORS.info, icon: Info, label: 'MINOR' };
            default: return { color: COLORS.textMuted, icon: Info, label: s };
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <BackgroundOrb />
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.header}>
                    <ShieldAlert size={28} color={COLORS.error} />
                    <Text style={styles.title}>Drug Interactions</Text>
                </View>

                <Text style={styles.sectionTitle}>CURRENT MEDICATIONS</Text>
                <View style={styles.drugList}>
                    {drugs.map((drug, i) => (
                        <View key={i} style={styles.drugChip}>
                            <Text style={styles.drugName}>{drug.name}</Text>
                            {drug.dose ? <Text style={styles.drugDose}>{drug.dose}</Text> : null}
                            <TouchableOpacity onPress={() => removeDrug(i)}><X size={14} color={COLORS.error} /></TouchableOpacity>
                        </View>
                    ))}
                </View>

                <View style={styles.addRow}>
                    <TextInput style={styles.addInput} placeholder="Add drug name..." placeholderTextColor={COLORS.textMuted} value={newDrug} onChangeText={setNewDrug} onSubmitEditing={addDrug} />
                    <TouchableOpacity style={styles.addBtn} onPress={addDrug}><Plus size={18} color="#fff" /></TouchableOpacity>
                </View>

                <TouchableOpacity style={styles.checkBtn} onPress={checkInteractions}>
                    <Search size={18} color="#fff" />
                    <Text style={styles.checkBtnText}>Check Interactions</Text>
                </TouchableOpacity>

                <Text style={styles.sectionTitle}>DETECTED INTERACTIONS ({interactions.length})</Text>
                {interactions.map((ix, i) => {
                    const cfg = getSeverityConfig(ix.severity);
                    return (
                        <GlassCard key={i} style={[styles.ixCard, { borderLeftWidth: 3, borderLeftColor: cfg.color }]}>
                            <View style={styles.ixHeader}>
                                <cfg.icon size={16} color={cfg.color} />
                                <View style={[styles.severityBadge, { backgroundColor: cfg.color + '20' }]}>
                                    <Text style={[styles.severityText, { color: cfg.color }]}>{cfg.label}</Text>
                                </View>
                            </View>
                            <Text style={styles.ixDrugs}>{ix.drug1} ↔ {ix.drug2}</Text>
                            <Text style={styles.ixDesc}>{ix.description}</Text>
                            <View style={styles.recoBox}>
                                <Text style={styles.recoLabel}>Recommendation:</Text>
                                <Text style={styles.recoText}>{ix.recommendation}</Text>
                            </View>
                        </GlassCard>
                    );
                })}

                {interactions.length === 0 && (
                    <GlassCard style={styles.safeCard}>
                        <CheckCircle size={32} color={COLORS.success} />
                        <Text style={styles.safeText}>No interactions detected</Text>
                    </GlassCard>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const getStyles = (COLORS: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.l, paddingTop: SPACING.m, gap: SPACING.s },
    title: { fontSize: 24, fontFamily: FONTS.bold, color: COLORS.text },
    sectionTitle: { fontSize: 12, fontFamily: FONTS.bold, color: COLORS.textMuted, letterSpacing: 1, marginTop: SPACING.l, marginBottom: SPACING.s, marginHorizontal: SPACING.m },
    drugList: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.m, gap: SPACING.s },
    drugChip: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 8, gap: 6, borderWidth: 1, borderColor: COLORS.border },
    drugName: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.text },
    drugDose: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textSecondary },
    addRow: { flexDirection: 'row', paddingHorizontal: SPACING.m, marginTop: SPACING.m, gap: SPACING.s },
    addInput: { flex: 1, backgroundColor: COLORS.surface, borderRadius: 12, paddingHorizontal: SPACING.m, paddingVertical: 12, color: COLORS.text, fontFamily: FONTS.regular, fontSize: 14, borderWidth: 1, borderColor: COLORS.border },
    addBtn: { width: 44, height: 44, borderRadius: 12, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
    checkBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.error, borderRadius: 14, paddingVertical: 14, marginHorizontal: SPACING.m, marginTop: SPACING.m, gap: 8 },
    checkBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 15 },
    ixCard: { marginHorizontal: SPACING.m, marginBottom: SPACING.m },
    ixHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
    severityBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
    severityText: { fontSize: 10, fontFamily: FONTS.bold },
    ixDrugs: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.text, marginBottom: 4 },
    ixDesc: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textSecondary, lineHeight: 18 },
    recoBox: { backgroundColor: COLORS.success + '10', borderRadius: 8, padding: SPACING.s, marginTop: SPACING.s },
    recoLabel: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.success, marginBottom: 2 },
    recoText: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.text, lineHeight: 17 },
    safeCard: { alignItems: 'center', marginHorizontal: SPACING.m, paddingVertical: SPACING.xl },
    safeText: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.success, marginTop: SPACING.m },
});
