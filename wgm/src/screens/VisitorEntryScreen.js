import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Alert, TouchableOpacity, Image } from 'react-native';
import { Text, TextInput, Button, Appbar, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Camera } from 'expo-camera';
import api from '../services/api';

export default function VisitorEntryScreen({ navigation }) {
    const [step, setStep] = useState(1); // 1: Details, 2: Photo, 3: Success
    const [loading, setLoading] = useState(false);
    
    // Form Data
    const [name, setName] = useState('');
    const [phone, setPhone] = useState('');
    const [purpose, setPurpose] = useState('');
    const [hostId, setHostId] = useState('');
    const [photo, setPhoto] = useState(null);

    // Camera
    const [cameraRef, setCameraRef] = useState(null);
    const [permission, requestPermission] = Camera.useCameraPermissions();

    const takePhoto = async () => {
        if (cameraRef) {
            const result = await cameraRef.takePictureAsync({ quality: 0.5 });
            setPhoto(result.uri);
            setStep(1); // Back to form
        }
    };

    const submitVisitor = async () => {
        if (!name || !phone || !purpose) return Alert.alert("Missing Fields");
        
        setLoading(true);
        try {
            await api.post('/visitors/log', {
                full_name: name,
                phone,
                purpose,
                host_id: hostId,
                photo_url: photo // In prod, upload to S3 first
            });
            setStep(3); // Success Mode
        } catch (e) {
            Alert.alert("Error", "Failed to log visitor");
        } finally {
            setLoading(false);
        }
    };

    if (step === 2) {
        // Camera View
        if (!permission?.granted) {
            return <View style={styles.container}><Button onPress={requestPermission}>Grant Camera</Button></View>;
        }
        return (
            <View style={{ flex: 1, backgroundColor: 'black' }}>
                <Camera style={{ flex: 1 }} type={Camera.Constants.Type.front} ref={setCameraRef} />
                <Button mode="contained" onPress={takePhoto} style={styles.captureBtn}>CAPTURE PHOTO</Button>
            </View>
        );
    }

    if (step === 3) {
        // Success View
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <MaterialCommunityIcons name="check-circle" size={100} color="#4CD964" />
                <Text style={styles.successTitle}>VISITOR LOGGED</Text>
                <Text style={styles.successSub}>Pass Generated Successfully</Text>
                <Button mode="contained" onPress={() => navigation.goBack()} style={{ marginTop: 30, backgroundColor: '#4CD964' }}>
                    DONE
                </Button>
            </View>
        );
    }

    // Default Form View
    return (
        <View style={styles.container}>
            <Appbar.Header style={{ backgroundColor: '#1c1c1e' }}>
                <Appbar.BackAction onPress={() => navigation.goBack()} color="white" />
                <Appbar.Content title="New Visitor Entry" titleStyle={{ color: 'white' }} />
            </Appbar.Header>

            <ScrollView style={styles.form}>
                {/* Photo Section */}
                <View style={styles.photoContainer}>
                    <TouchableOpacity onPress={() => setStep(2)}>
                        {photo ? (
                            <Image source={{ uri: photo }} style={styles.photo} />
                        ) : (
                            <View style={styles.photoPlaceholder}>
                                <MaterialCommunityIcons name="camera-plus" size={40} color="#666" />
                                <Text style={{ color: '#666', marginTop: 10 }}>Tap to take photo</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                <TextInput 
                    label="Full Name" 
                    value={name} onChangeText={setName} 
                    style={styles.input} mode="outlined" theme={{colors:{primary:'white'}}}
                />
                <TextInput 
                    label="Phone Number" 
                    value={phone} onChangeText={setPhone} keyboardType="phone-pad"
                    style={styles.input} mode="outlined" theme={{colors:{primary:'white'}}}
                />
                <TextInput 
                    label="Host (Employee Name/ID)" 
                    value={hostId} onChangeText={setHostId} 
                    style={styles.input} mode="outlined" theme={{colors:{primary:'white'}}}
                />
                <TextInput 
                    label="Purpose of Visit" 
                    value={purpose} onChangeText={setPurpose} 
                    style={styles.input} mode="outlined" theme={{colors:{primary:'white'}}}
                />

                <Button 
                    mode="contained" 
                    onPress={submitVisitor} 
                    loading={loading}
                    style={styles.submitBtn}
                    labelStyle={{ fontSize: 18, padding: 5 }}
                >
                    GENERATE PASS
                </Button>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    form: { padding: 20 },
    input: { marginBottom: 15, backgroundColor: '#1c1c1e', color: 'white' },
    photoContainer: { alignItems: 'center', marginBottom: 20 },
    photo: { width: 120, height: 120, borderRadius: 60, borderWidth: 2, borderColor: '#AF52DE' },
    photoPlaceholder: { 
        width: 120, height: 120, borderRadius: 60, backgroundColor: '#1c1c1e', 
        justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#333' 
    },
    submitBtn: { marginTop: 20, backgroundColor: '#AF52DE' },
    captureBtn: { margin: 20, backgroundColor: 'white', borderColor: 'black', borderWidth: 1 },
    successTitle: { color: 'white', fontSize: 24, fontWeight: 'bold', marginTop: 20 },
    successSub: { color: '#888', fontSize: 16 }
});
