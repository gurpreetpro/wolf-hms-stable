import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Scan, Search, Clock, CheckCircle, AlertTriangle, ChevronRight, Image, FileText } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';
import apiClient from '../../api/client';

type OrderStatus = 'pending' | 'scheduled' | 'completed' | 'reported';
interface RadiologyOrder {
    id: string; patient_name: string; modality: string; body_part: string;
    clinical_indication: string; status: OrderStatus; ordered_date: string;
    priority: 'routine' | 'urgent' | 'stat'; report_available: boolean;
}

export const RadiologyOrderScreen = ({ navigation }: any) => {
    const { COLORS } = useTheme();
    const [tab, setTab] = useState<'order' | 'results'>('order');
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedModality, setSelectedModality] = useState('');
    const [bodyPart, setBodyPart] = useState('');
    const [indication, setIndication] = useState('');
    const [priority, setPriority] = useState<'routine' | 'urgent' | 'stat'>('routine');
    const styles = getStyles(COLORS);

    const modalities = ['X-Ray', 'CT Scan', 'MRI', 'Ultrasound', 'Mammography', 'Fluoroscopy', 'PET-CT'];
    const bodyParts: Record<string, string[]> = {
        'X-Ray': ['Chest PA', 'Chest AP', 'Abdomen', 'Spine (Cervical)', 'Spine (LS)', 'Pelvis', 'Knee', 'Hand', 'Foot', 'Skull'],
        'CT Scan': ['Brain', 'Chest (HRCT)', 'Abdomen', 'Spine', 'Angiography', 'KUB'],
        'MRI': ['Brain', 'Spine (Cervical)', 'Spine (Lumbar)', 'Knee', 'Shoulder', 'Abdomen', 'Pelvis'],
        'Ultrasound': ['Abdomen', 'Pelvis', 'Thyroid', 'Breast', 'Musculoskeletal', 'Obstetric'],
    };

    const recentOrders: RadiologyOrder[] = [
        { id: '1', patient_name: 'Rajesh Kumar', modality: 'X-Ray', body_part: 'Chest PA', clinical_indication: 'R/O Pneumonia', status: 'reported', ordered_date: '2026-03-01', priority: 'routine', report_available: true },
        { id: '2', patient_name: 'Priya Sharma', modality: 'CT Scan', body_part: 'Brain', clinical_indication: 'Headache, papilledema', status: 'completed', ordered_date: '2026-03-02', priority: 'urgent', report_available: false },
        { id: '3', patient_name: 'Amit Patel', modality: 'MRI', body_part: 'Spine (Lumbar)', clinical_indication: 'Low back pain', status: 'scheduled', ordered_date: '2026-03-02', priority: 'routine', report_available: false },
        { id: '4', patient_name: 'Sunita Devi', modality: 'Ultrasound', body_part: 'Abdomen', clinical_indication: 'Abdominal pain', status: 'pending', ordered_date: '2026-03-02', priority: 'stat', report_available: false },
    ];

    const placeOrder = async () => {
        if (!selectedModality || !bodyPart) { Alert.alert('Required', 'Select modality and body part'); return; }
        Alert.alert('Order Placed', `${selectedModality} — ${bodyPart}\nPriority: ${priority.toUpperCase()}`);
        try { await apiClient.post('/api/radiology/orders', { modality: selectedModality, body_part: bodyPart, indication, priority }); } catch {}
        setSelectedModality(''); setBodyPart(''); setIndication(''); setPriority('routine');
    };

    const getStatusIcon = (s: OrderStatus) => {
        switch (s) {
            case 'pending': return <Clock size={14} color={COLORS.textMuted} />;
            case 'scheduled': return <Clock size={14} color={COLORS.info} />;
            case 'completed': return <CheckCircle size={14} color={COLORS.warning} />;
            case 'reported': return <CheckCircle size={14} color={COLORS.success} />;
        }
    };

    const getPriorityColor = (p: string) => p === 'stat' ? COLORS.error : p === 'urgent' ? COLORS.warning : COLORS.textMuted;

    return (
        <SafeAreaView style={styles.container}>
            <BackgroundOrb />
            <View style={styles.header}>
                <Text style={styles.title}>Radiology</Text>
                <View style={styles.tabRow}>
                    <TouchableOpacity style={[styles.tab, tab === 'order' && styles.tabActive]} onPress={() => setTab('order')}>
                        <Scan size={14} color={tab === 'order' ? COLORS.primary : COLORS.textMuted} />
                        <Text style={[styles.tabText, tab === 'order' && styles.tabTextActive]}>New Order</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.tab, tab === 'results' && styles.tabActive]} onPress={() => setTab('results')}>
                        <FileText size={14} color={tab === 'results' ? COLORS.primary : COLORS.textMuted} />
                        <Text style={[styles.tabText, tab === 'results' && styles.tabTextActive]}>Results</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}>
                {tab === 'order' ? (
                    <>
                        <Text style={styles.sectionTitle}>MODALITY</Text>
                        <View style={styles.chipRow}>
                            {modalities.map(m => (
                                <TouchableOpacity key={m} style={[styles.chip, selectedModality === m && styles.chipActive]} onPress={() => { setSelectedModality(m); setBodyPart(''); }}>
                                    <Text style={[styles.chipText, selectedModality === m && styles.chipTextActive]}>{m}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        {selectedModality && bodyParts[selectedModality] && (
                            <>
                                <Text style={styles.sectionTitle}>BODY PART / VIEW</Text>
                                <View style={styles.chipRow}>
                                    {bodyParts[selectedModality]?.map(bp => (
                                        <TouchableOpacity key={bp} style={[styles.chip, bodyPart === bp && styles.chipActive]} onPress={() => setBodyPart(bp)}>
                                            <Text style={[styles.chipText, bodyPart === bp && styles.chipTextActive]}>{bp}</Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </>
                        )}

                        <Text style={styles.sectionTitle}>PRIORITY</Text>
                        <View style={styles.chipRow}>
                            {(['routine', 'urgent', 'stat'] as const).map(p => (
                                <TouchableOpacity key={p} style={[styles.chip, priority === p && { backgroundColor: getPriorityColor(p) + '30', borderColor: getPriorityColor(p) }]} onPress={() => setPriority(p)}>
                                    <Text style={[styles.chipText, priority === p && { color: getPriorityColor(p) }]}>{p.toUpperCase()}</Text>
                                </TouchableOpacity>
                            ))}
                        </View>

                        <Text style={styles.sectionTitle}>CLINICAL INDICATION</Text>
                        <TextInput style={styles.textInput} placeholder="e.g. R/O Pneumonia, Rule out fracture..." placeholderTextColor={COLORS.textMuted} value={indication} onChangeText={setIndication} multiline />

                        <TouchableOpacity style={styles.orderBtn} onPress={placeOrder}>
                            <Scan size={18} color="#fff" />
                            <Text style={styles.orderBtnText}>Place Radiology Order</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        <View style={styles.searchBox}>
                            <Search size={16} color={COLORS.textMuted} />
                            <TextInput style={styles.searchInput} placeholder="Search patient..." placeholderTextColor={COLORS.textMuted} value={searchQuery} onChangeText={setSearchQuery} />
                        </View>
                        {recentOrders.map(order => (
                            <TouchableOpacity key={order.id} onPress={() => order.report_available ? Alert.alert('Report', `${order.modality} ${order.body_part}\n\nImpression: Normal study. No acute findings.`) : null}>
                                <GlassCard style={styles.orderCard}>
                                    <View style={styles.orderRow}>
                                        <View style={styles.orderLeft}>
                                            {getStatusIcon(order.status)}
                                            <View style={{ flex: 1 }}>
                                                <Text style={styles.orderPatient}>{order.patient_name}</Text>
                                                <Text style={styles.orderDetail}>{order.modality} — {order.body_part}</Text>
                                                <Text style={styles.orderIndication}>{order.clinical_indication}</Text>
                                            </View>
                                        </View>
                                        <View style={styles.orderRight}>
                                            <View style={[styles.priorityBadge, { backgroundColor: getPriorityColor(order.priority) + '20' }]}>
                                                <Text style={[styles.priorityText, { color: getPriorityColor(order.priority) }]}>{order.priority}</Text>
                                            </View>
                                            {order.report_available && <Image size={16} color={COLORS.success} />}
                                        </View>
                                    </View>
                                </GlassCard>
                            </TouchableOpacity>
                        ))}
                    </>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const getStyles = (COLORS: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { paddingHorizontal: SPACING.l, paddingTop: SPACING.m },
    title: { fontSize: 28, fontFamily: FONTS.bold, color: COLORS.text },
    tabRow: { flexDirection: 'row', marginTop: SPACING.m, gap: SPACING.s },
    tab: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.s, paddingHorizontal: SPACING.m, borderRadius: 20, backgroundColor: COLORS.surface, gap: 6 },
    tabActive: { backgroundColor: COLORS.primary + '20', borderWidth: 1, borderColor: COLORS.primary + '40' },
    tabText: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.textMuted },
    tabTextActive: { color: COLORS.primary },
    sectionTitle: { fontSize: 12, fontFamily: FONTS.bold, color: COLORS.textMuted, letterSpacing: 1, marginTop: SPACING.l, marginBottom: SPACING.s },
    chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.s },
    chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border },
    chipActive: { backgroundColor: COLORS.primary + '20', borderColor: COLORS.primary },
    chipText: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.textSecondary },
    chipTextActive: { color: COLORS.primary },
    textInput: { backgroundColor: COLORS.surface, borderRadius: 12, padding: SPACING.m, color: COLORS.text, fontFamily: FONTS.regular, fontSize: 14, minHeight: 60, textAlignVertical: 'top', borderWidth: 1, borderColor: COLORS.border },
    orderBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.primary, borderRadius: 14, paddingVertical: 14, marginTop: SPACING.l, gap: 8 },
    orderBtnText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 16 },
    searchBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.surface, borderRadius: 12, paddingHorizontal: SPACING.m, gap: SPACING.s, marginBottom: SPACING.m },
    searchInput: { flex: 1, color: COLORS.text, fontFamily: FONTS.regular, paddingVertical: SPACING.m, fontSize: 14 },
    orderCard: { marginBottom: SPACING.s },
    orderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    orderLeft: { flexDirection: 'row', flex: 1, gap: SPACING.s, alignItems: 'flex-start' },
    orderRight: { alignItems: 'flex-end', gap: 6 },
    orderPatient: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.text },
    orderDetail: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.textSecondary, marginTop: 2 },
    orderIndication: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textMuted, marginTop: 2 },
    priorityBadge: { borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
    priorityText: { fontSize: 10, fontFamily: FONTS.bold, textTransform: 'uppercase' },
});
