/**
 * Authentication Service
 * Handles all auth-related API calls
 */
import api from '../utils/axiosInstance';

const authService = {
  // Login
  login: async (credentials) => {
    const response = await api.post('/api/auth/login', credentials);
    return response.data;
  },

  // Demo Login
  demoLogin: async () => {
    const response = await api.post('/api/auth/demo-login');
    return response.data;
  },

  // Register (Admin creates user)
  register: async (userData) => {
    const response = await api.post('/api/auth/register', userData);
    return response.data;
  },

  // Public Registration
  registerPublic: async (userData) => {
    const response = await api.post('/api/auth/register-public', userData);
    return response.data;
  },

  // Get all users
  getUsers: async () => {
    const response = await api.get('/api/auth/users');
    return response.data;
  },

  // Get pending users
  getPendingUsers: async () => {
    const response = await api.get('/api/auth/users/pending');
    return response.data;
  },

  // Approve user
  approveUser: async (userId) => {
    const response = await api.put(`/api/auth/users/${userId}/approve`);
    return response.data;
  },

  // Reject user
  rejectUser: async (userId) => {
    const response = await api.put(`/api/auth/users/${userId}/reject`);
    return response.data;
  },

  // Password Recovery - Initiate
  recoverInit: async (username) => {
    const response = await api.post('/api/auth/recover-init', { username });
    return response.data;
  },

  // Password Recovery - Verify
  recoverVerify: async (username, answer, newPassword) => {
    const response = await api.post('/api/auth/recover-verify', { username, answer, newPassword });
    return response.data;
  },

  // Setup Security Questions
  setupSecurity: async (questions) => {
    const response = await api.post('/api/auth/setup-security', questions);
    return response.data;
  },

  // Get current user profile
  getProfile: async () => {
    const response = await api.get('/api/auth/profile');
    return response.data;
  },
};

export default authService;
