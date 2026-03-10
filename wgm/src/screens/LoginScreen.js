
import React, { useState, useContext, useEffect } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, ActivityIndicator, useTheme } from 'react-native-paper';
import { AuthContext } from '../context/AuthContext';
import * as LocalAuthentication from 'expo-local-authentication';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';

export default function LoginScreen() {
  const [empId, setEmpId] = useState('101'); 
  const [password, setPassword] = useState('pass123');
  const { login, isLoading } = useContext(AuthContext);
  const theme = useTheme();
  const [hasBiometrics, setHasBiometrics] = useState(false);

  useEffect(() => {
      (async () => {
          const compatible = await LocalAuthentication.hasHardwareAsync();
          const enrolled = await LocalAuthentication.isEnrolledAsync();
          setHasBiometrics(compatible && enrolled);
      })();
  }, []);

  const handleLogin = async () => {
    const result = await login(empId, password);
    if (!result.success) alert(result.message);
  };

  const handleBiometricAuth = async () => {
      try {
          const result = await LocalAuthentication.authenticateAsync({
              promptMessage: 'Wolf Guard Access',
              fallbackLabel: 'Use Passcode'
          });
          if (result.success) {
              // In a real app, we would retrieve stored credentials here.
              // For demo, we auto-trigger login with default/current inputs
              handleLogin();
          }
      } catch (e) { Alert.alert('Error', 'Biometric scan failed'); }
  };

  return (
    <View style={styles.container}>
       <LinearGradient
        colors={['#050a14', '#141e30']}
        style={StyleSheet.absoluteFill}
      />
      
      <View style={styles.content}>
        <View style={styles.header}>
            <MaterialCommunityIcons name="shield-lock-outline" size={60} color="#00f3ff" style={{marginBottom: 20}} />
            <Text variant="displaySmall" style={{ color: '#00f3ff', fontWeight: 'bold', textShadowColor: 'rgba(0, 243, 255, 0.5)', textShadowRadius: 10 }}>
                WOLF GUARD
            </Text>
            <Text variant="titleMedium" style={{ color: 'rgba(255,255,255,0.7)', letterSpacing: 3, marginTop: 5 }}>
                CYBER SENTINEL ACCESS
            </Text>
        </View>

        <BlurView intensity={30} tint="dark" style={styles.glassForm}>
            <TextInput
                label="GUARD ID"
                value={empId}
                onChangeText={setEmpId}
                mode="outlined"
                style={styles.input}
                textColor="white"
                theme={{ colors: { primary: '#00f3ff', background: 'transparent', outline: 'rgba(255,255,255,0.2)' } }}
                left={<TextInput.Icon icon="account" color="white" />}
            />
            
            <TextInput
                label="PASSPHRASE"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                mode="outlined"
                style={styles.input}
                textColor="white"
                theme={{ colors: { primary: '#00f3ff', background: 'transparent', outline: 'rgba(255,255,255,0.2)' } }}
                left={<TextInput.Icon icon="lock" color="white" />}
            />

            <Button 
                mode="contained" 
                onPress={handleLogin} 
                loading={isLoading}
                style={styles.button}
                contentStyle={{ height: 50 }}
                labelStyle={{ fontWeight: 'bold', fontSize: 16, letterSpacing: 1 }}
                buttonColor="#00f3ff"
                textColor="#000"
            >
                AUTHENTICATE
            </Button>

            {hasBiometrics && (
                <TouchableOpacity onPress={handleBiometricAuth} style={styles.bioButton}>
                    <MaterialCommunityIcons name="fingerprint" size={40} color="#00f3ff" />
                    <Text style={{color: '#00f3ff', marginTop: 5}}>BIO-UNLOCK</Text>
                </TouchableOpacity>
            )}
        </BlurView>
        
        <Text style={styles.footer}> Wolf Security Systems v2.1</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', padding: 20 },
  header: { alignItems: 'center', marginBottom: 40 },
  glassForm: {
      padding: 25, borderRadius: 20, overflow: 'hidden',
      borderColor: 'rgba(255,255,255,0.1)', borderWidth: 1,
      gap: 15
  },
  input: { backgroundColor: 'transparent' },
  button: { marginTop: 10, borderRadius: 10 },
  bioButton: { alignItems: 'center', marginTop: 20, alignSelf: 'center' },
  footer: { position: 'absolute', bottom: 30, alignSelf: 'center', color: 'rgba(255,255,255,0.3)' }
});

