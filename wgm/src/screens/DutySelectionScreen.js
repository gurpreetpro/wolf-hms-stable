import React, { useContext } from 'react';
import { View, StyleSheet, TouchableOpacity, ImageBackground } from 'react-native';
import { Text, Surface } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { AuthContext } from '../context/AuthContext';

export default function DutySelectionScreen({ navigation }) {
    const { setDutyMode, userData } = useContext(AuthContext);

    const handleSelect = (mode) => {
        setDutyMode(mode);
        // Reset navigation stack so Main is the root (no back gesture to this screen)
        navigation.reset({
            index: 0,
            routes: [{ name: 'Main' }],
        });
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.welcome}>Welcome, Officer {userData?.username}</Text>
                <Text style={styles.subtext}>Select your post for today:</Text>
            </View>

            <View style={styles.cardContainer}>
                {/* Option 1: Gate / Parking */}
                <TouchableOpacity onPress={() => handleSelect('GATE')} style={styles.touchable}>
                    <Surface style={[styles.card, { borderColor: '#FF9500' }]}>
                        <LinearGradient colors={['#FF9500', '#FF5E3A']} style={styles.iconBg}>
                            <MaterialCommunityIcons name="boom-gate" size={40} color="white" />
                        </LinearGradient>
                        <View style={styles.textContainer}>
                            <Text style={styles.cardTitle}>GATE / PARKING</Text>
                            <Text style={styles.cardDesc}>Visitor Entry, Vehicle Check-in, Logistics</Text>
                        </View>
                    </Surface>
                </TouchableOpacity>

                {/* Option 2: Premises / Patrol */}
                <TouchableOpacity onPress={() => handleSelect('PATROL')} style={styles.touchable}>
                    <Surface style={[styles.card, { borderColor: '#00f3ff' }]}>
                        <LinearGradient colors={['#00f3ff', '#0072ff']} style={styles.iconBg}>
                            <MaterialCommunityIcons name="shield-account" size={40} color="white" />
                        </LinearGradient>
                        <View style={styles.textContainer}>
                            <Text style={styles.cardTitle}>PREMISES / PATROL</Text>
                            <Text style={styles.cardDesc}>Rounds, Incidents, Safety Checks, SOS</Text>
                        </View>
                    </Surface>
                </TouchableOpacity>

                {/* Option 3: Reception / Lobby (New VMS Mode) */}
                <TouchableOpacity onPress={() => handleSelect('RECEPTION')} style={styles.touchable}>
                    <Surface style={[styles.card, { borderColor: '#AF52DE' }]}>
                        <LinearGradient colors={['#AF52DE', '#5856D6']} style={styles.iconBg}>
                            <MaterialCommunityIcons name="desk" size={40} color="white" />
                        </LinearGradient>
                        <View style={styles.textContainer}>
                            <Text style={styles.cardTitle}>RECEPTION / LOBBY</Text>
                            <Text style={styles.cardDesc}>Visitor Logs, Badging, Host Invites</Text>
                        </View>
                    </Surface>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000', padding: 20, paddingTop: 60 },
    header: { marginBottom: 40 },
    welcome: { color: 'white', fontSize: 24, fontWeight: 'bold' },
    subtext: { color: '#888', fontSize: 16, marginTop: 5 },
    cardContainer: { gap: 20 },
    touchable: { width: '100%' },
    card: { 
        flexDirection: 'row', alignItems: 'center', backgroundColor: '#111', 
        padding: 20, borderRadius: 15, borderWidth: 1, elevation: 5 
    },
    iconBg: { width: 70, height: 70, borderRadius: 35, justifyContent: 'center', alignItems: 'center' },
    textContainer: { marginLeft: 20, flex: 1 },
    cardTitle: { color: 'white', fontSize: 18, fontWeight: 'bold' },
    cardDesc: { color: '#aaa', fontSize: 12, marginTop: 5 }
});
