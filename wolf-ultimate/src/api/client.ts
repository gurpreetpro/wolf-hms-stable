// @ts-ignore
import axios from 'axios/dist/axios';
import { useAuthStore } from '../store/authStore';

// Determine Base URL (Assuming Dev environment for now)
// In production, this would be an environment variable
// const BASE_URL = 'https://wolfhms-server-738568603604.us-central1.run.app/api'; 
// Use local IP for dev if needed, or the cloud URL if stable. 
// Using Cloud Run URL for "Mock Mode" -> "Real Mode" transition as it's accessible.
const BASE_URL = 'http://217.216.78.81:8080/api';

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

// Request Interceptor: Attach Token, Hospital ID, and Dynamic Base URL
client.interceptors.request.use(
  (config) => {
    const state = useAuthStore.getState();
    
    // attach Dynamic Base URL if present
    if (state.baseUrl) {
        config.baseURL = state.baseUrl;
    }

    // Attach Token
    if (state.token) {
      config.headers.Authorization = `Bearer ${state.token}`;
    }

    // Attach Hospital ID (Critical for Multi-Tenancy)
    if (state.hospitalId) {
      config.headers['x-hospital-id'] = state.hospitalId.toString();
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle 401 (Logout)
client.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Logic to auto-logout could go here
      // useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export const hospitalLookup = async (code: string) => {
  try {
    // Use the public branding endpoint to resolve code -> ID
    const response = await client.get(`/hospitals/branding/${code}`);
    
    // Server returns { success: true, data: { ... } }
    // We need to return the inner data object
    if (response.data && response.data.success && response.data.data) {
        return response.data.data;
    }
    return response.data; // Fallback
  } catch (error) {
    console.error('Hospital Lookup Failed', error);
    throw error;
  }
};

export default client;
