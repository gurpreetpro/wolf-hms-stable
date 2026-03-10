import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BarChart3, Users, IndianRupee, Star, TrendingUp, Clock, Calendar, Activity } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';

const WIDTH = Dimensions.get('window').width;

interface StatCard { icon: any; label: string; value: string; change: string; color: string; positive: boolean; }

export const AnalyticsScreen = () => {
    const { COLORS } = useTheme();
    const [period, setPeriod] = useState<'today' | 'week' | 'month'>('week');
    const styles = getStyles(COLORS);

    const stats: StatCard[] = [
        { icon: Users, label: 'Patients Seen', value: period === 'today' ? '18' : period === 'week' ? '124' : '487', change: '+12%', color: COLORS.primary, positive: true },
        { icon: IndianRupee, label: 'Revenue', value: period === 'today' ? '₹45K' : period === 'week' ? '₹3.2L' : '₹12.8L', change: '+8%', color: COLORS.success, positive: true },
        { icon: Star, label: 'Rating', value: '4.8', change: '+0.2', color: '#f59e0b', positive: true },
        { icon: Clock, label: 'Avg Wait Time', value: period === 'today' ? '12min' : period === 'week' ? '15min' : '14min', change: '-3min', color: COLORS.info, positive: true },
    ];

    const weeklyData = [
        { day: 'Mon', opd: 22, ipd: 5 },
        { day: 'Tue', opd: 28, ipd: 4 },
        { day: 'Wed', opd: 18, ipd: 6 },
        { day: 'Thu', opd: 25, ipd: 3 },
        { day: 'Fri', opd: 30, ipd: 7 },
        { day: 'Sat', opd: 15, ipd: 2 },
        { day: 'Sun', opd: 8, ipd: 1 },
    ];
    const maxPatients = Math.max(...weeklyData.map(d => d.opd + d.ipd));

    const topProcedures = [
        { name: 'OPD Consultation', count: 320, revenue: '₹4.8L' },
        { name: 'Lap. Cholecystectomy', count: 12, revenue: '₹3.6L' },
        { name: 'Appendectomy', count: 8, revenue: '₹1.6L' },
        { name: 'Hernia Repair', count: 6, revenue: '₹1.2L' },
        { name: 'Follow-up Visit', count: 145, revenue: '₹1.1L' },
    ];

    const recentReviews = [
        { patient: 'Rajesh K.', rating: 5, comment: 'Very thorough examination. Explained everything clearly.' },
        { patient: 'Priya S.', rating: 5, comment: 'Best doctor! Very caring and attentive.' },
        { patient: 'Amit P.', rating: 4, comment: 'Good treatment but long waiting time.' },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <BackgroundOrb />
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.header}>
                    <BarChart3 size={24} color={COLORS.primary} />
                    <Text style={styles.title}>My Analytics</Text>
                </View>

                <View style={styles.periodRow}>
                    {(['today', 'week', 'month'] as const).map(p => (
                        <TouchableOpacity key={p} style={[styles.periodBtn, period === p && styles.periodActive]} onPress={() => setPeriod(p)}>
                            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>{p.charAt(0).toUpperCase() + p.slice(1)}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Stat Cards */}
                <View style={styles.statsGrid}>
                    {stats.map((stat, i) => (
                        <GlassCard key={i} style={styles.statCard}>
                            <View style={[styles.statIcon, { backgroundColor: stat.color + '15' }]}>
                                <stat.icon size={18} color={stat.color} />
                            </View>
                            <Text style={styles.statValue}>{stat.value}</Text>
                            <Text style={styles.statLabel}>{stat.label}</Text>
                            <Text style={[styles.statChange, { color: stat.positive ? COLORS.success : COLORS.error }]}>
                                {stat.positive ? '↑' : '↓'} {stat.change}
                            </Text>
                        </GlassCard>
                    ))}
                </View>

                {/* Weekly Chart */}
                <Text style={styles.sectionTitle}>WEEKLY PATIENT FLOW</Text>
                <GlassCard style={styles.chartCard}>
                    <View style={styles.chartRow}>
                        {weeklyData.map((d, i) => (
                            <View key={i} style={styles.barCol}>
                                <View style={styles.barContainer}>
                                    <View style={[styles.bar, styles.barIPD, { height: (d.ipd / maxPatients) * 100 }]} />
                                    <View style={[styles.bar, styles.barOPD, { height: (d.opd / maxPatients) * 100 }]} />
                                </View>
                                <Text style={styles.barLabel}>{d.day}</Text>
                                <Text style={styles.barValue}>{d.opd + d.ipd}</Text>
                            </View>
                        ))}
                    </View>
                    <View style={styles.legend}>
                        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: COLORS.primary }]} /><Text style={styles.legendText}>OPD</Text></View>
                        <View style={styles.legendItem}><View style={[styles.legendDot, { backgroundColor: COLORS.secondary }]} /><Text style={styles.legendText}>IPD</Text></View>
                    </View>
                </GlassCard>

                {/* Top Procedures */}
                <Text style={styles.sectionTitle}>TOP PROCEDURES</Text>
                {topProcedures.map((proc, i) => (
                    <GlassCard key={i} style={styles.procRow}>
                        <Text style={styles.procRank}>#{i + 1}</Text>
                        <View style={{ flex: 1 }}>
                            <Text style={styles.procName}>{proc.name}</Text>
                            <Text style={styles.procCount}>{proc.count} cases</Text>
                        </View>
                        <Text style={styles.procRevenue}>{proc.revenue}</Text>
                    </GlassCard>
                ))}

                {/* Reviews */}
                <Text style={styles.sectionTitle}>RECENT REVIEWS</Text>
                {recentReviews.map((r, i) => (
                    <GlassCard key={i} style={styles.reviewCard}>
                        <View style={styles.reviewHeader}>
                            <Text style={styles.reviewPatient}>{r.patient}</Text>
                            <View style={styles.starsRow}>
                                {Array.from({ length: 5 }).map((_, si) => (
                                    <Star key={si} size={14} color={si < r.rating ? '#f59e0b' : COLORS.textMuted} fill={si < r.rating ? '#f59e0b' : 'transparent'} />
                                ))}
                            </View>
                        </View>
                        <Text style={styles.reviewComment}>"{r.comment}"</Text>
                    </GlassCard>
                ))}
            </ScrollView>
        </SafeAreaView>
    );
};

const getStyles = (COLORS: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.l, paddingTop: SPACING.m, gap: SPACING.s },
    title: { fontSize: 24, fontFamily: FONTS.bold, color: COLORS.text },
    periodRow: { flexDirection: 'row', paddingHorizontal: SPACING.m, marginTop: SPACING.m, gap: SPACING.s },
    periodBtn: { paddingHorizontal: 20, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface },
    periodActive: { backgroundColor: COLORS.primary + '20' },
    periodText: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.textMuted },
    periodTextActive: { color: COLORS.primary },
    statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: SPACING.m, marginTop: SPACING.m, gap: SPACING.s },
    statCard: { width: '48%', alignItems: 'center', paddingVertical: SPACING.m },
    statIcon: { width: 36, height: 36, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    statValue: { fontSize: 22, fontFamily: FONTS.bold, color: COLORS.text, marginTop: 6 },
    statLabel: { fontSize: 12, fontFamily: FONTS.medium, color: COLORS.textSecondary, marginTop: 2 },
    statChange: { fontSize: 12, fontFamily: FONTS.bold, marginTop: 4 },
    sectionTitle: { fontSize: 12, fontFamily: FONTS.bold, color: COLORS.textMuted, letterSpacing: 1, marginTop: SPACING.l, marginBottom: SPACING.s, marginHorizontal: SPACING.l },
    chartCard: { marginHorizontal: SPACING.m },
    chartRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'flex-end', height: 130 },
    barCol: { alignItems: 'center', flex: 1 },
    barContainer: { width: 20, alignItems: 'center', justifyContent: 'flex-end', height: 100 },
    bar: { width: 16, borderRadius: 4, marginBottom: 2 },
    barOPD: { backgroundColor: COLORS.primary },
    barIPD: { backgroundColor: COLORS.secondary },
    barLabel: { fontSize: 11, fontFamily: FONTS.medium, color: COLORS.textMuted, marginTop: 4 },
    barValue: { fontSize: 10, fontFamily: FONTS.bold, color: COLORS.textSecondary },
    legend: { flexDirection: 'row', justifyContent: 'center', marginTop: SPACING.m, gap: SPACING.l },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: { fontSize: 12, fontFamily: FONTS.medium, color: COLORS.textSecondary },
    procRow: { flexDirection: 'row', alignItems: 'center', marginHorizontal: SPACING.m, marginBottom: SPACING.s },
    procRank: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.textMuted, width: 30 },
    procName: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.text },
    procCount: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 1 },
    procRevenue: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.success },
    reviewCard: { marginHorizontal: SPACING.m, marginBottom: SPACING.s },
    reviewHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    reviewPatient: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.text },
    starsRow: { flexDirection: 'row', gap: 2 },
    reviewComment: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 6, fontStyle: 'italic' },
});
