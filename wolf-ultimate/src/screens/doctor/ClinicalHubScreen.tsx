import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pill, FlaskConical, FileText, Layers, Scan, ClipboardList, Calendar, ShieldAlert } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';

interface ToolItem {
    icon: any; label: string; desc: string; color: string; route: string; params?: any;
}

export const ClinicalHubScreen = ({ navigation }: any) => {
    const { COLORS } = useTheme();
    const styles = getStyles(COLORS);

    const tools: ToolItem[] = [
        { icon: Pill, label: 'Prescriptions', desc: 'Write & manage Rx', color: COLORS.success, route: 'Prescriptions', params: { patientId: '', patientName: 'Select Patient' } },
        { icon: FlaskConical, label: 'Lab Orders', desc: 'Order & view results', color: COLORS.info, route: 'LabOrders', params: { patientId: '', patientName: 'Select Patient' } },
        { icon: Scan, label: 'Radiology', desc: 'X-ray, CT, MRI orders', color: COLORS.warning, route: 'RadiologyOrders' },
        { icon: FileText, label: 'Clinical Notes', desc: 'SOAP & progress notes', color: COLORS.secondary, route: 'ClinicalNotes', params: { patientId: '', patientName: 'Select Patient' } },
        { icon: Layers, label: 'Order Sets', desc: 'Quick-order templates', color: '#ec4899', route: 'OrderSets' },
        { icon: ClipboardList, label: 'Problem List', desc: 'Active diagnoses (ICD-10)', color: '#f97316', route: 'ProblemList' },
        { icon: Calendar, label: 'OT Schedule', desc: 'Theatre slots & cases', color: '#0ea5e9', route: 'OTSchedule' },
        { icon: ShieldAlert, label: 'Drug Interactions', desc: 'Check DDI for Rx', color: COLORS.error, route: 'DrugInteraction' },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <BackgroundOrb />
            <View style={styles.header}>
                <Text style={styles.title}>Clinical Tools</Text>
                <Text style={styles.subtitle}>Orders, notes & documentation</Text>
            </View>
            <ScrollView contentContainerStyle={styles.grid}>
                {tools.map((tool, i) => (
                    <TouchableOpacity key={i} style={styles.cardWrap} onPress={() => navigation.navigate(tool.route, tool.params)}>
                        <GlassCard style={styles.card}>
                            <View style={[styles.iconCircle, { backgroundColor: tool.color + '20' }]}>
                                <tool.icon size={24} color={tool.color} />
                            </View>
                            <Text style={styles.cardLabel}>{tool.label}</Text>
                            <Text style={styles.cardDesc}>{tool.desc}</Text>
                        </GlassCard>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
};

const getStyles = (COLORS: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { paddingHorizontal: SPACING.l, paddingTop: SPACING.m, marginBottom: SPACING.m },
    title: { fontSize: 28, fontFamily: FONTS.bold, color: COLORS.text },
    subtitle: { fontSize: 14, fontFamily: FONTS.medium, color: COLORS.textSecondary, marginTop: 2 },
    grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.m, paddingBottom: 100, gap: SPACING.m },
    cardWrap: { width: '47%' },
    card: { alignItems: 'center', paddingVertical: SPACING.l },
    iconCircle: { width: 56, height: 56, borderRadius: 28, justifyContent: 'center', alignItems: 'center', marginBottom: SPACING.m },
    cardLabel: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.text, textAlign: 'center' },
    cardDesc: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textSecondary, textAlign: 'center', marginTop: 4 },
});
