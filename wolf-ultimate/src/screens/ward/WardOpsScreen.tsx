import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Wrench, Sparkles, UtensilsCrossed, Users2, DoorOpen, Receipt } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';

interface OpItem { icon: any; label: string; desc: string; color: string; route: string; }

export const WardOpsScreen = ({ navigation }: any) => {
    const { COLORS } = useTheme();
    const styles = getStyles(COLORS);

    const ops: OpItem[] = [
        { icon: Receipt, label: 'Billing & Charges', desc: 'Patient bills, add charges', color: COLORS.success, route: 'Billing' },
        { icon: Wrench, label: 'Equipment', desc: 'Check availability, report issues', color: '#f97316', route: 'Equipment' },
        { icon: Sparkles, label: 'Housekeeping', desc: 'Room cleaning, bed turnover', color: '#06b6d4', route: 'Housekeeping' },
        { icon: UtensilsCrossed, label: 'Dietary', desc: 'Patient meals & diet plans', color: '#ec4899', route: 'Dietary' },
        { icon: Users2, label: 'Visitor Management', desc: 'Passes, hours, restrictions', color: COLORS.info, route: 'Visitors' },
        { icon: DoorOpen, label: 'Ward Pass', desc: 'Temporary patient leave', color: COLORS.warning, route: 'WardPass' },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <BackgroundOrb />
            <View style={styles.header}>
                <Text style={styles.title}>Operations</Text>
                <Text style={styles.subtitle}>Ward facilities & services</Text>
            </View>
            <ScrollView contentContainerStyle={styles.grid}>
                {ops.map((op, i) => (
                    <TouchableOpacity key={i} style={styles.cardWrap} onPress={() => navigation.navigate(op.route)}>
                        <GlassCard style={styles.card}>
                            <View style={[styles.iconCircle, { backgroundColor: op.color + '20' }]}>
                                <op.icon size={24} color={op.color} />
                            </View>
                            <Text style={styles.cardLabel}>{op.label}</Text>
                            <Text style={styles.cardDesc}>{op.desc}</Text>
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
