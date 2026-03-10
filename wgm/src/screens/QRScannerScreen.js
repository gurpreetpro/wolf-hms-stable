
import React, { useState, useEffect, useContext } from 'react';
import { View, StyleSheet, Alert, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { Text, Appbar, Button, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '../context/AuthContext';
import securityService from '../services/securityService';
import { useHIPS } from '../hooks/useHIPS';

const { width } = Dimensions.get('window');

// ... imports
import api from '../services/api';

export default function QRScannerScreen({ navigation, route }) {
    const { patrolId } = route.params || {};
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);
    const [scanResult, setScanResult] = useState(null); // null, 'ALLOWED', 'DENIED', 'CHECKPOINT'
    
    // ... permission checks ...
    useEffect(() => {
        if (!permission) requestPermission();
    }, [permission]);

    if (!permission?.granted) {
       return <View style={styles.container}><Button mode="contained" onPress={requestPermission}>Grant Camera</Button></View>;
    }

    const handleBarCodeScanned = async ({ type, data }) => {
        if (scanned) return;
        setScanned(true);
        console.log(`Scanned: ${data}`);

        // 1. Check if WARD PASS (Wolf Band)
        if (data.startsWith('WARD:')) {
            try {
                const res = await api.post('/ward-access/verify', { qr_code: data });
                // Success (Allowed)
                setScanResult({
                    status: 'ALLOWED',
                    data: res.data.data
                });
            } catch (error) {
                // Denied (Expired, Full, etc)
                const msg = error.response?.data?.message || 'Access Denied';
                setScanResult({
                    status: 'DENIED',
                    message: msg
                });
            }
        } 
        // 2. Standard CHECKPOINT (Patrol)
        else if (data.startsWith('CHECKPOINT:')) {
            const checkpointName = data.replace('CHECKPOINT:', '').trim();
            Alert.alert(`Check in at ${checkpointName}?`, '', [
                { text: 'Cancel', onPress: () => setScanned(false), style: 'cancel' },
                { text: 'Confirm', onPress: async () => {
                     try {
                        await securityService.recordCheckpoint(patrolId, checkpointName);
                        Alert.alert('Success', 'Checkpoint Verified');
                        navigation.navigate('Patrol', { checkpointVerified: true, checkpointName });
                     } catch (e) { Alert.alert('Error', 'Verification Failed'); setScanned(false); }
                }}
            ]);
        }
        // 3. Unknown QR
        else {
            Alert.alert("Unknown QR", data, [{ text: 'OK', onPress: () => setScanned(false) }]);
        }
    };

    // Render Result Overlay for Ward Access
    if (scanned && scanResult) {
        const isAllowed = scanResult.status === 'ALLOWED';
        const config = isAllowed 
            ? { color: '#4CD964', icon: 'check-circle', title: 'ACCESS GRANTED' } 
            : { color: '#FF3B30', icon: 'close-circle', title: 'ACCESS DENIED' };

        return (
            <View style={[styles.resultContainer, { backgroundColor: config.color }]}>
                <MaterialCommunityIcons name={config.icon} size={100} color="white" />
                <Text style={styles.resultTitle}>{config.title}</Text>
                
                {isAllowed ? (
                    <View style={styles.infoBox}>
                         <Text style={styles.infoText}>{scanResult.data.holder}</Text>
                         <Text style={styles.subText}>{scanResult.data.type} • {scanResult.data.action}</Text>
                         <Text style={styles.subText}>{scanResult.data.location === 'INSIDE' ? 'Entered Ward' : 'Exited Ward'}</Text>
                    </View>
                ) : (
                    <Text style={styles.reasonText}>{scanResult.message}</Text>
                )}

                <Button 
                    mode="contained" 
                    textColor={config.color} 
                    style={styles.scanBtn}
                    onPress={() => { setScanned(false); setScanResult(null); }}
                >
                    SCAN NEXT
                </Button>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Appbar.Header style={{ backgroundColor: 'transparent', position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 }}>
                <Appbar.BackAction onPress={() => navigation.goBack()} color="white" />
                <Appbar.Content title="SCAN QR" titleStyle={{color: 'white', fontWeight: 'bold'}} />
            </Appbar.Header>

            <CameraView 
                style={StyleSheet.absoluteFillObject}
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
            >
                <View style={styles.overlay}>
                    <View style={styles.scanFrame} />
                    <Text style={styles.hintText}>Scan Wolf Band or Checkpoint</Text>
                </View>
            </CameraView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    scanFrame: { width: width * 0.7, height: width * 0.7, borderWidth: 2, borderColor: '#00f3ff', backgroundColor: 'transparent' },
    hintText: { color: '#fff', marginTop: 20, fontSize: 16, fontWeight: 'bold' },
    
    // Result Overlay
    resultContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
    resultTitle: { color: 'white', fontSize: 28, fontWeight: 'bold', marginTop: 20 },
    infoBox: { marginTop: 20, alignItems: 'center' },
    infoText: { color: 'white', fontSize: 24, fontWeight: 'bold' },
    subText: { color: 'rgba(255,255,255,0.8)', fontSize: 16, marginTop: 5 },
    reasonText: { color: 'white', fontSize: 20, marginTop: 10, fontWeight:'bold' },
    scanBtn: { marginTop: 50, backgroundColor: 'white', paddingHorizontal: 20 }
});
