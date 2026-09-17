import React, { useState, useEffect, useContext, useRef } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { Text } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { Camera } from 'expo-camera';
import * as Battery from 'expo-battery';
import * as Haptics from 'expo-haptics';
import * as SecureStore from 'expo-secure-store';
import * as Location from 'expo-location';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { AuthContext } from '../context/AuthContext';
import locationService from '../services/locationService';
import securityService from '../services/securityService';
import socketService from '../services/socketService';
import TacticalIcon from '../components/TacticalIcon';
import { COLORS, MODE_ACCENTS } from '../theme';

// WP2: patrol persistence + hold-to-confirm SOS
const ACTIVE_PATROL_KEY = 'active_patrol_id';
const SOS_HOLD_MS = 3000;

// Safe error message extractor to prevent React Native DialogModule crash when passing objects
const extractErrorMessage = (err, fallback) => {
    if (!err) return fallback;
    const raw = err.response?.data?.error || err.response?.data?.message || err.message;
    if (typeof raw === 'string') return raw;
    if (raw && typeof raw === 'object') return raw.message || JSON.stringify(raw);
    return fallback;
};

export default function PatrolScreen({ navigation }) {
    const { userData, dutyMode } = useContext(AuthContext);
    const [patrolActive, setPatrolActive] = useState(false);
    const [activePatrolId, setActivePatrolId] = useState(null);
    const [torchOn, setTorchOn] = useState(false);
    const [batteryLevel, setBatteryLevel] = useState(100);
    const [currentFloor, setCurrentFloor] = useState(1);
    const [cameraPermission, setCameraPermission] = useState(null);
    const [sosHoldProgress, setSosHoldProgress] = useState(0);
    const [hqPingModal, setHqPingModal] = useState({ visible: false, from: '', time: '' });
    const [hqPhotoModal, setHqPhotoModal] = useState({ visible: false, from: '', time: '' });
    const [logs, setLogs] = useState([
        {
            id: 'init-shift',
            time: '14:00',
            title: 'Shift Authorization Active',
            sub: `Officer ${userData?.username || 'Kumar'} deployed at ${dutyMode || 'PATROL'} station.`
        }
    ]);

    const sosTimerRef = useRef(null);
    const sosStartRef = useRef(null);
    const sosHoldFiredRef = useRef(false);
    const locationInitRef = useRef(false);
    const insets = useSafeAreaInsets();

    // WP2: Init locationService once per app session (singleton guard)
    const ensureLocationInit = async () => {
        if (locationInitRef.current) return true;
        locationInitRef.current = true;
        try {
            locationService.setGuardId(userData?.id);
            await locationService.init();
            return true;
        } catch (e) {
            locationInitRef.current = false;
            console.warn('[Patrol] locationService.init failed — patrol runs without tracking', e);
            return false;
        }
    };

    // WP2: Restore active patrol from SecureStore on mount
    useEffect(() => {
        const restorePatrol = async () => {
            try {
                const storedId = await SecureStore.getItemAsync(ACTIVE_PATROL_KEY);
                if (storedId) {
                    setActivePatrolId(storedId);
                    setPatrolActive(true);
                    await ensureLocationInit();
                    locationService.setReportingEnabled(true);
                    setLogs(prev => [...prev, {
                        id: Date.now(),
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        title: 'Patrol Resumed',
                        sub: `Session restored (ID: ${storedId})`
                    }]);
                }
            } catch (e) {
                console.warn('[Patrol] Failed to restore patrol state', e);
            }
        };
        restorePatrol();
    }, []);

    // Battery level tracking & telemetry sync
    useEffect(() => {
        const getBattery = async () => {
            try {
                const level = await Battery.getBatteryLevelAsync();
                const pct = Math.round(level * 100);
                setBatteryLevel(pct);
                locationService.setTelemetry(pct);
            } catch (e) {
                // Battery API fallback
            }
        };
        getBattery();
        const subscription = Battery.addBatteryLevelListener(({ batteryLevel: bLevel }) => {
            const pct = Math.round(bLevel * 100);
            setBatteryLevel(pct);
            locationService.setTelemetry(pct);
        });
        return () => subscription?.remove();
    }, []);

    // Floor tracking listener
    useEffect(() => {
        const unsub = locationService.onFloorChange((floor) => {
            setCurrentFloor(floor);
        });
        return () => unsub && unsub();
    }, []);

    // Continuous Duty Session & SOC Socket Connection
    useEffect(() => {
        let isMounted = true;
        const initDutySOC = async () => {
            try {
                // 1. Connect real-time socket to SOC
                await socketService.connect();

                // 2. Initialize location tracking & activate duty reporting
                if (isMounted) {
                    await ensureLocationInit();
                    locationService.setReportingEnabled(true);
                }
            } catch (e) {
                console.warn('[PatrolScreen] Duty SOC connection error:', e);
            }
        };
        initDutySOC();

        // 3. Listen for HQ Command Centre Ping
        const unsubPing = socketService.onPing(async (data) => {
            console.log('[PatrolScreen] HQ Ping Received:', data);
            try {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            } catch (e) {}

            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            setHqPingModal({
                visible: true,
                from: data.from || 'Command Centre',
                time: timeStr
            });

            setLogs(prev => [{
                id: Date.now(),
                time: timeStr,
                title: 'HQ Status Ping Received',
                sub: `Pinged by ${data.from || 'HQ'} — Location & battery heartbeat synced`
            }, ...prev]);

            // Immediately send fresh telemetry update acknowledging ping
            await locationService.reportNow();
        });

        // 4. Listen for HQ Photo Request
        const unsubPhoto = socketService.onRequestPhoto(async (data) => {
            console.log('[PatrolScreen] HQ Photo Request Received:', data);
            try {
                await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            } catch (e) {}

            const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            setHqPhotoModal({
                visible: true,
                from: data.from || 'Command Centre',
                time: timeStr
            });

            setLogs(prev => [{
                id: Date.now(),
                time: timeStr,
                title: 'HQ Photo Requested',
                sub: `Requested by ${data.from || 'HQ'} — Tap to submit on-site photo`
            }, ...prev]);
        });

        return () => {
            isMounted = false;
            unsubPing?.();
            unsubPhoto?.();
        };
    }, [userData?.id]);

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

    // WP2: Start/stop patrol — wired to securityService API + SecureStore
    const handleStartPatrol = async () => {
        await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        if (!patrolActive) {
            // --- START PATROL ---
            try {
                const res = await securityService.startPatrol(userData?.id);
                if (res.data?.success && res.data?.data?.id) {
                    const patrolId = String(res.data.data.id);
                    setActivePatrolId(patrolId);
                    setPatrolActive(true);
                    await SecureStore.setItemAsync(ACTIVE_PATROL_KEY, patrolId);
                    const gpsOk = await ensureLocationInit();
                    locationService.setReportingEnabled(true);
                    setLogs(prev => [...prev, {
                        id: Date.now(),
                        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                        title: 'Patrol Started',
                        sub: `Session ID: ${patrolId} — ${gpsOk ? 'Location tracking active' : 'Started WITHOUT GPS tracking'}`
                    }]);
                } else {
                    Alert.alert('Patrol Error', 'Server did not return a valid patrol session.');
                }
            } catch (e) {
                Alert.alert('Patrol Start Failed', extractErrorMessage(e, 'Could not start patrol. Check your connection.'));
            }
        } else {
            // --- STOP PATROL ---
            try {
                await securityService.endPatrol(activePatrolId, '');
                locationService.setReportingEnabled(false);
                await SecureStore.deleteItemAsync(ACTIVE_PATROL_KEY);
                setPatrolActive(false);
                setActivePatrolId(null);
                setLogs(prev => [...prev, {
                    id: Date.now(),
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    title: 'Patrol Ended',
                    sub: 'Session completed — tracking stopped'
                }]);
            } catch (e) {
                Alert.alert('Patrol End Failed', extractErrorMessage(e, 'Could not end patrol.'));
            }
        }
    };

    // WP2: SOS handler — hold-to-confirm (3s) + GPS fallback + API call
    const getSOSPosition = async () => {
        const cached = locationService.currentPosition;
        if (cached && cached.latitude !== 0 && cached.longitude !== 0) {
            return cached;
        }
        try {
            const loc = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.BestForNavigation,
                timeout: 5000,
            });
            return {
                latitude: loc.coords.latitude,
                longitude: loc.coords.longitude,
                heading: loc.coords.heading || 0,
            };
        } catch (e) {
            return null;
        }
    };

    const cycleFloor = () => {
        // Cycle: L1 -> L2 -> B1 -> L1
        const floors = [1, 2, -1];
        const nextIdx = (floors.indexOf(currentFloor) + 1) % floors.length;
        const nextFloor = floors[nextIdx] !== undefined ? floors[nextIdx] : 1;
        locationService.setFloor(nextFloor, true);
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        } catch (e) {}
        setLogs(prev => [{
            id: Date.now(),
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            title: `Floor Set: ${nextFloor <= 0 ? 'B' + (Math.abs(nextFloor) + 1) : 'L' + nextFloor}`,
            sub: 'Telemetry re-anchored to hospital level'
        }, ...prev]);
    };

    const handleSOSStart = () => {
        sosStartRef.current = Date.now();
        sosHoldFiredRef.current = false;
        setSosHoldProgress(0);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);

        sosTimerRef.current = setInterval(() => {
            const elapsed = Date.now() - sosStartRef.current;
            const progress = Math.min(elapsed / SOS_HOLD_MS, 1);
            setSosHoldProgress(progress);

            if (progress >= 1) {
                clearInterval(sosTimerRef.current);
                sosTimerRef.current = null;
                fireSOS();
            }
        }, 50);
    };

    const handleSOSRelease = () => {
        if (sosTimerRef.current) {
            clearInterval(sosTimerRef.current);
            sosTimerRef.current = null;
        }
        setSosHoldProgress(0);
    };

    const handleSOSTap = () => {
        if (!sosHoldProgress && !sosHoldFiredRef.current) {
            Alert.alert('Hold to Send SOS', 'Press and hold the SOS button for 3 seconds to dispatch an emergency alert.');
        }
    };

    const fireSOS = async () => {
        sosHoldFiredRef.current = true;
        setSosHoldProgress(0);
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        const position = await getSOSPosition();
        if (!position) {
            Alert.alert('Location Unavailable', 'Cannot determine your location. SOS not sent. Please enable GPS and try again.');
            setSosHoldProgress(0);
            return;
        }
        try {
            const res = await securityService.triggerSOS(position.latitude, position.longitude, position.heading || 0);
            if (res.data?.success) {
                Alert.alert('🚨 SOS Sent', 'Emergency alert dispatched to Command Center. Help is on the way.');
                setLogs(prev => [...prev, {
                    id: Date.now(),
                    time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
                    title: '🚨 SOS TRIGGERED',
                    sub: `Location: ${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)}`
                }]);
            } else {
                Alert.alert('SOS Failed', 'Server did not confirm the alert. Try again.');
            }
        } catch (e) {
            Alert.alert('SOS Failed', extractErrorMessage(e, 'Could not send SOS. Check connection and retry.'));
        }
        setSosHoldProgress(0);
    };

    // Duty Mode configuration
    const isGate = dutyMode === 'GATE';
    const isPatrol = dutyMode === 'PATROL';
    const isReception = dutyMode === 'RECEPTION';

    const currentMode = isGate ? 'gate' : isReception ? 'reception' : 'patrol';
    const modeConfig = MODE_ACCENTS[currentMode];

    // Quick Action Tile Subcomponent
    const ActionTile = ({ icon, title, subtitle, onPress, color }) => (
        <TouchableOpacity 
            style={styles.actionTile} 
            onPress={onPress} 
            activeOpacity={0.8}
        >
            <View style={[styles.actionIconPod, { borderColor: `${color}40`, backgroundColor: `${color}15` }]}>
                <TacticalIcon name={icon} size={24} color={color} />
            </View>
            <View style={styles.actionTileTextCol}>
                <Text numberOfLines={1} style={styles.actionTileTitle}>{title}</Text>
                <Text numberOfLines={1} style={styles.actionTileSubtitle}>{subtitle}</Text>
            </View>
            <TacticalIcon name="chevron-right" size={16} color={COLORS.textMuted} />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {/* Tactical Command Header */}
            <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
                {/* Facility Identifier Bar */}
                <View style={styles.facilityRow}>
                    <View style={styles.facilityIdentity}>
                        <View style={styles.facilityShield}>
                            <TacticalIcon name="shield-account" size={14} color={COLORS.accent} />
                        </View>
                        <Text style={styles.facilityName}>WOLF HMS • SECURE CAMPUS ALPHA</Text>
                    </View>
                    <View style={styles.statusPill}>
                        <View style={[styles.statusDot, { backgroundColor: COLORS.statusGreen }]} />
                        <Text style={styles.statusPillText}>ONLINE • LIVE</Text>
                    </View>
                </View>

                {/* Officer & Duty Mode Row */}
                <View style={styles.officerRow}>
                    <View style={styles.officerGreetingCol}>
                        <Text style={styles.officerGreetingLabel}>SECURITY OFFICER ON DUTY</Text>
                        <Text style={styles.officerNameText}>
                            Officer {userData?.username || 'Kumar'}
                        </Text>
                    </View>

                    {/* Duty Station Badge + Switch Trigger */}
                    <View style={styles.dutyStationCol}>
                        <View style={[styles.stationBadge, { borderColor: modeConfig.primary }]}>
                            <TacticalIcon name={modeConfig.icon} size={14} color={modeConfig.primary} style={{ marginRight: 6 }} />
                            <Text style={[styles.stationBadgeText, { color: modeConfig.primary }]}>
                                {modeConfig.label}
                            </Text>
                        </View>
                        <TouchableOpacity 
                            onPress={() => navigation.navigate('DutySelection')} 
                            style={styles.switchStationBtn}
                            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            activeOpacity={0.75}
                        >
                            <TacticalIcon name="swap-horizontal" size={12} color={COLORS.textPrimary} />
                            <Text style={styles.switchStationText}>Switch</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Telemetry Strip (Battery, Torch, GPS, Floor) */}
                <View style={styles.telemetryRow}>
                    <View style={styles.telemetryPill}>
                        <View style={[styles.telemetryDot, { backgroundColor: batteryLevel > 20 ? COLORS.statusGreen : COLORS.statusRed }]} />
                        <Text style={styles.telemetryText}>{batteryLevel}% Battery</Text>
                    </View>

                    <TouchableOpacity 
                        onPress={toggleTorch} 
                        style={[styles.telemetryPill, torchOn && styles.telemetryPillActive]}
                        activeOpacity={0.8}
                    >
                        <TacticalIcon 
                            name={torchOn ? "flashlight" : "flashlight-off"} 
                            size={13} 
                            color={torchOn ? COLORS.accentOrange : COLORS.textMuted} 
                        />
                        <Text style={[styles.telemetryText, torchOn && { color: COLORS.accentOrange, fontWeight: 'bold' }]}>
                            Torch: {torchOn ? 'ON' : 'OFF'}
                        </Text>
                    </TouchableOpacity>

                    <View style={styles.telemetryPill}>
                        <View style={[styles.telemetryDot, { backgroundColor: COLORS.accent }]} />
                        <Text style={styles.telemetryText}>GPS Fix</Text>
                    </View>

                    <TouchableOpacity 
                        onPress={cycleFloor}
                        style={[styles.telemetryPill, { borderColor: `${COLORS.accent}60`, backgroundColor: `${COLORS.accent}15` }]}
                        activeOpacity={0.8}
                    >
                        <View style={[styles.telemetryDot, { backgroundColor: COLORS.accent }]} />
                        <Text style={[styles.telemetryText, { color: COLORS.accent, fontWeight: 'bold' }]}>
                            {currentFloor <= 0 ? `B${Math.abs(currentFloor) + 1}` : `L${currentFloor}`} Floor
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Scrollable Mission HUD */}
            <ScrollView 
                style={styles.content} 
                contentContainerStyle={{ paddingBottom: 85 + insets.bottom + 24, paddingTop: 14, paddingHorizontal: 16 }}
                showsVerticalScrollIndicator={false}
            >
                {/* Section: Primary Mission Command Card */}
                {isPatrol && (
                    <View style={[styles.missionCard, { borderColor: modeConfig.border }]}>
                        <LinearGradient 
                            colors={modeConfig.gradient} 
                            start={{ x: 0, y: 0 }} 
                            end={{ x: 1, y: 0 }} 
                            style={styles.cardTopBevel} 
                        />
                        <View style={styles.missionCardHeader}>
                            <View style={[styles.missionIconPedestal, { backgroundColor: `${modeConfig.primary}18`, borderColor: `${modeConfig.primary}50` }]}>
                                <TacticalIcon name={patrolActive ? "radar" : "shield-account"} size={30} color={modeConfig.primary} />
                            </View>
                            <View style={styles.missionInfoCol}>
                                <View style={styles.missionBeaconRow}>
                                    <View style={[styles.beaconDot, { backgroundColor: patrolActive ? COLORS.statusGreen : COLORS.accentOrange }]} />
                                    <Text style={[styles.beaconText, { color: patrolActive ? COLORS.statusGreen : COLORS.accentOrange }]}>
                                        {patrolActive ? 'TRACKING SQUAD ACTIVE' : 'PATROL STANDBY READY'}
                                    </Text>
                                </View>
                                <Text style={styles.missionTitle}>Premises Patrol Unit</Text>
                                <Text style={styles.missionSub}>
                                    {patrolActive ? `Assigned: Sector Alpha (${userData?.zone || 'Main'})` : '12 Perimeter checkpoints scheduled for tour'}
                                </Text>
                            </View>
                        </View>

                        <TouchableOpacity 
                            onPress={handleStartPatrol} 
                            style={[styles.missionActionBtn, { backgroundColor: patrolActive ? COLORS.dangerDark : COLORS.surfaceElevated, borderColor: patrolActive ? COLORS.danger : modeConfig.primary }]}
                            activeOpacity={0.85}
                        >
                            <Text style={[styles.missionActionText, { color: patrolActive ? COLORS.textPrimary : modeConfig.primary }]}>
                                {patrolActive ? 'TERMINATE PATROL TOUR' : 'INITIATE ACTIVE PATROL ROUND →'}
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {isGate && (
                    <View style={[styles.missionCard, { borderColor: modeConfig.border }]}>
                        <LinearGradient 
                            colors={modeConfig.gradient} 
                            start={{ x: 0, y: 0 }} 
                            end={{ x: 1, y: 0 }} 
                            style={styles.cardTopBevel} 
                        />
                        <View style={styles.missionCardHeader}>
                            <View style={[styles.missionIconPedestal, { backgroundColor: `${modeConfig.primary}18`, borderColor: `${modeConfig.primary}50` }]}>
                                <TacticalIcon name="boom-gate-up" size={30} color={modeConfig.primary} />
                            </View>
                            <View style={styles.missionInfoCol}>
                                <View style={styles.missionBeaconRow}>
                                    <View style={[styles.beaconDot, { backgroundColor: COLORS.statusGreen }]} />
                                    <Text style={[styles.beaconText, { color: COLORS.statusGreen }]}>
                                        ANPR BARRIER ARMED
                                    </Text>
                                </View>
                                <Text style={styles.missionTitle}>Perimeter Gate Control</Text>
                                <Text style={styles.missionSub}>Automated license plate recognition & vehicle entry</Text>
                            </View>
                        </View>

                        <TouchableOpacity 
                            onPress={() => navigation.navigate('Parking')} 
                            style={[styles.missionActionBtn, { backgroundColor: COLORS.surfaceElevated, borderColor: modeConfig.primary }]}
                            activeOpacity={0.85}
                        >
                            <Text style={[styles.missionActionText, { color: modeConfig.primary }]}>
                                OPEN ANPR VEHICLE SCANNER →
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {isReception && (
                    <View style={[styles.missionCard, { borderColor: modeConfig.border }]}>
                        <LinearGradient 
                            colors={modeConfig.gradient} 
                            start={{ x: 0, y: 0 }} 
                            end={{ x: 1, y: 0 }} 
                            style={styles.cardTopBevel} 
                        />
                        <View style={styles.missionCardHeader}>
                            <View style={[styles.missionIconPedestal, { backgroundColor: `${modeConfig.primary}18`, borderColor: `${modeConfig.primary}50` }]}>
                                <TacticalIcon name="desk" size={30} color={modeConfig.primary} />
                            </View>
                            <View style={styles.missionInfoCol}>
                                <View style={styles.missionBeaconRow}>
                                    <View style={[styles.beaconDot, { backgroundColor: COLORS.statusGreen }]} />
                                    <Text style={[styles.beaconText, { color: COLORS.statusGreen }]}>
                                        RECEPTION TERMINAL ONLINE
                                    </Text>
                                </View>
                                <Text style={styles.missionTitle}>Executive Lobby Desk</Text>
                                <Text style={styles.missionSub}>Visitor badges, host invitations & arrival registry</Text>
                            </View>
                        </View>

                        <TouchableOpacity 
                            onPress={() => navigation.navigate('VisitorEntry')} 
                            style={[styles.missionActionBtn, { backgroundColor: COLORS.surfaceElevated, borderColor: modeConfig.primary }]}
                            activeOpacity={0.85}
                        >
                            <Text style={[styles.missionActionText, { color: modeConfig.primary }]}>
                                REGISTER NEW VISITOR →
                            </Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Section: Tactical 2x2 Action Matrix */}
                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>TACTICAL OPERATIONS</Text>
                    <Text style={styles.sectionMeta}>STATION TOOLS</Text>
                </View>

                <View style={styles.actionGrid}>
                    {/* Mode Specific Tools */}
                    {isGate && (
                        <>
                            <ActionTile 
                                icon="boom-gate-up" 
                                title="ANPR Parking" 
                                subtitle="Plate check-in" 
                                onPress={() => navigation.navigate('Parking')} 
                                color={COLORS.accentOrange} 
                            />
                            <ActionTile 
                                icon="package" 
                                title="Logistics" 
                                subtitle="Freight arrival" 
                                onPress={() => navigation.navigate('Logistics')} 
                                color={COLORS.accentBlue} 
                            />
                            <ActionTile 
                                icon="alert-octagon" 
                                title="Citation" 
                                subtitle="Violation log" 
                                onPress={() => navigation.navigate('Violation')} 
                                color={COLORS.statusRed} 
                            />
                            <ActionTile 
                                icon="notebook" 
                                title="Logbook" 
                                subtitle="Shift handover" 
                                onPress={() => navigation.navigate('ShiftHandover')} 
                                color={COLORS.accentIndigo} 
                            />
                        </>
                    )}

                    {isPatrol && (
                        <>
                            <ActionTile 
                                icon="qrcode-scan" 
                                title="Checkpoint" 
                                subtitle="NFC / QR tour" 
                                onPress={() => navigation.navigate('QRScanner')} 
                                color={COLORS.accentBlue} 
                            />
                            <ActionTile 
                                icon="camera" 
                                title="Incident" 
                                subtitle="Dispatch alert" 
                                onPress={() => navigation.navigate('ReportIncident')} 
                                color={COLORS.accentTeal} 
                            />
                            <ActionTile 
                                icon="radio-handheld" 
                                title="Radio Comms" 
                                subtitle="Voice channel" 
                                onPress={() => navigation.navigate('Comms')} 
                                color={COLORS.accentRed} 
                            />
                            <ActionTile 
                                icon="notebook" 
                                title="Logbook" 
                                subtitle="Shift handover" 
                                onPress={() => navigation.navigate('ShiftHandover')} 
                                color={COLORS.accentIndigo} 
                            />
                        </>
                    )}

                    {isReception && (
                        <>
                            <ActionTile 
                                icon="account-plus" 
                                title="New Visitor" 
                                subtitle="Badge pass" 
                                onPress={() => navigation.navigate('VisitorEntry')} 
                                color={COLORS.accentPurple} 
                            />
                            <ActionTile 
                                icon="qrcode-scan" 
                                title="Verify Invite" 
                                subtitle="Scan guest QR" 
                                onPress={() => navigation.navigate('QRScanner')} 
                                color={COLORS.accentBlue} 
                            />
                            <ActionTile 
                                icon="account-group" 
                                title="Checkouts" 
                                subtitle="Visitor register" 
                                onPress={() => Alert.alert("Coming Soon in v2", "Visitor checkout register is under development.")} 
                                color={COLORS.accentOrange} 
                            />
                            <ActionTile 
                                icon="notebook" 
                                title="Logbook" 
                                subtitle="Shift handover" 
                                onPress={() => navigation.navigate('ShiftHandover')} 
                                color={COLORS.accentIndigo} 
                            />
                        </>
                    )}
                </View>

                {/* Section: Shift Activity Timeline */}
                <View style={styles.sectionHeaderRow}>
                    <Text style={styles.sectionTitle}>SHIFT EVENT TIMELINE</Text>
                    <Text style={styles.sectionMeta}>AUDIT LOG</Text>
                </View>

                <View style={styles.timelineContainer}>
                    {logs.map((log, index) => (
                        <View key={log.id} style={styles.timelineRow}>
                            <View style={styles.timelineTrackCol}>
                                <View style={[styles.timelineNode, { backgroundColor: index === 0 ? COLORS.accent : COLORS.statusGreen }]} />
                                {index < logs.length - 1 && <View style={styles.timelineLine} />}
                            </View>
                            <View style={styles.timelineContentCol}>
                                <View style={styles.timelineTimeRow}>
                                    <Text style={styles.timelineTitleText}>{log.title}</Text>
                                    <Text style={styles.timelineTimeText}>{log.time}</Text>
                                </View>
                                <Text style={styles.timelineSubText}>{log.sub}</Text>
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>

            {/* WP2: Hold-to-confirm SOS FAB with depth ring */}
            <View style={[styles.sosContainer, { bottom: insets.bottom + 95 }]}>
                <TouchableOpacity
                    style={[
                        styles.fabSOS, 
                        sosHoldProgress > 0 && styles.fabSOSActive
                    ]}
                    onPress={handleSOSTap}
                    onPressIn={handleSOSStart}
                    onPressOut={handleSOSRelease}
                    activeOpacity={0.85}
                >
                    {sosHoldProgress > 0 && (
                        <View style={[styles.sosProgressBg, { width: `${sosHoldProgress * 100}%` }]} />
                    )}
                    <TacticalIcon name="alarm-light" size={22} color={COLORS.textPrimary} style={{ marginRight: 6 }} />
                    <Text style={styles.fabText}>
                        {sosHoldProgress > 0 ? `HOLD ${Math.ceil(SOS_HOLD_MS / 1000 * (1 - sosHoldProgress))}s` : 'EMERGENCY SOS'}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Tactical HQ Ping Received Modal */}
            {hqPingModal.visible && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeaderRow}>
                            <TacticalIcon name="alarm-light" size={24} color={COLORS.accentOrange} />
                            <Text style={styles.modalTitle}>HQ STATUS CHECK</Text>
                        </View>
                        <Text style={styles.modalBody}>
                            Command Centre ({hqPingModal.from || 'HQ'}) has pinged your station at {hqPingModal.time}.
                        </Text>
                        <Text style={styles.modalSub}>
                            Live GPS beacon and battery ({batteryLevel}%) confirmed with HQ.
                        </Text>
                        <TouchableOpacity
                            style={styles.modalBtn}
                            onPress={async () => {
                                try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); } catch (e) {}
                                setHqPingModal({ visible: false, from: '', time: '' });
                            }}
                        >
                            <Text style={styles.modalBtnText}>ACKNOWLEDGE & DISMISS</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Tactical HQ Photo Request Modal */}
            {hqPhotoModal.visible && (
                <View style={styles.modalOverlay}>
                    <View style={styles.modalCard}>
                        <View style={styles.modalHeaderRow}>
                            <TacticalIcon name="camera" size={24} color={COLORS.accentTeal} />
                            <Text style={styles.modalTitle}>HQ PHOTO REQUEST</Text>
                        </View>
                        <Text style={styles.modalBody}>
                            Command Centre ({hqPhotoModal.from || 'HQ'}) requested an on-site photo of your station.
                        </Text>
                        <View style={styles.modalBtnRow}>
                            <TouchableOpacity
                                style={[styles.modalBtn, { backgroundColor: COLORS.surfaceElevated, flex: 1, marginRight: 8 }]}
                                onPress={() => setHqPhotoModal({ visible: false, from: '', time: '' })}
                            >
                                <Text style={styles.modalBtnTextDismiss}>DISMISS</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalBtn, { flex: 1, marginLeft: 8 }]}
                                onPress={async () => {
                                    try { await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); } catch (e) {}
                                    setHqPhotoModal({ visible: false, from: '', time: '' });
                                    navigation.navigate('ReportIncident');
                                }}
                            >
                                <Text style={styles.modalBtnText}>OPEN CAMERA</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: { 
        flex: 1, 
        backgroundColor: COLORS.background 
    },
    header: { 
        paddingHorizontal: 16, 
        paddingBottom: 14, 
        backgroundColor: COLORS.surface,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.borderHighlight,
    },
    facilityRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 8,
    },
    facilityIdentity: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    facilityShield: {
        marginRight: 6,
    },
    facilityName: {
        color: COLORS.textMuted,
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    statusPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    statusDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 5,
    },
    statusPillText: {
        color: COLORS.statusGreen,
        fontSize: 9,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    officerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    officerGreetingCol: {
        flex: 1,
    },
    officerGreetingLabel: {
        color: COLORS.textMuted,
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 0.5,
    },
    officerNameText: {
        color: COLORS.textPrimary,
        fontSize: 20,
        fontWeight: 'bold',
        letterSpacing: 0.3,
        marginTop: 2,
    },
    dutyStationCol: {
        alignItems: 'flex-end',
    },
    stationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        borderWidth: 1,
        backgroundColor: COLORS.card,
    },
    stationBadgeText: {
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 0.6,
    },
    switchStationBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 6,
        backgroundColor: COLORS.glassOverlayWeak,
    },
    switchStationText: {
        color: COLORS.textPrimary,
        fontSize: 10,
        fontWeight: '600',
        marginLeft: 4,
    },
    telemetryRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    telemetryPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    telemetryPillActive: {
        borderColor: COLORS.accentOrange,
        backgroundColor: `${COLORS.accentOrange}15`,
    },
    telemetryDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    telemetryText: {
        color: COLORS.textMuted,
        fontSize: 11,
        fontWeight: '600',
        marginLeft: 4,
    },
    content: {
        flex: 1,
    },
    missionCard: {
        backgroundColor: COLORS.card,
        borderRadius: 18,
        borderWidth: 1.5,
        overflow: 'hidden',
        marginBottom: 20,
        elevation: 4,
    },
    cardTopBevel: {
        height: 4,
        width: '100%',
    },
    missionCardHeader: {
        flexDirection: 'row',
        padding: 16,
        alignItems: 'center',
    },
    missionIconPedestal: {
        width: 54,
        height: 54,
        borderRadius: 16,
        borderWidth: 1.5,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    missionInfoCol: {
        flex: 1,
    },
    missionBeaconRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 4,
    },
    beaconDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginRight: 6,
    },
    beaconText: {
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 0.6,
    },
    missionTitle: {
        color: COLORS.textPrimary,
        fontSize: 17,
        fontWeight: 'bold',
        letterSpacing: 0.3,
    },
    missionSub: {
        color: COLORS.textMuted,
        fontSize: 12,
        marginTop: 2,
        lineHeight: 16,
    },
    missionActionBtn: {
        marginHorizontal: 16,
        marginBottom: 14,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    missionActionText: {
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 0.8,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
        marginTop: 4,
    },
    sectionTitle: {
        color: COLORS.textPrimary,
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1.2,
    },
    sectionMeta: {
        color: COLORS.textMuted,
        fontSize: 10,
        fontWeight: '600',
        letterSpacing: 0.8,
    },
    actionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
        marginBottom: 22,
    },
    actionTile: {
        width: '48.5%',
        backgroundColor: COLORS.card,
        borderRadius: 14,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        elevation: 2,
    },
    actionIconPod: {
        width: 40,
        height: 40,
        borderRadius: 10,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    actionTileTextCol: {
        flex: 1,
        marginHorizontal: 8,
    },
    actionTileTitle: {
        color: COLORS.textPrimary,
        fontSize: 13,
        fontWeight: 'bold',
    },
    actionTileSubtitle: {
        color: COLORS.textMuted,
        fontSize: 10,
        marginTop: 1,
    },
    timelineContainer: {
        backgroundColor: COLORS.card,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        padding: 16,
    },
    timelineRow: {
        flexDirection: 'row',
        marginBottom: 12,
    },
    timelineTrackCol: {
        width: 20,
        alignItems: 'center',
    },
    timelineNode: {
        width: 8,
        height: 8,
        borderRadius: 4,
        marginTop: 5,
    },
    timelineLine: {
        width: 2,
        flex: 1,
        backgroundColor: COLORS.border,
        marginVertical: 4,
    },
    timelineContentCol: {
        flex: 1,
        marginLeft: 10,
    },
    timelineTimeRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    timelineTitleText: {
        color: COLORS.textPrimary,
        fontSize: 13,
        fontWeight: 'bold',
    },
    timelineTimeText: {
        color: COLORS.textMuted,
        fontSize: 11,
        fontWeight: '500',
    },
    timelineSubText: {
        color: COLORS.textMuted,
        fontSize: 11,
        marginTop: 2,
        lineHeight: 15,
    },
    sosContainer: {
        position: 'absolute',
        right: 18,
        zIndex: 99,
    },
    fabSOS: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.statusRed,
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 30,
        elevation: 8,
        borderWidth: 2,
        borderColor: COLORS.dangerDark,
        overflow: 'hidden',
    },
    fabSOSActive: {
        backgroundColor: COLORS.dangerDark,
        borderColor: COLORS.statusRed,
    },
    fabText: {
        color: COLORS.textPrimary,
        fontWeight: 'bold',
        fontSize: 13,
        letterSpacing: 1,
    },
    sosProgressBg: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        backgroundColor: 'rgba(255, 255, 255, 0.35)',
    },
    modalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.78)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
        zIndex: 999,
    },
    modalCard: {
        width: '100%',
        backgroundColor: COLORS.surface,
        borderRadius: 16,
        padding: 20,
        borderWidth: 1.5,
        borderColor: COLORS.accentOrange,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 15,
        elevation: 10,
    },
    modalHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 12,
    },
    modalTitle: {
        color: COLORS.textPrimary,
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    modalBody: {
        color: COLORS.textPrimary,
        fontSize: 14,
        lineHeight: 20,
        marginBottom: 8,
    },
    modalSub: {
        color: COLORS.textMuted,
        fontSize: 12,
        marginBottom: 16,
    },
    modalBtn: {
        backgroundColor: COLORS.accentOrange,
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    modalBtnRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    modalBtnText: {
        color: COLORS.textPrimary,
        fontWeight: 'bold',
        fontSize: 13,
        letterSpacing: 0.5,
    },
    modalBtnTextDismiss: {
        color: COLORS.textMuted,
        fontWeight: '600',
        fontSize: 13,
    },
});
