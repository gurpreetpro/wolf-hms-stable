import React, { useState, useEffect } from 'react';
import wardService from '../../services/wardService';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Users, AlertTriangle, Briefcase, Activity, RefreshCw } from 'lucide-react-native';
import { FONTS, SPACING, SHADOWS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { VerticalStatCard } from '../../components/common/VerticalStatCard';
import { EmptyState } from '../../components/common/EmptyState';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeContext';

export const WardManagementScreen = ({ navigation }: any) => {
    const user = useAuthStore(state => state.user);
    const { theme: COLORS } = useTheme();
    const styles = React.useMemo(() => getStyles(COLORS), [COLORS]);

    const [stats, setStats] = useState({ occupancy: 85, staff: 12, alerts: 3 });
    const [requests, setRequests] = useState<any[]>([
        { id: 1, type: 'Nurse Call', description: 'Patient in Room 302 requesting assistance.' },
        { id: 2, type: 'Supplies', description: 'IV Kits running low in Station B.' }
    ]);
    const [staffList, setStaffList] = useState<any[]>([
        { id: 1, name: 'Sarah J.', role: 'Head Nurse', status: 'active' },
        { id: 2, name: 'Mike T.', role: 'Junior Nurse', status: 'break' }
    ]);

    const handleResolve = (id: number) => {
        setRequests(prev => prev.filter(r => r.id !== id));
        Alert.alert('Resolved', 'Alert marked as resolved.');
    };

    const loadDashboard = () => {
        // Refresh logic or navigation
        Alert.alert('Dashboard', 'Refreshing data...');
    };

    return (
        <View style={styles.container}>
             <LinearGradient
                colors={[COLORS.background, '#1e1b4b']}
                style={StyleSheet.absoluteFill}
            />
            {/* Ambient Background */}
            <BackgroundOrb color={COLORS.error} position="top-left" />
            
            <SafeAreaView style={{ flex: 1 }}>
                <View style={styles.header}>
                    <View>
                        <Text style={styles.title}>Ward Command</Text>
                        <Text style={styles.subtitle}>{user?.department || 'General Ward'}</Text>
                    </View>
                    <TouchableOpacity onPress={loadDashboard} style={styles.refreshBtn}>
                         <RefreshCw size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={{ padding: SPACING.m, paddingBottom: 100 }}>
                    {/* Key Metrics */}
                    <View style={styles.statsRow}>
                        <VerticalStatCard 
                            icon={Users} 
                            title="Occupancy" 
                            value={stats.occupancy + '%'} 
                            color={COLORS.primary} 
                        />
                        <VerticalStatCard 
                            icon={Briefcase} 
                            title="Staff On Duty" 
                            value={stats.staff} 
                            color={COLORS.warning} 
                        />
                        <VerticalStatCard 
                            icon={AlertTriangle} 
                            title="Active Alerts" 
                            value={stats.alerts} 
                            color={COLORS.error} 
                        />
                    </View>

                    {/* Alerts Section */}
                    <Text style={styles.sectionTitle}>Critical Alerts</Text>
                    {requests.length === 0 ? (
                        <EmptyState 
                            icon={<AlertTriangle size={36} color={COLORS.textMuted} />} 
                            title="No Active Alerts" 
                            message="All clear. No critical issues reported." 
                        />
                    ) : (
                        requests.slice(0, 3).map((req: any, i: number) => (
                             <GlassCard key={i} style={[styles.alertCard, { borderColor: COLORS.error + '50' }]} intensity={25}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
                                    <View style={[styles.iconBox, { backgroundColor: COLORS.error + '20' }]}>
                                        <AlertTriangle size={18} color={COLORS.error} />
                                    </View>
                                    <Text style={[styles.alertType, { color: COLORS.error }]}>{req.type || 'Alert'}</Text>
                                </View>
                                <Text style={styles.alertDesc}>{req.description || 'Action required.'}</Text>
                                <TouchableOpacity 
                                    style={styles.resolveBtn}
                                    onPress={() => handleResolve(req.id)}
                                >
                                    <Text style={styles.resolveText}>Resolve</Text>
                                </TouchableOpacity>
                             </GlassCard>
                        ))
                    )}

                    {/* Staff List */}
                    <Text style={[styles.sectionTitle, { marginTop: SPACING.l }]}>Staff on Duty</Text>
                     {staffList.length === 0 ? (
                        <EmptyState 
                            icon={<Users size={36} color={COLORS.textMuted} />} 
                            title="No Staff Checked In" 
                            message="Wait for staff to check in for their shift." 
                        />
                     ) : (
                        staffList.map((staff, index) => (
                            <GlassCard key={staff.id || index} style={styles.staffCard} intensity={15}>
                                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <View style={[styles.avatar, { backgroundColor: staff.status === 'active' ? COLORS.success : COLORS.warning }]}>
                                            <Text style={{ fontFamily: FONTS.bold, color: '#fff' }}>{staff.name?.charAt(0) || '?'}</Text>
                                        </View>
                                        <View style={{ marginLeft: 12 }}>
                                            <Text style={styles.staffName}>{staff.name || 'Unknown Staff'}</Text>
                                            <Text style={styles.staffRole}>{staff.role || 'Staff'}</Text>
                                        </View>
                                    </View>
                                    <View style={[styles.statusTag, { backgroundColor: COLORS.surface }]}>
                                        <Text style={{ color: COLORS.textSecondary, fontSize: 10, textTransform: 'capitalize' }}>{staff.status || 'Active'}</Text>
                                    </View>
                                </View>
                            </GlassCard>
                        ))
                     )}

                </ScrollView>
            </SafeAreaView>
        </View>
    );
};

const getStyles = (COLORS: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingHorizontal: SPACING.m, 
        marginTop: SPACING.m, 
        marginBottom: SPACING.m 
    },
    title: { fontFamily: FONTS.bold, fontSize: 28, color: COLORS.text },
    subtitle: { fontFamily: FONTS.medium, fontSize: 16, color: COLORS.primary },
    refreshBtn: { 
        padding: 10, 
        borderRadius: 12, 
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border
    },
    
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 8,
        marginBottom: SPACING.l,
    },

    sectionTitle: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text, marginBottom: 12 },
    
    alertCard: { marginBottom: SPACING.m, borderWidth: 1 },
    iconBox: { width: 32, height: 32, borderRadius: 16, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
    alertType: { fontFamily: FONTS.bold, fontSize: 16 },
    alertDesc: { color: COLORS.textSecondary, fontFamily: FONTS.regular, marginBottom: 12 },
    resolveBtn: { backgroundColor: COLORS.error, paddingVertical: 8, paddingHorizontal: 16, borderRadius: 8, alignItems: 'center', alignSelf: 'flex-start' },
    resolveText: { color: '#fff', fontFamily: FONTS.bold, fontSize: 12 },

    staffCard: { marginBottom: 8, padding: 12, borderRadius: 16 },
    avatar: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
    staffName: { fontFamily: FONTS.bold, color: COLORS.text, fontSize: 14 },
    staffRole: { fontFamily: FONTS.regular, color: COLORS.textSecondary, fontSize: 12 },
    statusTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
});
