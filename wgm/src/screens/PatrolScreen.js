import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, Platform, FlatList, Alert } from 'react-native';
import { Text, Card, Avatar, IconButton } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Camera } from 'expo-camera';
import * as Battery from 'expo-battery';
import * as Haptics from 'expo-haptics';

import { AuthContext } from '../context/AuthContext';
import locationService from '../services/locationService';
import securityService from '../services/securityService';
import api from '../services/api';

// --- Components ---
const QuickAction = ({ icon, label, onPress, color = "#4A90E2" }) => (
    <TouchableOpacity style={styles.quickActionItem} onPress={onPress}>
        <View style={[styles.quickActionIcon, { backgroundColor: `${color}20` }]}>
            <MaterialCommunityIcons name={icon} size={28} color={color} />
        </View>
        <Text style={styles.quickActionLabel}>{label}</Text>
    </TouchableOpacity>
);

const ActivityItem = ({ time, title, sub }) => (
    <View style={styles.activityItem}>
        <View style={styles.activityTimeContainer}>
            <Text style={styles.activityTime}>{time}</Text>
            <View style={styles.timelineDot} />
            <View style={styles.timelineLine} />
        </View>
        <View style={styles.activityContent}>
            <Text style={styles.activityTitle}>{title}</Text>
            <Text style={styles.activitySub}>{sub}</Text>
        </View>
    </View>
);

export default function PatrolScreen({ navigation }) {
    const { userData, logout, dutyMode } = useContext(AuthContext);
    const [patrolActive, setPatrolActive] = useState(false);
    const [torchOn, setTorchOn] = useState(false);
    const [batteryLevel, setBatteryLevel] = useState(100);
    const [logs, setLogs] = useState([]);
    const [cameraPermission, setCameraPermission] = useState(null);
    
    // Battery level tracking
    useEffect(() => {
        const getBattery = async () => {
            const level = await Battery.getBatteryLevelAsync();
            setBatteryLevel(Math.round(level * 100));
        };
        getBattery();
        const subscription = Battery.addBatteryLevelListener(({ batteryLevel }) => {
            setBatteryLevel(Math.round(batteryLevel * 100));
        });
        return () => subscription?.remove();
    }, []);

    // Request camera permission
    useEffect(() => {
        (async () => {
            const { status } = await Camera.requestCameraPermissionsAsync();
            setCameraPermission(status === 'granted');
        })();
    }, []);

    // Toggle torch/flashlight
    const toggleTorch = async () => {
        try {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            setTorchOn(!torchOn);
        } catch (e) {
            console.log('Torch not available');
        }
    };

    // Start/stop patrol
    const handleStartPatrol = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
        if (!patrolActive) {
            setPatrolActive(true);
            setLogs(prev => [...prev, { id: Date.now(), time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), title: 'Patrol Started', sub: 'Location tracking active' }]);
        } else {
            setPatrolActive(false);
            setLogs(prev => [...prev, { id: Date.now(), time: new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}), title: 'Patrol Ended', sub: 'Session completed' }]);
        }
    };

    // SOS handler
    const handleSOS = async () => {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        Alert.alert(
            '🚨 EMERGENCY SOS',
            'This will send an immediate distress signal to the command center. Continue?',
            [
                { text: 'Cancel', style: 'cancel' },
                { text: 'SEND ALERT', style: 'destructive', onPress: () => {
                    Alert.alert('Alert Sent', 'Help is on the way. Stay calm.');
                }}
            ]
        );
    };

    // Filter Actions
    const isGate = dutyMode === 'GATE';
    const isPatrol = dutyMode === 'PATROL';
    const isReception = dutyMode === 'RECEPTION';

    return (
        <View style={styles.container}>
            {/* ... Torch ... */}

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerTop}>
                    <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
                        <Text style={styles.welcomeText}>Good Afternoon,</Text>
                        <Text style={styles.officerName}>Officer {userData?.username}</Text>
                        <View style={{flexDirection:'row', alignItems:'center'}}>
                            <Text style={{color:'#666', fontSize:10, fontWeight:'bold', letterSpacing:1}}>{dutyMode} MODE</Text>
                            <TouchableOpacity onPress={() => navigation.navigate('DutySelection')} style={{marginLeft: 10, padding: 4, backgroundColor: '#333', borderRadius: 4}}>
                                <MaterialCommunityIcons name="swap-horizontal" size={14} color="white" />
                            </TouchableOpacity>
                        </View>
                    </TouchableOpacity>
                    {/* Only show patrol status if NOT Gate mode */}
                    {isPatrol && (
                        <View style={styles.statusBadge}>
                           <View style={[styles.statusDot, { backgroundColor: patrolActive ? '#4CD964' : '#FF9500' }]} />
                           <Text style={styles.statusText}>{patrolActive ? 'ON PATROL' : 'STANDBY'}</Text>
                        </View>
                    )}
                </View>
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                
                {/* Quick Actions */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Quick Actions</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                        
                        {/* Always Visible */}
                        <QuickAction icon="notebook" label="Logbook" onPress={() => navigation.navigate('ShiftHandover')} color="#5E5CE6"/>

                        {/* RECEPTION Specific */}
                        {isReception && (
                            <>
                                <QuickAction icon="account-plus" label="New Visitor" onPress={() => navigation.navigate('VisitorEntry')} color="#AF52DE"/>
                                <QuickAction icon="qrcode-scan" label="Scan Invite" onPress={() => navigation.navigate('QRScanner')} color="#32ADE6"/>
                                <QuickAction icon="account-group" label="Checkouts" onPress={() => Alert.alert("Coming Soon", "Checkout List")} color="#FF9500"/>
                            </>
                        )}

                        {/* GATE Specific */}
                        {isGate && (
                            <>
                                <QuickAction icon="boom-gate" label="Parking" onPress={() => navigation.navigate('Parking')} color="#FF9500"/>
                                <QuickAction icon="package" label="Logistics" onPress={() => navigation.navigate('Logistics')} color="#32ADE6"/>
                                <QuickAction icon="alert-octagon" label="Citation" onPress={() => navigation.navigate('Violation')} color="#FF3B30"/>
                            </>
                        )}

                        {/* PATROL Specific */}
                        {isPatrol && (
                            <>
                                <QuickAction icon="camera" label="Camera" onPress={() => navigation.navigate('ReportIncident')} color="#32ADE6"/>
                                <QuickAction icon="door" label="Access" onPress={() => navigation.navigate('QRScanner')} color="#30B0C7"/>
                                <QuickAction icon={torchOn ? "flashlight-off" : "flashlight"} label={torchOn ? "Torch Off" : "Torch"} onPress={toggleTorch} color="#FF9F0A"/>
                            </>
                        )}
                        
                        <QuickAction icon="radio-handheld" label="Comms" onPress={() => navigation.navigate('Comms')} color="#FF375F"/>
                    </ScrollView>
                </View>

                {/* Hero Card: Start Patrol (Only for Patrol Mode) */}
                {isPatrol && (
                    <TouchableOpacity style={styles.heroCard} onPress={handleStartPatrol}>
                         <LinearGradient
                            colors={patrolActive ? ['#007AFF', '#5856D6'] : ['#2c3e50', '#34495e']}
                            style={styles.heroGradient}
                        >
                            <View style={styles.heroHeader}>
                                <MaterialCommunityIcons name={patrolActive ? "radar" : "shield-home"} size={32} color="white" />
                                <MaterialCommunityIcons name="battery-high" size={24} color="rgba(255,255,255,0.7)" />
                            </View>
                            
                            <View style={styles.heroContent}>
                                <Text style={styles.heroTitle}>
                                    {patrolActive ? "Patrol in Progress" : "Ready for Duty"}
                                </Text>
                                <Text style={styles.heroSub}>
                                    {patrolActive ? `Target: Sector ${userData?.zone || 'Unassigned'}` : "Tap here to start patrol"}
                                </Text>
                            </View>

                            <View style={styles.heroFooter}>
                                <Text style={styles.heroStat}>{batteryLevel}% Battery</Text>
                                <Text style={styles.heroStat}>{patrolActive ? 'Tracking Active' : 'Idle'}</Text>
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>
                )}

                {/* Gate Hero Card (For Gate Mode) */}
                {isGate && (
                     <TouchableOpacity style={styles.heroCard} onPress={() => navigation.navigate('Parking')}>
                         <LinearGradient colors={['#FF9500', '#FF5E3A']} style={styles.heroGradient}>
                            <View style={styles.heroHeader}>
                                <MaterialCommunityIcons name="boom-gate-up" size={32} color="white" />
                                <Text style={{color:'white', fontWeight:'bold'}}>GATE MODE</Text>
                            </View>
                            <View style={styles.heroContent}>
                                <Text style={styles.heroTitle}>Vehicle Control</Text>
                                <Text style={styles.heroSub}>Manage entry, exit and billing.</Text>
                            </View>
                         </LinearGradient>
                     </TouchableOpacity>
                )}

                {/* Reception Hero Card (For Reception Mode) */}
                {isReception && (
                     <TouchableOpacity style={styles.heroCard} onPress={() => navigation.navigate('VisitorEntry')}>
                         <LinearGradient colors={['#AF52DE', '#5856D6']} style={styles.heroGradient}>
                            <View style={styles.heroHeader}>
                                <MaterialCommunityIcons name="desk" size={32} color="white" />
                                <Text style={{color:'white', fontWeight:'bold'}}>RECEPTION</Text>
                            </View>
                            <View style={styles.heroContent}>
                                <Text style={styles.heroTitle}>Visitor Log</Text>
                                <Text style={styles.heroSub}>Process Walk-ins and Invites.</Text>
                            </View>
                         </LinearGradient>
                     </TouchableOpacity>
                )}

                {/* Recent Activity Feed */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Recent Activity</Text>

                    <View style={styles.feedContainer}>
                        {logs.length === 0 ? (
                            <Text style={{color: '#8E8E93', textAlign: 'center', padding: 20}}>No activity recorded this session.</Text>
                        ) : (
                            logs.map(log => (
                                <ActivityItem key={log.id} {...log} />
                            ))
                        )}
                    </View>
                </View>

            </ScrollView>

            {/* 5. Safe SOS Floating Action Button */}
            <TouchableOpacity style={styles.fabSOS} onPress={handleSOS} onLongPress={handleSOS}>
                <MaterialCommunityIcons name="alarm-light-outline" size={28} color="white" />
                <Text style={styles.fabText}>SOS</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F2F4F8' }, // Soft Grey Background
    
    header: { padding: 20, paddingTop: 60, backgroundColor: 'white', paddingBottom: 15 },
    headerTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    welcomeText: { color: '#8E8E93', fontSize: 14, fontWeight: '600' },
    officerName: { color: '#1C1C1E', fontSize: 22, fontWeight: 'bold' },
    statusBadge: { 
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#F2F4F8', 
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 
    },
    statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
    statusText: { fontSize: 12, fontWeight: 'bold', color: '#3A3A3C' },

    content: { padding: 20 },

    section: { marginBottom: 25 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#1C1C1E', marginBottom: 15 },
    
    horizontalScroll: { flexDirection: 'row', marginLeft: -5 },
    quickActionItem: { alignItems: 'center', marginRight: 20, width: 70 },
    quickActionIcon: { 
        width: 60, height: 60, borderRadius: 20, 
        justifyContent: 'center', alignItems: 'center', marginBottom: 8 
    },
    quickActionLabel: { fontSize: 12, color: '#3A3A3C', fontWeight: '500' },

    heroCard: { 
        borderRadius: 24, marginBottom: 30, 
        shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, 
        shadowOpacity: 0.1, shadowRadius: 20, elevation: 5 
    },
    heroGradient: { padding: 20, borderRadius: 24, height: 180, justifyContent: 'space-between' },
    heroHeader: { flexDirection: 'row', justifyContent: 'space-between' },
    heroTitle: { color: 'white', fontSize: 24, fontWeight: 'bold' },
    heroSub: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 5 },
    heroFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 },
    heroStat: { color: 'rgba(255,255,255,0.9)', fontSize: 12, fontWeight: '600' },

    feedContainer: { backgroundColor: 'white', borderRadius: 20, padding: 20 },
    activityItem: { flexDirection: 'row', marginBottom: 20 },
    activityTimeContainer: { width: 70, alignItems: 'flex-end', marginRight: 15 },
    activityTime: { fontSize: 12, color: '#8E8E93', fontWeight: '600', marginBottom: 5 },
    timelineDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: '#E5E5EA', position: 'absolute', right: -20, top: 4 },
    timelineLine: { width: 2, height: '100%', backgroundColor: '#F2F4F8', position: 'absolute', right: -16, top: 14 },
    activityContent: { flex: 1 },
    activityTitle: { fontSize: 14, fontWeight: 'bold', color: '#1C1C1E' },
    activitySub: { fontSize: 12, color: '#8E8E93', marginTop: 2 },

    fabSOS: {
        position: 'absolute', bottom: 30, alignSelf: 'center',
        backgroundColor: '#FF3B30', paddingHorizontal: 30, paddingVertical: 15,
        borderRadius: 30, flexDirection: 'row', alignItems: 'center',
        shadowColor: "#FF3B30", shadowOffset: { width: 0, height: 5 },
        shadowOpacity: 0.3, shadowRadius: 10, elevation: 5
    },
    fabText: { color: 'white', fontWeight: 'bold', fontSize: 16, marginLeft: 8 }
});
