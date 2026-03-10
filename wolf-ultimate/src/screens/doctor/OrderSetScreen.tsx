import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Layers, Check, Pill, FlaskConical, Scan, Activity, ChevronRight } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';
import apiClient from '../../api/client';

interface OrderSet {
    id: string; name: string; category: string; items_count: number; icon: any; color: string;
    items: { type: string; name: string; details: string }[];
}

export const OrderSetScreen = () => {
    const { COLORS } = useTheme();
    const [selectedSet, setSelectedSet] = useState<OrderSet | null>(null);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const styles = getStyles(COLORS);

    const categories = ['All', 'Medicine', 'Surgery', 'OB-GYN', 'Paediatrics', 'Emergency'];

    const orderSets: OrderSet[] = [
        { id: '1', name: 'Fever Workup', category: 'Medicine', items_count: 8, icon: Activity, color: COLORS.error,
          items: [
            { type: 'Lab', name: 'CBC with ESR', details: 'Stat' },
            { type: 'Lab', name: 'Blood Culture (2 sets)', details: 'Before antibiotics' },
            { type: 'Lab', name: 'CRP / Procalcitonin', details: 'Routine' },
            { type: 'Lab', name: 'Urine R/M + C/S', details: 'Routine' },
            { type: 'Lab', name: 'Dengue NS1 + IgM', details: 'If endemic' },
            { type: 'Radiology', name: 'Chest X-Ray PA', details: 'Routine' },
            { type: 'Rx', name: 'Tab Paracetamol 650mg', details: 'SOS q6h, max 4g/day' },
            { type: 'Rx', name: 'IV NS 1L', details: '100ml/hr if dehydrated' },
          ]},
        { id: '2', name: 'Pre-Op Panel', category: 'Surgery', items_count: 10, icon: Scan, color: COLORS.warning,
          items: [
            { type: 'Lab', name: 'CBC', details: 'Routine' },
            { type: 'Lab', name: 'PT/INR, aPTT', details: 'Stat' },
            { type: 'Lab', name: 'Blood Group + Cross-match', details: '2 units PRBC' },
            { type: 'Lab', name: 'RFT (Urea, Creatinine)', details: 'Routine' },
            { type: 'Lab', name: 'LFT', details: 'Routine' },
            { type: 'Lab', name: 'RBS', details: 'Stat' },
            { type: 'Lab', name: 'Serum Electrolytes', details: 'Routine' },
            { type: 'Radiology', name: 'Chest X-Ray PA', details: 'Within 7 days' },
            { type: 'Radiology', name: 'ECG (12-lead)', details: 'If age >40' },
            { type: 'Rx', name: 'NPO from midnight', details: 'Nursing order' },
          ]},
        { id: '3', name: 'Chest Pain Protocol', category: 'Emergency', items_count: 7, icon: Activity, color: '#ef4444',
          items: [
            { type: 'Lab', name: 'Troponin I (Serial)', details: '0hr, 3hr, 6hr' },
            { type: 'Lab', name: 'ECG (12-lead)', details: 'Stat, repeat q15min if ST change' },
            { type: 'Lab', name: 'CBC, RFT, LFT, Lipid Profile', details: 'Stat' },
            { type: 'Rx', name: 'Tab Aspirin 325mg', details: 'Stat, chew' },
            { type: 'Rx', name: 'Tab Clopidogrel 300mg', details: 'Loading dose' },
            { type: 'Rx', name: 'Inj. Heparin 5000U IV', details: 'Bolus, then infusion' },
            { type: 'Rx', name: 'Tab Atorvastatin 80mg', details: 'Stat' },
          ]},
        { id: '4', name: 'DKA Management', category: 'Medicine', items_count: 6, icon: Pill, color: COLORS.info,
          items: [
            { type: 'Lab', name: 'ABG + Lactate', details: 'Stat, repeat q2h' },
            { type: 'Lab', name: 'RBS (Hourly)', details: 'Bedside glucometer' },
            { type: 'Lab', name: 'Serum Electrolytes', details: 'q4h' },
            { type: 'Rx', name: 'IV NS 1L', details: '1L/hr x 2hr, then 500ml/hr' },
            { type: 'Rx', name: 'Inj. Insulin (Regular)', details: '0.1U/kg/hr infusion' },
            { type: 'Rx', name: 'KCl 20mEq in each liter', details: 'If K+ < 5.5' },
          ]},
        { id: '5', name: 'Normal Delivery', category: 'OB-GYN', items_count: 5, icon: Activity, color: '#ec4899',
          items: [
            { type: 'Lab', name: 'CBC + Blood Group', details: 'If not done' },
            { type: 'Lab', name: 'RBS', details: 'On admission' },
            { type: 'Rx', name: 'IV RL 500ml', details: 'Slow drip' },
            { type: 'Rx', name: 'Inj. Oxytocin 10U IM', details: 'Active management of 3rd stage' },
            { type: 'Rx', name: 'Tab Paracetamol 650mg', details: 'Post-delivery, SOS' },
          ]},
    ];

    const filtered = selectedCategory === 'All' ? orderSets : orderSets.filter(s => s.category === selectedCategory);

    const applyOrderSet = (set: OrderSet) => {
        Alert.alert('Apply Order Set', `Apply "${set.name}" (${set.items_count} items)?`, [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Apply', onPress: async () => {
                Alert.alert('Applied', `${set.name} applied successfully!`);
                try { await apiClient.post('/api/order-sets/apply', { orderSetId: set.id }); } catch {}
            }},
        ]);
    };

    const getTypeColor = (t: string) => t === 'Lab' ? COLORS.info : t === 'Radiology' ? COLORS.warning : COLORS.success;

    return (
        <SafeAreaView style={styles.container}>
            <BackgroundOrb />
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.header}>
                    <Layers size={24} color={COLORS.primary} />
                    <Text style={styles.title}>Order Sets</Text>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
                    {categories.map(c => (
                        <TouchableOpacity key={c} style={[styles.catChip, selectedCategory === c && styles.catChipActive]} onPress={() => setSelectedCategory(c)}>
                            <Text style={[styles.catText, selectedCategory === c && styles.catTextActive]}>{c}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {!selectedSet ? (
                    <View style={styles.setList}>
                        {filtered.map(set => (
                            <TouchableOpacity key={set.id} onPress={() => setSelectedSet(set)}>
                                <GlassCard style={styles.setCard}>
                                    <View style={styles.setRow}>
                                        <View style={[styles.setIcon, { backgroundColor: set.color + '20' }]}>
                                            <set.icon size={22} color={set.color} />
                                        </View>
                                        <View style={{ flex: 1 }}>
                                            <Text style={styles.setName}>{set.name}</Text>
                                            <Text style={styles.setMeta}>{set.category} · {set.items_count} items</Text>
                                        </View>
                                        <ChevronRight size={18} color={COLORS.textMuted} />
                                    </View>
                                </GlassCard>
                            </TouchableOpacity>
                        ))}
                    </View>
                ) : (
                    <View style={styles.detailView}>
                        <TouchableOpacity onPress={() => setSelectedSet(null)}>
                            <Text style={styles.backText}>← Back to sets</Text>
                        </TouchableOpacity>
                        <GlassCard style={styles.detailHeader}>
                            <View style={[styles.setIcon, { backgroundColor: selectedSet.color + '20' }]}>
                                <selectedSet.icon size={24} color={selectedSet.color} />
                            </View>
                            <Text style={styles.detailName}>{selectedSet.name}</Text>
                            <Text style={styles.detailMeta}>{selectedSet.category} · {selectedSet.items_count} items</Text>
                        </GlassCard>

                        {selectedSet.items.map((item, i) => (
                            <GlassCard key={i} style={[styles.itemCard, { borderLeftWidth: 3, borderLeftColor: getTypeColor(item.type) }]}>
                                <View style={styles.itemRow}>
                                    <View style={[styles.typeBadge, { backgroundColor: getTypeColor(item.type) + '20' }]}>
                                        <Text style={[styles.typeText, { color: getTypeColor(item.type) }]}>{item.type}</Text>
                                    </View>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.itemName}>{item.name}</Text>
                                        <Text style={styles.itemDetails}>{item.details}</Text>
                                    </View>
                                </View>
                            </GlassCard>
                        ))}

                        <TouchableOpacity style={styles.applyBtn} onPress={() => applyOrderSet(selectedSet)}>
                            <Check size={18} color="#fff" />
                            <Text style={styles.applyBtnText}>Apply All {selectedSet.items_count} Orders</Text>
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
    catRow: { paddingHorizontal: SPACING.m, paddingVertical: SPACING.m, gap: SPACING.s },
    catChip: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
    catChipActive: { backgroundColor: COLORS.primary + '20', borderColor: COLORS.primary },
    catText: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.textMuted },
    catTextActive: { color: COLORS.primary },
    setList: { paddingHorizontal: SPACING.m },
    setCard: { marginBottom: SPACING.s },
    setRow: { flexDirection: 'row', alignItems: 'center' },
    setIcon: { width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.m },
    setName: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.text },
    setMeta: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 2 },
    detailView: { paddingHorizontal: SPACING.m },
    backText: { fontSize: 14, fontFamily: FONTS.medium, color: COLORS.primary, marginBottom: SPACING.m },
    detailHeader: { alignItems: 'center', paddingVertical: SPACING.l, marginBottom: SPACING.m },
    detailName: { fontSize: 20, fontFamily: FONTS.bold, color: COLORS.text, marginTop: SPACING.s },
    detailMeta: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 4 },
    itemCard: { marginBottom: SPACING.s },
    itemRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.m },
    typeBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    typeText: { fontSize: 10, fontFamily: FONTS.bold },
    itemName: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.text },
    itemDetails: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 2 },
    applyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.success, borderRadius: 14, paddingVertical: 14, marginTop: SPACING.m, gap: 8 },
    applyBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 16 },
});
