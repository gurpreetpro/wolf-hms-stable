/**
 * Admin Service
 * Handles all admin-related API calls
 * [TITAN] Updated with Feature Flags and Archive methods
 */
import api from '../utils/axiosInstance';

const adminService = {
  // ============================================
  // EXISTING METHODS
  // ============================================

  // Analytics
  getAnalytics: async () => {
    const response = await api.get('/api/admin/analytics');
    return response.data;
  },

  // Activity Logs
  getLogs: async (limit = 10) => {
    const response = await api.get(`/api/admin/logs?limit=${limit}`);
    return response.data;
  },

  // Settings
  getSettings: async () => {
    const response = await api.get('/api/settings/profile');
    return response.data;
  },

  updateSettings: async (settings) => {
    const response = await api.post('/api/settings/profile', settings);
    return response.data;
  },

  getServices: async () => {
    const response = await api.get('/api/settings/services');
    return response.data;
  },

  updateServices: async (services) => {
    const response = await api.post('/api/settings/services', services);
    return response.data;
  },

  // Hospital Profile
  getHospitalProfile: async () => {
    const response = await api.get('/api/settings/hospital-profile');
    return response.data;
  },

  updateHospitalProfile: async (profile) => {
    const response = await api.post('/api/settings/hospital-profile', profile);
    return response.data;
  },

  // ============================================
  // TITAN: FEATURE FLAGS
  // ============================================

  /**
   * Get feature flags for current hospital
   * @returns {Object} { features, definitions, hospitalId }
   */
  getFeatures: async () => {
    const response = await api.get('/api/admin/features');
    return response.data;
  },

  /**
   * Update feature flags
   * @param {Object} features - Features to update
   * @returns {Object} Updated features
   */
  updateFeatures: async (features) => {
    const response = await api.put('/api/admin/features', { features });
    return response.data;
  },

  /**
   * Enable a specific feature
   * @param {string} feature - Feature name
   */
  enableFeature: async (feature) => {
    const response = await api.post('/api/admin/features/enable', { feature });
    return response.data;
  },

  /**
   * Disable a specific feature
   * @param {string} feature - Feature name
   */
  disableFeature: async (feature) => {
    const response = await api.post('/api/admin/features/disable', { feature });
    return response.data;
  },

  /**
   * Apply subscription tier defaults
   * @param {string} tier - 'basic', 'professional', 'enterprise'
   */
  applyTier: async (tier) => {
    const response = await api.post('/api/admin/features/apply-tier', { tier });
    return response.data;
  },

  /**
   * Check if specific feature is enabled (quick check)
   * @param {string} featureName - Feature to check
   * @returns {Object} { feature, enabled }
   */
  checkFeature: async (featureName) => {
    const response = await api.get(`/api/admin/features/check/${featureName}`);
    return response.data;
  },

  // ============================================
  // TITAN: ARCHIVE MANAGEMENT
  // ============================================

  /**
   * Get archive statistics
   * @returns {Object[]} Stats per table
   */
  getArchiveStats: async () => {
    const response = await api.get('/api/admin/archive/stats');
    return response.data;
  },

  /**
   * Setup archive tables
   * @returns {Object} Setup result
   */
  setupArchive: async () => {
    const response = await api.post('/api/admin/archive/setup');
    return response.data;
  },

  /**
   * Run archive job
   * @param {Object} options - { daysOld, table }
   * @returns {Object} Archive result
   */
  runArchive: async (options = {}) => {
    const response = await api.post('/api/admin/archive/run', options);
    return response.data;
  },

  /**
   * Restore records from archive
   * @param {string} table - Table name
   * @param {number[]} recordIds - Record IDs to restore
   */
  restoreFromArchive: async (table, recordIds) => {
    const response = await api.post('/api/admin/archive/restore', { table, recordIds });
    return response.data;
  },
};

export default adminService;
