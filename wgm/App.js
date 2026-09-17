
import React, { useContext, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { PaperProvider, MD3DarkTheme, FAB, Text } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import * as SplashScreen from 'expo-splash-screen';
import * as Font from 'expo-font';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext, AuthProvider } from './src/context/AuthContext';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedSplash from './src/components/AnimatedSplash';
import { ThemeProvider } from './src/context/ThemeContext';
import NeuralBackground from './src/components/NeuralBackground';
import TacticalIcon from './src/components/TacticalIcon';
import { COLORS } from './src/theme/index';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

// Screens
import LoginScreen from './src/screens/LoginScreen';
import PatrolScreen from './src/screens/PatrolScreen';
import DispatchScreen from './src/screens/DispatchScreen';
import ReportIncidentScreen from './src/screens/ReportIncidentScreen';
import QRScannerScreen from './src/screens/QRScannerScreen';
import CommsScreen from './src/screens/CommsScreen';
import ShiftHandoverScreen from './src/screens/ShiftHandoverScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ParkingScreen from './src/screens/ParkingScreen';
import VehicleInspectionScreen from './src/screens/VehicleInspectionScreen';
import ViolationScreen from './src/screens/ViolationScreen';
import LogisticsScreen from './src/screens/LogisticsScreen';
import DutySelectionScreen from './src/screens/DutySelectionScreen';
import VisitorEntryScreen from './src/screens/VisitorEntryScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

// Metro Glass Theme (tokens sourced from src/theme/index.js)
const theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: COLORS.accent,     // Cyan Neon
    secondary: COLORS.secondary,   // Blue Violet
    background: 'transparent', // Handled by Gradient
    surface: COLORS.glassSurface, // Glassy
    onSurface: COLORS.text,
    error: COLORS.danger,
  },
  roundness: 20,
};

// Mission Control Center Scan Button
const ScanButton = ({ onPress }) => (
    <View style={{ top: -20, justifyContent: 'center', alignItems: 'center' }}>
        <TouchableOpacity 
            onPress={onPress} 
            activeOpacity={0.85}
            style={{ 
                width: 64, 
                height: 64, 
                borderRadius: 32, 
                overflow: 'hidden',
                borderWidth: 2,
                borderColor: COLORS.accent,
                elevation: 8,
                shadowColor: COLORS.accent,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.5,
                shadowRadius: 8,
            }}
        >
            <LinearGradient 
                colors={[COLORS.scanGradientStart, COLORS.scanGradientEnd]} 
                style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
            >
                <TacticalIcon name="qrcode-scan" size={28} color={COLORS.onAccent} />
            </LinearGradient>
        </TouchableOpacity>
    </View>
);

const MainTabs = () => {
    return (
        <Tab.Navigator
            screenOptions={{
                headerShown: false,
                tabBarStyle: {
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    backgroundColor: 'rgba(8, 12, 20, 0.92)',
                    borderTopWidth: 1,
                    borderTopColor: COLORS.border,
                    elevation: 10,
                    height: 85,
                },
                tabBarBackground: () => (
                    <BlurView intensity={85} tint="dark" style={StyleSheet.absoluteFill} />
                ),
                tabBarActiveTintColor: COLORS.accent,
                tabBarInactiveTintColor: COLORS.textMuted,
                tabBarLabelStyle: { fontSize: 10, fontWeight: '700', marginBottom: 6, letterSpacing: 0.5 },
                tabBarIconStyle: { marginTop: 6 }
            }}
        >
            <Tab.Screen 
                name="Command" 
                component={PatrolScreen} 
                options={{
                    tabBarIcon: ({ color }) => <TacticalIcon name="shield-account" size={24} color={color} />,
                    tabBarLabel: 'COMMAND'
                }}
            />
            <Tab.Screen 
                name="DispatchList" 
                component={DispatchScreen} 
                options={{
                    tabBarIcon: ({ color }) => <TacticalIcon name="clipboard-text-clock" size={24} color={color} />,
                    tabBarLabel: 'LOGS'
                }}
            />
            
            <Tab.Screen 
                 name="Scan" 
                 component={View} 
                 options={({ navigation }) => ({
                     tabBarButton: () => <ScanButton onPress={() => navigation.navigate('QRScanner')} />,
                     tabBarLabel: ''
                 })}
            />

            <Tab.Screen 
                name="Comms" 
                component={CommsScreen} 
                options={{
                    tabBarIcon: ({ color }) => <TacticalIcon name="radio-handheld" size={24} color={color} />,
                    tabBarLabel: 'COMMS'
                }}
            />
            <Tab.Screen 
                name="Report" 
                component={ReportIncidentScreen} 
                options={{
                    tabBarIcon: ({ color }) => <TacticalIcon name="alert-octagon" size={24} color={color} />,
                    tabBarLabel: 'REPORT'
                }}
            />
            <Tab.Screen 
                 name="ProfileTab" 
                 component={View} 
                 listeners={({ navigation }) => ({
                     tabPress: (e) => {
                         e.preventDefault();
                         navigation.navigate('Profile');
                     },
                 })}
                 options={{
                    tabBarIcon: ({ color }) => <TacticalIcon name="account-cog" size={24} color={color} />,
                    tabBarLabel: 'PROFILE'
                 }}
            />
        </Tab.Navigator>
    );
};

const LockScreen = () => {
    const { unlockApp } = useContext(AuthContext);
    
    // Auto-trigger on mount
    React.useEffect(() => {
        unlockApp();
    }, []);

    return (
        <View style={{ flex: 1, backgroundColor: COLORS.background, justifyContent: 'center', alignItems: 'center' }}>
            <BlurView intensity={20} style={StyleSheet.absoluteFill} />
            <MaterialCommunityIcons name="shield-lock" size={80} color={COLORS.accent} style={{ marginBottom: 20 }} />
            <Text variant="headlineMedium" style={{ color: COLORS.textPrimary, fontWeight: 'bold' }}>SYSTEM LOCKED</Text>
            <Text variant="bodyMedium" style={{ color: COLORS.glassOverlayStrong, marginTop: 10, letterSpacing: 1 }}>AUTHENTICATION REQUIRED</Text>
            
            <TouchableOpacity onPress={unlockApp} style={{ marginTop: 50, backgroundColor: COLORS.glassOverlayWeak, paddingVertical: 15, paddingHorizontal: 40, borderRadius: 30 }}>

                <Text style={{ color: COLORS.accent, fontWeight: 'bold' }}>UNLOCK</Text>
            </TouchableOpacity>
        </View>
    );
};

const AppNavigator = () => {
  const { userToken, isLocked, dutyMode } = useContext(AuthContext);

  if (isLocked) {
      return <LockScreen />;
  }

  return (
    <NavigationContainer theme={{...theme, colors: {...theme.colors, background: 'transparent'}}}>
       {/* Global Background */}
       <NeuralBackground />
      
      <Stack.Navigator screenOptions={{ 
            headerShown: false, 
            contentStyle: { backgroundColor: 'transparent' },
            animation: 'fade'
        }}>
        {userToken == null ? (
          <Stack.Screen name="Login" component={LoginScreen} />
        ) : (
          <>
             {/* Show DutySelection first if no dutyMode, otherwise go to Main */}
             <Stack.Screen 
                name="DutySelection" 
                component={DutySelectionScreen} 
                options={{ gestureEnabled: false }}
             />
             <Stack.Screen name="Main" component={MainTabs} />
             <Stack.Screen name="QRScanner" component={QRScannerScreen} />
             <Stack.Screen name="Dispatch" component={DispatchScreen} />
             <Stack.Screen name="ReportIncident" component={ReportIncidentScreen} />
             <Stack.Screen name="ShiftHandover" component={ShiftHandoverScreen} />
             <Stack.Screen name="Profile" component={ProfileScreen} />
             <Stack.Screen name="Parking" component={ParkingScreen} />
             <Stack.Screen name="VehicleInspection" component={VehicleInspectionScreen} />
             <Stack.Screen name="Violation" component={ViolationScreen} />
             <Stack.Screen name="Logistics" component={LogisticsScreen} />
             <Stack.Screen name="VisitorEntry" component={VisitorEntryScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default function App() {
  const [appIsReady, setAppIsReady] = useState(false);
  const [splashVisible, setSplashVisible] = useState(true);

  React.useEffect(() => {
      // Preload icon fonts before hiding native splash so vector glyphs render immediately
      async function prepare() {
          try {
              await Font.loadAsync({
                  ...MaterialCommunityIcons.font,
              });
          } catch (e) {
              console.warn('[Font] Failed to preload icon fonts', e);
          } finally {
              setAppIsReady(true);
              try {
                  await SplashScreen.hideAsync();
              } catch (e) {
                  console.warn(e);
              }
          }
      }
      prepare();
  }, []);

  if (!appIsReady || splashVisible) {
      return <AnimatedSplash onFinish={() => setSplashVisible(false)} />;
  }

  return (
    <PaperProvider theme={theme}>
        <ThemeProvider>
            <AuthProvider>
                <AppNavigator />
                <StatusBar style="light" />
            </AuthProvider>
        </ThemeProvider>
    </PaperProvider>
  );
}
