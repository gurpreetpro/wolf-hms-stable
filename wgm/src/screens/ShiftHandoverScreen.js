import React, { useState, useRef, useContext } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert, Modal, Image } from 'react-native';
import { Text, TextInput, Button } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import SignatureScreen from 'react-native-signature-canvas';
import { AuthContext } from '../context/AuthContext';
import ScreenShell from '../components/ScreenShell';
import api from '../services/api';
import { COLORS } from '../theme';

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
    const signatureRef = useRef();

    const handleSignature = (sig) => {
        setSignature(sig); // Base64 image
        setIsSigning(false);
    };

    const handleEmpty = () => {
        Alert.alert('Empty Signature', 'Please sign before confirming.');
    };

    const handleClear = () => {
        signatureRef.current?.clearSignature();
    };

    const handleConfirm = () => {
        signatureRef.current?.readSignature();
    };

    const submitHandover = async () => {
        if (!signature || !notes.trim()) {
            Alert.alert('Incomplete Handover', 'Please add shift summary notes and sign the logbook.');
            return;
        }

        setLoading(true);
        try {
            const res = await api.post('/security/handover', {
                nextGuardId: null,
                notes,
                inventory,
                signatureUrl: signature
            });

            if (res.data?.success) {
                Alert.alert('Shift Ended', 'Logbook signed and shift successfully closed.', [
                    { text: 'Sign Out', onPress: logout }
                ]);
            } else {
                Alert.alert('Submission Error', 'Failed to log shift handover.');
            }
        } catch (e) {
            Alert.alert('Error', 'Failed to submit handover. Check network connection.');
        } finally {
            setLoading(false);
        }
    };

    const toggleItem = (item) => {
        setInventory(prev => ({ ...prev, [item]: !prev[item] }));
    };

    return (
        <ScreenShell
            title="Digital Logbook"
            subtitle="Shift Handover & Equipment Clearance"
            badgeText="HANDOVER"
            badgeColor={COLORS.accentIndigo}
            showBack={true}
        >
            {/* 1. Inventory Check */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>EQUIPMENT CHECKLIST</Text>
                <View style={styles.grid}>
                    {Object.keys(inventory).map(key => (
                        <TouchableOpacity 
                            key={key} 
                            style={[styles.checkItem, inventory[key] && styles.checked]}
                            onPress={() => toggleItem(key)}
                            activeOpacity={0.7}
                        >
                            <MaterialCommunityIcons 
                                name={inventory[key] ? "checkbox-marked" : "checkbox-blank-outline"} 
                                size={22} 
                                color={inventory[key] ? COLORS.accent : COLORS.textMuted} 
                            />
                            <Text style={styles.checkLabel}>{key.toUpperCase()}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
            </View>

            {/* 2. Notes */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>SHIFT SUMMARY NOTES</Text>
                <TextInput
                    mode="outlined"
                    placeholder="Log unusual incidents, key handovers, pending tasks..."
                    placeholderTextColor={COLORS.textMuted}
                    value={notes}
                    onChangeText={setNotes}
                    multiline
                    numberOfLines={4}
                    style={styles.textArea}
                    textColor={COLORS.textPrimary}
                    theme={{ colors: { primary: COLORS.accentIndigo } }}
                />
            </View>

            {/* 3. Signature */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>OFFICER DIGITAL SIGNATURE</Text>
                {signature ? (
                    <View style={styles.signaturePreviewContainer}>
                        <Image source={{ uri: signature }} style={styles.signaturePreview} resizeMode="contain" />
                        <Button mode="text" onPress={() => setIsSigning(true)} textColor={COLORS.accent}>
                            Re-sign Logbook
                        </Button>
                    </View>
                ) : (
                    <Button 
                        mode="outlined" 
                        icon="draw" 
                        onPress={() => setIsSigning(true)}
                        style={styles.signButton}
                        textColor={COLORS.accent}
                    >
                        Tap to Sign Handover
                    </Button>
                )}
            </View>

            {/* Submit */}
            <Button 
                mode="contained" 
                onPress={submitHandover} 
                loading={loading}
                style={styles.submitBtn}
                labelStyle={{ fontSize: 16, fontWeight: 'bold' }}
            >
                COMPLETE HANDOVER & END SHIFT
            </Button>

            {/* Signature Modal */}
            <Modal visible={isSigning} animationType="slide" transparent>
                <View style={styles.modalContainer}>
                    <View style={styles.signatureBox}>
                        <Text style={styles.modalTitle}>Sign with finger below</Text>
                        <View style={styles.canvasWrapper}>
                            <SignatureScreen
                                ref={signatureRef}
                                onOK={handleSignature}
                                onEmpty={handleEmpty}
                                descriptionText="Sign here"
                                clearText="Clear"
                                confirmText="Save"
                                webStyle={`.m-signature-pad--footer {display: none; margin: 0px;}`}
                                autoClear={true}
                                imageType="image/png"
                            />
                        </View>
                        <View style={styles.modalActions}>
                            <Button onPress={() => setIsSigning(false)} textColor={COLORS.textMuted}>
                                Cancel
                            </Button>
                            <Button onPress={handleClear} textColor={COLORS.statusRed}>
                                Clear
                            </Button>
                            <Button mode="contained" onPress={handleConfirm} style={{ backgroundColor: COLORS.accentIndigo }}>
                                Confirm
                            </Button>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScreenShell>
    );
}

const styles = StyleSheet.create({
    section: {
        marginBottom: 20,
    },
    sectionTitle: {
        color: COLORS.textMuted,
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 10,
    },
    checkItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        paddingHorizontal: 14,
        paddingVertical: 12,
        borderRadius: 12,
        width: '48%',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    checked: {
        borderColor: COLORS.accent,
        backgroundColor: COLORS.card,
    },
    checkLabel: {
        color: COLORS.textPrimary,
        marginLeft: 8,
        fontWeight: '600',
        fontSize: 12,
    },
    textArea: {
        backgroundColor: COLORS.surface,
        minHeight: 100,
    },
    signButton: {
        borderColor: COLORS.accent,
        borderWidth: 1,
        borderStyle: 'dashed',
        paddingVertical: 8,
        borderRadius: 12,
    },
    signaturePreviewContainer: {
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    signaturePreview: {
        width: '100%',
        height: 100,
        backgroundColor: COLORS.background,
        borderRadius: 8,
    },
    submitBtn: {
        marginTop: 10,
        backgroundColor: COLORS.accentIndigo,
        borderRadius: 12,
        paddingVertical: 6,
    },
    modalContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.scrim,
        padding: 20,
    },
    signatureBox: {
        width: '100%',
        height: 380,
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    modalTitle: {
        color: COLORS.textPrimary,
        fontSize: 16,
        fontWeight: 'bold',
        textAlign: 'center',
        marginBottom: 10,
    },
    canvasWrapper: {
        flex: 1,
        borderRadius: 10,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    modalActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 14,
    }
});
