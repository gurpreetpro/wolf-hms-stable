import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Image, ScrollView } from 'react-native';
import { Text, TextInput, Button, SegmentedButtons, Card, Avatar, ActivityIndicator, Modal, Portal, Provider } from 'react-native-paper';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../services/api';

export default function ParkingScreen({ navigation }) {
    const [mode, setMode] = useState('ENTRY'); // ENTRY | EXIT
    const [permission, requestPermission] = useCameraPermissions();
    const [cameraRef, setCameraRef] = useState(null);
    const [isCameraOpen, setIsCameraOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    
    // Form Data
    const [vehicleNo, setVehicleNo] = useState('');
    const [vehicleType, setVehicleType] = useState('CAR');
    const [capturedImage, setCapturedImage] = useState(null);

    // Exit Data
    const [exitData, setExitData] = useState(null); // { amount_due, duration, etc }
    const [showPaymentModal, setShowPaymentModal] = useState(false);

    useEffect(() => {
        if (!permission) requestPermission();
    }, []);

    const handleCameraCapture = async () => {
        if (cameraRef) {
            try {
                const photo = await cameraRef.takePictureAsync({ quality: 0.5, base64: true });
                setCapturedImage(photo.uri);
                setIsCameraOpen(false);
                
                // Simulate OCR for MVP
                // In production, send photo.base64 to Google Cloud Vision API here
                // setVehicleNo("KA 05 MN 1234"); 
            } catch (e) {
                Alert.alert("Error", "Failed to capture image");
            }
        }
    };

    const submitEntry = async () => {
        if (!vehicleNo) {
            Alert.alert("Missing Info", "Please enter Vehicle Number");
            return;
        }
        setLoading(true);
        try {
            const res = await api.post('/parking/entry', {
                vehicle_no: vehicleNo,
                vehicle_type: vehicleType,
                image_url: capturedImage // In real app, upload first and send URL
            });
            if (res.data.success) {
                Alert.alert("Success", "Vehicle Checked In");
                resetForm();
            }
        } catch (e) {
            Alert.alert("Error", e.response?.data?.message || "Entry Failed");
        } finally {
            setLoading(false);
        }
    };

    const calculateExit = async () => {
        if (!vehicleNo) {
            Alert.alert("Missing Info", "Please enter Vehicle Number");
            return;
        }
        setLoading(true);
        try {
            const res = await api.get(`/parking/exit-calc?vehicle_no=${vehicleNo}`);
            if (res.data.success) {
                setExitData(res.data.data);
                setShowPaymentModal(true);
            }
        } catch (e) {
            Alert.alert("Error", e.response?.data?.message || "Vehicle Not Found");
        } finally {
            setLoading(false);
        }
    };

    const confirmPayment = async (method) => {
        setLoading(true);
        try {
            const res = await api.post('/parking/exit-confirm', {
                session_id: exitData.session_id,
                amount_paid: exitData.amount_due,
                payment_method: method
            });
            if (res.data.success) {
                setShowPaymentModal(false);
                Alert.alert("Payment Success", "Gate Open. Vehicle Checked Out.");
                resetForm();
            }
        } catch (e) {
            Alert.alert("Error", "Payment Failed");
        } finally {
            setLoading(false);
        }
    };

    const resetForm = () => {
        setVehicleNo('');
        setCapturedImage(null);
        setExitData(null);
    };

    if (!permission) return <View />;
    if (!permission.granted) {
        return (
            <View style={styles.center}>
                <Text>Camera permission is required for ANPR.</Text>
                <Button onPress={requestPermission}>Grant Permission</Button>
            </View>
        );
    }

    // --- Camera View Overlay ---
    if (isCameraOpen) {
        return (
            <View style={{ flex: 1 }}>
                <CameraView style={{ flex: 1 }} ref={ref => setCameraRef(ref)}>
                    <View style={styles.camOverlay}>
                        <Text style={styles.camText}>Align Plate in Box</Text>
                        <View style={styles.scanBox} />
                        <TouchableOpacity onPress={handleCameraCapture} style={styles.captureBtn}>
                            <View style={styles.captureInner} />
                        </TouchableOpacity>
                        <Button mode="contained" onPress={() => setIsCameraOpen(false)} style={styles.closeCam}>
                            Cancel
                        </Button>
                    </View>
                </CameraView>
            </View>
        );
    }

    return (
        <Provider>
            <View style={styles.container}>
                {/* Header */}
                 <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={{marginRight: 10}}>
                        <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Wolf Parking System</Text>
                </View>

                <View style={{padding: 15}}>
                    <SegmentedButtons
                        value={mode}
                        onValueChange={setMode}
                        buttons={[
                            { value: 'ENTRY', label: 'ENTRY (Check-In)', icon: 'login' },
                            { value: 'EXIT', label: 'EXIT (Payment)', icon: 'logout' },
                        ]}
                        style={{marginBottom: 20}}
                    />

                    <Card style={styles.card}>
                        <Card.Content>
                            <Text style={styles.label}>VEHICLE PLATE ANPR</Text>
                            
                            <View style={styles.inputRow}>
                                <TextInput
                                    mode="outlined"
                                    label="Vehicle Number (e.g. KA05MN1234)"
                                    value={vehicleNo}
                                    onChangeText={t => setVehicleNo(t.toUpperCase())}
                                    style={{flex: 1, backgroundColor: '#1c1c1e'}}
                                    textColor="white"
                                    right={<TextInput.Icon icon="camera" onPress={() => setIsCameraOpen(true)} color="#00f3ff"/>}
                                />
                            </View>

                            {mode === 'ENTRY' && (
                                <>
                                    <Text style={[styles.label, {marginTop: 15}]}>VEHICLE TYPE</Text>
                                    <View style={styles.typeRow}>
                                        {['CAR', 'BIKE', 'TRUCK'].map(t => (
                                            <TouchableOpacity 
                                                key={t} 
                                                style={[styles.typeBtn, vehicleType === t && styles.activeType]}
                                                onPress={() => setVehicleType(t)}
                                            >
                                                <MaterialCommunityIcons name={t === 'BIKE' ? 'motorbike' : t.toLowerCase()} size={24} color={vehicleType === t ? 'black' : 'gray'} />
                                                <Text style={{color: vehicleType === t ? 'black' : 'gray', fontSize: 12}}>{t}</Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                    
                                    <Button 
                                        mode="text" 
                                        icon="car-wrench" 
                                        textColor="#FF3B30"
                                        onPress={() => navigation.navigate('VehicleInspection', { vehicle_no: vehicleNo })}
                                    >
                                        Log Existing Damage (Inspection)
                                    </Button>
                                </>
                            )}

                            {capturedImage && (
                                <Image source={{uri: capturedImage}} style={styles.previewImg} />
                            )}

                            <Button 
                                mode="contained" 
                                style={styles.actionBtn}
                                loading={loading}
                                onPress={mode === 'ENTRY' ? submitEntry : calculateExit}
                            >
                                {mode === 'ENTRY' ? 'CHECK IN VEHICLE' : 'CALCULATE FEE'}
                            </Button>
                        </Card.Content>
                    </Card>
                </View>

                {/* Payment Modal */}
                <Portal>
                    <Modal visible={showPaymentModal} onDismiss={() => setShowPaymentModal(false)} contentContainerStyle={styles.modal}>
                        <Text style={styles.modalTitle}>PAYMENT DUE</Text>
                        <View style={styles.billRow}>
                            <Text style={{color:'#aaa'}}>Duration:</Text>
                            <Text style={styles.billVal}>{exitData?.duration_formatted}</Text>
                        </View>
                        <View style={styles.billRow}>
                            <Text style={{color:'#aaa'}}>Rate:</Text>
                            <Text style={styles.billVal}>₹{exitData?.rate_per_hour}/hr</Text>
                        </View>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>TOTAL AMOUNT</Text>
                            <Text style={styles.totalVal}>₹{exitData?.amount_due}</Text>
                        </View>

                        <Text style={{color:'#666', marginBottom: 10, textAlign:'center'}}>Select Payment Method:</Text>
                        <View style={styles.payBtns}>
                            <Button mode="contained" onPress={() => confirmPayment('CASH')} style={[styles.payBtn, {backgroundColor: '#4CD964'}]}>
                                💵 CASH
                            </Button>
                            <Button mode="contained" onPress={() => confirmPayment('UPI')} style={[styles.payBtn, {backgroundColor: '#FF9500'}]}>
                                📱 UPI
                            </Button>
                        </View>
                        <Button onPress={() => setShowPaymentModal(false)} style={{marginTop: 10}}>Cancel</Button>
                    </Modal>
                </Portal>
            </View>
        </Provider>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 50, backgroundColor: '#1c1c1e' },
    headerTitle: { color: 'white', fontSize: 20, fontWeight: 'bold' },
    card: { backgroundColor: '#111', borderColor: '#333', borderWidth: 1 },
    label: { color: '#666', fontSize: 12, marginBottom: 5, fontWeight: 'bold' },
    typeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
    typeBtn: { flex: 1, alignItems: 'center', padding: 10, borderWidth: 1, borderColor: '#333', borderRadius: 8, marginHorizontal: 5 },
    activeType: { backgroundColor: '#00f3ff', borderColor: '#00f3ff' },
    previewImg: { width: '100%', height: 150, borderRadius: 10, marginTop: 15 },
    actionBtn: { marginTop: 20, backgroundColor: '#00f3ff', borderRadius: 8, paddingVertical: 5 },
    
    // Camera
    camOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    scanBox: { width: 300, height: 100, borderWidth: 2, borderColor: '#00f3ff', borderRadius: 10 },
    camText: { color: 'white', marginBottom: 20, fontSize: 18, fontWeight: 'bold' },
    captureBtn: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'white', position: 'absolute', bottom: 50, justifyContent: 'center', alignItems: 'center' },
    captureInner: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: 'black' },
    closeCam: { position: 'absolute', top: 50, right: 20 },

    // Modal
    modal: { backgroundColor: '#1c1c1e', padding: 20, margin: 20, borderRadius: 15 },
    modalTitle: { color: 'white', fontSize: 22, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
    billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    billVal: { color: 'white', fontWeight: 'bold' },
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#333', marginBottom: 20 },
    totalLabel: { color: '#00f3ff', fontSize: 18, fontWeight: 'bold' },
    totalVal: { color: '#00f3ff', fontSize: 24, fontWeight: 'bold' },
    payBtns: { flexDirection: 'row', gap: 10 },
    payBtn: { flex: 1 }
});
