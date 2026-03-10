
import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, Appbar, TextInput, Button, HelperText, SegmentedButtons } from 'react-native-paper';
import * as Location from 'expo-location';
import securityService from '../services/securityService';

export default function ReportIncidentScreen({ navigation }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [locationName, setLocationName] = useState('Fetching location...');
    const [severity, setSeverity] = useState('Low');
    const [type, setType] = useState('Security');
    
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        (async () => {
             const loc = await Location.getCurrentPositionAsync({});
             setLocationName(`${loc.coords.latitude.toFixed(5)}, ${loc.coords.longitude.toFixed(5)}`);
        })();
    }, []);

    const handleSubmit = async () => {
        if (!title || !description) {
            Alert.alert('Missing Fields', 'Please provide a title and description.');
            return;
        }

        setLoading(true);
        try {
            const res = await securityService.createIncident({
                title,
                type,
                severity,
                location: locationName,
                description,
                media_urls: []
            });

            if (res.data.success || res.status === 201) {
                Alert.alert('Report Submitted', 'Incident has been logged successfully.', [
                    { text: 'OK', onPress: () => navigation.goBack() }
                ]);
            }
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to submit report. Please check connection.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Appbar.Header style={{ backgroundColor: '#050a14' }}>
                <Appbar.BackAction onPress={() => navigation.goBack()} color="#00f3ff" />
                <Appbar.Content 
                    title={<Text style={{color: '#00f3ff', fontWeight: 'bold'}}>REPORT INCIDENT</Text>} 
                />
            </Appbar.Header>

            <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex: 1}}>
                <ScrollView contentContainerStyle={styles.content}>
                    
                    <Text style={styles.label}>Severity Level</Text>
                    <SegmentedButtons
                        value={severity}
                        onValueChange={setSeverity}
                        buttons={[
                            { value: 'Low', label: 'Low', style: {backgroundColor: severity==='Low' ? '#4ade80' : undefined} },
                            { value: 'Medium', label: 'Med', style: {backgroundColor: severity==='Medium' ? '#facc15' : undefined} },
                            { value: 'High', label: 'High', style: {backgroundColor: severity==='High' ? '#ff6600' : undefined} },
                            { value: 'Critical', label: 'Crit', style: {backgroundColor: severity==='Critical' ? '#ff003c' : undefined} },
                        ]}
                        style={styles.input}
                    />

                    <TextInput
                        label="Incident Title"
                        value={title}
                        onChangeText={setTitle}
                        mode="outlined"
                        style={styles.input}
                        textColor='white'
                        theme={{colors: {primary: '#00f3ff', background: '#0a1220'}}}
                    />

                    <TextInput
                        label="Type (e.g. Theft, Fire, Violence)"
                        value={type}
                        onChangeText={setType}
                        mode="outlined"
                        style={styles.input}
                        textColor='white'
                        theme={{colors: {primary: '#00f3ff', background: '#0a1220'}}}
                    />

                    <TextInput
                        label="Location"
                        value={locationName}
                        onChangeText={setLocationName}
                        mode="outlined"
                        style={styles.input}
                        textColor='white'
                        theme={{colors: {primary: '#00f3ff', background: '#0a1220'}}}
                        right={<TextInput.Icon icon="crosshairs-gps" color="#00f3ff"/>}
                    />

                    <TextInput
                        label="Description / Details"
                        value={description}
                        onChangeText={setDescription}
                        mode="outlined"
                        multiline
                        numberOfLines={5}
                        style={styles.input}
                        textColor='white'
                        theme={{colors: {primary: '#00f3ff', background: '#0a1220'}}}
                    />

                    <Button 
                        mode="contained" 
                        onPress={handleSubmit} 
                        loading={loading}
                        disabled={loading}
                        buttonColor="#00f3ff"
                        textColor="black"
                        style={styles.submitBtn}
                        labelStyle={{fontWeight: 'bold', fontSize: 16}}
                    >
                        SUBMIT REPORT
                    </Button>
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050a14',
    },
    content: {
        padding: 20,
    },
    label: {
        color: '#666',
        marginBottom: 10,
        fontWeight: 'bold',
    },
    input: {
        marginBottom: 20,
        backgroundColor: '#0a1220',
    },
    submitBtn: {
        marginTop: 20,
        paddingVertical: 8,
        borderRadius: 8,
    }
});
