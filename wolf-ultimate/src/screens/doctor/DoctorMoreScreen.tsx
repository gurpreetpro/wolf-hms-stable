import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bot, BarChart3, MessageCircle, Video, ArrowUpRight, ShieldAlert, FileOutput, Shield, Fingerprint, Calculator, Droplets, Settings, Zap, Heart, Calendar, Bell, Receipt, Package, LifeBuoy, ArrowRightLeft } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';
import { useAuthStore } from '../../store/authStore';

interface MenuItem { icon: any; label: string; desc: string; color: string; route: string; }

export const DoctorMoreScreen = ({ navigation }: any) => {
    const { COLORS } = useTheme();
    const user = useAuthStore(s => s.user);
    const styles = getStyles(COLORS);

    const sections: { title: string; items: MenuItem[] }[] = [
        {
            title: 'AI & Intelligence',
            items: [
                { icon: Bot, label: 'AI Assistant', desc: 'Differential Dx, ICD-10', color: '#8b5cf6', route: 'AIClinical' },
                { icon: ShieldAlert, label: 'Drug Interactions', desc: 'Check DDI for Rx', color: COLORS.error, route: 'DrugInteraction' },
                { icon: BarChart3, label: 'My Analytics', desc: 'Patients, revenue, ratings', color: COLORS.info, route: 'DoctorAnalytics' },
            ]
        },
        {
            title: 'Clinical Tools',
            items: [
                { icon: FileOutput, label: 'Discharge Summary', desc: 'Generate & share', color: COLORS.success, route: 'DischargeSummary' },
                { icon: ArrowUpRight, label: 'Referrals', desc: 'Refer to specialist', color: '#f97316', route: 'Referrals' },
                { icon: Calculator, label: 'Clinical Scales', desc: 'GCS, NEWS-2, Braden', color: '#06b6d4', route: 'ClinicalScales' },
                { icon: Zap, label: 'Procedures', desc: 'Log surgery & codes', color: '#ec4899', route: 'ProcedureLog' },
                { icon: Calendar, label: 'OT Schedule', desc: 'Operation theatre slots', color: '#0ea5e9', route: 'OTSchedule' },
                { icon: ArrowRightLeft, label: 'Transition Plan', desc: 'Discharge planning', color: '#14b8a6', route: 'TransitionPlanning' },
            ]
        },
        {
            title: 'Communication',
            items: [
                { icon: MessageCircle, label: 'Staff Chat', desc: 'Message nurses & staff', color: COLORS.primary, route: 'StaffChat' },
                { icon: Video, label: 'Telehealth', desc: 'Video consultation', color: '#10b981', route: 'Telehealth' },
                { icon: Bell, label: 'Clinical Alerts', desc: 'Critical notifications', color: COLORS.warning, route: 'ClinicalAlerts' },
                { icon: LifeBuoy, label: 'Support Tickets', desc: 'Report issues', color: '#f97316', route: 'SupportTickets' },
            ]
        },
        {
            title: 'Insurance & Compliance',
            items: [
                { icon: Shield, label: 'Pre-Authorization', desc: 'Submit & track pre-auth', color: '#a855f7', route: 'PreAuth' },
                { icon: Fingerprint, label: 'ABDM / ABHA', desc: 'National health ID', color: '#0ea5e9', route: 'ABDM' },
                { icon: Receipt, label: 'Insurance Claims', desc: 'Track claim status', color: COLORS.success, route: 'InsuranceClaims' },
                { icon: Package, label: 'Packages', desc: 'Treatment packages', color: '#8b5cf6', route: 'TreatmentPackages' },
                { icon: Droplets, label: 'Chemo Tracking', desc: 'Chemotherapy cycles', color: '#ef4444', route: 'ChemoTracking' },
                { icon: Heart, label: 'Dialysis Monitor', desc: 'HD/PD sessions', color: '#f43f5e', route: 'DialysisMonitoring' },
            ]
        },
        {
            title: 'Settings',
            items: [
                { icon: Settings, label: 'App Settings', desc: 'Theme, profile, logout', color: COLORS.textMuted, route: 'Settings' },
            ]
        },
    ];

    return (
        <SafeAreaView style={styles.container}>
            <BackgroundOrb />
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.header}>
                    <Text style={styles.title}>More</Text>
                    <Text style={styles.subtitle}>Dr. {user?.name || 'Doctor'}</Text>
                </View>
                {sections.map((section, si) => (
                    <View key={si} style={styles.section}>
                        <Text style={styles.sectionTitle}>{section.title}</Text>
                        {section.items.map((item, ii) => (
                            <TouchableOpacity key={ii} onPress={() => navigation.navigate(item.route)}>
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
                ))}
            </ScrollView>
        </SafeAreaView>
    );
};

const getStyles = (COLORS: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { paddingHorizontal: SPACING.l, paddingTop: SPACING.m },
    title: { fontSize: 28, fontFamily: FONTS.bold, color: COLORS.text },
    subtitle: { fontSize: 14, fontFamily: FONTS.medium, color: COLORS.textSecondary, marginTop: 2 },
    section: { marginTop: SPACING.l, paddingHorizontal: SPACING.m },
    sectionTitle: { fontSize: 13, fontFamily: FONTS.bold, color: COLORS.textMuted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: SPACING.s, marginLeft: SPACING.s },
    menuItem: { flexDirection: 'row', alignItems: 'center', marginBottom: SPACING.s, paddingVertical: SPACING.s },
    menuIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginRight: SPACING.m },
    menuText: { flex: 1 },
    menuLabel: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.text },
    menuDesc: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 1 },
});
