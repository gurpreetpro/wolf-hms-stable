import React from 'react'
import ReactDOM from 'react-dom/client'
import axios from 'axios'
import App from './App.jsx'
import 'bootstrap/dist/css/bootstrap.min.css';
import './index.css'

// Configure axios baseURL - uses VITE_API_URL from environment
// Production: Cloud Run URL, Development: empty (uses proxy)

// GLOBAL ERROR HANDLER (DEBUGGING PRODUCTION CRASH)
window.onerror = function(message, source, lineno, colno, error) {
  const root = document.getElementById('root');
  if (!root || root.innerHTML.trim() === '') {
     document.body.innerHTML = `
      <div style="font-family: sans-serif; padding: 2rem; color: #721c24; background-color: #f8d7da; border: 1px solid #f5c6cb; margin: 1rem; border-radius: 0.25rem;">
        <h2 style="margin-top: 0">Client Startup Error</h2>
        <p><strong>Error:</strong> ${message}</p>
        <p><strong>Source:</strong> ${source}:${lineno}:${colno}</p>
        <pre style="background: white; padding: 1rem; overflow: auto; border-radius: 4px;">${error?.stack || 'No stack trace'}</pre>
        <button onclick="window.location.reload()" style="padding: 0.5rem 1rem; cursor: pointer;">Reload</button>
      </div>
    `;
  }
};

// GLOBAL UNHANDLED PROMISE REJECTION HANDLER
window.onunhandledrejection = function(event) {
  console.error('[WOLF HMS] Unhandled Promise Rejection:', event.reason);
  const root = document.getElementById('root');
  if (!root || root.innerHTML.trim() === '') {
     document.body.innerHTML = `
      <div style="font-family: sans-serif; padding: 2rem; color: #721c24; background-color: #f8d7da; border: 1px solid #f5c6cb; margin: 1rem; border-radius: 0.25rem;">
        <h2 style="margin-top: 0">Promise Rejection Error</h2>
        <p><strong>Error:</strong> ${event.reason?.message || event.reason}</p>
        <pre style="background: white; padding: 1rem; overflow: auto; border-radius: 4px;">${event.reason?.stack || 'No stack trace'}</pre>
        <button onclick="window.location.reload()" style="padding: 0.5rem 1rem; cursor: pointer;">Reload</button>
      </div>
    `;
  }
};

const API_URL = import.meta.env.VITE_API_URL || '';
axios.defaults.baseURL = API_URL;
console.log('[WOLF HMS] API URL:', API_URL || 'relative (dev mode)');

// Global Axios Interceptor for Auth Errors
axios.interceptors.response.use(
  response => response,
  error => {
    if (error.response && error.response.status === 401) {
      console.log('[WOLF HMS] Session expired or invalid token (401)');
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      if (!window.location.pathname.includes('/login')) {
         window.location.href = '/login';
      }
    } else if (error.response && (error.response.status === 503 || error.response.status === 500)) {
        // Redirect to service unavailable for critical server errors
        if (!window.location.pathname.includes('/service-unavailable')) {
             window.location.href = '/service-unavailable';
        }
    } else if (error.code === 'ERR_NETWORK') {
        // Handle network errors (server down)
        if (!window.location.pathname.includes('/service-unavailable')) {
             window.location.href = '/service-unavailable';
        }
    } else if (error.response && error.response.status === 403) {
      console.warn('[WOLF HMS] Access Forbidden (403) - Request denied but session valid.');
      // Do NOT log out on 403
    }
    return Promise.reject(error);
  }
);

// Clean up any malformed localStorage entries on startup
// This prevents JSON.parse errors from corrupted data
const cleanupLocalStorage = () => {
  const keysToValidate = ['user', 'hospital_profile_cache'];
  
  keysToValidate.forEach(key => {
    try {
      const value = localStorage.getItem(key);
      if (!value) return;
      
      // Detect corrupted data (HTML, undefined string, etc.)
      const trimmed = value.trim();
      if (value === 'undefined' || 
          value === 'null' ||
          trimmed.startsWith('<!') ||
          trimmed.startsWith('<html') ||
          trimmed.startsWith('<HTML')) {
        console.log(`[WOLF HMS] Cleaning up corrupt ${key}`);
        localStorage.removeItem(key);
        if (key === 'user') localStorage.removeItem('token');
        return;
      }
      
      // Validate JSON structure
      if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
        JSON.parse(value); // Just validate, don't need result
      }
    } catch (e) {
      console.log(`[WOLF HMS] Invalid ${key} in localStorage, cleaning up:`, e.message);
      localStorage.removeItem(key);
      if (key === 'user') localStorage.removeItem('token');
    }
  });
};
cleanupLocalStorage();

// Render the application
ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
