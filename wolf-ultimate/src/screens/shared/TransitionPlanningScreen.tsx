import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowRightLeft, CheckCircle, Circle, Clock, Home, Building } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';
import supportService from '../../services/supportService';

interface TransitionPlan { id: string; patient_name: string; bed: string; diagnosis: string; destination: 'home' | 'rehab' | 'nursing_home' | 'hospice' | 'transfer'; planned_date: string; status: 'planning' | 'ready' | 'completed'; checklist: { item: string; done: boolean }[]; }

export const TransitionPlanningScreen = () => {
    const { COLORS } = useTheme();
    const styles = getStyles(COLORS);

    const mockPlans: TransitionPlan[] = [
        { id: '1', patient_name: 'Rajesh Kumar', bed: 'W1-5', diagnosis: 'Post Lap. Cholecystectomy', destination: 'home', planned_date: '2026-03-03', status: 'ready',
          checklist: [
            { item: 'Discharge summary prepared', done: true },
            { item: 'Medications dispensed', done: true },
            { item: 'Follow-up appointment booked', done: true },
            { item: 'Diet instructions given', done: true },
            { item: 'Wound care education', done: false },
            { item: 'Emergency contact shared', done: true },
          ]},
        { id: '2', patient_name: 'Sunita Devi', bed: 'W2-3', diagnosis: 'Post TKR (Right)', destination: 'rehab', planned_date: '2026-03-05', status: 'planning',
          checklist: [
            { item: 'Discharge summary prepared', done: false },
            { item: 'Rehab facility confirmed', done: true },
            { item: 'Transport arranged', done: false },
            { item: 'Medical records shared', done: false },
            { item: 'Physiotherapy plan documented', done: true },
            { item: 'Insurance approval for rehab', done: false },
          ]},
        { id: '3', patient_name: 'Meena Gupta', bed: 'ICU-3 \u2192 W1', diagnosis: 'Pneumonia (resolved)', destination: 'home', planned_date: '2026-03-04', status: 'planning',
          checklist: [
            { item: 'Discharge summary prepared', done: false },
            { item: 'Medications dispensed', done: false },
            { item: 'Follow-up appointment booked', done: true },
            { item: 'Oxygen support assessment', done: true },
            { item: 'Home care instructions', done: false },
          ]},
    ];
    const [plans, setPlans] = useState<TransitionPlan[]>(mockPlans);

    useEffect(() => { loadPlans(); }, []);

    const loadPlans = async () => {
        try {
            const data = await supportService.getTransitionPlans();
            if (data.length > 0) {
                setPlans(data.map((t: any) => ({
                    id: t.id, patient_name: t.patient_name, bed: '',
                    diagnosis: '', destination: t.destination,
                    planned_date: t.target_date || '', status: t.status,
                    checklist: (t.checklist || []).map((c: any) => ({ item: c.label, done: c.completed })),
                })));
            }
        } catch { /* keep mock data */ }
    };

    const toggleChecklist = (planId: string, itemIdx: number) => {
        setPlans(prev => prev.map(p => p.id === planId ? { ...p, checklist: p.checklist.map((c, i) => i === itemIdx ? { ...c, done: !c.done } : c) } : p));
    };

    const getDestConfig = (d: string) => {
        switch (d) { case 'home': return { icon: Home, color: COLORS.success, label: 'Home' }; case 'rehab': return { icon: Building, color: COLORS.info, label: 'Rehab Facility' }; case 'nursing_home': return { icon: Building, color: '#8b5cf6', label: 'Nursing Home' }; case 'hospice': return { icon: Building, color: COLORS.warning, label: 'Hospice' }; case 'transfer': return { icon: ArrowRightLeft, color: COLORS.error, label: 'Hospital Transfer' }; default: return { icon: Home, color: COLORS.textMuted, label: d }; }
    };

    return (
        <SafeAreaView style={styles.container}>
            <BackgroundOrb />
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.header}>
                    <ArrowRightLeft size={24} color={COLORS.primary} />
                    <Text style={styles.title}>Transition Planning</Text>
                </View>

                {plans.map(plan => {
                    const dest = getDestConfig(plan.destination);
                    const doneCount = plan.checklist.filter(c => c.done).length;
                    const totalCount = plan.checklist.length;
                    const progress = (doneCount / totalCount) * 100;

                    return (
                        <GlassCard key={plan.id} style={[styles.planCard, plan.status === 'ready' && { borderWidth: 1, borderColor: COLORS.success + '40' }]}>
                            <View style={styles.planHeader}>
                                <View style={{ flex: 1 }}>
                                    <Text style={styles.planPatient}>{plan.patient_name}</Text>
                                    <Text style={styles.planDiag}>{plan.diagnosis}</Text>
                                    <Text style={styles.planBed}>Bed: {plan.bed}</Text>
                                </View>
                                <View style={styles.planRight}>
                                    <View style={[styles.destBadge, { backgroundColor: dest.color + '20' }]}>
                                        <dest.icon size={12} color={dest.color} />
                                        <Text style={[styles.destText, { color: dest.color }]}>{dest.label}</Text>
                                    </View>
                                    <Text style={styles.planDate}>{plan.planned_date}</Text>
                                </View>
                            </View>

                            <View style={styles.progressWrap}>
                                <View style={styles.progressBar}>
                                    <View style={[styles.progressFill, { width: `${progress}%`, backgroundColor: progress === 100 ? COLORS.success : COLORS.primary }]} />
                                </View>
                                <Text style={styles.progressText}>{doneCount}/{totalCount}</Text>
                            </View>

                            {plan.checklist.map((item, idx) => (
                                <TouchableOpacity key={idx} style={styles.checkRow} onPress={() => toggleChecklist(plan.id, idx)}>
                                    {item.done ? <CheckCircle size={18} color={COLORS.success} /> : <Circle size={18} color={COLORS.textMuted} />}
                                    <Text style={[styles.checkText, item.done && styles.checkDone]}>{item.item}</Text>
                                </TouchableOpacity>
                            ))}

                            {progress === 100 && (
                                <TouchableOpacity style={styles.dischargeBtn} onPress={() => Alert.alert('Ready', `${plan.patient_name} ready for discharge to ${dest.label}`)}>
                                    <CheckCircle size={16} color="#fff" />
                                    <Text style={styles.dischargeBtnText}>Ready for Discharge</Text>
                                </TouchableOpacity>
                            )}
                        </GlassCard>
                    );
                })}
            </ScrollView>
        </SafeAreaView>
    );
};

const getStyles = (COLORS: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.l, paddingTop: SPACING.m, gap: SPACING.s },
    title: { fontSize: 24, fontFamily: FONTS.bold, color: COLORS.text },
    planCard: { marginHorizontal: SPACING.m, marginTop: SPACING.m },
    planHeader: { flexDirection: 'row' },
    planPatient: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.text },
    planDiag: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 2 },
    planBed: { fontSize: 12, fontFamily: FONTS.medium, color: COLORS.textMuted, marginTop: 2 },
    planRight: { alignItems: 'flex-end' },
    destBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, gap: 4 },
    destText: { fontSize: 11, fontFamily: FONTS.bold },
    planDate: { fontSize: 12, fontFamily: FONTS.medium, color: COLORS.textMuted, marginTop: 4 },
    progressWrap: { flexDirection: 'row', alignItems: 'center', marginTop: SPACING.m, gap: SPACING.s },
    progressBar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: COLORS.surface },
    progressFill: { height: 6, borderRadius: 3 },
    progressText: { fontSize: 12, fontFamily: FONTS.bold, color: COLORS.textMuted },
    checkRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.s, paddingVertical: 6 },
    checkText: { fontSize: 14, fontFamily: FONTS.regular, color: COLORS.text, flex: 1 },
    checkDone: { textDecorationLine: 'line-through', color: COLORS.textMuted },
    dischargeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.success, borderRadius: 12, paddingVertical: 12, marginTop: SPACING.m, gap: 6 },
    dischargeBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 14 },
});
