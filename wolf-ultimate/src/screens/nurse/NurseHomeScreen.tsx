import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { BedDouble, Activity, CheckCircle, AlertTriangle, Pill, ClipboardList } from 'lucide-react-native';
import { FONTS, SPACING, SHADOWS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { VerticalStatCard } from '../../components/common/VerticalStatCard';
import { EmptyState } from '../../components/common/EmptyState';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeContext';
import { BedDetailModal } from './BedDetailModal';
import nurseService, { Bed as BedType, WardOverview } from '../../services/nurseService';

// Helper functions (Theme Independent)
const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good Morning';
    if (hour < 18) return 'Good Afternoon';
    return 'Good Evening';
};

const getCurrentShift = () => {
    const hour = new Date().getHours();
    if (hour >= 7 && hour < 15) return 'Morning Shift';
    if (hour >= 15 && hour < 23) return 'Evening Shift';
    return 'Night Shift';
};

export const NurseHomeScreen = ({ navigation }: any) => {
    const user = useAuthStore(state => state.user);
    const { theme: COLORS } = useTheme();
    const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);

    const [beds, setBeds] = useState<BedType[]>([]);
    const [overview, setOverview] = useState<WardOverview | null>(null);
    const [loading, setLoading] = useState(true);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedBed, setSelectedBed] = useState<BedType | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [bedsData, overviewData] = await Promise.all([
                nurseService.getAllBeds(),
                nurseService.getWardOverview(),
            ]);
            setBeds(bedsData || []);
            setOverview(overviewData);
        } catch (error) {
            console.error('Failed to load ward data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleBedPress = (bed: BedType) => {
        setSelectedBed(bed);
        setModalVisible(true);
    };

    // Internal Component to access styles/COLORS
    const BedCard = ({ bed, onPress }: { bed: BedType; onPress: () => void }) => {
        const isOccupied = bed.status === 'Occupied';
        const getStatusColor = () => {
            switch (bed.status) {
                case 'Occupied': return COLORS.primary;
                case 'Available': return COLORS.success;
                case 'Cleaning': return COLORS.warning;
                case 'Maintenance': return COLORS.error;
                default: return COLORS.textMuted;
            }
        };
    
        return (
            <TouchableOpacity 
                style={[styles.bedCard, { borderColor: getStatusColor() + '30' }]} 
                onPress={onPress}
            >
                <View style={[styles.bedIconWrap, { backgroundColor: getStatusColor() + '15' }]}>
                    <BedDouble size={20} color={getStatusColor()} />
                </View>
                <Text style={styles.bedNumber}>{bed.bed_number}</Text>
                {isOccupied && bed.patient_name && (
                    <Text style={styles.patientNameSmall} numberOfLines={1}>{bed.patient_name}</Text>
                )}
                <View style={[styles.statusIndicator, { backgroundColor: getStatusColor() }]} />
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
             <LinearGradient
                colors={[COLORS.background, COLORS.surface]} // Dynamic gradient
                style={StyleSheet.absoluteFill}
            />

            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.greeting}>{getGreeting()}</Text>
                        <Text style={styles.name}>{user?.name || 'Nurse'}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                             <Text style={styles.shift}>{getCurrentShift()}</Text>
                             <View style={styles.statusDot} />
                             <Text style={styles.statusText}>On Duty</Text>
                        </View>
                    </View>
                    {/* Placeholder for Profile/Notifications if needed */}
                </View>

                <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}>
                    {/* Stats Row */}
                    <View style={styles.statsRow}>
                        <VerticalStatCard 
                            icon={BedDouble} 
                            title="Occupied" 
                            value={overview?.occupied_beds || 0} 
                            color={COLORS.primary} 
                        />
                        <VerticalStatCard 
                            icon={AlertTriangle} 
                            title="Critical" 
                            value={overview?.critical_patients || 0} 
                            color={COLORS.error} 
                        />
                        <VerticalStatCard 
                            icon={CheckCircle} 
                            title="Free Beds" 
                            value={overview?.available_beds || 0} 
                            color={COLORS.success} 
                        />
                    </View>

                    {/* Quick Actions (Efficiency Booster) */}
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <View style={{ flexDirection: 'row', gap: SPACING.m, marginBottom: SPACING.l }}>
                         <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.surface }]} onPress={() => Alert.alert('Action', 'Vitals Round Started')}>
                            <Activity size={20} color={COLORS.primary} />
                            <Text style={[styles.actionBtnText, { color: COLORS.text }]}>Log Vitals</Text>
                         </TouchableOpacity>
                         
                         <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.surface }]} onPress={() => Alert.alert('Action', 'Medication Round Started')}>
                            <Pill size={20} color={COLORS.secondary} />
                            <Text style={[styles.actionBtnText, { color: COLORS.text }]}>Meds Round</Text>
                         </TouchableOpacity>

                         <TouchableOpacity style={[styles.actionBtn, { backgroundColor: COLORS.surface }]} onPress={() => Alert.alert('Action', 'Handover Notes')}>
                            <ClipboardList size={20} color={COLORS.textSecondary} />
                            <Text style={[styles.actionBtnText, { color: COLORS.text }]}>Handover</Text>
                         </TouchableOpacity>
                    </View>
                    
                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Bed Status</Text>
                        <TouchableOpacity onPress={loadData}>
                            <Text style={{color: COLORS.primary, fontFamily: FONTS.medium}}>Refresh</Text>
                        </TouchableOpacity>
                    </View>
                    
                    {loading ? (
                         <Text style={{color: COLORS.textSecondary, textAlign: 'center', marginTop: 20}}>Loading Ward Status...</Text>
                    ) : beds.length === 0 ? (
                        <EmptyState 
                            icon={<BedDouble size={36} color={COLORS.textMuted} />} 
                            title="No Beds Found" 
                            message="This ward has no beds configured." 
                        />
                    ) : (
                        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                            {beds.map(bed => (
                                <BedCard 
                                    key={bed.id} 
                                    bed={bed} 
                                    onPress={() => handleBedPress(bed)}
                                />
                            ))}
                        </View>
                    )}

                </ScrollView>

                <BedDetailModal 
                    visible={modalVisible} 
                    bed={selectedBed} 
                    onClose={() => setModalVisible(false)} 
                />
            </SafeAreaView>
        </View>
    );
};

const getStyles = (COLORS: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: {
        paddingHorizontal: SPACING.m,
        paddingVertical: SPACING.s,
        marginTop: SPACING.m,
        marginBottom: SPACING.s,
    },
    greeting: {
        fontFamily: FONTS.regular,
        color: COLORS.textSecondary,
        fontSize: 14,
        marginBottom: 4,
    },
    name: {
        fontFamily: FONTS.bold,
        color: COLORS.text,
        fontSize: 28,
    },
    shift: {
        fontFamily: FONTS.medium,
        color: COLORS.textSecondary,
        fontSize: 14,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: COLORS.success,
        marginHorizontal: 8,
    },
    statusText: {
        color: COLORS.success,
        fontFamily: FONTS.bold,
        fontSize: 12,
    },
    
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
        marginBottom: SPACING.l,
    },

    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.m,
    },
    sectionTitle: {
        fontFamily: FONTS.bold,
        color: COLORS.text,
        fontSize: 18,
        marginBottom: SPACING.m,
    },
    
    // BedCard styles
    bedCard: { 
        width: '48%', 
        backgroundColor: COLORS.surface, 
        borderRadius: 20, 
        padding: SPACING.m, 
        marginBottom: SPACING.m,
        borderWidth: 1,
        alignItems: 'center',
    },
    bedIconWrap: { 
        width: 40, 
        height: 40, 
        borderRadius: 20, 
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12 
    },
    bedNumber: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 16 },
    patientNameSmall: { fontFamily: FONTS.regular, color: COLORS.textMuted, fontSize: 12, marginTop: 4 },
    statusIndicator: { width: 8, height: 8, borderRadius: 4, position: 'absolute', top: 12, right: 12 },

    // Quick Action Styles
    actionBtn: {
        flex: 1,
        borderRadius: 16,
        padding: SPACING.m,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    actionBtnText: {
        fontFamily: FONTS.medium,
        fontSize: 12
    }
});
