import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Building2, ArrowRight, Server, CheckCircle2 } from 'lucide-react-native';
import { useAuthStore } from '../../store/authStore';
import * as SecureStore from 'expo-secure-store';
import { useNavigation } from '@react-navigation/native';
// @ts-ignore
import axios from 'axios/dist/axios';

// Default directory URL for resolution (Mocking this for now to point to known cloud instances)
// In a real scenario, this would be a central registry.
// Here we will simulate resolution locally for the Prototype.
const MOCK_REGISTRY: Record<string, string> = {
    'demo': 'http://217.216.78.81:8080/api',
    'kokila': 'http://217.216.78.81:8080/api', // Simulating On-Prem pointing to Cloud for demo
    'localhost': 'http://192.168.1.5:8080/api', // Dev helper
};

export const ServerResolverScreen = () => {
    const [code, setCode] = useState('');
    const [resolving, setResolving] = useState(false);
    const setConnection = useAuthStore(state => state.setConnection);
    const navigation = useNavigation<any>();

    const handleConnect = async () => {
        if (!code.trim()) {
            Alert.alert('Validation Error', 'Please enter a Hospital Code.');
            return;
        }

        setResolving(true);
        const normalizedCode = code.toLowerCase().trim();

        try {
            // 1. Resolve URL
            // Real implementation: const res = await axios.get(`https://directory.wolfhms.com/resolve/${normalizedCode}`);
            // Mock Implementation:
            await new Promise(r => setTimeout(r, 1500)); // Fake network delay

            const resolvedUrl = MOCK_REGISTRY[normalizedCode];

            if (!resolvedUrl) {
                throw new Error('Hospital code not found in directory.');
            }

            // 2. Verify Connectivity
            // Hit the health endpoint of the resolved URL to make sure it's alive
            try {
                 await axios.get(`${resolvedUrl}/health`, { timeout: 5000 });
            } catch (healthErr) {
                 console.warn("Health check failed, but proceeding if it's just a config issue", healthErr);
                 // We might still allow it if it's a valid code but server is sleeping (Cloud Run)
            }
            
            // 3. Save to Store & Storage
            setConnection(resolvedUrl, normalizedCode);
            await SecureStore.setItemAsync('wolf_hospital_code', normalizedCode);
            await SecureStore.setItemAsync('wolf_base_url', resolvedUrl);

            // 4. Navigate
            navigation.replace('Login');

        } catch (error: any) {
            Alert.alert('Connection Failed', error.message || 'Could not connect to the server.');
        } finally {
            setResolving(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="light" />
            <KeyboardAvoidingView 
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.content}
            >
                <View style={styles.header}>
                    <View style={styles.iconContainer}>
                        <Building2 size={42} color="#06b6d4" />
                    </View>
                    <Text style={styles.title}>Wolf Ultimate</Text>
                    <Text style={styles.subtitle}>Enterprise Mobility Platform</Text>
                </View>

                <View style={styles.formCard}>
                    <Text style={styles.label}>Connect to Hospital</Text>
                    <Text style={styles.helperText}>Enter your unique hospital code to configure the app for your organization.</Text>

                    <View style={styles.inputContainer}>
                        <Server size={20} color="#64748b" style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. kokila, demo"
                            placeholderTextColor="#94a3b8"
                            value={code}
                            onChangeText={setCode}
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                    </View>

                    <TouchableOpacity 
                        style={styles.button} 
                        onPress={handleConnect}
                        disabled={resolving}
                    >
                        {resolving ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <>
                                <Text style={styles.buttonText}>Connect Securely</Text>
                                <ArrowRight size={20} color="#fff" style={{ marginLeft: 8 }} />
                            </>
                        )}
                    </TouchableOpacity>
                </View>

                <View style={styles.footer}>
                    <Text style={styles.footerText}>Version 1.1.0 (Build 502)</Text>
                    <Text style={styles.footerText}>Powered by Wolf HMS Cloud</Text>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f172a', // Slate 900
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 48,
    },
    iconContainer: {
        width: 80,
        height: 80,
        backgroundColor: 'rgba(6, 182, 212, 0.1)', // Cyan 500 alpha
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 16,
        borderWidth: 1,
        borderColor: 'rgba(6, 182, 212, 0.2)',
    },
    title: {
        fontSize: 32,
        fontFamily: 'Inter_800ExtraBold',
        color: '#f8fafc',
        letterSpacing: -1,
    },
    subtitle: {
        fontSize: 16,
        fontFamily: 'Inter_400Regular',
        color: '#94a3b8',
        marginTop: 8,
    },
    formCard: {
        backgroundColor: '#1e293b', // Slate 800
        padding: 24,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#334155',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
        elevation: 10,
    },
    label: {
        fontSize: 18,
        fontFamily: 'Inter_700Bold',
        color: '#f1f5f9',
        marginBottom: 8,
    },
    helperText: {
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        color: '#64748b',
        marginBottom: 24,
        lineHeight: 20,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#0f172a',
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#334155',
        marginBottom: 24,
        height: 56,
        paddingHorizontal: 16,
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        color: '#fff',
        fontFamily: 'Inter_500Medium',
        fontSize: 16,
    },
    button: {
        backgroundColor: '#0891b2', // Cyan 600
        height: 56,
        borderRadius: 12,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#0891b2',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 5,
    },
    buttonText: {
        color: '#fff',
        fontFamily: 'Inter_700Bold',
        fontSize: 16,
    },
    footer: {
        marginTop: 48,
        alignItems: 'center',
    },
    footerText: {
        color: '#475569',
        fontFamily: 'Inter_400Regular',
        fontSize: 12,
    },
});
