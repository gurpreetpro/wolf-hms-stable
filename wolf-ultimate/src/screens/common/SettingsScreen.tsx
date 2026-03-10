import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuthStore } from '../../store/authStore';
import { useTheme } from '../../theme/ThemeContext';
import { COLORS, FONTS, SPACING } from '../../theme/theme';
import { LogOut, Settings, Shield, Server } from 'lucide-react-native';
import { GlassCard } from '../../components/common/GlassCard';

export const SettingsScreen = () => {
    const logout = useAuthStore(state => state.logout);
    const user = useAuthStore(state => state.user);
    const hospitalCode = useAuthStore(state => state.hospitalCode);
    const baseUrl = useAuthStore(state => state.baseUrl);
    const { themeType, setThemeType, theme: dynamicTheme } = useTheme();

    // Use dynamic colors for this screen locally to show effect
    const C = dynamicTheme; // Alias for brevity

    return (
        <SafeAreaView style={styles.container}>
            <Text style={styles.title}>Settings</Text>

            <ScrollView contentContainerStyle={{ padding: SPACING.m }}>
                
                {/* Profile Card */}
                <GlassCard style={{ marginBottom: SPACING.m, padding: 24, alignItems: 'center', borderRadius: 32 }}>
                    <View style={{ 
                        width: 80, 
                        height: 80, 
                        borderRadius: 40, 
                        backgroundColor: COLORS.primary, 
                        justifyContent: 'center', 
                        alignItems: 'center',
                        marginBottom: 16,
                        shadowColor: COLORS.primary,
                        shadowOffset: { width: 0, height: 8 },
                        shadowOpacity: 0.3,
                        shadowRadius: 16,
                        elevation: 8
                    }}>
                        <Text style={{ fontFamily: FONTS.bold, fontSize: 32, color: '#fff' }}>
                            {user?.name?.charAt(0) || '?'}
                        </Text>
                    </View>
                    <Text style={{ fontFamily: FONTS.bold, fontSize: 24, color: COLORS.text, marginBottom: 4 }}>
                        {user?.name || user?.username}
                    </Text>
                    <Text style={{ 
                        fontFamily: FONTS.bold, 
                        fontSize: 12, 
                        color: COLORS.textSecondary, 
                        letterSpacing: 2,
                        backgroundColor: COLORS.surface,
                        paddingHorizontal: 12,
                        paddingVertical: 4,
                        borderRadius: 100,
                        overflow: 'hidden'
                    }}>
                        {user?.role?.toUpperCase()}
                    </Text>
                </GlassCard>

                {/* Connection Info */}
                <Text style={styles.sectionHeader}>Connection</Text>
                <GlassCard style={{ marginBottom: SPACING.m }}>
                    <View style={styles.row}>
                        <Server size={20} color={COLORS.primary} />
                        <Text style={styles.label}>Hospital</Text>
                        <Text style={styles.value}>{hospitalCode?.toUpperCase()}</Text>
                    </View>
                    <Text style={styles.tinyUrl}>{baseUrl}</Text>
                </GlassCard>



                {/* Theme Selector */}
                <Text style={styles.sectionHeader}>Appearance</Text>
                <View style={{ flexDirection: 'row', gap: 12, marginBottom: SPACING.m }}>
                        {/* Light */}
                        <TouchableOpacity 
                        style={[styles.themeBtn, themeType === 'light' && { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' }]} 
                        onPress={() => setThemeType('light')}
                        >
                        <View style={[styles.colorBubble, { backgroundColor: '#f8fafc' }]} />
                        <Text style={[styles.themeText, themeType === 'light' && { color: COLORS.primary, fontFamily: FONTS.bold }]}>Clinical</Text>
                        </TouchableOpacity>

                        {/* Dark */}
                        <TouchableOpacity 
                        style={[styles.themeBtn, themeType === 'dark' && { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' }]} 
                        onPress={() => setThemeType('dark')}
                        >
                        <View style={[styles.colorBubble, { backgroundColor: '#0f172a' }]} />
                        <Text style={[styles.themeText, themeType === 'dark' && { color: COLORS.primary, fontFamily: FONTS.bold }]}>Midnight</Text>
                        </TouchableOpacity>

                        {/* Dim */}
                        <TouchableOpacity 
                        style={[styles.themeBtn, themeType === 'dim' && { borderColor: COLORS.primary, backgroundColor: COLORS.primary + '10' }]} 
                        onPress={() => setThemeType('dim')}
                        >
                        <View style={[styles.colorBubble, { backgroundColor: '#18181b' }]} />
                        <Text style={[styles.themeText, themeType === 'dim' && { color: COLORS.primary, fontFamily: FONTS.bold }]}>Dim</Text>
                        </TouchableOpacity>
                </View>

                {/* Actions */}
                <Text style={styles.sectionHeader}>Account</Text>
                <TouchableOpacity style={styles.actionBtn} onPress={logout}>
                    <LogOut size={20} color={COLORS.error} />
                    <Text style={[styles.actionText, { color: COLORS.error }]}>Log Out</Text>
                </TouchableOpacity>

            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.background },
    title: { fontFamily: FONTS.bold, fontSize: 32, color: COLORS.text, padding: SPACING.m },
    avatar: { width: 60, height: 60, borderRadius: 30, backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' },
    avatarText: { fontFamily: FONTS.bold, fontSize: 24, color: '#fff' },
    name: { fontFamily: FONTS.bold, fontSize: 20, color: COLORS.text },
    role: { fontFamily: FONTS.medium, fontSize: 14, color: COLORS.textSecondary },
    sectionHeader: { fontFamily: FONTS.bold, fontSize: 18, color: COLORS.text, marginBottom: 12, marginTop: 12 },
    row: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    label: { fontFamily: FONTS.medium, fontSize: 16, color: COLORS.textSecondary, marginLeft: 12, flex: 1 },
    value: { fontFamily: FONTS.bold, fontSize: 16, color: COLORS.text },
    tinyUrl: { fontFamily: FONTS.regular, fontSize: 10, color: COLORS.textMuted, marginTop: 4 },
    actionBtn: { flexDirection: 'row', alignItems: 'center', padding: 16, backgroundColor: COLORS.surface, borderRadius: 12, borderWidth: 1, borderColor: COLORS.border },
    actionText: { fontFamily: FONTS.bold, fontSize: 16, marginLeft: 12 },
    
    // Theme Selector
    themeBtn: { 
        flex: 1, 
        alignItems: 'center', 
        padding: 16, 
        borderRadius: 20, 
        borderWidth: 2, 
        borderColor: 'transparent', 
        backgroundColor: COLORS.surface,
        aspectRatio: 0.8,
        justifyContent: 'center',
    },
    colorBubble: { 
        width: 32, 
        height: 32, 
        borderRadius: 16, 
        borderWidth: 1, 
        borderColor: COLORS.border, 
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 2,
    },
    themeText: { 
        fontFamily: FONTS.medium, 
        fontSize: 13, 
        color: COLORS.textMuted 
    },
});
