
import React, { useContext, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { PaperProvider, MD3DarkTheme, FAB, Text } from 'react-native-paper';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext, AuthProvider } from './src/context/AuthContext';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import AnimatedSplash from './src/components/AnimatedSplash';
import { ThemeProvider } from './src/context/ThemeContext';
import NeuralBackground from './src/components/NeuralBackground';

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

// Metro Glass Theme
const theme = {
  ...MD3DarkTheme,
  colors: {
    ...MD3DarkTheme.colors,
    primary: '#00f3ff',     // Cyan Neon
    secondary: '#8a2be2',   // Blue Violet
    background: 'transparent', // Handled by Gradient
    surface: 'rgba(255,255,255,0.05)', // Glassy
    onSurface: '#e0e0e0',
    error: '#ff003c',
  },
  roundness: 20,
};

// Custom FAB Button
const ScanButton = ({ children, onPress }) => (
    <View style={{ top: -25, justifyContent: 'center', alignItems: 'center' }}>
        <View style={{ width: 70, height: 70, borderRadius: 35, overflow: 'hidden' }}>
            <BlurView intensity={30} tint="light" style={StyleSheet.absoluteFill} />
             <LinearGradient 
                colors={['#00c6ff', '#0072ff']} 
                style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}
            >
                <FAB
                    icon="qrcode-scan"
                    style={{ backgroundColor: 'transparent', shadowOpacity: 0 }}
                    color="white"
                    onPress={onPress}
                    customSize={60}
                />
            </LinearGradient>
        </View>
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
                    backgroundColor: 'transparent',
                    borderTopWidth: 0,
                    elevation: 0,
                    height: 85,
                },
                tabBarBackground: () => (
                    <BlurView intensity={80} tint="dark" style={StyleSheet.absoluteFill} />
                ),
                tabBarActiveTintColor: '#00f3ff',
                tabBarInactiveTintColor: 'rgba(255,255,255,0.5)',
                tabBarLabelStyle: { fontSize: 10, fontWeight: '600', marginBottom: 5 },
                tabBarIconStyle: { marginTop: 5 }
            }}
        >
            <Tab.Screen 
                name="Command" 
                component={PatrolScreen} 
                options={{
                    tabBarIcon: ({ color }) => <MaterialCommunityIcons name="shield-account" size={28} color={color} />,
                    tabBarLabel: 'COMMAND'
                }}
            />
            <Tab.Screen 
                name="DispatchList" 
                component={DispatchScreen} 
                options={{
                    tabBarIcon: ({ color }) => <MaterialCommunityIcons name="clipboard-text-clock" size={28} color={color} />,
                    tabBarLabel: 'LOGS'
                }}
            />
            
            <Tab.Screen 
                 name="Scan" 
                 component={View} 
                 options={({ navigation }) => ({
                     tabBarButton: (props) => <ScanButton {...props} onPress={() => navigation.navigate('QRScanner')} />,
                     tabBarLabel: ''
                 })}
            />

            <Tab.Screen 
                name="Comms" 
                component={CommsScreen} 
                options={{
                    tabBarIcon: ({ color }) => <MaterialCommunityIcons name="radio-handheld" size={28} color={color} />,
                    tabBarLabel: 'COMMS'
                }}
            />
            <Tab.Screen 
                name="Report" 
                component={ReportIncidentScreen} 
                options={{
                    tabBarIcon: ({ color }) => <MaterialCommunityIcons name="alert-octagon" size={28} color={color} />,
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
                    tabBarIcon: ({ color }) => <MaterialCommunityIcons name="account-cog" size={28} color={color} />,
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
        <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
            <BlurView intensity={20} style={StyleSheet.absoluteFill} />
            <MaterialCommunityIcons name="shield-lock" size={80} color="#00f3ff" style={{ marginBottom: 20 }} />
            <Text variant="headlineMedium" style={{ color: 'white', fontWeight: 'bold' }}>SYSTEM LOCKED</Text>
            <Text variant="bodyMedium" style={{ color: 'rgba(255,255,255,0.6)', marginTop: 10, letterSpacing: 1 }}>AUTHENTICATION REQUIRED</Text>
            
            <TouchableOpacity onPress={unlockApp} style={{ marginTop: 50, backgroundColor: 'rgba(255,255,255,0.1)', paddingVertical: 15, paddingHorizontal: 40, borderRadius: 30 }}>
                <Text style={{ color: '#00f3ff', fontWeight: 'bold' }}>UNLOCK</Text>
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

import * as SplashScreen from 'expo-splash-screen';

// Keep the splash screen visible while we fetch resources
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [splashVisible, setSplashVisible] = useState(true);

  React.useEffect(() => {
      // Hide the native splash screen immediately so our Custom AnimatedSplash can be seen
      async function prepare() {
          try {
              await SplashScreen.hideAsync();
          } catch (e) {
              console.warn(e);
          }
      }
      prepare();
  }, []);

  if (splashVisible) {
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
