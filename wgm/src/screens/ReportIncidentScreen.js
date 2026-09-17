import React, { useState, useEffect } from 'react';
import { View, StyleSheet, Alert } from 'react-native';
import { Text, TextInput, Button, SegmentedButtons } from 'react-native-paper';
import * as Location from 'expo-location';
import ScreenShell from '../components/ScreenShell';
import securityService from '../services/securityService';
import { COLORS } from '../theme';

export default function ReportIncidentScreen({ navigation }) {
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [locationName, setLocationName] = useState('Fetching GPS fix...');
    const [severity, setSeverity] = useState('Low');
    const [type, setType] = useState('Security');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        (async () => {
            try {
                const loc = await Location.getCurrentPositionAsync({});
                if (loc?.coords) {
                    setLocationName(`${loc.coords.latitude.toFixed(5)}, ${loc.coords.longitude.toFixed(5)}`);
                }
            } catch (e) {
                setLocationName('Sector Main Compound (GPS Unavailable)');
            }
        })();
    }, []);

    const handleSubmit = async () => {
        if (!title.trim() || !description.trim()) {
            Alert.alert('Missing Fields', 'Please provide an incident title and detailed description.');
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

            if (res.data?.success || res.status === 201) {
                Alert.alert('Report Submitted', 'Incident log dispatched successfully to Command Center.', [
                    { text: 'OK', onPress: () => {
                        setTitle('');
                        setDescription('');
                        if (navigation.canGoBack()) navigation.goBack();
                    }}
                ]);
            }
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to submit report. Please check network connectivity.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScreenShell
            title="Report Incident"
            badgeText="ALERT"
            badgeColor={COLORS.statusRed}
        >
            <View style={styles.formCard}>
                <TextInput
                    label="Incident Title *"
                    value={title}
                    onChangeText={setTitle}
                    mode="outlined"
                    style={styles.input}
                    textColor={COLORS.textPrimary}
                    placeholder="e.g., Broken Lock at West Gate"
                    placeholderTextColor={COLORS.textMuted}
                    theme={{ colors: { primary: COLORS.accent } }}
                />

                <Text style={styles.label}>SEVERITY LEVEL</Text>
                <SegmentedButtons
                    value={severity}
                    onValueChange={setSeverity}
                    buttons={[
                        { value: 'Low', label: 'Low' },
                        { value: 'Medium', label: 'Med' },
                        { value: 'High', label: 'High' },
                        { value: 'Critical', label: 'Crit' },
                    ]}
                    style={styles.segmented}
                />

                <Text style={styles.label}>INCIDENT CLASSIFICATION</Text>
                <SegmentedButtons
                    value={type}
                    onValueChange={setType}
                    buttons={[
                        { value: 'Security', label: 'Security' },
                        { value: 'Safety', label: 'Safety' },
                        { value: 'Medical', label: 'Medical' },
                    ]}
                    style={styles.segmented}
                />

                <TextInput
                    label="Incident Location (GPS Coords)"
                    value={locationName}
                    editable={false}
                    mode="outlined"
                    style={styles.input}
                    textColor={COLORS.textMuted}
                    left={<TextInput.Icon icon="map-marker" color={COLORS.accent} />}
                />

                <TextInput
                    label="Description of Event *"
                    value={description}
                    onChangeText={setDescription}
                    mode="outlined"
                    multiline
                    numberOfLines={4}
                    style={[styles.input, { minHeight: 100 }]}
                    textColor={COLORS.textPrimary}
                    placeholder="Describe what occurred, individuals involved, and action taken..."
                    placeholderTextColor={COLORS.textMuted}
                    theme={{ colors: { primary: COLORS.accent } }}
                />

                <Button
                    mode="contained"
                    onPress={handleSubmit}
                    loading={loading}
                    style={styles.submitBtn}
                    labelStyle={{ fontSize: 16, fontWeight: 'bold' }}
                >
                    DISPATCH INCIDENT REPORT
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
    label: {
        color: COLORS.textMuted,
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 6,
        letterSpacing: 0.5,
    },
    segmented: {
        marginBottom: 16,
    },
    submitBtn: {
        marginTop: 10,
        backgroundColor: COLORS.statusRed,
        borderRadius: 10,
        paddingVertical: 4,
    },
});
