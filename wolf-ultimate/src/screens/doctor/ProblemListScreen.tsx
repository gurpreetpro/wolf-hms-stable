import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ClipboardList, Plus, CheckCircle, Clock, AlertTriangle, X } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';

interface Problem { id: string; name: string; icd_code: string; onset_date: string; status: 'active' | 'resolved' | 'chronic'; severity: 'mild' | 'moderate' | 'severe'; notes?: string; }

export const ProblemListScreen = () => {
    const { COLORS } = useTheme();
    const [problems, setProblems] = useState<Problem[]>([
        { id: '1', name: 'Type 2 Diabetes Mellitus', icd_code: 'E11.9', onset_date: '2020-03-15', status: 'chronic', severity: 'moderate', notes: 'On Metformin 1g BD. HbA1c 7.2% (Dec 2025)' },
        { id: '2', name: 'Essential Hypertension', icd_code: 'I10', onset_date: '2019-08-20', status: 'chronic', severity: 'moderate', notes: 'On Telmisartan 40mg OD. BP well controlled.' },
        { id: '3', name: 'Community Acquired Pneumonia', icd_code: 'J18.9', onset_date: '2026-02-28', status: 'active', severity: 'moderate', notes: 'Currently on IV antibiotics. Improving.' },
        { id: '4', name: 'Allergic Rhinitis', icd_code: 'J30.4', onset_date: '2022-01-10', status: 'active', severity: 'mild', notes: 'Seasonal. Using nasal steroid spray.' },
        { id: '5', name: 'Appendicitis (Post-Op)', icd_code: 'K35.80', onset_date: '2024-06-15', status: 'resolved', severity: 'severe', notes: 'Laparoscopic appendectomy done. Uneventful recovery.' },
    ]);
    const [filter, setFilter] = useState<'all' | 'active' | 'chronic' | 'resolved'>('all');
    const styles = getStyles(COLORS);

    const filtered = filter === 'all' ? problems : problems.filter(p => p.status === filter);

    const getStatusConfig = (s: string) => {
        switch (s) {
            case 'active': return { color: COLORS.warning, icon: Clock, label: 'Active' };
            case 'chronic': return { color: COLORS.info, icon: AlertTriangle, label: 'Chronic' };
            case 'resolved': return { color: COLORS.success, icon: CheckCircle, label: 'Resolved' };
            default: return { color: COLORS.textMuted, icon: Clock, label: s };
        }
    };

    const getSeverityColor = (s: string) => s === 'severe' ? COLORS.error : s === 'moderate' ? COLORS.warning : COLORS.success;

    const toggleStatus = (id: string) => {
        setProblems(prev => prev.map(p => {
            if (p.id !== id) return p;
            const next = p.status === 'active' ? 'resolved' : p.status === 'resolved' ? 'active' : p.status;
            return { ...p, status: next as any };
        }));
    };

    return (
        <SafeAreaView style={styles.container}>
            <BackgroundOrb />
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>Problem List</Text>
                        <Text style={styles.subtitle}>{problems.filter(p => p.status === 'active').length} active · {problems.filter(p => p.status === 'chronic').length} chronic</Text>
                    </View>
                    <TouchableOpacity style={styles.addBtn} onPress={() => Alert.alert('Add Problem', 'Search ICD-10 to add new problem')}>
                        <Plus size={20} color="#fff" />
                    </TouchableOpacity>
                </View>

                <View style={styles.filterRow}>
                    {(['all', 'active', 'chronic', 'resolved'] as const).map(f => (
                        <TouchableOpacity key={f} style={[styles.filterChip, filter === f && styles.filterActive]} onPress={() => setFilter(f)}>
                            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f.charAt(0).toUpperCase() + f.slice(1)}</Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {filtered.map(problem => {
                    const cfg = getStatusConfig(problem.status);
                    return (
                        <TouchableOpacity key={problem.id} onLongPress={() => toggleStatus(problem.id)}>
                            <GlassCard style={[styles.problemCard, { borderLeftWidth: 3, borderLeftColor: cfg.color }]}>
                                <View style={styles.problemHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={[styles.problemName, problem.status === 'resolved' && { textDecorationLine: 'line-through', opacity: 0.6 }]}>{problem.name}</Text>
                                        <View style={styles.codeRow}>
                                            <View style={styles.icdBadge}>
                                                <Text style={styles.icdText}>{problem.icd_code}</Text>
                                            </View>
                                            <Text style={styles.onsetText}>Since {problem.onset_date}</Text>
                                        </View>
                                    </View>
                                    <View style={styles.statusCol}>
                                        <View style={[styles.statusBadge, { backgroundColor: cfg.color + '20' }]}>
                                            <cfg.icon size={12} color={cfg.color} />
                                            <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                                        </View>
                                        <View style={[styles.severityDot, { backgroundColor: getSeverityColor(problem.severity) }]} />
                                    </View>
                                </View>
                                {problem.notes && <Text style={styles.notes}>{problem.notes}</Text>}
                            </GlassCard>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </SafeAreaView>
    );
};

const getStyles = (COLORS: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: SPACING.l, paddingTop: SPACING.m },
    title: { fontSize: 28, fontFamily: FONTS.bold, color: COLORS.text },
    subtitle: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.textSecondary, marginTop: 2 },
    addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
    filterRow: { flexDirection: 'row', paddingHorizontal: SPACING.m, marginTop: SPACING.m, gap: SPACING.s },
    filterChip: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, backgroundColor: COLORS.surface },
    filterActive: { backgroundColor: COLORS.primary + '20' },
    filterText: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.textMuted },
    filterTextActive: { color: COLORS.primary },
    problemCard: { marginHorizontal: SPACING.m, marginTop: SPACING.m },
    problemHeader: { flexDirection: 'row', justifyContent: 'space-between' },
    problemName: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.text },
    codeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
    icdBadge: { backgroundColor: COLORS.info + '20', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
    icdText: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.info },
    onsetText: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textMuted },
    statusCol: { alignItems: 'flex-end', gap: 6 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, gap: 4 },
    statusText: { fontSize: 11, fontFamily: FONTS.bold },
    severityDot: { width: 8, height: 8, borderRadius: 4 },
    notes: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: SPACING.s, lineHeight: 18, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.s },
});
