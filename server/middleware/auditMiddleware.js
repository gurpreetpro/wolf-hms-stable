/**
 * Audit Middleware
 * Logs all CRUD operations on sensitive resources for compliance
 * Phase 1: Security Hardening (Gold Standard HMS)
 */

const pool = require('../config/db');

// Resources that contain PHI (Protected Health Information)
const PHI_RESOURCES = [
    'patients', 'admissions', 'prescriptions', 'lab_results', 
    'radiology_results', 'vitals', 'diagnoses', 'medical_history',
    'appointments', 'opd_visits', 'invoices', 'insurance_claims'
];

// Actions to log
const LOGGABLE_ACTIONS = {
    POST: 'CREATE',
    GET: 'READ',
    PUT: 'UPDATE',
    PATCH: 'UPDATE',
    DELETE: 'DELETE'
};

/**
 * Extract resource type from URL
 * e.g., /api/patients/123 -> 'patients'
 */
const extractResourceType = (url) => {
    const match = url.match(/\/api\/([^\/\?]+)/);
    return match ? match[1] : 'unknown';
};

/**
 * Extract resource ID from URL
 * e.g., /api/patients/123 -> '123'
 */
const extractResourceId = (url) => {
    const match = url.match(/\/api\/[^\/]+\/([^\/\?]+)/);
    return match ? match[1] : null;
};

/**
 * Create audit log entry
 */
const logAudit = async ({
    userId,
    username,
    userRole,
    ipAddress,
    userAgent,
    action,
    resourceType,
    resourceId,
    oldValue,
    newValue,
    metadata,
    hospitalId,
    isPhi
}) => {
    try {
        await pool.query(`
            INSERT INTO audit_logs (
                user_id, username, user_role, ip_address, user_agent,
                action, resource_type, resource_id,
                old_value, new_value, metadata,
                hospital_id, is_phi
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        `, [
            userId, username, userRole, ipAddress, userAgent,
            action, resourceType, resourceId,
            oldValue ? JSON.stringify(oldValue) : null,
            newValue ? JSON.stringify(newValue) : null,
            metadata ? JSON.stringify(metadata) : null,
            hospitalId, isPhi
        ]);
    } catch (error) {
        console.error('[Audit] Failed to log:', error.message);
        // Don't throw - audit failure shouldn't break the request
    }
};

/**
 * Audit Middleware - attach to routes that need logging
 */
const auditMiddleware = (req, res, next) => {
    // Skip non-API requests
    if (!req.path.startsWith('/api/')) {
        return next();
    }

    const resourceType = extractResourceType(req.path);
    const action = LOGGABLE_ACTIONS[req.method];

    // Skip if not a loggable action
    if (!action) {
        return next();
    }

    // Skip read operations on non-PHI resources to reduce log volume
    if (action === 'READ' && !PHI_RESOURCES.includes(resourceType)) {
        return next();
    }

    // Capture original response
    const originalSend = res.send;
    
    res.send = function(body) {
        // Log after response is sent
        const isPhi = PHI_RESOURCES.includes(resourceType);
        
        logAudit({
            userId: req.user?.id || null,
            username: req.user?.username || 'anonymous',
            userRole: req.user?.role || 'unknown',
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get('User-Agent'),
            action: action,
            resourceType: resourceType,
            resourceId: extractResourceId(req.path) || req.body?.id,
            oldValue: null, // Would need pre-fetch for UPDATE/DELETE
            newValue: action === 'CREATE' || action === 'UPDATE' ? req.body : null,
            metadata: {
                statusCode: res.statusCode,
                method: req.method,
                path: req.path,
                query: req.query
            },
            hospitalId: req.hospital_id,
            isPhi: isPhi
        });

        return originalSend.call(this, body);
    };

    next();
};

/**
 * Log specific audit events (for use in controllers)
 */
const logEvent = async (req, action, resourceType, resourceId, details = {}) => {
    await logAudit({
        userId: req.user?.id,
        username: req.user?.username,
        userRole: req.user?.role,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        action: action,
        resourceType: resourceType,
        resourceId: resourceId,
        oldValue: details.oldValue,
        newValue: details.newValue,
        metadata: details.metadata,
        hospitalId: req.hospital_id,
        isPhi: PHI_RESOURCES.includes(resourceType)
    });
};

module.exports = {
    auditMiddleware,
    logEvent,
    PHI_RESOURCES
};
