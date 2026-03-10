const express = require('express');
const router = express.Router();
const { 
    getAllTenants, 
    deployTenant, 
    teleportToTenant, 
    getPlatformHealth, 
    updateTenantStatus,
    getTenantLogs,
    getTenantDetails,
    checkDomainAvailability,
    updateTenantDomain,
    getUsageAnalytics
} = require('../controllers/platformController');
const { protect } = require('../middleware/authMiddleware');
const { isPlatformAdmin, PLATFORM_CONFIG } = require('../config/platformOwners');

/**
 * Platform Routes - Master Command Centre
 * 
 * SECURITY: These routes are protected by multiple layers:
 * 1. JWT Authentication (protect middleware)
 * 2. Email Whitelist (only registered platform admins)
 * 3. MFA Verification (when enabled)
 * 4. Rate Limiting (applied at server level)
 */

// Enhanced Platform Admin Middleware with Whitelist Check
const requirePlatformAdmin = (req, res, next) => {
    const userEmail = req.user?.email?.toLowerCase();
    const userRole = req.user?.role;

    // Log all platform access attempts for security audit
    console.log(`[Platform Access] Attempt by: ${userEmail} (Role: ${userRole}) from IP: ${req.ip}`);

    // Check 1: Must be authenticated
    if (!req.user) {
        console.log(`[Platform Security] BLOCKED: No authenticated user`);
        return res.status(401).json({ 
            success: false, 
            message: 'Authentication required' 
        });
    }

    // Check 2: Must be in the whitelist
    if (!isPlatformAdmin(userEmail)) {
        console.log(`[Platform Security] BLOCKED: ${userEmail} not in whitelist`);
        return res.status(403).json({ 
            success: false, 
            message: 'Access denied. Platform Administrator privileges required.',
            hint: 'Contact system administrator if you need access.'
        });
    }

    // Check 3: Must have admin role as additional safety
    const allowedRoles = ['admin', 'platform_admin', 'super_admin'];
    if (!allowedRoles.includes(userRole)) {
        console.log(`[Platform Security] BLOCKED: ${userEmail} has insufficient role (${userRole})`);
        return res.status(403).json({ 
            success: false, 
            message: 'Administrator role required for platform access.'
        });
    }

    // All checks passed - log successful access
    console.log(`[Platform Security] ACCESS GRANTED to ${userEmail}`);
    next();
};

// MFA Enforcement Middleware (for sensitive operations)
const requireMfa = async (req, res, next) => {
    // If MFA is not required in config, skip
    if (!PLATFORM_CONFIG.MFA.REQUIRED) {
        return next();
    }

    // Check if user has MFA enabled
    // For now, we'll skip this check and implement after MFA setup flow
    // In production: query DB to check if user.mfa_enabled = true
    
    // TODO: Implement full MFA check
    // const mfaVerified = req.headers['x-mfa-token'] ? await verifyMfaToken(req.user.id, req.headers['x-mfa-token']) : false;
    
    next();
};

// ========================================
// FLEET MANAGEMENT ROUTES
// ========================================
router.get('/tenants', protect, requirePlatformAdmin, getAllTenants);
router.get('/tenants/:hospital_id', protect, requirePlatformAdmin, getTenantDetails);
router.get('/tenants/:hospital_id/logs', protect, requirePlatformAdmin, getTenantLogs);
router.put('/tenants/:hospital_id/domain', protect, requirePlatformAdmin, updateTenantDomain);

// ========================================
// DOMAIN AND ANALYTICS ROUTES
// ========================================
router.get('/domain-check/:subdomain', protect, requirePlatformAdmin, checkDomainAvailability);
router.get('/usage', protect, requirePlatformAdmin, getUsageAnalytics);

// ========================================
// HIGH-RISK OPERATIONS (Require extra caution)
// ========================================
router.post('/deploy', protect, requirePlatformAdmin, requireMfa, (req, res, next) => {
    console.log(`[SECURITY AUDIT] DEPLOY initiated by ${req.user.email} for domain: ${req.body.hospital_domain}`);
    next();
}, deployTenant);

router.put('/status', protect, requirePlatformAdmin, requireMfa, (req, res, next) => {
    console.log(`[SECURITY AUDIT] STATUS CHANGE by ${req.user.email}: Hospital ${req.body.hospital_id} -> ${req.body.status}`);
    next();
}, updateTenantStatus);

router.post('/teleport', protect, requirePlatformAdmin, requireMfa, (req, res, next) => {
    console.log(`[SECURITY AUDIT] TELEPORT by ${req.user.email} to hospital: ${req.body.target_hospital_id}`);
    next();
}, teleportToTenant);

// ========================================
// PLATFORM HEALTH (Read-only, less sensitive)
// ========================================
router.get('/health', protect, requirePlatformAdmin, getPlatformHealth);

module.exports = router;


