import React, { createContext, useState, useEffect, useRef } from 'react';
import * as SecureStore from 'expo-secure-store';
import { AppState } from 'react-native';
import * as LocalAuthentication from 'expo-local-authentication';
import api, { setUnauthorizedCallback } from '../services/api';

export const AuthContext = createContext();

// Helper to check if a JWT is expired
const isTokenExpired = (jwtToken) => {
  try {
    if (!jwtToken) return true;
    const parts = jwtToken.split('.');
    if (parts.length < 2) return true;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    let decodedStr = '';
    if (typeof atob === 'function') {
      decodedStr = atob(base64);
    } else {
      // Manual base64 decode fallback
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
      let buffer = 0, bits = 0;
      for (let i = 0; i < base64.length; i++) {
        const idx = chars.indexOf(base64.charAt(i));
        if (idx === -1) continue;
        buffer = (buffer << 6) | idx;
        bits += 6;
        if (bits >= 8) {
          bits -= 8;
          decodedStr += String.fromCharCode((buffer >> bits) & 0xff);
        }
      }
    }
    const decoded = JSON.parse(decodedStr);
    if (decoded.exp && (decoded.exp * 1000) < Date.now()) {
      return true; // Expired
    }
    return false;
  } catch (e) {
    return false;
  }
};

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
            password: password,
            clientType: 'mobile'
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

        if (token && isTokenExpired(token)) {
            console.log("[AuthContext] Stored token expired. Purging stale session.");
            await logout();
            return;
        }

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
    setUnauthorizedCallback(() => {
      console.warn('[AuthContext] Session expired via 401 response. Logging out.');
      logout();
    });
    isLoggedIn();
  }, []);

  // App State Listener for Bio-Lock (DISABLED - too aggressive, locks on every foreground)
  // Re-enable once biometric enrollment is confirmed working
  // useEffect(() => {
  //     const subscription = AppState.addEventListener('change', nextAppState => {
  //         if (
  //             appState.current.match(/inactive|background/) && 
  //             nextAppState === 'active' &&
  //             userToken // Only lock if logged in
  //         ) {
  //             setIsLocked(true);
  //         }
  //         appState.current = nextAppState;
  //     });
  //     return () => subscription.remove();
  // }, [userToken]);

  return (
    <AuthContext.Provider value={{ login, logout, isLoading, userToken, userData, isLocked, unlockApp, dutyMode, setDutyMode }}>
      {children}
    </AuthContext.Provider>
  );
};
