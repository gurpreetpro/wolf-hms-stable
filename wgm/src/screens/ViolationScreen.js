import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Image, ScrollView } from 'react-native';
import { Text, TextInput, Button, Card, RadioButton } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import api from '../services/api';

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
            const photo = await cameraRef.takePictureAsync({ quality: 0.5, base64: true });
            setCapturedImage(photo.uri);
            setCameraOpen(false);
        }
    };

    const submitViolation = async () => {
        if (!vehicleNo) return Alert.alert("Error", "Enter Vehicle Number");
        
        setLoading(true);
        try {
            await api.post('/parking/violation_log', {
                vehicle_no: vehicleNo,
                violation_type: type,
                photo_url: capturedImage // In prod, upload first
            });
            Alert.alert("Citation Issued", "Violation logged in system.");
            navigation.goBack();
        } catch (e) {
            Alert.alert("Error", "Failed to submit");
        } finally {
            setLoading(false);
        }
    };

    if (cameraOpen) {
         return (
             <View style={{ flex: 1 }}>
                 <CameraView style={{ flex: 1 }} ref={r => setCameraRef(r)}>
                     <View style={{ flex: 1, justifyContent: 'flex-end', padding: 30 }}>
                         <TouchableOpacity onPress={handleCapture} style={styles.captureBtn} />
                         <Button onPress={() => setCameraOpen(false)} style={{marginTop: 20}} textColor="white">Cancel</Button>
                     </View>
                 </CameraView>
             </View>
         );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Issue Citation</Text>
                <View style={{width: 28}} />
            </View>

            <View style={styles.content}>
                <Card style={styles.card}>
                    <Card.Content>
                        <TextInput
                            label="Vehicle Plate Number"
                            value={vehicleNo}
                            onChangeText={t => setVehicleNo(t.toUpperCase())}
                            mode="outlined"
                            style={styles.input}
                            textColor="white"
                        />

                        <Text style={styles.label}>VIOLATION TYPE</Text>
                        <RadioButton.Group onValueChange={setType} value={type}>
                            <RadioButton.Item label="No Parking Zone" value="NO_PARKING" labelStyle={{color:'white'}} color="#FF3B30" />
                            <RadioButton.Item label="Blocking Exit" value="BLOCKING" labelStyle={{color:'white'}} color="#FF3B30" />
                            <RadioButton.Item label="Overtime Limit" value="OVERTIME" labelStyle={{color:'white'}} color="#FF3B30" />
                            <RadioButton.Item label="No Permit" value="NO_PERMIT" labelStyle={{color:'white'}} color="#FF3B30" />
                        </RadioButton.Group>

                        <Text style={styles.label}>EVIDENCE PHOTO</Text>
                        {capturedImage ? (
                            <TouchableOpacity onPress={() => setCameraOpen(true)}>
                                <Image source={{uri: capturedImage}} style={{width: '100%', height: 200, borderRadius: 10}} />
                            </TouchableOpacity>
                        ) : (
                            <Button mode="outlined" icon="camera" onPress={() => setCameraOpen(true)} textColor="#aaa" style={{borderColor: '#333'}}>
                                Take Photo
                            </Button>
                        )}

                        <Button 
                            mode="contained" 
                            style={styles.submitBtn} 
                            onPress={submitViolation}
                            loading={loading}
                        >
                            ISSUE TICKET
                        </Button>
                    </Card.Content>
                </Card>
            </View>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50, backgroundColor: '#1c1c1e' },
    headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    content: { padding: 20 },
    card: { backgroundColor: '#111', borderColor: '#333', borderWidth: 1 },
    input: { backgroundColor: '#1c1c1e', marginBottom: 20 },
    label: { color: '#666', fontSize: 12, fontWeight: 'bold', marginTop: 10, marginBottom: 5 },
    submitBtn: { marginTop: 30, backgroundColor: '#FF3B30', borderRadius: 8 },
    captureBtn: { width: 70, height: 70, borderRadius: 35, backgroundColor: 'white', alignSelf: 'center' }
});
