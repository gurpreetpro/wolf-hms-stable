import React, { createContext, useState, useEffect, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [userToken, setUserToken] = useState(null);
  const [userData, setUserData] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [dutyMode, setDutyModeState] = useState(null); // 'PATROL' | 'GATE' | 'RECEPTION'
  const appState = useRef(AppState.currentState);

  // Persist dutyMode to SecureStore
  const setDutyMode = async (mode) => {
    setDutyModeState(mode);
    if (mode) {
      await SecureStore.setItemAsync('dutyMode', mode);
    } else {
      await SecureStore.deleteItemAsync('dutyMode');
    }
  };

  // Login Function
  const login = async (employeeId, password) => {
    setIsLoading(true);
    try {
        const response = await api.post('/auth/login', {
            id: employeeId,
            password: password
        });

        if (response.data.success) {
            const { token, user } = response.data;
            if (user.role !== 'security_guard' && user.role !== 'admin') {
                throw new Error('Access Denied: Wolf Guard App is for Security Personal Only.');
            }
            setUserToken(token);
            setUserData(user);
            await SecureStore.setItemAsync('userToken', token);
            await SecureStore.setItemAsync('userData', JSON.stringify(user));
            return { success: true };
        } else {
            return { success: false, message: response.data.message };
        }
    } catch (error) {
        console.error('Login Error:', error);
        return { success: false, message: error.message || 'Network Error' };
    } finally {
        setIsLoading(false);
    }
  };

  // Logout Function
  const logout = async () => {
    setUserToken(null);
    setUserData(null);
    setDutyMode(null);
    setIsLocked(false);
    await SecureStore.deleteItemAsync('userToken');
    await SecureStore.deleteItemAsync('userData');
  };

  // Restore Token and DutyMode on Start
  const isLoggedIn = async () => {
    try {
        let token = await SecureStore.getItemAsync('userToken');
        let user = await SecureStore.getItemAsync('userData');
        let savedDutyMode = await SecureStore.getItemAsync('dutyMode');
        if (token && user) {
            setUserToken(token);
            setUserData(JSON.parse(user));
            if (savedDutyMode) {
                setDutyModeState(savedDutyMode);
            }
        }
    } catch(e) {
        console.log("No stored session");
    }
  };

  const unlockApp = async () => {
      const result = await LocalAuthentication.authenticateAsync({
          promptMessage: 'Wolf Guard Resume',
          fallbackLabel: 'Enter Passcode'
      });
      if (result.success) {
          setIsLocked(false);
      }
  };

  useEffect(() => {
    isLoggedIn();
  }, []);

  // App State Listener for Bio-Lock
  useEffect(() => {
      const subscription = AppState.addEventListener('change', nextAppState => {
          if (
              appState.current.match(/inactive|background/) && 
              nextAppState === 'active' &&
              userToken // Only lock if logged in
          ) {
              setIsLocked(true);
          }
          appState.current = nextAppState;
      });

      return () => subscription.remove();
  }, [userToken]);

  return (
    <AuthContext.Provider value={{ login, logout, isLoading, userToken, userData, isLocked, unlockApp, dutyMode, setDutyMode }}>
      {children}
    </AuthContext.Provider>
  );
};
