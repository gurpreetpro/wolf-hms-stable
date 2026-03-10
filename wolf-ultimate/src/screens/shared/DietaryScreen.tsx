import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { UtensilsCrossed, AlertTriangle, Clock, Check, Ban } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';

interface DietOrder { id: string; patient_name: string; bed: string; diet_type: string; meal: string; allergies?: string; npo: boolean; special_instructions?: string; status: 'ordered' | 'preparing' | 'delivered'; }

export const DietaryScreen = () => {
    const { COLORS } = useTheme();
    const [patientName, setPatientName] = useState('');
    const [selectedDiet, setSelectedDiet] = useState('');
    const [selectedMeal, setSelectedMeal] = useState('');
    const [instructions, setInstructions] = useState('');
    const [isNPO, setIsNPO] = useState(false);
    const styles = getStyles(COLORS);

    const dietTypes = ['Normal', 'Soft', 'Liquid', 'Semi-Solid', 'Diabetic', 'Low Salt', 'Renal', 'Cardiac', 'High Protein', 'Paediatric', 'Post-Op'];
    const meals = ['Breakfast', 'Lunch', 'Evening Snack', 'Dinner', 'Special'];

    const orders: DietOrder[] = [
        { id: '1', patient_name: 'Meena Gupta', bed: 'ICU-3', diet_type: 'Liquid', meal: 'Lunch', npo: false, status: 'preparing', allergies: 'Nuts' },
        { id: '2', patient_name: 'Ravi Verma', bed: 'W2-12', diet_type: 'Soft', meal: 'Lunch', npo: false, status: 'ordered', special_instructions: 'No spicy food' },
        { id: '3', patient_name: 'Baby Arjun', bed: 'P-1', diet_type: 'Paediatric', meal: 'Lunch', npo: false, status: 'delivered' },
        { id: '4', patient_name: 'Gopal Das', bed: 'W1-5', diet_type: '', meal: '', npo: true, status: 'ordered' },
    ];

    const getStatusConfig = (s: string) => {
        switch (s) { case 'ordered': return { color: COLORS.warning, label: 'Ordered' }; case 'preparing': return { color: COLORS.info, label: 'Preparing' }; case 'delivered': return { color: COLORS.success, label: 'Delivered' }; default: return { color: COLORS.textMuted, label: s }; }
    };

    const placeOrder = () => {
        if (!patientName || (!selectedDiet && !isNPO)) { Alert.alert('Required', 'Patient and diet type required'); return; }
        Alert.alert('Order Placed', isNPO ? `NPO order for ${patientName}` : `${selectedDiet} ${selectedMeal} for ${patientName}`);
    };

    return (
        <SafeAreaView style={styles.container}>
            <BackgroundOrb />
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.header}>
                    <UtensilsCrossed size={24} color="#f97316" />
                    <Text style={styles.title}>Dietary Orders</Text>
                </View>

                {/* Active Orders */}
                <Text style={styles.sectionLabel}>ACTIVE ORDERS</Text>
                {orders.map(order => {
                    const cfg = getStatusConfig(order.status);
                    return (
                        <GlassCard key={order.id} style={[styles.orderCard, order.npo && { borderLeftWidth: 3, borderLeftColor: COLORS.error }]}>
                            <View style={styles.orderHeader}>
                                <View>
                                    <Text style={styles.orderPatient}>{order.patient_name}</Text>
                                    <Text style={styles.orderBed}>Bed: {order.bed}</Text>
                                </View>
                                {order.npo ? (
                                    <View style={[styles.npoBadge, { backgroundColor: COLORS.error + '20' }]}>
                                        <Ban size={12} color={COLORS.error} />
                                        <Text style={[styles.npoText, { color: COLORS.error }]}>NPO</Text>
                                    </View>
                                ) : (
                                    <View style={[styles.statusBadge, { backgroundColor: cfg.color + '20' }]}>
                                        <Text style={[styles.statusText, { color: cfg.color }]}>{cfg.label}</Text>
                                    </View>
                                )}
                            </View>
                            {!order.npo && <Text style={styles.orderMeta}>{order.diet_type} · {order.meal}</Text>}
                            {order.allergies && <Text style={[styles.allergyText, { color: COLORS.error }]}>⚠ Allergy: {order.allergies}</Text>}
                            {order.special_instructions && <Text style={styles.instructionText}>Note: {order.special_instructions}</Text>}
                        </GlassCard>
                    );
                })}

                {/* New Order Form */}
                <Text style={styles.sectionLabel}>NEW ORDER</Text>
                <View style={{ paddingHorizontal: SPACING.m }}>
                    <TextInput style={styles.input} placeholder="Patient name..." placeholderTextColor={COLORS.textMuted} value={patientName} onChangeText={setPatientName} />

                    <TouchableOpacity style={[styles.npoToggle, isNPO && { backgroundColor: COLORS.error + '20', borderColor: COLORS.error }]} onPress={() => setIsNPO(!isNPO)}>
                        <Ban size={16} color={isNPO ? COLORS.error : COLORS.textMuted} />
                        <Text style={[styles.npoToggleText, isNPO && { color: COLORS.error }]}>Mark NPO (Nil Per Os)</Text>
                    </TouchableOpacity>

                    {!isNPO && (
                        <>
                            <Text style={styles.fieldLabel}>DIET TYPE</Text>
                            <View style={styles.chipRow}>
                                {dietTypes.map(d => (
                                    <TouchableOpacity key={d} style={[styles.chip, selectedDiet === d && styles.chipActive]} onPress={() => setSelectedDiet(d)}>
                                        <Text style={[styles.chipText, selectedDiet === d && styles.chipTextActive]}>{d}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <Text style={styles.fieldLabel}>MEAL</Text>
                            <View style={styles.chipRow}>
                                {meals.map(m => (
                                    <TouchableOpacity key={m} style={[styles.chip, selectedMeal === m && styles.chipActive]} onPress={() => setSelectedMeal(m)}>
                                        <Text style={[styles.chipText, selectedMeal === m && styles.chipTextActive]}>{m}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>

                            <TextInput style={[styles.input, { marginTop: SPACING.m }]} placeholder="Special instructions..." placeholderTextColor={COLORS.textMuted} value={instructions} onChangeText={setInstructions} />
                        </>
                    )}

                    <TouchableOpacity style={[styles.orderBtn, { backgroundColor: isNPO ? COLORS.error : '#f97316' }]} onPress={placeOrder}>
                        {isNPO ? <Ban size={18} color="#fff" /> : <UtensilsCrossed size={18} color="#fff" />}
                        <Text style={styles.orderBtnText}>{isNPO ? 'Set NPO Status' : 'Place Diet Order'}</Text>
                    </TouchableOpacity>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const getStyles = (COLORS: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.l, paddingTop: SPACING.m, gap: SPACING.s },
    title: { fontSize: 24, fontFamily: FONTS.bold, color: COLORS.text },
    sectionLabel: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.textMuted, letterSpacing: 1, marginTop: SPACING.l, marginBottom: SPACING.s, marginHorizontal: SPACING.l },
    orderCard: { marginHorizontal: SPACING.m, marginBottom: SPACING.s },
    orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    orderPatient: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.text },
    orderBed: { fontSize: 12, fontFamily: FONTS.medium, color: COLORS.textSecondary, marginTop: 2 },
    orderMeta: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.textSecondary, marginTop: 6 },
    statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
    statusText: { fontSize: 11, fontFamily: FONTS.bold },
    npoBadge: { flexDirection: 'row', alignItems: 'center', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3, gap: 4 },
    npoText: { fontSize: 11, fontFamily: FONTS.bold },
    allergyText: { fontSize: 12, fontFamily: FONTS.bold, marginTop: 4 },
    instructionText: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 2, fontStyle: 'italic' },
    input: { backgroundColor: COLORS.surface, borderRadius: 12, padding: SPACING.m, color: COLORS.text, fontFamily: FONTS.regular, fontSize: 14, borderWidth: 1, borderColor: COLORS.border },
    npoToggle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: SPACING.m, padding: SPACING.m, borderRadius: 12, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
    npoToggleText: { fontSize: 14, fontFamily: FONTS.medium, color: COLORS.textMuted },
    fieldLabel: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.textMuted, letterSpacing: 1, marginTop: SPACING.m, marginBottom: 6 },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.s },
    chip: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
    chipActive: { backgroundColor: '#f97316' + '20', borderColor: '#f97316' },
    chipText: { fontSize: 12, fontFamily: FONTS.medium, color: COLORS.textMuted },
    chipTextActive: { color: '#f97316' },
    orderBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderRadius: 14, paddingVertical: 14, marginTop: SPACING.l, gap: 8 },
    orderBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 16 },
});
