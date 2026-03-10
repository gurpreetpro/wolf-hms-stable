/**
 * App Constants — Centralized version info, feature flags, and configuration
 */

export const APP_CONFIG = {
  // Version
  version: '2.0.0',
  buildNumber: '1',
  codename: 'Wolf Ultimate',

  // Feature Flags
  features: {
    enableWebSocket: true,
    enableOfflineMode: true,
    enablePushNotifications: true,
    enableAutoRefresh: true,
    enableBiometricLogin: true,
    enableABDM: true,
    enableTelehealth: true,
    enableAIClinical: true,
  },

  // Auto-refresh intervals (ms)
  refreshIntervals: {
    vitals: 15000,        // 15 seconds
    otSchedule: 30000,    // 30 seconds
    bedBoard: 60000,      // 1 minute
    clinicalAlerts: 10000, // 10 seconds
    opdQueue: 20000,      // 20 seconds
  },

  // API Configuration
  api: {
    timeout: 10000,
    maxRetries: 3,
    retryDelay: 1000,
  },

  // Offline Configuration
  offline: {
    maxQueueSize: 50,
    syncIntervalMs: 15000,
    cacheExpiryMs: 3600000, // 1 hour
  },

  // WebSocket Configuration
  websocket: {
    reconnectIntervalMs: 3000,
    maxReconnectAttempts: 10,
    heartbeatIntervalMs: 30000,
  },
};

export const APP_LINKS = {
  helpCenter: 'https://wolfhms.com/help',
  privacyPolicy: 'https://wolfhms.com/privacy',
  termsOfService: 'https://wolfhms.com/terms',
  support: 'mailto:support@wolfhms.com',
};
