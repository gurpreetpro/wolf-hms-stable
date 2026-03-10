/**
 * Services Index
 * Central export for all API services
 * 
 * Usage:
 *   import { authService, labService } from '../services';
 *   // or
 *   import authService from '../services/authService';
 */

export { default as authService } from './authService';
export { default as opdService } from './opdService';
export { default as labService } from './labService';
export { default as financeService } from './financeService';
export { default as pharmacyService } from './pharmacyService';
export { default as wardService } from './wardService';
export { default as adminService } from './adminService';
export { default as nurseService } from './nurseService';
export { default as clinicalService } from './clinicalService';
export { default as aiService } from './aiService';
export { default as securityService } from './securityService';

// Re-export axios instance for custom API calls
export { default as api } from '../utils/axiosInstance';
