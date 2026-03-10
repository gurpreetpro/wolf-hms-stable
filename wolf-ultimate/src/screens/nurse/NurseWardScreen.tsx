import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BedDouble, ArrowLeftRight, DoorOpen, User, AlertTriangle } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';
import nurseService from '../../services/nurseService';
import { BedDetailModal } from './BedDetailModal';

interface BedInfo { id: string; bed_number: string; ward_name: string; status: string; patient_name?: string; diagnosis?: string; acuity?: string; }

export const NurseWardScreen = ({ navigation }: any) => {
    const { COLORS } = useTheme();
    const [beds, setBeds] = useState<BedInfo[]>([]);
    const [loading, setLoading] = useState(false);
    const [selectedBed, setSelectedBed] = useState<any>(null);
    const styles = getStyles(COLORS);

    useEffect(() => { loadBeds(); }, []);

    const loadBeds = async () => {
        setLoading(true);
        try {
            const res = await nurseService.getWardOverview();
            const allBeds = res?.beds || [];
            setBeds(allBeds.length > 0 ? allBeds : [
                { id: '1', bed_number: 'ICU-1', ward_name: 'ICU', status: 'occupied', patient_name: 'Meena Gupta', diagnosis: 'Pneumonia', acuity: 'critical' },
                { id: '2', bed_number: 'ICU-2', ward_name: 'ICU', status: 'occupied', patient_name: 'Ravi Verma', diagnosis: 'Sepsis', acuity: 'critical' },
                { id: '3', bed_number: 'ICU-3', ward_name: 'ICU', status: 'available', acuity: 'normal' },
                { id: '4', bed_number: 'W1-1', ward_name: 'General', status: 'occupied', patient_name: 'Sita Ram', diagnosis: 'Fracture', acuity: 'normal' },
                { id: '5', bed_number: 'W1-2', ward_name: 'General', status: 'occupied', patient_name: 'Gopal Das', diagnosis: 'Post-Op', acuity: 'moderate' },
                { id: '6', bed_number: 'W1-3', ward_name: 'General', status: 'cleaning', acuity: 'normal' },
                { id: '7', bed_number: 'W1-4', ward_name: 'General', status: 'available', acuity: 'normal' },
                { id: '8', bed_number: 'W2-1', ward_name: 'Paediatric', status: 'occupied', patient_name: 'Baby Arjun', diagnosis: 'Bronchiolitis', acuity: 'moderate' },
            ]);
        } catch {
            setBeds([
                { id: '1', bed_number: 'ICU-1', ward_name: 'ICU', status: 'occupied', patient_name: 'Meena G.', diagnosis: 'Pneumonia', acuity: 'critical' },
                { id: '2', bed_number: 'ICU-2', ward_name: 'ICU', status: 'available', acuity: 'normal' },
                { id: '3', bed_number: 'W1-1', ward_name: 'General', status: 'occupied', patient_name: 'Sita R.', diagnosis: 'Fracture', acuity: 'normal' },
            ]);
        } finally { setLoading(false); }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'occupied': return COLORS.primary;
            case 'available': return COLORS.success;
            case 'cleaning': return COLORS.warning;
            case 'reserved': return COLORS.info;
            default: return COLORS.textMuted;
        }
    };

    const getAcuityColor = (acuity?: string) => {
        if (acuity === 'critical') return COLORS.error;
        if (acuity === 'moderate') return COLORS.warning;
        return COLORS.success;
    };

    const occupied = beds.filter(b => b.status === 'occupied').length;
    const available = beds.filter(b => b.status === 'available').length;

    return (
        <SafeAreaView style={styles.container}>
            <BackgroundOrb />
            <View style={styles.header}>
                <Text style={styles.title}>Ward View</Text>
                <Text style={styles.subtitle}>{occupied} occupied · {available} available · {beds.length} total</Text>
            </View>

            <View style={styles.actions}>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.info + '20' }]} onPress={() => navigation.navigate('BedTransfer')}>
                    <ArrowLeftRight size={16} color={COLORS.info} />
                    <Text style={[styles.actionText, { color: COLORS.info }]}>Transfer</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.warning + '20' }]} onPress={() => navigation.navigate('WardPass')}>
                    <DoorOpen size={16} color={COLORS.warning} />
                    <Text style={[styles.actionText, { color: COLORS.warning }]}>Ward Pass</Text>
                </TouchableOpacity>
            </View>

            <ScrollView refreshControl={<RefreshControl refreshing={loading} onRefresh={loadBeds} tintColor={COLORS.primary} />} contentContainerStyle={styles.grid}>
                {beds.map(bed => (
                    <TouchableOpacity key={bed.id} style={styles.bedWrap} onPress={() => setSelectedBed(bed)}>
                        <GlassCard style={[styles.bedCard, { borderLeftWidth: 3, borderLeftColor: getStatusColor(bed.status) }]}>
                            <View style={styles.bedHeader}>
                                <BedDouble size={16} color={getStatusColor(bed.status)} />
                                <Text style={styles.bedNumber}>{bed.bed_number}</Text>
                                {bed.acuity === 'critical' && <AlertTriangle size={14} color={COLORS.error} />}
                            </View>
                            {bed.patient_name ? (
                                <>
                                    <Text style={styles.patientName} numberOfLines={1}>{bed.patient_name}</Text>
                                    <Text style={styles.diagnosis} numberOfLines={1}>{bed.diagnosis}</Text>
                                    <View style={[styles.acuityDot, { backgroundColor: getAcuityColor(bed.acuity) }]} />
                                </>
                            ) : (
                                <Text style={[styles.statusLabel, { color: getStatusColor(bed.status) }]}>
                                    {bed.status === 'available' ? 'Available' : bed.status === 'cleaning' ? 'Cleaning' : bed.status}
                                </Text>
                            )}
                        </GlassCard>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {selectedBed && (
                <BedDetailModal
                    visible={!!selectedBed}
                    bed={selectedBed}
                    onClose={() => setSelectedBed(null)}
                />
            )}
        </SafeAreaView>
    );
};

const getStyles = (COLORS: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { paddingHorizontal: SPACING.l, paddingTop: SPACING.m },
    title: { fontSize: 28, fontFamily: FONTS.bold, color: COLORS.text },
    subtitle: { fontSize: 14, fontFamily: FONTS.medium, color: COLORS.textSecondary, marginTop: 2 },
    actions: { flexDirection: 'row', paddingHorizontal: SPACING.m, marginTop: SPACING.m, gap: SPACING.s },
    actionBtn: { flexDirection: 'row', alignItems: 'center', paddingVertical: SPACING.s, paddingHorizontal: SPACING.m, borderRadius: 20, gap: 6 },
    actionText: { fontSize: 13, fontFamily: FONTS.bold },
    grid: { flexDirection: 'row', flexWrap: 'wrap', padding: SPACING.m, paddingBottom: 100, gap: SPACING.s },
    bedWrap: { width: '48%' },
    bedCard: { minHeight: 90 },
    bedHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    bedNumber: { fontSize: 14, fontFamily: FONTS.bold, color: COLORS.text, flex: 1 },
    patientName: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.text },
    diagnosis: { fontSize: 11, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 2 },
    statusLabel: { fontSize: 13, fontFamily: FONTS.medium, marginTop: 4 },
    acuityDot: { width: 8, height: 8, borderRadius: 4, position: 'absolute', top: SPACING.m, right: SPACING.m },
});
