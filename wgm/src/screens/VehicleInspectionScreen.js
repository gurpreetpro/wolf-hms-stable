import React, { useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, ImageBackground, Alert, Image } from 'react-native';
import { Text, Button, Card, TextInput, ActivityIndicator } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import ViewShot from "react-native-view-shot"; 
import api from '../services/api';

// Simple Car Outline (Base64 or URL) - Using a simple box representation for now if image fails
// In prod, use a real car diagram image asset
const CAR_DIAGRAM_URI = 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e0/Car_Outline_Top_View.svg/640px-Car_Outline_Top_View.svg.png';

export default function VehicleInspectionScreen({ route, navigation }) {
    const { session_id, vehicle_no } = route.params || {}; // Passed from ParkingScreen Entry
    
    // Fallback if accessed directly (Dev)
    const vNo = vehicle_no || "UNKNOWN";

    const [damagePoints, setDamagePoints] = useState([]);
    const [loading, setLoading] = useState(false);
    const viewShotRef = useRef();

    const handleTouch = (evt) => {
        // Get touch coordinates relative to the image container
        const { locationX, locationY } = evt.nativeEvent;
        setDamagePoints([...damagePoints, { x: locationX, y: locationY, id: Date.now() }]);
    };

    const undoLast = () => {
        setDamagePoints(damagePoints.slice(0, -1));
    };

    const submitInspection = async () => {
        if (damagePoints.length === 0) {
            Alert.alert("No Damage", "Marked as clean. Proceed?");
        }
        
        setLoading(true);
        try {
            await api.post('/parking/inspection_log', {
                session_id: session_id || 0,
                vehicle_no: vNo,
                damage_points: damagePoints
            });
            Alert.alert("Success", "Inspection Logged");
            navigation.goBack();
        } catch (e) {
            Alert.alert("Error", "Failed to save log");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <MaterialCommunityIcons name="arrow-left" size={28} color="white" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Inspection: {vNo}</Text>
                <Button mode="text" onPress={undoLast} textColor="#00f3ff">Undo</Button>
            </View>

            <View style={styles.instruction}>
                <Text style={{color:'#aaa'}}>Tap on diagram to mark scratches/dents.</Text>
            </View>

            <View style={styles.canvasContainer}>
                {/* 
                   In a real app, use <ImageBackground> with the Car Diagram.
                   For this demo, we verify the touch logic on a Box.
                */}
                <TouchableOpacity activeOpacity={1} onPress={handleTouch} style={styles.touchArea}>
                     <Image 
                        source={{ uri: CAR_DIAGRAM_URI }} 
                        style={styles.carImage} 
                        resizeMode="contain"
                    />
                    {damagePoints.map(p => (
                        <View 
                            key={p.id} 
                            style={[styles.damageDot, { left: p.x - 10, top: p.y - 10 }]} 
                        />
                    ))}
                </TouchableOpacity>
            </View>

            <View style={styles.footer}>
                <View style={styles.summary}>
                    <Text style={{color:'white'}}>{damagePoints.length} Damage Points Marked</Text>
                </View>
                <Button 
                    mode="contained" 
                    onPress={submitInspection} 
                    loading={loading}
                    style={styles.submitBtn}
                >
                    SAVE INSPECTION
                </Button>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 50, backgroundColor: '#1c1c1e' },
    headerTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    instruction: { padding: 10, alignItems: 'center' },
    canvasContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    touchArea: { width: '90%', height: '80%', backgroundColor: '#111', borderRadius: 20, overflow: 'hidden', borderWidth: 1, borderColor: '#333' },
    carImage: { width: '100%', height: '100%', opacity: 0.6 },
    damageDot: { position: 'absolute', width: 20, height: 20, borderRadius: 10, backgroundColor: '#ff003c', borderWidth: 2, borderColor: 'white' },
    footer: { padding: 20 },
    summary: { alignItems: 'center', marginBottom: 10 },
    submitBtn: { backgroundColor: '#00f3ff', borderRadius: 8 }
});
