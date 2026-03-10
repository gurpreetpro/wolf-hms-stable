import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer } from '@react-navigation/native';
import { useAuthStore } from '../store/authStore';
import { LoginScreen } from '../screens/auth/LoginScreen';
import { ServerResolverScreen } from '../screens/auth/ServerResolverScreen';
import { View, Text } from 'react-native';

const Stack = createNativeStackNavigator();

import { TabNavigator } from './TabNavigator';

export const AppNavigator = () => {
    const isAuthenticated = useAuthStore(state => state.isAuthenticated);
    const hospitalCode = useAuthStore(state => state.hospitalCode);

    return (
        <NavigationContainer>
            <Stack.Navigator screenOptions={{ headerShown: false }} id="AppStack">
                {!hospitalCode ? (
                    <Stack.Screen name="ServerResolver" component={ServerResolverScreen} />
                ) : !isAuthenticated ? (
                    <Stack.Screen name="Login" component={LoginScreen} />
                ) : (
                    <Stack.Screen name="MainTabs" component={TabNavigator} />
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
};
