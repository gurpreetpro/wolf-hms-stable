
import React, { useState, useContext, useEffect } from 'react';
import { View, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { Text, TextInput, Button, ActivityIndicator, useTheme } from 'react-native-paper';
import { AuthContext } from '../context/AuthContext';
import * as LocalAuthentication from 'expo-local-authentication';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import * as SecureStore from 'expo-secure-store';
import { COLORS } from '../theme';

export default function LoginScreen() {
  const [empId, setEmpId] = useState('');
  const [password, setPassword] = useState('');
  const { login, isLoading } = useContext(AuthContext);
  const theme = useTheme();
  const [hasBiometrics, setHasBiometrics] = useState(false);
  const [hasStoredCreds, setHasStoredCreds] = useState(false);

  useEffect(() => {
      (async () => {
          const compatible = await LocalAuthentication.hasHardwareAsync();
          const enrolled = await LocalAuthentication.isEnrolledAsync();
          setHasBiometrics(compatible && enrolled);
          // Only show biometric button if we have stored credentials
          try {
              const storedId = await SecureStore.getItemAsync('wg_login_id');
              const storedPw = await SecureStore.getItemAsync('wg_login_pw');
              setHasStoredCreds(!!(storedId && storedPw));
          } catch (e) {
              setHasStoredCreds(false);
          }
      })();
  }, []);

  const handleLogin = async () => {
    if (!empId.trim() || !password.trim()) {
        Alert.alert('Missing Fields', 'Please enter your Guard ID and Passphrase.');
        return;
    }
    const result = await login(empId, password);
    if (result.success) {
        // Save credentials for future biometric login
        try {
            await SecureStore.setItemAsync('wg_login_id', empId);
            await SecureStore.setItemAsync('wg_login_pw', password);
        } catch (e) { /* non-critical */ }
    } else {
        Alert.alert('Login Failed', result.message || 'Invalid credentials.');
    }
  };

  const handleBiometricAuth = async () => {
      try {
          const result = await LocalAuthentication.authenticateAsync({
              promptMessage: 'Wolf Guard Access',
              fallbackLabel: 'Use Passcode'
          });
          if (result.success) {
              // Retrieve stored credentials from SecureStore
              const storedId = await SecureStore.getItemAsync('wg_login_id');
              const storedPw = await SecureStore.getItemAsync('wg_login_pw');
              if (storedId && storedPw) {
                  const loginResult = await login(storedId, storedPw);
                  if (!loginResult.success) {
                      Alert.alert('Login Failed', loginResult.message || 'Stored credentials may be expired. Please login manually.');
                  }
              } else {
                  Alert.alert('No Stored Credentials', 'Please login manually first. Biometric login will work on subsequent sessions.');
              }
          }
      } catch (e) { Alert.alert('Error', 'Biometric scan failed'); }
  };

  return (
    <View style={styles.container}>
       <LinearGradient
        colors={[COLORS.gradientStart, COLORS.gradientEnd]}
        style={StyleSheet.absoluteFill}
      />
      
      <View style={styles.content}>
        <View style={styles.header}>
            <MaterialCommunityIcons name="shield-lock-outline" size={60} color={COLORS.accent} style={{marginBottom: 20}} />
            <Text variant="displaySmall" style={{ color: COLORS.accent, fontWeight: 'bold', textShadowColor: COLORS.accentGlow, textShadowRadius: 10 }}>
                WOLF GUARD
            </Text>
            <Text variant="titleMedium" style={{ color: COLORS.glassOverlayStrong, letterSpacing: 3, marginTop: 5 }}>
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
                textColor={COLORS.textPrimary}
                theme={{ colors: { primary: COLORS.accent, background: 'transparent', outline: COLORS.border } }}
                left={<TextInput.Icon icon="account" color={COLORS.textPrimary} />}
            />
            
            <TextInput
                label="PASSPHRASE"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                mode="outlined"
                style={styles.input}
                textColor={COLORS.textPrimary}
                theme={{ colors: { primary: COLORS.accent, background: 'transparent', outline: COLORS.border } }}
                left={<TextInput.Icon icon="lock" color={COLORS.textPrimary} />}
            />

            <Button 
                mode="contained" 
                onPress={handleLogin} 
                loading={isLoading}
                style={styles.button}
                contentStyle={{ height: 50 }}
                labelStyle={{ fontWeight: 'bold', fontSize: 16, letterSpacing: 1 }}
                buttonColor={COLORS.accent}
                textColor={COLORS.onAccent}
            >
                AUTHENTICATE
            </Button>

            {hasBiometrics && hasStoredCreds && (
                <TouchableOpacity onPress={handleBiometricAuth} style={styles.bioButton}>
                    <MaterialCommunityIcons name="fingerprint" size={40} color={COLORS.accent} />
                    <Text style={{color: COLORS.accent, marginTop: 5}}>BIO-UNLOCK</Text>
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
      borderColor: COLORS.border, borderWidth: 1,
      gap: 15
  },
  input: { backgroundColor: 'transparent' },
  button: { marginTop: 10, borderRadius: 10 },
  bioButton: { alignItems: 'center', marginTop: 20, alignSelf: 'center' },
  footer: { position: 'absolute', bottom: 30, alignSelf: 'center', color: COLORS.textDim }
});

