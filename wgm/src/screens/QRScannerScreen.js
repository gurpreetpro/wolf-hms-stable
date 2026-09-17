import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Text, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ScreenShell from '../components/ScreenShell';
import securityService from '../services/securityService';
import locationService from '../services/locationService';
import api from '../services/api';
import { COLORS } from '../theme';

const { width } = Dimensions.get('window');

export default function QRScannerScreen({ navigation, route }) {
    const { patrolId } = route.params || {};
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [scanResult, setScanResult] = useState(null); // null, 'ALLOWED', 'DENIED', 'CHECKPOINT'
    
    useEffect(() => {
        if (!permission) requestPermission();
    }, [permission]);

    if (!permission?.granted) {
        return (
            <ScreenShell title="Camera Access" showBack={true}>
                <View style={styles.permissionContainer}>
                    <MaterialCommunityIcons name="camera-off" size={60} color={COLORS.textMuted} style={{ marginBottom: 16 }} />
                    <Text style={{ color: COLORS.textPrimary, textAlign: 'center', marginBottom: 20 }}>
                        Camera permission is required to scan badges, guest passes, and checkpoints.
                    </Text>
                    <Button mode="contained" onPress={requestPermission} style={{ backgroundColor: COLORS.accent }}>
                        Grant Camera Permission
                    </Button>
                </View>
            </ScreenShell>
        );
    }

    const handleBarCodeScanned = async ({ type, data }) => {
        if (scanned) return;
        setScanned(true);

        // 1. Check if WARD PASS (Wolf Band)
        if (data.startsWith('WARD:')) {
            try {
                const res = await api.post('/ward-access/verify', { qr_code: data });
                setScanResult({
                    status: 'ALLOWED',
                    data: res.data?.data
                });
            } catch (error) {
                const msg = error.response?.data?.message || 'Access Denied — Invalid Pass';
                setScanResult({
                    status: 'DENIED',
                    message: msg
                });
            }
        } 
        // 2. Standard CHECKPOINT (Patrol) — Supports CHECKPOINT:Name, CHECKPOINT:Name:lat:lng, or CHECKPOINT:Name:lat:lng:floor
        else if (data.startsWith('CHECKPOINT:')) {
            const raw = data.replace('CHECKPOINT:', '').trim();
            const parts = raw.split(':');
            const checkpointName = parts[0];
            const qrLat = parts.length >= 3 ? parseFloat(parts[1]) : null;
            const qrLng = parts.length >= 3 ? parseFloat(parts[2]) : null;
            const qrFloor = parts.length >= 4 ? parseInt(parts[3], 10) : null;

            let promptDesc = 'Confirm attendance at this tour checkpoint';
            if (qrLat !== null && !isNaN(qrLat) && qrLng !== null && !isNaN(qrLng)) {
                promptDesc = `Anchor: ${qrLat.toFixed(5)}, ${qrLng.toFixed(5)}${qrFloor !== null ? ` • Level ${qrFloor}` : ''}`;
            }

            Alert.alert(`Check in at ${checkpointName}?`, promptDesc, [
                { text: 'Cancel', onPress: () => setScanned(false), style: 'cancel' },
                { text: 'Confirm', onPress: async () => {
                     try {
                        const curPos = locationService.currentPosition;
                        const latToSend = (qrLat !== null && !isNaN(qrLat)) ? qrLat : curPos.latitude;
                        const lngToSend = (qrLng !== null && !isNaN(qrLng)) ? qrLng : curPos.longitude;

                        await securityService.recordCheckpoint(patrolId, checkpointName, latToSend, lngToSend);

                        // Snap 2D position to reset accumulated IMU drift
                        if (qrLat !== null && !isNaN(qrLat) && qrLng !== null && !isNaN(qrLng)) {
                            locationService.snapToCoordinates(qrLat, qrLng, checkpointName);
                        }

                        // Re-anchor floor if calibrated in QR
                        if (qrFloor !== null && !isNaN(qrFloor)) {
                            locationService.setFloor(qrFloor, true);
                        }

                        Alert.alert('Success', `Checkpoint "${checkpointName}" Verified`);
                        navigation.navigate('Command', { checkpointVerified: true, checkpointName });
                     } catch (e) { 
                        Alert.alert('Error', e?.response?.data?.error?.message || e?.response?.data?.message || e.message || 'Verification Failed'); 
                        setScanned(false); 
                     }
                }}
            ]);
        }
        // 3. JSON Checkpoint / Blueprint Anchor
        else if (data.startsWith('{') && data.includes('checkpoint')) {
            try {
                const parsed = JSON.parse(data);
                const cpName = parsed.checkpoint || parsed.name || 'Station';
                const lat = parsed.lat || parsed.latitude;
                const lng = parsed.lng || parsed.longitude;
                const floor = parsed.floor !== undefined ? parsed.floor : parsed.floor_number;

                Alert.alert(`Check in at ${cpName}?`, lat && lng ? `Anchor: ${lat}, ${lng}${floor ? ` • Floor L${floor}` : ''}` : '', [
                    { text: 'Cancel', onPress: () => setScanned(false), style: 'cancel' },
                    { text: 'Confirm', onPress: async () => {
                        try {
                            await securityService.recordCheckpoint(patrolId, cpName, lat, lng);
                            if (lat && lng) {
                                locationService.snapToCoordinates(lat, lng, cpName);
                            }
                            if (floor !== undefined && floor !== null && !isNaN(parseInt(floor, 10))) {
                                locationService.setFloor(parseInt(floor, 10), true);
                            }
                            Alert.alert('Success', `Checkpoint "${cpName}" Verified`);
                            navigation.navigate('Command', { checkpointVerified: true, checkpointName: cpName });
                        } catch (e) {
                            Alert.alert('Error', 'Verification Failed');
                            setScanned(false);
                        }
                    }}
                ]);
            } catch (err) {
                Alert.alert("Scanned QR Code", data, [{ text: 'OK', onPress: () => setScanned(false) }]);
            }
        }
        // 3. Unknown QR
        else {
            Alert.alert("Scanned QR Code", data, [
                { text: 'Scan Another', onPress: () => setScanned(false) }
            ]);
        }
    };

    // Render Result Overlay for Ward Access
    if (scanned && scanResult) {
        const isAllowed = scanResult.status === 'ALLOWED';
        const config = isAllowed 
            ? { color: COLORS.statusGreen, icon: 'check-circle', title: 'ACCESS GRANTED' }
            : { color: COLORS.statusRed, icon: 'close-circle', title: 'ACCESS DENIED' };

        return (
            <ScreenShell 
                title="Scan Result" 
                showBack={true} 
                onBack={() => { setScanned(false); setScanResult(null); }}
                scrollable={false}
            >
                <View style={[styles.resultContainer, { backgroundColor: config.color }]}>
                    <MaterialCommunityIcons name={config.icon} size={90} color={COLORS.textPrimary} />
                    <Text style={styles.resultTitle}>{config.title}</Text>
                    
                    {isAllowed ? (
                        <View style={styles.infoBox}>
                             <Text style={styles.infoText}>{scanResult.data?.holder || 'Visitor / Staff'}</Text>
                             <Text style={styles.subText}>{scanResult.data?.type || 'Standard'} • {scanResult.data?.action || 'Entry'}</Text>
                             <Text style={styles.subText}>{scanResult.data?.location === 'INSIDE' ? 'Entered Ward' : 'Exited Ward'}</Text>
                        </View>
                    ) : (
                        <Text style={styles.reasonText}>{scanResult.message}</Text>
                    )}

                    <Button 
                        mode="contained" 
                        textColor={config.color} 
                        style={styles.scanNextBtn}
                        onPress={() => { setScanned(false); setScanResult(null); }}
                    >
                        SCAN NEXT
                    </Button>
                </View>
            </ScreenShell>
        );
    }

    return (
        <ScreenShell
            title="Scan QR Code"
            variant="overlay"
            showBack={true}
            scrollable={false}
            contentContainerStyle={{ paddingHorizontal: 0, paddingTop: 0 }}
        >
            <CameraView 
                style={StyleSheet.absoluteFillObject}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            >
                <View style={styles.overlay}>
                    <View style={styles.scanFrame} />
                    <Text style={styles.hintText}>Align QR code inside the box</Text>
                </View>
            </CameraView>
        </ScreenShell>
    );
}

const styles = StyleSheet.create({
    permissionContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    overlay: { 
        flex: 1, 
        backgroundColor: COLORS.scrim, 
        justifyContent: 'center', 
        alignItems: 'center' 
    },
    scanFrame: { 
        width: width * 0.7, 
        height: width * 0.7, 
        borderWidth: 2, 
        borderColor: COLORS.accent, 
        borderRadius: 16,
        backgroundColor: 'transparent' 
    },
    hintText: { 
        color: COLORS.textPrimary, 
        marginTop: 20, 
        fontSize: 15, 
        fontWeight: 'bold',
        letterSpacing: 0.3,
    },
    
    // Result Overlay
    resultContainer: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        padding: 24,
        borderRadius: 20,
    },
    resultTitle: { 
        color: COLORS.textPrimary, 
        fontSize: 26, 
        fontWeight: 'bold', 
        marginTop: 16 
    },
    infoBox: { 
        marginTop: 18, 
        alignItems: 'center' 
    },
    infoText: { 
        color: COLORS.textPrimary, 
        fontSize: 22, 
        fontWeight: 'bold' 
    },
    subText: { 
        color: COLORS.textPrimary, 
        fontSize: 15, 
        marginTop: 4 
    },
    reasonText: { 
        color: COLORS.textPrimary, 
        fontSize: 18, 
        marginTop: 10, 
        fontWeight: 'bold',
        textAlign: 'center',
    },
    scanNextBtn: { 
        marginTop: 40, 
        backgroundColor: COLORS.textPrimary, 
        paddingHorizontal: 20,
        borderRadius: 12,
    }
});
