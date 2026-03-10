import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Pill, Heart, Droplets, Syringe, ClipboardList } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';

interface TaskCategory { icon: any; label: string; desc: string; count: number; color: string; route: string; }

export const NurseTaskHubScreen = ({ navigation }: any) => {
    const { COLORS } = useTheme();
    const styles = getStyles(COLORS);

    const tasks: TaskCategory[] = [
        { icon: Pill, label: 'Medications', desc: 'Due & overdue meds', count: 12, color: COLORS.warning, route: 'Medications' },
        { icon: Heart, label: 'Vitals', desc: 'Scheduled recordings', count: 8, color: COLORS.error, route: 'Vitals', },
        { icon: Droplets, label: 'IO Chart', desc: 'Intake/Output logging', count: 5, color: COLORS.info, route: 'IOChart' },
        { icon: Syringe, label: 'IV Management', desc: 'Infusions & drips', count: 3, color: '#8b5cf6', route: 'IVManagement' },
        { icon: ClipboardList, label: 'Care Plans', desc: 'Active nursing plans', count: 6, color: COLORS.success, route: 'CarePlan' },
    ];

    const totalDue = tasks.reduce((s, t) => s + t.count, 0);

    return (
        <SafeAreaView style={styles.container}>
            <BackgroundOrb />
            <View style={styles.header}>
                <Text style={styles.title}>Tasks</Text>
                <Text style={styles.subtitle}>{totalDue} pending tasks this shift</Text>
            </View>
            <ScrollView contentContainerStyle={styles.list}>
                {tasks.map((task, i) => (
                    <TouchableOpacity key={i} onPress={() => navigation.navigate(task.route)}>
                        <GlassCard style={styles.card}>
                            <View style={[styles.iconCircle, { backgroundColor: task.color + '20' }]}>
                                <task.icon size={22} color={task.color} />
                            </View>
                            <View style={styles.cardText}>
                                <Text style={styles.cardLabel}>{task.label}</Text>
                                <Text style={styles.cardDesc}>{task.desc}</Text>
                            </View>
                            <View style={[styles.countBadge, { backgroundColor: task.count > 0 ? task.color + '20' : COLORS.surface }]}>
                                <Text style={[styles.countText, { color: task.count > 0 ? task.color : COLORS.textMuted }]}>{task.count}</Text>
                            </View>
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
    list: { paddingHorizontal: SPACING.m, paddingBottom: 100 },
    card: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.s },
    iconCircle: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.m },
    cardText: { flex: 1 },
    cardLabel: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.text },
    cardDesc: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 2 },
    countBadge: { minWidth: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    countText: { fontSize: 16, fontFamily: FONTS.bold },
});
