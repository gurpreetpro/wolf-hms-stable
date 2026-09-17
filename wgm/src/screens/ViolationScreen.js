import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Image } from 'react-native';
import { Text, TextInput, Button, Card, RadioButton } from 'react-native-paper';
import { CameraView, useCameraPermissions } from 'expo-camera';
import ScreenShell from '../components/ScreenShell';
import api from '../services/api';
import { COLORS } from '../theme';

export default function ViolationScreen({ navigation }) {
    const [vehicleNo, setVehicleNo] = useState('');
    const [type, setType] = useState('NO_PARKING');
    const [permission, requestPermission] = useCameraPermissions();
    const [cameraOpen, setCameraOpen] = useState(false);
    const [capturedImage, setCapturedImage] = useState(null);
    const [cameraRef, setCameraRef] = useState(null);
    const [loading, setLoading] = useState(false);

    if (!permission) requestPermission();

    const handleCapture = async () => {
        if (cameraRef) {
            try {
                const photo = await cameraRef.takePictureAsync({ quality: 0.5, base64: true });
                setCapturedImage(photo.uri);
                setCameraOpen(false);
            } catch (e) {
                Alert.alert("Camera Error", "Failed to capture photo");
            }
        }
    };

    const submitViolation = async () => {
        if (!vehicleNo) return Alert.alert("Error", "Please enter vehicle license plate number.");
        
        setLoading(true);
        try {
            await api.post('/parking/violation_log', {
                vehicle_no: vehicleNo,
                violation_type: type,
                photo_url: capturedImage
            });
            Alert.alert("Citation Issued", "Violation has been logged into the system.", [
                { text: "OK", onPress: () => navigation.goBack() }
            ]);
        } catch (e) {
            Alert.alert("Error", "Failed to submit violation report.");
        } finally {
            setLoading(false);
        }
    };

    if (cameraOpen) {
        return (
            <ScreenShell 
                title="Evidence Photo" 
                variant="overlay" 
                showBack={true} 
                onBack={() => setCameraOpen(false)} 
                scrollable={false}
                contentContainerStyle={{ paddingHorizontal: 0, paddingTop: 0 }}
            >
                <View style={StyleSheet.absoluteFill}>
                    <CameraView style={{ flex: 1 }} ref={r => setCameraRef(r)}>
                        <View style={styles.camFooter}>
                            <TouchableOpacity onPress={handleCapture} style={styles.captureBtn} />
                        </View>
                    </CameraView>
                </View>
            </ScreenShell>
        );
    }

    return (
        <ScreenShell
            title="Issue Citation"
            badgeText="GATE"
            badgeColor={COLORS.accentOrange}
            showBack={true}
        >
            <Card style={styles.card}>
                <Card.Content>
                    <TextInput
                        label="Vehicle Plate Number"
                        value={vehicleNo}
                        onChangeText={t => setVehicleNo(t.toUpperCase())}
                        mode="outlined"
                        style={styles.input}
                        textColor={COLORS.textPrimary}
                        theme={{ colors: { primary: COLORS.statusRed } }}
                    />

                    <Text style={styles.label}>VIOLATION TYPE</Text>
                    <RadioButton.Group onValueChange={setType} value={type}>
                        <RadioButton.Item label="No Parking Zone" value="NO_PARKING" labelStyle={{ color: COLORS.textPrimary }} color={COLORS.statusRed} />
                        <RadioButton.Item label="Blocking Exit" value="BLOCKING" labelStyle={{ color: COLORS.textPrimary }} color={COLORS.statusRed} />
                        <RadioButton.Item label="Overtime Limit" value="OVERTIME" labelStyle={{ color: COLORS.textPrimary }} color={COLORS.statusRed} />
                        <RadioButton.Item label="No Valid Permit" value="NO_PERMIT" labelStyle={{ color: COLORS.textPrimary }} color={COLORS.statusRed} />
                    </RadioButton.Group>

                    <Text style={[styles.label, { marginTop: 15 }]}>EVIDENCE PHOTO</Text>
                    {capturedImage ? (
                        <TouchableOpacity onPress={() => setCameraOpen(true)}>
                            <Image source={{ uri: capturedImage }} style={styles.evidenceImage} />
                        </TouchableOpacity>
                    ) : (
                        <Button 
                            mode="outlined" 
                            icon="camera" 
                            onPress={() => setCameraOpen(true)} 
                            textColor={COLORS.textPrimary} 
                            style={{ borderColor: COLORS.border, marginVertical: 8 }}
                        >
                            Take Evidence Photo
                        </Button>
                    )}

                    <Button 
                        mode="contained" 
                        style={styles.submitBtn} 
                        onPress={submitViolation}
                        loading={loading}
                        labelStyle={{ fontWeight: 'bold', fontSize: 16 }}
                    >
                        ISSUE CITATION
                    </Button>
                </Card.Content>
            </Card>
        </ScreenShell>
    );
}

const styles = StyleSheet.create({
    card: { 
        backgroundColor: COLORS.surface, 
        borderColor: COLORS.border, 
        borderWidth: 1,
        borderRadius: 16,
    },
    input: { 
        backgroundColor: COLORS.surface, 
        marginBottom: 16 
    },
    label: { 
        color: COLORS.textMuted, 
        fontSize: 12, 
        fontWeight: 'bold', 
        marginBottom: 6 
    },
    evidenceImage: { 
        width: '100%', 
        height: 180, 
        borderRadius: 12,
        marginVertical: 8,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    submitBtn: { 
        marginTop: 20, 
        backgroundColor: COLORS.statusRed, 
        borderRadius: 10,
        paddingVertical: 4,
    },
    camFooter: { 
        flex: 1, 
        justifyContent: 'flex-end', 
        alignItems: 'center',
        paddingBottom: 40 
    },
    captureBtn: { 
        width: 72, 
        height: 72, 
        borderRadius: 36, 
        backgroundColor: COLORS.textPrimary,
        borderWidth: 4,
        borderColor: COLORS.onAccent,
    }
});
