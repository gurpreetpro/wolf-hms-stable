import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ClipboardCheck, CheckCircle, Circle, AlertTriangle, ChevronDown } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';

interface CheckItem { id: string; label: string; checked: boolean; note?: string; }
interface Section { title: string; items: CheckItem[]; }

export const PreOpScreen = () => {
    const { COLORS } = useTheme();
    const [sections, setSections] = useState<Section[]>([
        { title: 'Patient Identification', items: [
            { id: 'p1', label: 'Identity band verified', checked: false },
            { id: 'p2', label: 'Consent form signed', checked: false },
            { id: 'p3', label: 'Site marking done', checked: false },
            { id: 'p4', label: 'Blood group verified', checked: false },
        ]},
        { title: 'Clinical Assessment', items: [
            { id: 'c1', label: 'NPO status confirmed (≥6hrs solid, ≥2hrs clear)', checked: false },
            { id: 'c2', label: 'Allergies documented', checked: false },
            { id: 'c3', label: 'Pre-op vitals recorded', checked: false },
            { id: 'c4', label: 'Airway assessment done (Mallampati)', checked: false },
            { id: 'c5', label: 'ASA classification documented', checked: false },
        ]},
        { title: 'Investigations', items: [
            { id: 'i1', label: 'CBC available', checked: false },
            { id: 'i2', label: 'PT/INR available', checked: false },
            { id: 'i3', label: 'Blood sugar checked', checked: false },
            { id: 'i4', label: 'ECG reviewed (if applicable)', checked: false },
            { id: 'i5', label: 'Chest X-ray reviewed', checked: false },
            { id: 'i6', label: 'Cross-matched blood available', checked: false },
        ]},
        { title: 'Preparation', items: [
            { id: 'r1', label: 'IV access established', checked: false },
            { id: 'r2', label: 'Pre-medication given', checked: false },
            { id: 'r3', label: 'Jewellery / dentures removed', checked: false },
            { id: 'r4', label: 'OT gown on', checked: false },
            { id: 'r5', label: 'Deep vein prophylaxis reviewed', checked: false },
        ]},
    ]);
    const styles = getStyles(COLORS);

    const toggleItem = (sIdx: number, iIdx: number) => {
        setSections(prev => prev.map((sec, si) => si === sIdx ? { ...sec, items: sec.items.map((item, ii) => ii === iIdx ? { ...item, checked: !item.checked } : item) } : sec));
    };

    const totalItems = sections.reduce((s, sec) => s + sec.items.length, 0);
    const checkedItems = sections.reduce((s, sec) => s + sec.items.filter(i => i.checked).length, 0);
    const progress = totalItems > 0 ? (checkedItems / totalItems) * 100 : 0;

    return (
        <SafeAreaView style={styles.container}>
            <BackgroundOrb />
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.header}>
                    <ClipboardCheck size={24} color={COLORS.primary} />
                    <View>
                        <Text style={styles.title}>Pre-Op Assessment</Text>
                        <Text style={styles.subtitle}>{checkedItems}/{totalItems} completed</Text>
                    </View>
                </View>

                {/* Progress bar */}
                <View style={styles.progressWrap}>
                    <View style={styles.progressBar}>
                        <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: progress === 100 ? COLORS.success : COLORS.primary }]} />
                    </View>
                    <Text style={[styles.progressText, { color: progress === 100 ? COLORS.success : COLORS.primary }]}>{Math.round(progress)}%</Text>
                </View>

                {progress === 100 && (
                    <GlassCard style={[styles.readyCard, { borderColor: COLORS.success + '40' }]}>
                        <CheckCircle size={24} color={COLORS.success} />
                        <Text style={[styles.readyText, { color: COLORS.success }]}>Patient Ready for OT</Text>
                    </GlassCard>
                )}

                {sections.map((sec, sIdx) => {
                    const secDone = sec.items.every(i => i.checked);
                    return (
                        <View key={sIdx} style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Text style={styles.sectionTitle}>{sec.title.toUpperCase()}</Text>
                                {secDone && <CheckCircle size={14} color={COLORS.success} />}
                            </View>
                            {sec.items.map((item, iIdx) => (
                                <TouchableOpacity key={item.id} style={styles.checkRow} onPress={() => toggleItem(sIdx, iIdx)}>
                                    {item.checked ? <CheckCircle size={20} color={COLORS.success} /> : <Circle size={20} color={COLORS.textMuted} />}
                                    <Text style={[styles.checkLabel, item.checked && styles.checkLabelDone]}>{item.label}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    );
                })}

                <TouchableOpacity style={styles.submitBtn} onPress={() => { if (progress < 100) Alert.alert('Incomplete', `${totalItems - checkedItems} items still pending`); else Alert.alert('Cleared', 'Pre-op checklist complete. Patient cleared for OT.'); }}>
                    <ClipboardCheck size={18} color="#fff" />
                    <Text style={styles.submitBtnText}>Submit Pre-Op Clearance</Text>
                </TouchableOpacity>
            </ScrollView>
        </SafeAreaView>
    );
};

const getStyles = (COLORS: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.l, paddingTop: SPACING.m, gap: SPACING.s },
    title: { fontSize: 24, fontFamily: FONTS.bold, color: COLORS.text },
    subtitle: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.textSecondary },
    progressWrap: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.m, marginTop: SPACING.m, gap: SPACING.s },
    progressBar: { flex: 1, height: 8, borderRadius: 4, backgroundColor: COLORS.surface },
    progressFill: { height: 8, borderRadius: 4 },
    progressText: { fontSize: 13, fontFamily: FONTS.bold },
    readyCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: SPACING.m, marginTop: SPACING.m, paddingVertical: SPACING.m, gap: SPACING.s, borderWidth: 1 },
    readyText: { fontSize: 16, fontFamily: FONTS.bold },
    section: { marginTop: SPACING.l, paddingHorizontal: SPACING.m },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: SPACING.s },
    sectionTitle: { fontSize: 12, fontFamily: FONTS.bold, color: COLORS.textMuted, letterSpacing: 1 },
    checkRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.m, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: COLORS.border },
    checkLabel: { fontSize: 14, fontFamily: FONTS.regular, color: COLORS.text, flex: 1 },
    checkLabelDone: { textDecorationLine: 'line-through', color: COLORS.textMuted },
    submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.success, borderRadius: 14, paddingVertical: 14, marginHorizontal: SPACING.m, marginTop: SPACING.l, gap: 8 },
    submitBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 16 },
});
