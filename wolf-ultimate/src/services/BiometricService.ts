import * as LocalAuthentication from 'expo-local-authentication';
import * as SecureStore from 'expo-secure-store';
import { Alert, Platform } from 'react-native';

const SECURE_KEY_USERNAME = 'wolf_auth_username';
const SECURE_KEY_PASSWORD = 'wolf_auth_password';
const SECURE_KEY_HOSPITAL = 'wolf_auth_hospital';
const SECURE_KEY_HOSPITAL_CODE = 'wolf_auth_hospital_code';

class BiometricService {
    
    // Check if hardware supports biometrics
    async isSupported(): Promise<boolean> {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        return hasHardware && isEnrolled;
    }

    // Authenticate User
    async authenticate(): Promise<boolean> {
        try {
            const result = await LocalAuthentication.authenticateAsync({
                promptMessage: 'Login to WOLF Ultimate',
                fallbackLabel: 'Use Passcode',
                disableDeviceFallback: false,
                cancelLabel: 'Cancel',
            });
            return result.success;
        } catch (error) {
            console.error('Biometric Auth Error:', error);
            return false;
        }
    }

    // Save Credentials
    async saveCredentials(username: string, password: string, hospitalId: number, hospitalCode: string) {
        try {
            await SecureStore.setItemAsync(SECURE_KEY_USERNAME, username);
            await SecureStore.setItemAsync(SECURE_KEY_PASSWORD, password);
            await SecureStore.setItemAsync(SECURE_KEY_HOSPITAL, hospitalId.toString());
            await SecureStore.setItemAsync(SECURE_KEY_HOSPITAL_CODE, hospitalCode);
            return true;
        } catch (error) {
            console.error('Secure Save Error:', error);
            return false;
        }
    }

    // Retrieve Credentials
    async getCredentials() {
        try {
            const username = await SecureStore.getItemAsync(SECURE_KEY_USERNAME);
            const password = await SecureStore.getItemAsync(SECURE_KEY_PASSWORD);
            const hospitalId = await SecureStore.getItemAsync(SECURE_KEY_HOSPITAL);
            const hospitalCode = await SecureStore.getItemAsync(SECURE_KEY_HOSPITAL_CODE);

            if (username && password && hospitalId && hospitalCode) {
                return { username, password, hospitalId: parseInt(hospitalId), hospitalCode };
            }
            return null;
        } catch (error) {
            console.error('Secure Retrieve Error:', error);
            return null;
        }
    }

    // Clear Credentials
    async clearCredentials() {
        try {
            await SecureStore.deleteItemAsync(SECURE_KEY_USERNAME);
            await SecureStore.deleteItemAsync(SECURE_KEY_PASSWORD);
            await SecureStore.deleteItemAsync(SECURE_KEY_HOSPITAL);
            await SecureStore.deleteItemAsync(SECURE_KEY_HOSPITAL_CODE);
            return true;
        } catch (error) {
            console.error('Secure Delete Error:', error);
            return false;
        }
    }
}

export default new BiometricService();
