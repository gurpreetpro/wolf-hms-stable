import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calculator, ChevronRight, CheckCircle, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';

interface ScaleItem { label: string; options: { value: number; text: string }[]; }
interface Scale { id: string; name: string; abbrev: string; description: string; color: string; items: ScaleItem[]; interpret: (score: number) => { level: string; color: string; action: string }; }

export const ClinicalScalesScreen = () => {
    const { COLORS } = useTheme();
    const [selectedScale, setSelectedScale] = useState<Scale | null>(null);
    const [answers, setAnswers] = useState<Record<number, number>>({});
    const styles = getStyles(COLORS);

    const scales: Scale[] = [
        { id: 'gcs', name: 'Glasgow Coma Scale', abbrev: 'GCS', description: 'Level of consciousness', color: '#ef4444',
          items: [
            { label: 'Eye Opening', options: [{ value: 1, text: 'None' }, { value: 2, text: 'To Pain' }, { value: 3, text: 'To Voice' }, { value: 4, text: 'Spontaneous' }] },
            { label: 'Verbal Response', options: [{ value: 1, text: 'None' }, { value: 2, text: 'Incomprehensible' }, { value: 3, text: 'Inappropriate' }, { value: 4, text: 'Confused' }, { value: 5, text: 'Oriented' }] },
            { label: 'Motor Response', options: [{ value: 1, text: 'None' }, { value: 2, text: 'Extension' }, { value: 3, text: 'Flexion' }, { value: 4, text: 'Withdrawal' }, { value: 5, text: 'Localizing' }, { value: 6, text: 'Obeys' }] },
          ],
          interpret: (s) => s <= 8 ? { level: 'Severe', color: '#ef4444', action: 'Consider intubation' } : s <= 12 ? { level: 'Moderate', color: '#f59e0b', action: 'Close monitoring' } : { level: 'Mild', color: '#10b981', action: 'Observe' }
        },
        { id: 'news2', name: 'National Early Warning Score 2', abbrev: 'NEWS-2', description: 'Deterioration risk', color: '#f59e0b',
          items: [
            { label: 'Respiration Rate', options: [{ value: 3, text: '≤8' }, { value: 1, text: '9-11' }, { value: 0, text: '12-20' }, { value: 2, text: '21-24' }, { value: 3, text: '≥25' }] },
            { label: 'SpO2 Scale 1', options: [{ value: 3, text: '≤91' }, { value: 2, text: '92-93' }, { value: 1, text: '94-95' }, { value: 0, text: '≥96' }] },
            { label: 'Systolic BP', options: [{ value: 3, text: '≤90' }, { value: 2, text: '91-100' }, { value: 1, text: '101-110' }, { value: 0, text: '111-219' }, { value: 3, text: '≥220' }] },
            { label: 'Heart Rate', options: [{ value: 3, text: '≤40' }, { value: 1, text: '41-50' }, { value: 0, text: '51-90' }, { value: 1, text: '91-110' }, { value: 2, text: '111-130' }, { value: 3, text: '≥131' }] },
            { label: 'Consciousness', options: [{ value: 0, text: 'Alert' }, { value: 3, text: 'CVPU' }] },
            { label: 'Temperature', options: [{ value: 3, text: '≤35.0' }, { value: 1, text: '35.1-36.0' }, { value: 0, text: '36.1-38.0' }, { value: 1, text: '38.1-39.0' }, { value: 2, text: '≥39.1' }] },
          ],
          interpret: (s) => s >= 7 ? { level: 'High Risk', color: '#ef4444', action: 'Urgent: escalate to critical care' } : s >= 5 ? { level: 'Medium Risk', color: '#f59e0b', action: 'Urgent response needed' } : s >= 1 ? { level: 'Low Risk', color: '#3b82f6', action: 'Increase monitoring frequency' } : { level: 'No Risk', color: '#10b981', action: 'Continue routine monitoring' }
        },
        { id: 'braden', name: 'Braden Scale', abbrev: 'Braden', description: 'Pressure ulcer risk', color: '#8b5cf6',
          items: [
            { label: 'Sensory Perception', options: [{ value: 1, text: 'Completely Limited' }, { value: 2, text: 'Very Limited' }, { value: 3, text: 'Slightly Limited' }, { value: 4, text: 'No Impairment' }] },
            { label: 'Moisture', options: [{ value: 1, text: 'Constantly Moist' }, { value: 2, text: 'Very Moist' }, { value: 3, text: 'Occasionally Moist' }, { value: 4, text: 'Rarely Moist' }] },
            { label: 'Activity', options: [{ value: 1, text: 'Bedfast' }, { value: 2, text: 'Chairfast' }, { value: 3, text: 'Walks Occasionally' }, { value: 4, text: 'Walks Frequently' }] },
            { label: 'Mobility', options: [{ value: 1, text: 'Completely Immobile' }, { value: 2, text: 'Very Limited' }, { value: 3, text: 'Slightly Limited' }, { value: 4, text: 'No Limitation' }] },
            { label: 'Nutrition', options: [{ value: 1, text: 'Very Poor' }, { value: 2, text: 'Probably Inadequate' }, { value: 3, text: 'Adequate' }, { value: 4, text: 'Excellent' }] },
            { label: 'Friction & Shear', options: [{ value: 1, text: 'Problem' }, { value: 2, text: 'Potential Problem' }, { value: 3, text: 'No Apparent Problem' }] },
          ],
          interpret: (s) => s <= 9 ? { level: 'Very High Risk', color: '#ef4444', action: 'Aggressive prevention protocol' } : s <= 12 ? { level: 'High Risk', color: '#f59e0b', action: 'Turn q2h, pressure-relieving mattress' } : s <= 14 ? { level: 'Moderate Risk', color: '#3b82f6', action: 'Standard prevention measures' } : { level: 'Mild/No Risk', color: '#10b981', action: 'Routine skin assessment' }
        },
    ];

    const totalScore = Object.values(answers).reduce((s, v) => s + v, 0);

    const resetScale = () => { setAnswers({}); setSelectedScale(null); };

    return (
        <SafeAreaView style={styles.container}>
            <BackgroundOrb />
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.header}>
                    <Calculator size={24} color={COLORS.primary} />
                    <Text style={styles.title}>Clinical Scales</Text>
                </View>

                {!selectedScale ? (
                    <View style={{ paddingHorizontal: SPACING.m }}>
                        {scales.map(scale => (
                            <TouchableOpacity key={scale.id} onPress={() => { setSelectedScale(scale); setAnswers({}); }}>
                                <GlassCard style={[styles.scaleCard, { borderLeftWidth: 3, borderLeftColor: scale.color }]}>
                                    <View style={styles.scaleRow}>
                                        <View style={[styles.abbrevBadge, { backgroundColor: scale.color + '20' }]}>
                                            <Text style={[styles.abbrevText, { color: scale.color }]}>{scale.abbrev}</Text>
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.scaleName}>{scale.name}</Text>
                                            <Text style={styles.scaleDesc}>{scale.description} · {scale.items.length} parameters</Text>
                                        </View>
                                        <ChevronRight size={18} color={COLORS.textMuted} />
                                    </View>
                                </GlassCard>
                            </TouchableOpacity>
                        ))}
                    </View>
                ) : (
                    <View style={{ paddingHorizontal: SPACING.m }}>
                        <TouchableOpacity onPress={resetScale}><Text style={styles.backText}>← Back to scales</Text></TouchableOpacity>
                        
                        <GlassCard style={[styles.scoreHeader, { borderWidth: 1, borderColor: selectedScale.color + '40' }]}>
                            <Text style={styles.scoreName}>{selectedScale.name}</Text>
                            <Text style={[styles.scoreValue, { color: selectedScale.color }]}>{totalScore}</Text>
                            {Object.keys(answers).length === selectedScale.items.length && (
                                <View style={[styles.resultBadge, { backgroundColor: selectedScale.interpret(totalScore).color + '20' }]}>
                                    <Text style={[styles.resultText, { color: selectedScale.interpret(totalScore).color }]}>
                                        {selectedScale.interpret(totalScore).level}
                                    </Text>
                                    <Text style={[styles.resultAction, { color: selectedScale.interpret(totalScore).color }]}>
                                        {selectedScale.interpret(totalScore).action}
                                    </Text>
                                </View>
                            )}
                        </GlassCard>

                        {selectedScale.items.map((item, idx) => (
                            <View key={idx} style={styles.itemBlock}>
                                <Text style={styles.itemLabel}>{item.label}</Text>
                                <View style={styles.optionRow}>
                                    {item.options.map((opt, oi) => (
                                        <TouchableOpacity key={oi} style={[styles.optionChip, answers[idx] === opt.value && { backgroundColor: selectedScale.color + '20', borderColor: selectedScale.color }]} onPress={() => setAnswers(p => ({ ...p, [idx]: opt.value }))}>
                                            <Text style={[styles.optionValue, answers[idx] === opt.value && { color: selectedScale.color }]}>{opt.value}</Text>
                                            <Text style={[styles.optionText, answers[idx] === opt.value && { color: selectedScale.color }]} numberOfLines={2}>{opt.text}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        ))}

                        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: selectedScale.color }]} onPress={() => Alert.alert('Saved', `${selectedScale.abbrev} Score: ${totalScore} recorded`)}>
                            <CheckCircle size={18} color="#fff" />
                            <Text style={styles.saveBtnText}>Save {selectedScale.abbrev} Score</Text>
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
    scaleCard: { marginTop: SPACING.m },
    scaleRow: { flexDirection: 'row', alignItems: 'center' },
    abbrevBadge: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 8, marginRight: SPACING.m, minWidth: 50, alignItems: 'center' },
    abbrevText: { fontSize: 13, fontFamily: FONTS.bold },
    scaleName: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.text },
    scaleDesc: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 2 },
    backText: { fontSize: 14, fontFamily: FONTS.medium, color: COLORS.primary, marginBottom: SPACING.m, marginTop: SPACING.s },
    scoreHeader: { alignItems: 'center', paddingVertical: SPACING.l, marginBottom: SPACING.m },
    scoreName: { fontSize: 14, fontFamily: FONTS.medium, color: COLORS.textSecondary },
    scoreValue: { fontSize: 48, fontFamily: FONTS.extraBold, marginTop: 4 },
    resultBadge: { borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, marginTop: SPACING.s, alignItems: 'center' },
    resultText: { fontSize: 14, fontFamily: FONTS.bold },
    resultAction: { fontSize: 12, fontFamily: FONTS.regular, marginTop: 2 },
    itemBlock: { marginBottom: SPACING.l },
    itemLabel: { fontSize: 13, fontFamily: FONTS.bold, color: COLORS.text, marginBottom: SPACING.s },
    optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.s },
    optionChip: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border, minWidth: 70, alignItems: 'center' },
    optionValue: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.text },
    optionText: { fontSize: 10, fontFamily: FONTS.regular, color: COLORS.textSecondary, textAlign: 'center', marginTop: 2 },
    saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 14, marginTop: SPACING.m, gap: 8 },
    saveBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 16 },
});
