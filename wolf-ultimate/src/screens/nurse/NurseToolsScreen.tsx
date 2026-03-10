import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Calculator, ThermometerSun, FileSignature, Upload, Droplets, Wrench, ShieldCheck } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';

interface ToolItem { icon: any; label: string; desc: string; color: string; route: string; }

export const NurseToolsScreen = ({ navigation }: any) => {
    const { COLORS } = useTheme();
    const styles = getStyles(COLORS);

    const tools: ToolItem[] = [
        { icon: Calculator, label: 'Clinical Scales', desc: 'GCS, NEWS-2, Braden, APGAR', color: '#06b6d4', route: 'ClinicalScales' },
        { icon: ThermometerSun, label: 'Pain Assessment', desc: 'NRS, Wong-Baker, FLACC', color: COLORS.error, route: 'PainAssessment' },
        { icon: FileSignature, label: 'Consent Forms', desc: 'Digital signatures, NABH', color: COLORS.success, route: 'ConsentForms' },
        { icon: Upload, label: 'File Uploads', desc: 'Wound photos, documents', color: COLORS.info, route: 'FileUploads' },
        { icon: Droplets, label: 'Blood Bank', desc: 'Request, cross-match, transfusion', color: '#ef4444', route: 'BloodBank' },
        { icon: ShieldCheck, label: 'CSSD Tracking', desc: 'Sterilization tray status', color: '#8b5cf6', route: 'CSSD' },
        { icon: Wrench, label: 'Equipment', desc: 'Availability & maintenance', color: '#f97316', route: 'Equipment' },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <BackgroundOrb />
            <View style={styles.header}>
                <Text style={styles.title}>Tools</Text>
                <Text style={styles.subtitle}>Scales, forms & utilities</Text>
            </View>
            <ScrollView contentContainerStyle={styles.grid}>
                {tools.map((tool, i) => (
                    <TouchableOpacity key={i} style={styles.cardWrap} onPress={() => navigation.navigate(tool.route)}>
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
    cardLabel: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.text, textAlign: 'center' },
    cardDesc: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textSecondary, textAlign: 'center', marginTop: 4 },
});
