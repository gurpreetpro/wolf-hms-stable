import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Package, IndianRupee, ChevronRight, CheckCircle, Star } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';
import insuranceService from '../../services/insuranceService';

interface TreatmentPackage { id: string; name: string; category: string; inclusions: string[]; exclusions: string[]; price: number; validity: string; popular: boolean; }

export const TreatmentPackagesScreen = () => {
    const { COLORS } = useTheme();
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const styles = getStyles(COLORS);

    const categories = ['All', 'Surgery', 'Maternity', 'Cardiac', 'Ortho', 'Oncology', 'Wellness'];

    const [packages, setPackages] = useState<TreatmentPackage[]>([]);

    const mockPackages: TreatmentPackage[] = [
        { id: '1', name: 'Normal Delivery Package', category: 'Maternity', price: 45000, validity: '3 days', popular: true,
          inclusions: ['Room (Semi-Private, 3 days)', 'OT + Labour Room', 'Doctor Fees (OB-GYN)', 'Paediatrician', 'Medications & Consumables', 'Lab Tests (CBC, RBS, Urine)', 'Baby Care'],
          exclusions: ['NICU charges', 'Blood transfusion', 'Epidural anaesthesia', 'Private room upgrade'] },
        { id: '2', name: 'LSCS Package', category: 'Maternity', price: 85000, validity: '5 days', popular: true,
          inclusions: ['Room (Semi-Private, 5 days)', 'OT + Anaesthesia', 'Surgeon + Anaesthetist Fees', 'Paediatrician', 'Medications & Consumables', 'Lab + Imaging', 'Baby Care'],
          exclusions: ['NICU charges', 'Blood products', 'ICU if needed', 'Room upgrade'] },
        { id: '3', name: 'Lap Cholecystectomy', category: 'Surgery', price: 110000, validity: '3 days', popular: false,
          inclusions: ['Room (3 days)', 'OT + Anaesthesia', 'Surgeon Fees', 'Medications', 'Lab Tests', 'Consumables'],
          exclusions: ['ICU', 'Blood products', 'Conversion to open surgery', 'Extended stay'] },
        { id: '4', name: 'Total Knee Replacement', category: 'Ortho', price: 280000, validity: '7 days', popular: true,
          inclusions: ['Room (7 days)', 'OT + Anaesthesia', 'Surgeon Fees', 'Implant (Standard)', 'Physiotherapy (7 sessions)', 'Medications', 'Lab + Imaging'],
          exclusions: ['Premium implants', 'ICU', 'Blood products', 'Extended physiotherapy'] },
        { id: '5', name: 'Angioplasty (Single Stent)', category: 'Cardiac', price: 180000, validity: '3 days', popular: false,
          inclusions: ['Room (3 days)', 'Cath Lab', 'Stent (Medicated)', 'Cardiologist Fees', 'Medications', 'Lab Tests', 'ECG/Echo'],
          exclusions: ['Additional stents', 'ICU beyond 1 day', 'CABG conversion'] },
    ];

    useEffect(() => { loadPackages(); }, []);

    const loadPackages = async () => {
        try {
            const data = await insuranceService.getPackages();
            if (data.length > 0) {
                setPackages(data.map((p: any) => ({
                    id: p.id, name: p.name, category: p.category,
                    price: p.price, validity: p.duration_days ? `${p.duration_days} days` : '3 days',
                    popular: p.popular || false,
                    inclusions: p.inclusions || [], exclusions: p.exclusions || [],
                })));
            } else { setPackages(mockPackages); }
        } catch { setPackages(mockPackages); }
    };

    const filtered = selectedCategory === 'All' ? packages : packages.filter(p => p.category === selectedCategory);
    const formatCurrency = (n: number) => '₹' + n.toLocaleString('en-IN');

    return (
        <SafeAreaView style={styles.container}>
            <BackgroundOrb />
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.header}>
                    <Package size={24} color="#8b5cf6" />
                    <Text style={styles.title}>Treatment Packages</Text>
                </View>

                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.catRow}>
                    {categories.map(c => (
                        <TouchableOpacity key={c} style={[styles.catChip, selectedCategory === c && styles.catActive]} onPress={() => setSelectedCategory(c)}>
                            <Text style={[styles.catText, selectedCategory === c && styles.catTextActive]}>{c}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                {filtered.map(pkg => {
                    const expanded = expandedId === pkg.id;
                    return (
                        <TouchableOpacity key={pkg.id} onPress={() => setExpandedId(expanded ? null : pkg.id)}>
                            <GlassCard style={styles.pkgCard}>
                                <View style={styles.pkgHeader}>
                                    <View style={{ flex: 1 }}>
                                        <View style={styles.pkgNameRow}>
                                            <Text style={styles.pkgName}>{pkg.name}</Text>
                                            {pkg.popular && <Star size={14} color="#f59e0b" fill="#f59e0b" />}
                                        </View>
                                        <Text style={styles.pkgMeta}>{pkg.category} · Stay: {pkg.validity}</Text>
                                    </View>
                                    <Text style={styles.pkgPrice}>{formatCurrency(pkg.price)}</Text>
                                </View>
                                {expanded && (
                                    <View style={styles.details}>
                                        <Text style={styles.detailLabel}>INCLUSIONS</Text>
                                        {pkg.inclusions.map((inc, i) => (
                                            <View key={i} style={styles.detailRow}>
                                                <CheckCircle size={12} color={COLORS.success} />
                                                <Text style={styles.detailText}>{inc}</Text>
                                            </View>
                                        ))}
                                        <Text style={[styles.detailLabel, { marginTop: SPACING.m }]}>EXCLUSIONS</Text>
                                        {pkg.exclusions.map((exc, i) => (
                                            <View key={i} style={styles.detailRow}>
                                                <Text style={[styles.detailText, { color: COLORS.error }]}>✕ {exc}</Text>
                                            </View>
                                        ))}
                                        <TouchableOpacity style={styles.applyBtn} onPress={() => Alert.alert('Apply Package', `Apply ${pkg.name} to patient?`)}>
                                            <Text style={styles.applyBtnText}>Apply to Patient</Text>
                                        </TouchableOpacity>
                                    </View>
                                )}
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
    header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: SPACING.l, paddingTop: SPACING.m, gap: SPACING.s },
    title: { fontSize: 24, fontFamily: FONTS.bold, color: COLORS.text },
    catRow: { paddingHorizontal: SPACING.m, paddingVertical: SPACING.m, gap: SPACING.s },
    catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface },
    catActive: { backgroundColor: '#8b5cf6' + '20' },
    catText: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.textMuted },
    catTextActive: { color: '#8b5cf6' },
    pkgCard: { marginHorizontal: SPACING.m, marginBottom: SPACING.m },
    pkgHeader: { flexDirection: 'row', alignItems: 'flex-start' },
    pkgNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    pkgName: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.text },
    pkgMeta: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 2 },
    pkgPrice: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.success },
    details: { marginTop: SPACING.m, borderTopWidth: 1, borderTopColor: COLORS.border, paddingTop: SPACING.m },
    detailLabel: { fontSize: 11, fontFamily: FONTS.bold, color: COLORS.textMuted, letterSpacing: 1, marginBottom: 6 },
    detailRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 3 },
    detailText: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.text },
    applyBtn: { backgroundColor: '#8b5cf6', borderRadius: 12, paddingVertical: 12, alignItems: 'center', marginTop: SPACING.m },
    applyBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 14 },
});
