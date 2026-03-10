import React, { useState, useRef, useContext } from 'react';
import { View, StyleSheet, TouchableOpacity, ScrollView, Alert, Modal, Image } from 'react-native';
import { Text, TextInput, Button, Checkbox, ActivityIndicator } from 'react-native-paper';
import { BlurView } from 'expo-blur';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SignatureScreen from 'react-native-signature-canvas';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';

export default function ShiftHandoverScreen({ navigation }) {
    const { userData, logout } = useContext(AuthContext);
    const [notes, setNotes] = useState('');
    const [inventory, setInventory] = useState({
        radio: false,
        keys: false,
        torch: false,
        taser: false
    });
    const [signature, setSignature] = useState(null);
    const [isSigning, setIsSigning] = useState(false);
    const [loading, setLoading] = useState(false);
    const ref = useRef();

    const handleSignature = (signature) => {
        setSignature(signature); // Base64 image
        setIsSigning(false);
    };

    const handleEmpty = () => {
        console.log('Empty signature');
    };

    const handleClear = () => {
        ref.current.clearSignature();
    };

    const handleConfirm = () => {
        ref.current.readSignature();
    };

    const submitHandover = async () => {
        if (!signature || !notes) {
            Alert.alert('Incomplete', 'Please add notes and sign the logbook.');
            return;
        }

        setLoading(true);
        try {
            const res = await api.post('/security/handover', {
                nextGuardId: null, // For now, just logging out
                notes,
                inventory,
                signatureUrl: signature // Sending Base64 for now (Phase 13 MVP)
            });

            if (res.data.success) {
                Alert.alert('Shift Ended', 'Logbook signed successfully.', [
                    { text: 'Clock Out', onPress: () => {
                        logout(); // Actual Logout
                    }}
                ]);
            }
        } catch (error) {
            Alert.alert('Error', 'Failed to submit logbook.');
        } finally {
            setLoading(false);
        }
    };

    const toggleItem = (item) => {
        setInventory(prev => ({ ...prev, [item]: !prev[item] }));
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>DIGITAL LOGBOOK</Text>
                <Text style={styles.subtitle}>SHIFT HANDOVER REPORT</Text>
            </View>

            <ScrollView style={styles.form}>
                {/* 1. Inventory Check */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>EQUIPMENT CHECKLIST</Text>
                    <View style={styles.grid}>
                        {Object.keys(inventory).map(key => (
                            <TouchableOpacity 
                                key={key} 
                                style={[styles.checkItem, inventory[key] && styles.checked]}
                                onPress={() => toggleItem(key)}
                            >
                                <MaterialCommunityIcons 
                                    name={inventory[key] ? "checkbox-marked" : "checkbox-blank-outline"} 
                                    size={24} 
                                    color={inventory[key] ? "#00f3ff" : "gray"} 
                                />
                                <Text style={styles.checkLabel}>{key.toUpperCase()}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                {/* 2. Notes */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>SHIFT SUMMARY</Text>
                    <TextInput
                        mode="outlined"
                        placeholder="Report incidents, broken items, or clear status..."
                        multiline
                        numberOfLines={4}
                        value={notes}
                        onChangeText={setNotes}
                        style={styles.input}
                        theme={{ colors: { primary: '#00f3ff', background: '#222', placeholder: 'gray', text: 'white' }}}
                        textColor="white"
                    />
                </View>

                {/* 3. Signature */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>SIGNATURE</Text>
                    {signature ? (
                        <TouchableOpacity onPress={() => setIsSigning(true)} style={styles.sigPreview}>
                             <Image source={{ uri: signature }} style={{ width: '100%', height: 100, resizeMode: 'contain' }} />
                             <Text style={styles.editSig}>Tap to Edit</Text>
                        </TouchableOpacity>
                    ) : (
                        <TouchableOpacity onPress={() => setIsSigning(true)} style={styles.sigPlaceholder}>
                            <MaterialCommunityIcons name="draw" size={40} color="#00f3ff" />
                            <Text style={styles.sigText}>TAP TO SIGN</Text>
                        </TouchableOpacity>
                    )}
                </View>

                <Button 
                    mode="contained" 
                    onPress={submitHandover} 
                    loading={loading}
                    disabled={loading}
                    style={styles.submitBtn}
                    labelStyle={styles.btnLabel}
                >
                    CONFIRM & CLOCK OUT
                </Button>
            </ScrollView>

            {/* Signature Modal */}
            <Modal visible={isSigning} animationType="slide">
                <View style={{flex: 1, backgroundColor: 'black'}}>
                    <View style={styles.modalHeader}>
                        <Text style={styles.modalTitle}>PLEASE SIGN BELOW</Text>
                        <TouchableOpacity onPress={() => setIsSigning(false)}>
                            <MaterialCommunityIcons name="close" size={30} color="white" />
                        </TouchableOpacity>
                    </View>
                    <SignatureScreen
                        ref={ref}
                        onOK={handleSignature}
                        onEmpty={handleEmpty}
                        descriptionText="Sign above"
                        clearText="Clear"
                        confirmText="Save"
                        webStyle={`.m-signature-pad--footer {display: none; margin: 0px;}`} 
                    />
                    <View style={styles.modalDirectActions}>
                        <Button mode="outlined" onPress={handleClear} textColor="red" style={{borderColor: 'red', flex: 1, marginRight: 10}}>CLEAR</Button>
                        <Button mode="contained" onPress={handleConfirm} buttonColor="#00f3ff" textColor="black" style={{flex: 1}}>SAVE</Button>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#0f0c29', padding: 20, paddingTop: 50 },
    header: { marginBottom: 30 },
    title: { color: 'white', fontSize: 24, fontWeight: 'bold', letterSpacing: 2 },
    subtitle: { color: '#00f3ff', fontSize: 12, marginTop: 5, letterSpacing: 1 },
    
    section: { marginBottom: 25 },
    sectionTitle: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: 'bold', marginBottom: 10 },
    
    grid: { flexDirection: 'row', flexWrap: 'wrap' },
    checkItem: { 
        width: '48%', flexDirection: 'row', alignItems: 'center', 
        padding: 15, marginBottom: 10, marginRight: '2%',
        backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 10,
        borderWidth: 1, borderColor: 'transparent'
    },
    checked: { borderColor: '#00f3ff', backgroundColor: 'rgba(0, 243, 255, 0.1)' },
    checkLabel: { color: 'white', marginLeft: 10, fontWeight: 'bold' },

    input: { backgroundColor: '#1a1a1a' },

    sigPlaceholder: {
        height: 120, borderStyle: 'dashed', borderWidth: 2, borderColor: '#00f3ff', borderRadius: 10,
        justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 243, 255, 0.05)'
    },
    sigPreview: {
        height: 120, borderWidth: 1, borderColor: '#00f3ff', borderRadius: 10,
        backgroundColor: 'white', justifyContent: 'center', alignItems: 'center'
    },
    sigText: { color: '#00f3ff', marginTop: 10, fontWeight: 'bold', letterSpacing: 1 },
    editSig: { position: 'absolute', bottom: 5, right: 5, color: 'gray', fontSize: 10 },

    submitBtn: { backgroundColor: '#00f3ff', borderRadius: 5, marginTop: 20, paddingVertical: 5 },
    btnLabel: { color: 'black', fontWeight: 'bold', fontSize: 16, letterSpacing: 1 },

    modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20 },
    modalTitle: { color: 'white', fontWeight: 'bold', fontSize: 18 },
    modalDirectActions: { flexDirection: 'row', padding: 20, backgroundColor: 'black' }
});
