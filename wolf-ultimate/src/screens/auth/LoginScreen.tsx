import React, { useState, useEffect } from 'react';
import client, { hospitalLookup } from '../../api/client';
import BiometricService from '../../services/BiometricService'; // Import Service
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ImageBackground, ActivityIndicator, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { User, Lock, ArrowRight, Building2, Fingerprint } from 'lucide-react-native'; // Added Fingerprint
import { COLORS, FONTS, SPACING, SHADOWS } from '../../theme/theme';
import { useAuthStore } from '../../store/authStore';

export const LoginScreen = () => {
  const [username, setUsername] = useState('doctor_demo');
  const [password, setPassword] = useState('pass');
  const [hospitalCode, setHospitalCode] = useState('');
  const login = useAuthStore(state => state.login);
  const [loading, setLoading] = useState(false);
  const [biometricsAvailable, setBiometricsAvailable] = useState(false);

  useEffect(() => {
    checkBiometrics();
  }, []);

  const checkBiometrics = async () => {
    const supported = await BiometricService.isSupported();
    const creds = await BiometricService.getCredentials();
    if (supported && creds) {
        setBiometricsAvailable(true);
        // Optional: Auto-trigger prompt?
        // handleBiometricLogin(); 
    }
  };

  const handleBiometricLogin = async () => {
    const authenticated = await BiometricService.authenticate();
    if (authenticated) {
        const creds = await BiometricService.getCredentials();
        if (creds) {
            setHospitalCode(creds.hospitalCode);
            setUsername(creds.username);
            setPassword(creds.password);
            performLogin(creds.username, creds.password, creds.hospitalCode);
        }
    }
  };

  const promptForBiometrics = async (u: string, p: string, hId: number, hCode: string) => {
    const supported = await BiometricService.isSupported();
    if (!supported) return;

    Alert.alert(
        'Enable Biometrics',
        'Would you like to use FaceID/TouchID for next time?',
        [
            { text: 'No', style: 'cancel' },
            { 
                text: 'Yes', 
                onPress: async () => {
                    await BiometricService.saveCredentials(u, p, hId, hCode);
                    Alert.alert('Success', 'Biometrics enabled!');
                } 
            }
        ]
    );
  };

  const performLogin = async (u: string, p: string, hCode: string) => {
    setLoading(true);
    try {
      // 1. Resolve Hospital Code -> ID
      console.log(`Looking up hospital: ${hCode}`);
      const hospitalData = await hospitalLookup(hCode);
      
      if (!hospitalData || !hospitalData.id) {
        throw new Error('Invalid Hospital Code');
      }
      
      console.log(`Resolved Hospital ID: ${hospitalData.id}`);

      // 2. Authenticate
      const response = await client.post('/auth/login', {
        username: u, // Fixed: Server expects 'username', not 'loginIdentifier'
        password: p
      }, {
        headers: { 'x-hospital-id': hospitalData.id.toString() }
      });
      
      const { user, token } = response.data;
      
      // ✅ ROLE VALIDATION - Only allow clinical staff
      const allowedRoles = ['doctor', 'nurse', 'ward_incharge', 'admin'];
      if (!allowedRoles.includes(user?.role)) {
          throw new Error(
              `Access denied. Role '${user?.role}' is not authorized for Wolf Ultimate.\n\n` +
              `This app is for clinical staff only (Doctor, Nurse, Ward In-Charge).`
          );
      }
      
      // 3. Update Store
      login(user, token, hospitalData.id);

      // 4. Offer Biometrics (if not using them already)
      // Check if we already have these creds saved? Simplified: just ask.
      const currentCreds = await BiometricService.getCredentials();
      if (!currentCreds || currentCreds.username !== u) {
         promptForBiometrics(u, p, hospitalData.id, hCode);
      }
      
    } catch (error: any) {
      console.error('Login Error:', error);
      const msg = error.response?.data?.message || error.message || 'Login Failed';
      Alert.alert('Authentication Failed', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[COLORS.background, '#1e1b4b']}
        style={styles.background}
      />
      
      {/* Abstract Background Shapes */}
      <View style={[styles.shape, styles.shape1]} />
      <View style={[styles.shape, styles.shape2]} />

      <SafeAreaView style={styles.content}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <LinearGradient colors={[COLORS.primary, COLORS.secondary]} style={styles.logoBadge}>
               <Text style={styles.logoText}>W</Text>
            </LinearGradient>
            <Text style={styles.appName}>WOLF <Text style={{color: COLORS.primary}}>ULTIMATE</Text></Text>
          </View>
          <Text style={styles.tagline}>Next-Gen Hospital Management</Text>
        </View>

        <View style={styles.cardContainer}>
          <BlurView intensity={30} tint="dark" style={styles.card}>
            <Text style={styles.loginTitle}>Welcome Back</Text>
            
            <View style={styles.inputContainer}>
              <Building2 size={20} color={COLORS.textSecondary} style={styles.icon} />
              <TextInput 
                style={styles.input}
                placeholder="Hospital Code"
                placeholderTextColor={COLORS.textSecondary}
                value={hospitalCode}
                onChangeText={setHospitalCode}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <User size={20} color={COLORS.textSecondary} style={styles.icon} />
              <TextInput 
                style={styles.input}
                placeholder="Username"
                placeholderTextColor={COLORS.textSecondary}
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.inputContainer}>
              <Lock size={20} color={COLORS.textSecondary} style={styles.icon} />
              <TextInput 
                style={styles.input}
                placeholder="Password"
                placeholderTextColor={COLORS.textSecondary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <View style={{flexDirection: 'row', gap: 12}}>
                {biometricsAvailable && (
                    <TouchableOpacity 
                        style={[styles.loginButton, { flex: 1, backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: 16, justifyContent: 'center', alignItems: 'center' }]} 
                        onPress={handleBiometricLogin}
                        disabled={loading}
                    >
                        <Fingerprint size={28} color={COLORS.primary} />
                    </TouchableOpacity>
                )}

                <TouchableOpacity 
                  style={[styles.loginButton, { flex: 4 }]} 
                  activeOpacity={0.8}
                  onPress={() => performLogin(username, password, hospitalCode)}
                  disabled={loading}
                >
                  <LinearGradient
                    colors={[COLORS.primary, COLORS.secondary]}
                    start={{x: 0, y: 0}}
                    end={{x: 1, y: 0}}
                    style={styles.gradientButton}
                  >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <>
                            <Text style={styles.buttonText}>Sign In</Text>
                            <ArrowRight size={20} color="#fff" />
                        </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
            </View>

          </BlurView>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  background: {
    ...StyleSheet.absoluteFillObject,
  },
  shape: {
    position: 'absolute',
    borderRadius: 999,
    opacity: 0.3,
  },
  shape1: {
    width: 300,
    height: 300,
    backgroundColor: COLORS.secondary, // Purple
    top: -50,
    left: -100,
    // blurRadius removed as it's not valid for View
  },
  shape2: {
    width: 400,
    height: 400,
    backgroundColor: COLORS.primary, // Cyan
    bottom: -100,
    right: -100,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: SPACING.l,
  },
  header: {
    marginBottom: SPACING.xxl,
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.s,
  },
  logoBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.s,
  },
  logoText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
  },
  appName: {
    fontSize: 32,
    fontFamily: FONTS.bold,
    color: COLORS.text,
    letterSpacing: 1,
  },
  tagline: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.regular,
    fontSize: 16,
  },
  cardContainer: {
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.1)',
  },
  card: {
    padding: SPACING.l,
    backgroundColor: 'rgba(30, 41, 59, 0.4)', // Fallback / Base
  },
  loginTitle: {
    color: COLORS.text,
    fontSize: 22,
    fontFamily: FONTS.bold,
    marginBottom: SPACING.l,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.m,
    height: 56,
    marginBottom: SPACING.m,
  },
  icon: {
    marginRight: SPACING.s,
  },
  input: {
    flex: 1,
    color: COLORS.text,
    fontFamily: FONTS.medium,
    fontSize: 16,
  },
  loginButton: {
    marginTop: SPACING.s,
    ...SHADOWS.glow,
  },
  gradientButton: {
    height: 56,
    borderRadius: 16,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: SPACING.s,
  },
  buttonText: {
    color: '#fff',
    fontSize: 18,
    fontFamily: FONTS.bold,
  },
});
