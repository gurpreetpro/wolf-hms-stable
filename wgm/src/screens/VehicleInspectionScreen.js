import React, { useState, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { Text, Button } from 'react-native-paper';
import Svg, { Path, Circle, Rect, Line } from 'react-native-svg';
import ScreenShell from '../components/ScreenShell';
import api from '../services/api';
import { COLORS } from '../theme';

// Local top-view car diagram drawn with react-native-svg (no network dependency)
const CarTopView = () => (
    <Svg width="100%" height="100%" viewBox="0 0 320 200">
        {/* Car body outline (sedan style, top view) */}
        <Path
            d="M20 110 L30 65 C35 50 55 40 90 37 L110 22 C118 16 130 14 145 14 L175 14 C190 14 202 16 210 22 L230 37 C265 40 285 50 290 65 L300 110 C310 118 315 130 315 145 C315 155 310 160 300 160 L290 160 C290 160 288 140 270 135 L50 135 C32 140 30 160 30 160 L20 160 C10 160 5 155 5 145 C5 130 10 118 20 110 Z"
            fill={COLORS.card} stroke={COLORS.accent} strokeWidth="1.5" opacity="0.85"
        />
        {/* Windshield outline (front, top of drawing) */}
        <Path d="M45 75 C50 62 70 52 100 49 L118 36 L202 36 L220 49 C250 52 270 62 275 75 C280 88 272 95 240 95 L80 95 C48 95 40 88 45 75 Z" fill="none" stroke={COLORS.accent} strokeWidth="1" opacity="0.4" />
        {/* Rear window (bottom) */}
        <Path d="M45 130 C50 143 70 151 100 154 L118 162 L202 162 L220 154 C250 151 270 143 275 130 C280 120 272 115 240 115 L80 115 C48 115 40 120 45 130 Z" fill="none" stroke={COLORS.accent} strokeWidth="1" opacity="0.3" />
        {/* Side mirrors */}
        <Rect x="8" y="62" width="14" height="10" rx="3" fill={COLORS.card} stroke={COLORS.accent} strokeWidth="1" opacity="0.6" />
        <Rect x="298" y="62" width="14" height="10" rx="3" fill={COLORS.card} stroke={COLORS.accent} strokeWidth="1" opacity="0.6" />
        {/* Headlights */}
        <Circle cx="55" cy="115" r="4" fill={COLORS.statusGreen} opacity="0.8" />
        <Circle cx="265" cy="115" r="4" fill={COLORS.statusGreen} opacity="0.8" />
        {/* Taillights */}
        <Circle cx="55" cy="150" r="4" fill={COLORS.statusRed} opacity="0.8" />
        <Circle cx="265" cy="150" r="4" fill={COLORS.statusRed} opacity="0.8" />
        {/* Axle lines to guide placement */}
        <Line x1="160" y1="14" x2="160" y2="44" stroke={COLORS.accent} strokeWidth="0.5" opacity="0.25" />
        <Line x1="160" y1="158" x2="160" y2="186" stroke={COLORS.accent} strokeWidth="0.5" opacity="0.25" />
    </Svg>
);

export default function VehicleInspectionScreen({ route, navigation }) {
    const { session_id, vehicle_no } = route.params || {};
    const vNo = vehicle_no || "UNKNOWN";

    const [damagePoints, setDamagePoints] = useState([]);
    const [loading, setLoading] = useState(false);

    const handleTouch = (evt) => {
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
        <ScreenShell
            title={`Inspection: ${vNo}`}
            badgeText="GATE"
            badgeColor={COLORS.accentOrange}
            showBack={true}
            scrollable={false}
            rightAction={
                <Button mode="text" onPress={undoLast} textColor={COLORS.accent} compact>
                    Undo
                </Button>
            }
        >
            <View style={styles.instruction}>
                <Text style={{ color: COLORS.textMuted, fontSize: 13 }}>Tap diagram to mark scratches, dents, or existing damage.</Text>
            </View>

            <View style={styles.canvasContainer}>
                <TouchableOpacity activeOpacity={1} onPress={handleTouch} style={styles.touchArea}>
                    <View style={StyleSheet.absoluteFill} pointerEvents="none">
                        <CarTopView />
                    </View>
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
                    <Text style={{ color: COLORS.textPrimary, fontWeight: 'bold' }}>
                        {damagePoints.length} Damage Points Marked
                    </Text>
                </View>
                <Button 
                    mode="contained" 
                    onPress={submitInspection} 
                    loading={loading}
                    style={styles.submitBtn}
                    labelStyle={{ fontWeight: 'bold', fontSize: 16 }}
                >
                    SAVE INSPECTION
                </Button>
            </View>
        </ScreenShell>
    );
}

const styles = StyleSheet.create({
    instruction: { 
        paddingVertical: 8, 
        alignItems: 'center' 
    },
    canvasContainer: { 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center',
        paddingVertical: 10,
    },
    touchArea: { 
        width: '100%', 
        height: '90%', 
        backgroundColor: COLORS.surface, 
        borderRadius: 20, 
        overflow: 'hidden', 
        borderWidth: 1, 
        borderColor: COLORS.border 
    },
    damageDot: { 
        position: 'absolute', 
        width: 20, 
        height: 20, 
        borderRadius: 10, 
        backgroundColor: COLORS.severityCritical, 
        borderWidth: 2, 
        borderColor: COLORS.textPrimary 
    },
    footer: { 
        paddingTop: 10,
    },
    summary: { 
        alignItems: 'center', 
        marginBottom: 10 
    },
    submitBtn: { 
        backgroundColor: COLORS.accent, 
        borderRadius: 10,
        paddingVertical: 4,
    }
});
