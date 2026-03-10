import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MessageCircle, Bell, UtensilsCrossed, Sparkles, AlertTriangle, ClipboardList, Settings, Calendar, LifeBuoy, ArrowRightLeft } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';
import { useAuthStore } from '../../store/authStore';

interface MenuItem { icon: any; label: string; desc: string; color: string; route: string; }

export const NurseMoreScreen = ({ navigation }: any) => {
    const { COLORS } = useTheme();
    const user = useAuthStore(s => s.user);
    const styles = getStyles(COLORS);

    const sections: { title: string; items: MenuItem[] }[] = [
        {
            title: 'Communication',
            items: [
                { icon: MessageCircle, label: 'Staff Chat', desc: 'Message doctors & team', color: COLORS.primary, route: 'StaffChat' },
                { icon: Bell, label: 'Clinical Alerts', desc: 'Critical labs & vitals', color: COLORS.error, route: 'ClinicalAlerts' },
                { icon: ClipboardList, label: 'Requests', desc: 'Pending requests', color: COLORS.warning, route: 'Requests' },
            ]
        },
        {
            title: 'Ward Services',
            items: [
                { icon: UtensilsCrossed, label: 'Dietary Orders', desc: 'Patient meals & NPO', color: '#f97316', route: 'Dietary' },
                { icon: Sparkles, label: 'Housekeeping', desc: 'Room cleaning requests', color: '#06b6d4', route: 'Housekeeping' },
                { icon: AlertTriangle, label: 'Emergency', desc: 'Code blue & protocols', color: COLORS.error, route: 'Emergency' },
            ]
        },
        {
            title: 'Clinical',
            items: [
                { icon: Calendar, label: 'OT Schedule', desc: 'Theatre availability', color: '#0ea5e9', route: 'OTSchedule' },
                { icon: ArrowRightLeft, label: 'Transition Plan', desc: 'Discharge planning', color: '#14b8a6', route: 'TransitionPlanning' },
                { icon: LifeBuoy, label: 'Support Tickets', desc: 'Report issues', color: '#f97316', route: 'SupportTickets' },
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
                    <Text style={styles.subtitle}>{user?.name || 'Nurse'}</Text>
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
