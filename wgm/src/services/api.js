import axios from 'axios';
import * as SecureStore from 'expo-secure-store';
import { API_URL } from '../config/environment';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
    'x-client-type': 'mobile',
  },
});

let onUnauthorizedCallback = null;

export const setUnauthorizedCallback = (cb) => {
  onUnauthorizedCallback = cb;
};

// Request Interceptor: Attach Token & Mobile Client Identification
api.interceptors.request.use(
  async (config) => {
    try {
      const token = await SecureStore.getItemAsync('userToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      config.headers['x-client-type'] = 'mobile';
    } catch (error) {
      console.error('[API] Error fetching token from SecureStore:', error);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Gracefully handle 401 session expiration
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response?.status === 401) {
      console.warn(`[API] 401 Unauthorized from ${error.config?.url}:`, error.response?.data);
      if (onUnauthorizedCallback) {
        try {
          onUnauthorizedCallback(error.response?.data);
        } catch (cbErr) {
          console.error('[API] Error in onUnauthorizedCallback:', cbErr);
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;
