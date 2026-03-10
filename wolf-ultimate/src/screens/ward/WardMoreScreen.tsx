import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AlertTriangle, ShieldCheck, MessageCircle, Bell, Settings, LifeBuoy, Shield, Receipt, Package, ArrowRightLeft } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';
import { useAuthStore } from '../../store/authStore';

interface MenuItem { icon: any; label: string; desc: string; color: string; route: string; }

export const WardMoreScreen = ({ navigation }: any) => {
    const { COLORS } = useTheme();
    const user = useAuthStore(s => s.user);
    const styles = getStyles(COLORS);

    const items: MenuItem[] = [
        { icon: AlertTriangle, label: 'Emergency', desc: 'Code blue & protocols', color: COLORS.error, route: 'Emergency' },
        { icon: ShieldCheck, label: 'Ward Admin', desc: 'Ward configuration', color: COLORS.secondary, route: 'WardAdmin' },
        { icon: MessageCircle, label: 'Staff Chat', desc: 'Team messaging', color: COLORS.primary, route: 'StaffChat' },
        { icon: Bell, label: 'Clinical Alerts', desc: 'Critical notifications', color: COLORS.warning, route: 'ClinicalAlerts' },
        { icon: LifeBuoy, label: 'Support Tickets', desc: 'Report issues', color: '#f97316', route: 'SupportTickets' },
        { icon: Shield, label: 'Pre-Authorization', desc: 'Insurance pre-auth', color: '#a855f7', route: 'PreAuth' },
        { icon: Receipt, label: 'Insurance Claims', desc: 'Track claim status', color: COLORS.success, route: 'InsuranceClaims' },
        { icon: Package, label: 'Packages', desc: 'Treatment packages', color: '#8b5cf6', route: 'TreatmentPackages' },
        { icon: ArrowRightLeft, label: 'Transition Plan', desc: 'Discharge planning', color: '#14b8a6', route: 'TransitionPlanning' },
        { icon: Settings, label: 'App Settings', desc: 'Theme, profile, logout', color: COLORS.textMuted, route: 'Settings' },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <BackgroundOrb />
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.header}>
                    <Text style={styles.title}>More</Text>
                    <Text style={styles.subtitle}>{user?.name || 'Ward Incharge'}</Text>
                </View>
                <View style={styles.list}>
                    {items.map((item, i) => (
                        <TouchableOpacity key={i} onPress={() => navigation.navigate(item.route)}>
                            <GlassCard style={styles.menuItem}>
                                <View style={[styles.menuIcon, { backgroundColor: item.color + '20' }]}>
                                    <item.icon size={20} color={item.color} />
                                </View>
                                <View style={styles.menuText}>
                                    <Text style={styles.menuLabel}>{item.label}</Text>
                                    <Text style={styles.menuDesc}>{item.desc}</Text>
                                </View>
                            </GlassCard>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const getStyles = (COLORS: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { paddingHorizontal: SPACING.l, paddingTop: SPACING.m },
    title: { fontSize: 28, fontFamily: FONTS.bold, color: COLORS.text },
    subtitle: { fontSize: 14, fontFamily: FONTS.medium, color: COLORS.textSecondary, marginTop: 2 },
    list: { marginTop: SPACING.l, paddingHorizontal: SPACING.m },
    menuItem: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.s, paddingVertical: SPACING.s },
    menuIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.m },
    menuText: { flex: 1 },
    menuLabel: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.text },
    menuDesc: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 1 },
});
