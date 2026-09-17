import React, { useContext, useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, Avatar, List, Divider, Button, Switch } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as Battery from 'expo-battery';
import { AuthContext } from '../context/AuthContext';
import ScreenShell from '../components/ScreenShell';
import api from '../services/api';
import { COLORS } from '../theme';

export default function ProfileScreen({ navigation }) {
    const { userData, logout, dutyMode } = useContext(AuthContext);
    const [batteryLevel, setBatteryLevel] = useState(100);
    const [isVibration, setIsVibration] = useState(true);
    const [metrics, setMetrics] = useState({ patrols: '-', hours: '-', reports: '-' });

    useEffect(() => {
        try {
            Battery.getBatteryLevelAsync().then(l => setBatteryLevel(Math.round(l * 100)));
        } catch (e) {
            // Battery API fallback
        }
        fetchMetrics();
    }, []);

    const fetchMetrics = async () => {
        try {
            if (!userData?.id) return;
            const res = await api.get(`/security/guard/${userData.id}/metrics`);
            if (res.data?.success) {
                const data = res.data.data;
                setMetrics({
                    patrols: data.totalPatrols || 0,
                    hours: data.totalHours || 0,
                    reports: data.totalReports || 0
                });
            }
        } catch (e) {
            console.log('Failed to load metrics', e);
        }
    };

    const handleLogout = () => {
        Alert.alert(
            "Sign Out",
            "Are you sure you want to sign out? This will end your active session.",
            [
                { text: "Cancel", style: "cancel" },
                { text: "Sign Out", style: 'destructive', onPress: logout }
            ]
        );
    };

    const StatBox = ({ label, value, icon, color }) => (
        <View style={styles.statBox}>
            <MaterialCommunityIcons name={icon} size={24} color={color} style={{ marginBottom: 5 }} />
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statLabel}>{label}</Text>
        </View>
    );

    return (
        <ScreenShell
            title="Officer Profile"
            badgeText={dutyMode || 'OFFICER'}
            badgeColor={dutyMode === 'GATE' ? COLORS.accentOrange : dutyMode === 'RECEPTION' ? COLORS.accentPurple : COLORS.accent}
            showBack={true}
        >
            {/* Officer Hero Card */}
            <View style={styles.profileCard}>
                <Avatar.Text 
                    size={76} 
                    label={userData?.username?.substring(0, 2).toUpperCase() || "WG"} 
                    style={{ backgroundColor: COLORS.accent }}
                    labelStyle={{ color: COLORS.onAccent, fontWeight: 'bold' }}
                />
                <Text style={styles.name}>Officer {userData?.username || "Wolf"}</Text>
                <Text style={styles.role}>Security Guard • ID: #{userData?.id || '---'}</Text>
                <View style={styles.badgeRow}>
                    <View style={styles.badge}>
                        <Text style={styles.badgeText}>ZONE: {userData?.zone || 'SEC-4'}</Text>
                    </View>
                    <View style={[styles.badge, { backgroundColor: COLORS.surfaceElevated }]}>
                        <Text style={[styles.badgeText, { color: COLORS.accent }]}>BATTERY: {batteryLevel}%</Text>
                    </View>
                </View>
            </View>

            {/* Performance Stats Grid */}
            <Text style={styles.sectionTitle}>PERFORMANCE (THIS SHIFT)</Text>
            <View style={styles.statsGrid}>
                <StatBox label="Patrols" value={metrics.patrols} icon="shield-check" color={COLORS.statusGreen} />
                <StatBox label="Hours" value={metrics.hours} icon="clock-outline" color={COLORS.iosBlue} />
                <StatBox label="Reports" value={metrics.reports} icon="file-document-outline" color={COLORS.accentOrange} />
            </View>

            <Divider style={styles.divider} />

            {/* Shift & Duty Settings */}
            <Text style={styles.sectionTitle}>POST & DUTY SETTINGS</Text>
            
            {/* Phase 4: Switch Duty Post */}
            <List.Item
                title="Switch Duty Post"
                description={`Currently assigned to ${dutyMode || 'PATROL'} post`}
                left={props => <List.Icon {...props} icon="swap-horizontal" color={COLORS.accent} />}
                right={props => <List.Icon {...props} icon="chevron-right" color={COLORS.surfaceElevated} />}
                onPress={() => navigation.navigate('DutySelection')}
                titleStyle={{ color: COLORS.textPrimary, fontWeight: 'bold' }}
                descriptionStyle={{ color: COLORS.textMuted }}
                style={styles.listItem}
            />

            <Divider style={styles.divider} />

            {/* App Settings */}
            <Text style={styles.sectionTitle}>DEVICE SETTINGS</Text>
            <View style={styles.settingRow}>
                <View>
                    <Text style={styles.settingLabel}>Haptic Feedback</Text>
                    <Text style={styles.settingSub}>Vibrate on alerts & critical taps</Text>
                </View>
                <Switch 
                    value={isVibration} 
                    onValueChange={setIsVibration} 
                    trackColor={{ true: COLORS.accent, false: COLORS.surfaceElevated }} 
                    thumbColor={isVibration ? COLORS.onAccent : COLORS.textMuted}
                />
            </View>

            <Divider style={styles.divider} />

            <List.Item
                title="Command Center Support"
                description="Contact central security supervisor"
                left={props => <List.Icon {...props} icon="headset" color={COLORS.textMuted} />}
                right={props => <List.Icon {...props} icon="chevron-right" color={COLORS.surfaceElevated} />}
                onPress={() => Alert.alert("Command Dispatch", "Connecting to security supervisor channel on 185.213.27.158.")}
                titleStyle={{ color: COLORS.textPrimary }}
                descriptionStyle={{ color: COLORS.textMuted }}
                style={styles.listItem}
            />

            <Button 
                mode="outlined" 
                textColor={COLORS.statusRed} 
                style={styles.logoutBtn} 
                onPress={handleLogout}
                icon="logout"
                labelStyle={{ fontWeight: 'bold' }}
            >
                SIGN OUT
            </Button>
        </ScreenShell>
    );
}

const styles = StyleSheet.create({
    profileCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 18,
        padding: 20,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 20,
    },
    name: { 
        color: COLORS.textPrimary, 
        fontSize: 20, 
        fontWeight: 'bold', 
        marginTop: 10 
    },
    role: { 
        color: COLORS.textMuted, 
        fontSize: 13, 
        marginTop: 2 
    },
    badgeRow: { 
        flexDirection: 'row', 
        marginTop: 12, 
        gap: 8 
    },
    badge: { 
        backgroundColor: COLORS.card, 
        paddingHorizontal: 10, 
        paddingVertical: 4, 
        borderRadius: 6,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    badgeText: { 
        color: COLORS.textPrimary, 
        fontSize: 11, 
        fontWeight: 'bold' 
    },
    sectionTitle: { 
        color: COLORS.textMuted, 
        fontSize: 12, 
        fontWeight: 'bold', 
        letterSpacing: 0.5,
        marginBottom: 10,
        marginTop: 6,
    },
    statsGrid: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        marginBottom: 16,
    },
    statBox: { 
        flex: 1, 
        backgroundColor: COLORS.surface, 
        padding: 14, 
        borderRadius: 14, 
        alignItems: 'center', 
        marginHorizontal: 4,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    statValue: { 
        color: COLORS.textPrimary, 
        fontSize: 18, 
        fontWeight: 'bold' 
    },
    statLabel: { 
        color: COLORS.textMuted, 
        fontSize: 11, 
        marginTop: 2 
    },
    divider: { 
        backgroundColor: COLORS.border, 
        marginVertical: 14 
    },
    listItem: {
        paddingHorizontal: 0,
        paddingVertical: 4,
    },
    settingRow: { 
        flexDirection: 'row', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        paddingVertical: 6,
    },
    settingLabel: { 
        color: COLORS.textPrimary, 
        fontSize: 15, 
        fontWeight: '500' 
    },
    settingSub: { 
        color: COLORS.textMuted, 
        fontSize: 12, 
        marginTop: 2 
    },
    logoutBtn: { 
        borderColor: COLORS.statusRed, 
        borderRadius: 12, 
        marginTop: 24,
        paddingVertical: 4,
    }
});
