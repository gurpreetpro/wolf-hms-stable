import React, { useEffect, useState } from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import * as Font from 'expo-font';
import { Inter_400Regular, Inter_500Medium, Inter_700Bold, Inter_800ExtraBold } from '@expo-google-fonts/inter';
import { AppNavigator } from './src/navigation/AppNavigator';
import { View, ActivityIndicator } from 'react-native';
import * as SecureStore from 'expo-secure-store';
import { useAuthStore } from './src/store/authStore';

import { setupNetworkInterceptor } from './src/services/networkService';

import { ThemeProvider } from './src/theme/ThemeContext';

export default function App() {
  const [appReady, setAppReady] = useState(false);
  const setConnection = useAuthStore(state => state.setConnection);

  useEffect(() => {
    setupNetworkInterceptor();
    async function loadResources() {
      try {
        await Font.loadAsync({
          Inter_400Regular,
          Inter_500Medium,
          Inter_700Bold,
          Inter_800ExtraBold,
        });

        // Hydrate Auth Store
        const savedCode = await SecureStore.getItemAsync('wolf_hospital_code');
        const savedUrl = await SecureStore.getItemAsync('wolf_base_url');
        const savedToken = await SecureStore.getItemAsync('wolf_auth_token');
        const savedUserStr = await SecureStore.getItemAsync('wolf_user_data');

        if (savedCode && savedUrl) {
            setConnection(savedUrl, savedCode);
        }

        setAppReady(true);
      } catch (e) {
        console.warn(e);
      }
    }
    loadResources();
  }, []);

  if (!appReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f172a' }}>
        <ActivityIndicator size="large" color="#06b6d4" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <StatusBar style="light" />
         {/* Global Context Providers Here */}
        <AppNavigator />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
