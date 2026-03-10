import axios from 'axios';

// Create axios instance with default config
// When frontend is served from the same server (Cloud Run), use relative URLs
// This ensures API calls go to the same domain the frontend is hosted on
// Same-origin API via Firebase Cloud Function proxy
// The function lives at /api and proxies to Cloud Run
// const API_BASE_URL = '';
// const API_BASE_URL = import.meta.env.VITE_API_URL || '';
const API_BASE_URL = ''; // Use relative path for same-origin (Cloud Run)

const api = axios.create({
    baseURL: API_BASE_URL,
    timeout: 30000, // Increased timeout for slow cold starts
});

// Request interceptor - add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor - handle errors and retry
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        // Handle 401 Unauthorized - token expired or invalid
        if (error.response?.status === 401) {
            // Clear auth data and redirect to login
            localStorage.removeItem('token');
            localStorage.removeItem('user');

            // Only redirect if not already on login page
            if (!window.location.pathname.includes('/login')) {
                window.location.href = '/login';
            }
            return Promise.reject(error);
        }

        // Retry logic for server errors (500, 502, 503, 504)
        const isServerError = error.response?.status >= 500;
        const isNetworkError = !error.response && error.code === 'ERR_NETWORK';

        if ((isServerError || isNetworkError) && !originalRequest._retry) {
            originalRequest._retry = true;
            originalRequest._retryCount = originalRequest._retryCount || 0;

            // Max 3 retries with exponential backoff
            if (originalRequest._retryCount < 3) {
                originalRequest._retryCount++;
                const delay = Math.pow(2, originalRequest._retryCount) * 500;

                console.log(`Retrying request (${originalRequest._retryCount}/3) in ${delay}ms...`);

                await new Promise(resolve => setTimeout(resolve, delay));
                return api(originalRequest);
            }
        }

        return Promise.reject(error);
    }
);

// Helper function to check if token is about to expire
export const isTokenExpiringSoon = () => {
    const token = localStorage.getItem('token');
    if (!token) return true;

    try {
        // Decode JWT payload (base64)
        const payload = JSON.parse(atob(token.split('.')[1]));
        const expiryTime = payload.exp * 1000;
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;

        return expiryTime - now < fiveMinutes;
    } catch (e) {
        return true;
    }
};

// Helper function to check if token is valid
export const isTokenValid = () => {
    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        return payload.exp * 1000 > Date.now();
    } catch (e) {
        return false;
    }
};

export default api;
