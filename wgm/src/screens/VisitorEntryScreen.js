import React, { useState } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity, Image } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { CameraView, useCameraPermissions } from 'expo-camera';
import ScreenShell from '../components/ScreenShell';
import api from '../services/api';
import { COLORS } from '../theme';

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
    const [permission, requestPermission] = useCameraPermissions();
    if (!permission) requestPermission();

    const takePhoto = async () => {
        if (cameraRef) {
            try {
                const result = await cameraRef.takePictureAsync({ quality: 0.5 });
                setPhoto(result.uri);
                setStep(1); // Back to form
            } catch (e) {
                Alert.alert("Camera Error", "Failed to capture photo");
            }
        }
    };

    const submitVisitor = async () => {
        if (!name || !phone || !purpose) return Alert.alert("Missing Fields", "Please provide name, phone and purpose of visit.");
        
        setLoading(true);
        try {
            await api.post('/visitors/log', {
                full_name: name,
                phone,
                purpose,
                host_id: hostId,
                photo_url: photo
            });
            setStep(3); // Success Mode
        } catch (e) {
            Alert.alert("Error", "Failed to log visitor");
        } finally {
            setLoading(false);
        }
    };

    if (step === 2) {
        // Camera View using ScreenShell overlay
        if (!permission?.granted) {
            return (
                <ScreenShell title="Camera Permission" showBack={true} onBack={() => setStep(1)}>
                    <View style={styles.centerContainer}>
                        <Text style={{ color: COLORS.textPrimary, marginBottom: 20 }}>Camera permission is required to capture visitor photo.</Text>
                        <Button mode="contained" onPress={requestPermission} style={{ backgroundColor: COLORS.accentPurple }}>
                            Grant Camera
                        </Button>
                    </View>
                </ScreenShell>
            );
        }
        return (
            <ScreenShell 
                title="Visitor Photo" 
                variant="overlay" 
                showBack={true} 
                onBack={() => setStep(1)} 
                scrollable={false}
                contentContainerStyle={{ paddingHorizontal: 0, paddingTop: 0 }}
            >
                <View style={StyleSheet.absoluteFill}>
                    <CameraView style={{ flex: 1 }} facing="front" ref={setCameraRef} />
                    <View style={styles.cameraFooter}>
                        <Button mode="contained" onPress={takePhoto} style={styles.captureBtn} textColor={COLORS.background}>
                            CAPTURE PHOTO
                        </Button>
                    </View>
                </View>
            </ScreenShell>
        );
    }

    if (step === 3) {
        // Success View
        return (
            <ScreenShell 
                title="Pass Created" 
                showBack={true} 
                onBack={() => navigation.goBack()}
                scrollable={false}
            >
                <View style={styles.centerContainer}>
                    <MaterialCommunityIcons name="check-circle" size={88} color={COLORS.statusGreen} />
                    <Text style={styles.successTitle}>VISITOR LOGGED</Text>
                    <Text style={styles.successSub}>Pass Generated Successfully</Text>
                    <Button 
                        mode="contained" 
                        onPress={() => navigation.goBack()} 
                        style={{ marginTop: 28, backgroundColor: COLORS.statusGreen, width: '100%' }}
                    >
                        DONE
                    </Button>
                </View>
            </ScreenShell>
        );
    }

    // Default Form View
    return (
        <ScreenShell 
            title="New Visitor Entry" 
            badgeText="RECEPTION" 
            badgeColor={COLORS.accentPurple}
            showBack={true}
        >
            <View style={styles.formCard}>
                {/* Photo Section */}
                <View style={styles.photoContainer}>
                    <TouchableOpacity onPress={() => setStep(2)} activeOpacity={0.8}>
                        {photo ? (
                            <Image source={{ uri: photo }} style={styles.photo} />
                        ) : (
                            <View style={styles.photoPlaceholder}>
                                <MaterialCommunityIcons name="camera-plus" size={36} color={COLORS.accentPurple} />
                                <Text style={{ color: COLORS.textMuted, marginTop: 8, fontSize: 12 }}>Tap to capture</Text>
                            </View>
                        )}
                    </TouchableOpacity>
                </View>

                <TextInput 
                    label="Full Name *" 
                    value={name} 
                    onChangeText={setName} 
                    style={styles.input} 
                    mode="outlined" 
                    textColor={COLORS.textPrimary}
                    theme={{ colors: { primary: COLORS.accentPurple } }}
                />
                <TextInput 
                    label="Phone Number *" 
                    value={phone} 
                    onChangeText={setPhone} 
                    keyboardType="phone-pad"
                    style={styles.input} 
                    mode="outlined" 
                    textColor={COLORS.textPrimary}
                    theme={{ colors: { primary: COLORS.accentPurple } }}
                />
                <TextInput 
                    label="Host (Employee Name / ID)" 
                    value={hostId} 
                    onChangeText={setHostId} 
                    style={styles.input} 
                    mode="outlined" 
                    textColor={COLORS.textPrimary}
                    theme={{ colors: { primary: COLORS.accentPurple } }}
                />
                <TextInput 
                    label="Purpose of Visit *" 
                    value={purpose} 
                    onChangeText={setPurpose} 
                    style={styles.input} 
                    mode="outlined" 
                    textColor={COLORS.textPrimary}
                    theme={{ colors: { primary: COLORS.accentPurple } }}
                />

                <Button 
                    mode="contained" 
                    onPress={submitVisitor} 
                    loading={loading}
                    style={styles.submitBtn}
                    labelStyle={{ fontSize: 16, fontWeight: 'bold' }}
                >
                    GENERATE PASS
                </Button>
            </View>
        </ScreenShell>
    );
}

const styles = StyleSheet.create({
    formCard: { 
        backgroundColor: COLORS.surface, 
        borderRadius: 18, 
        padding: 18,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    input: { 
        marginBottom: 14, 
        backgroundColor: COLORS.surface,
    },
    photoContainer: { 
        alignItems: 'center', 
        marginBottom: 20 
    },
    photo: { 
        width: 110, 
        height: 110, 
        borderRadius: 55, 
        borderWidth: 2, 
        borderColor: COLORS.accentPurple 
    },
    photoPlaceholder: { 
        width: 110, 
        height: 110, 
        borderRadius: 55, 
        backgroundColor: COLORS.card, 
        justifyContent: 'center', 
        alignItems: 'center', 
        borderWidth: 1, 
        borderColor: COLORS.border 
    },
    submitBtn: { 
        marginTop: 14, 
        backgroundColor: COLORS.accentPurple,
        borderRadius: 10,
        paddingVertical: 4,
    },
    cameraFooter: {
        position: 'absolute',
        bottom: 40,
        left: 20,
        right: 20,
    },
    captureBtn: { 
        backgroundColor: COLORS.textPrimary, 
        borderRadius: 12,
        paddingVertical: 6,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24,
    },
    successTitle: { 
        color: COLORS.textPrimary, 
        fontSize: 22, 
        fontWeight: 'bold', 
        marginTop: 18 
    },
    successSub: { 
        color: COLORS.textMuted, 
        fontSize: 15,
        marginTop: 4,
    }
});
