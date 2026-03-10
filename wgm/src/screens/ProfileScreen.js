import React, { useContext, useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert, Switch } from 'react-native';
import { Text, Avatar, List, Divider, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import * as Battery from 'expo-battery';
import api from '../services/api';

export default function ProfileScreen({ navigation }) {
    const { userData, logout } = useContext(AuthContext);
    const [batteryLevel, setBatteryLevel] = useState(100);
    const [isDarkMode, setIsDarkMode] = useState(true);
    const [isVibration, setIsVibration] = useState(true);
    const [metrics, setMetrics] = useState({ patrols: '-', hours: '-', reports: '-' });

    useEffect(() => {
        Battery.getBatteryLevelAsync().then(l => setBatteryLevel(Math.round(l * 100)));
        fetchMetrics();
    }, []);

    const fetchMetrics = async () => {
        try {
            if (!userData?.id) return;
            const res = await api.get(`/security/guard/${userData.id}/metrics`);
            if (res.data.success) {
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
        <View style={styles.container}>
            {/* Header / Avatar */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
                </TouchableOpacity>
                <View style={styles.profileInfo}>
                    <Avatar.Text 
                        size={80} 
                        label={userData?.username?.substring(0, 2).toUpperCase() || "WG"} 
                        style={{ backgroundColor: '#00f3ff' }}
                        labelStyle={{ color: 'black', fontWeight: 'bold' }}
                    />
                    <Text style={styles.name}>{userData?.username || "Officer Wolf"}</Text>
                    <Text style={styles.role}>Security Guard • ID: {userData?.id || '---'}</Text>
                    <View style={styles.badgeRow}>
                        <View style={styles.badge}>
                            <Text style={styles.badgeText}>ZONE: {userData?.zone || 'SEC-4'}</Text>
                        </View>
                        <View style={[styles.badge, { backgroundColor: '#333' }]}>
                            <Text style={[styles.badgeText, { color: '#00f3ff' }]}>BAT: {batteryLevel}%</Text>
                        </View>
                    </View>
                </View>
            </View>

            <ScrollView style={styles.content}>
                {/* Stats Grid */}
                <Text style={styles.sectionTitle}>PERFORMANCE (THIS WEEK)</Text>
                <View style={styles.statsGrid}>
                    <StatBox label="Patrols" value={metrics.patrols} icon="shield-check" color="#4CD964" />
                    <StatBox label="Hours" value={metrics.hours} icon="clock-outline" color="#007AFF" />
                    <StatBox label="Reports" value={metrics.reports} icon="file-document-outline" color="#FF9500" />
                </View>

                <Divider style={styles.divider} />

                {/* Settings List */}
                <Text style={styles.sectionTitle}>APP SETTINGS</Text>
                <View style={styles.settingRow}>
                    <View>
                        <Text style={styles.settingLabel}>Dark Mode</Text>
                        <Text style={styles.settingSub}>Always on for tactical view</Text>
                    </View>
                    <Switch value={isDarkMode} onValueChange={setIsDarkMode} trackColor={{true: '#00f3ff'}} />
                </View>
                <View style={styles.settingRow}>
                    <View>
                        <Text style={styles.settingLabel}>Haptic Feedback</Text>
                        <Text style={styles.settingSub}>Vibrate on alerts & taps</Text>
                    </View>
                    <Switch value={isVibration} onValueChange={setIsVibration} trackColor={{true: '#00f3ff'}} />
                </View>

                <Divider style={styles.divider} />

                <List.Item
                    title="Help & Support"
                    left={props => <List.Icon {...props} icon="help-circle-outline" color="gray" />}
                    right={props => <List.Icon {...props} icon="chevron-right" color="#333" />}
                    onPress={() => Alert.alert("Support", "Contact Dispatch at +1-555-0199")}
                    titleStyle={{ color: '#333' }}
                />

                <Button 
                    mode="outlined" 
                    textColor="#FF3B30" 
                    style={styles.logoutBtn} 
                    contentStyle={{ height: 50 }}
                    onPress={handleLogout}
                    icon="logout"
                >
                    SIGN OUT
                </Button>
                
                <Text style={styles.version}>Wolf Guard Mobile v2.3.0 (Build 405)</Text>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F2F4F8' },
    header: { 
        backgroundColor: '#1c1c1e', padding: 20, paddingTop: 60, 
        borderBottomLeftRadius: 30, borderBottomRightRadius: 30,
        alignItems: 'center'
    },
    backBtn: { position: 'absolute', top: 50, left: 20, zIndex: 10 },
    profileInfo: { alignItems: 'center', marginTop: 10 },
    name: { color: 'white', fontSize: 22, fontWeight: 'bold', marginTop: 10 },
    role: { color: 'rgba(255,255,255,0.6)', fontSize: 14, marginTop: 2 },
    badgeRow: { flexDirection: 'row', marginTop: 15, gap: 10 },
    badge: { backgroundColor: '#007AFF', paddingVertical: 4, paddingHorizontal: 12, borderRadius: 20 },
    badgeText: { color: 'white', fontSize: 10, fontWeight: 'bold' },

    content: { padding: 20 },
    sectionTitle: { color: '#8E8E93', fontSize: 12, fontWeight: 'bold', marginBottom: 10, marginTop: 10 },
    
    statsGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    statBox: { 
        width: '31%', backgroundColor: 'white', padding: 15, borderRadius: 15, 
        alignItems: 'center', shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 10 
    },
    statValue: { fontSize: 20, fontWeight: 'bold', color: '#1C1C1E' },
    statLabel: { fontSize: 12, color: '#8E8E93', marginTop: 2 },

    divider: { marginVertical: 15, backgroundColor: '#E5E5EA' },

    settingRow: { 
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', 
        backgroundColor: 'white', padding: 15, borderRadius: 15, marginBottom: 10
    },
    settingLabel: { fontSize: 16, fontWeight: '600', color: '#1C1C1E' },
    settingSub: { fontSize: 12, color: '#8E8E93' },

    logoutBtn: { borderColor: '#FF3B30', marginTop: 20, borderWidth: 1, backgroundColor: 'white' },
    version: { textAlign: 'center', color: '#C7C7CC', fontSize: 12, marginTop: 30, marginBottom: 50 }
});
