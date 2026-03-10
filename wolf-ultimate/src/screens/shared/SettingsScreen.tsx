import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Palette, Bell, Info, LogOut, ChevronRight, Moon, Sun, Monitor, Shield, HelpCircle } from 'lucide-react-native';
import { useTheme } from '../../theme/ThemeContext';
import { SPACING, FONTS, ThemeType } from '../../theme/theme';
import { GlassCard } from '../../components/common/GlassCard';
import { BackgroundOrb } from '../../components/common/BackgroundOrb';
import { useAuthStore } from '../../store/authStore';

export const SettingsScreen = ({ navigation }: any) => {
    const { COLORS, themeType, setThemeType } = useTheme();
    const user = useAuthStore(s => s.user);
    const logout = useAuthStore(s => s.logout);
    const hospitalCode = useAuthStore(s => s.hospitalCode);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [criticalAlertsEnabled, setCriticalAlertsEnabled] = useState(true);
    const styles = getStyles(COLORS);

    const getRoleLabel = (role?: string) => {
        switch (role) {
            case 'doctor': return 'Doctor';
            case 'nurse': return 'Nurse';
            case 'ward_incharge': return 'Ward Incharge';
            case 'admin': return 'Administrator';
            default: return 'Staff';
        }
    };

    const themeOptions: { key: ThemeType; label: string; icon: any }[] = [
        { key: 'light', label: 'Light', icon: Sun },
        { key: 'dark', label: 'Dark', icon: Moon },
        { key: 'dim', label: 'Dim', icon: Monitor },
    ];

    const handleLogout = () => {
        Alert.alert('Logout', 'Are you sure you want to logout?', [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Logout', style: 'destructive', onPress: () => logout() },
        ]);
    };

    return (
        <SafeAreaView style={styles.container}>
            <BackgroundOrb />
            <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>
                <View style={styles.header}>
                    <Text style={styles.title}>Settings</Text>
                </View>

                {/* Profile Card */}
                <View style={styles.section}>
                    <GlassCard style={styles.profileCard}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {user?.name?.charAt(0)?.toUpperCase() || '?'}
                            </Text>
                        </View>
                        <View style={styles.profileInfo}>
                            <Text style={styles.profileName}>{user?.name || 'User'}</Text>
                            <Text style={styles.profileRole}>{getRoleLabel(user?.role)}</Text>
                            {!!user?.department && (
                                <Text style={styles.profileDept}>{user.department}</Text>
                            )}
                        </View>
                        <View style={[styles.roleBadge, { backgroundColor: COLORS.primary + '20' }]}>
                            <Text style={[styles.roleBadgeText, { color: COLORS.primary }]}>
                                {hospitalCode?.toUpperCase() || 'WOLF'}
                            </Text>
                        </View>
                    </GlassCard>
                </View>

                {/* Theme Selection */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>APPEARANCE</Text>
                    <GlassCard style={styles.themeCard}>
                        <View style={styles.themeRow}>
                            <Palette size={20} color={COLORS.primary} />
                            <Text style={styles.themeLabel}>Theme</Text>
                        </View>
                        <View style={styles.themeOptions}>
                            {themeOptions.map(opt => (
                                <TouchableOpacity
                                    key={opt.key}
                                    style={[
                                        styles.themeBtn,
                                        themeType === opt.key && styles.themeBtnActive,
                                    ]}
                                    onPress={() => setThemeType(opt.key)}
                                >
                                    <opt.icon
                                        size={18}
                                        color={themeType === opt.key ? '#fff' : COLORS.textMuted}
                                    />
                                    <Text
                                        style={[
                                            styles.themeBtnText,
                                            themeType === opt.key && styles.themeBtnTextActive,
                                        ]}
                                    >
                                        {opt.label}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </GlassCard>
                </View>

                {/* Notifications */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>NOTIFICATIONS</Text>
                    <GlassCard>
                        <View style={styles.settingRow}>
                            <View style={styles.settingLeft}>
                                <Bell size={20} color={COLORS.info} />
                                <Text style={styles.settingLabel}>Push Notifications</Text>
                            </View>
                            <Switch
                                value={notificationsEnabled}
                                onValueChange={setNotificationsEnabled}
                                trackColor={{ false: COLORS.border, true: COLORS.primary + '60' }}
                                thumbColor={notificationsEnabled ? COLORS.primary : COLORS.textMuted}
                            />
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.settingRow}>
                            <View style={styles.settingLeft}>
                                <Shield size={20} color={COLORS.error} />
                                <Text style={styles.settingLabel}>Critical Alerts</Text>
                            </View>
                            <Switch
                                value={criticalAlertsEnabled}
                                onValueChange={setCriticalAlertsEnabled}
                                trackColor={{ false: COLORS.border, true: COLORS.error + '60' }}
                                thumbColor={criticalAlertsEnabled ? COLORS.error : COLORS.textMuted}
                            />
                        </View>
                    </GlassCard>
                </View>

                {/* About */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ABOUT</Text>
                    <GlassCard>
                        <TouchableOpacity style={styles.settingRow}>
                            <View style={styles.settingLeft}>
                                <Info size={20} color={COLORS.textMuted} />
                                <Text style={styles.settingLabel}>App Version</Text>
                            </View>
                            <Text style={styles.settingValue}>2.0.0 (Ultimate)</Text>
                        </TouchableOpacity>
                        <View style={styles.divider} />
                        <TouchableOpacity style={styles.settingRow}>
                            <View style={styles.settingLeft}>
                                <HelpCircle size={20} color={COLORS.textMuted} />
                                <Text style={styles.settingLabel}>Help & Support</Text>
                            </View>
                            <ChevronRight size={18} color={COLORS.textMuted} />
                        </TouchableOpacity>
                    </GlassCard>
                </View>

                {/* Logout */}
                <View style={styles.section}>
                    <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                        <LogOut size={20} color={COLORS.error} />
                        <Text style={styles.logoutText}>Logout</Text>
                    </TouchableOpacity>
                </View>

                <Text style={styles.footer}>Wolf HMS Ultimate © 2026</Text>
            </ScrollView>
        </SafeAreaView>
    );
};

const getStyles = (COLORS: any) => StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    header: { paddingHorizontal: SPACING.l, paddingTop: SPACING.m, marginBottom: SPACING.m },
    title: { fontSize: 28, fontFamily: FONTS.bold, color: COLORS.text },
    section: { paddingHorizontal: SPACING.m, marginBottom: SPACING.l },
    sectionTitle: {
        fontSize: 12, fontFamily: FONTS.bold, color: COLORS.textMuted,
        textTransform: 'uppercase', letterSpacing: 1.5, marginBottom: SPACING.s, marginLeft: SPACING.s,
    },
    // Profile
    profileCard: { flexDirection: 'row', alignItems: 'center', padding: SPACING.m },
    avatar: {
        width: 56, height: 56, borderRadius: 28, backgroundColor: COLORS.primary,
        justifyContent: 'center', alignItems: 'center',
    },
    avatarText: { fontSize: 24, fontFamily: FONTS.bold, color: '#fff' },
    profileInfo: { flex: 1, marginLeft: SPACING.m },
    profileName: { fontSize: 18, fontFamily: FONTS.bold, color: COLORS.text },
    profileRole: { fontSize: 14, fontFamily: FONTS.medium, color: COLORS.primary, marginTop: 2 },
    profileDept: { fontSize: 12, fontFamily: FONTS.regular, color: COLORS.textSecondary, marginTop: 2 },
    roleBadge: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
    roleBadgeText: { fontSize: 11, fontFamily: FONTS.bold },
    // Theme
    themeCard: { padding: SPACING.m },
    themeRow: { flexDirection: 'row', alignItems: 'center', gap: SPACING.s, marginBottom: SPACING.m },
    themeLabel: { fontSize: 15, fontFamily: FONTS.bold, color: COLORS.text },
    themeOptions: { flexDirection: 'row', gap: SPACING.s },
    themeBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        paddingVertical: 12, borderRadius: 12, backgroundColor: COLORS.surface,
        borderWidth: 1, borderColor: COLORS.border, gap: 6,
    },
    themeBtnActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
    themeBtnText: { fontSize: 13, fontFamily: FONTS.medium, color: COLORS.textMuted },
    themeBtnTextActive: { color: '#fff' },
    // Settings rows
    settingRow: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingVertical: SPACING.s,
    },
    settingLeft: { flexDirection: 'row', alignItems: 'center', gap: SPACING.m },
    settingLabel: { fontSize: 15, fontFamily: FONTS.medium, color: COLORS.text },
    settingValue: { fontSize: 13, fontFamily: FONTS.regular, color: COLORS.textMuted },
    divider: { height: 1, backgroundColor: COLORS.divider, marginVertical: SPACING.xs },
    // Logout
    logoutBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        backgroundColor: COLORS.error + '10', borderWidth: 1, borderColor: COLORS.error + '30',
        borderRadius: 16, paddingVertical: 16, gap: SPACING.s,
    },
    logoutText: { fontSize: 16, fontFamily: FONTS.bold, color: COLORS.error },
    footer: {
        textAlign: 'center', fontSize: 12, fontFamily: FONTS.regular,
        color: COLORS.textMuted, marginTop: SPACING.m, marginBottom: SPACING.xl,
    },
});

export default SettingsScreen;
