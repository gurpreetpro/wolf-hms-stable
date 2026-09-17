/**
 * Audit Middleware
 * Logs all CRUD operations on sensitive resources for HIPAA & DPDP compliance.
 * Phase 5 Hardening (W2): Cryptographic hash chaining & full 12 PHI resource coverage.
 */

const pool = require('../config/db');
const logger = require('../utils/logger');
const { computeRecordHash, getLatestHash } = require('../utils/auditChain');

// Resources that contain PHI (Protected Health Information) per HIPAA
const PHI_RESOURCES = [
    'patients', 'admissions', 'prescriptions', 'lab_results', 
    'radiology_results', 'vitals', 'diagnoses', 'medical_history',
    'appointments', 'opd_visits', 'invoices', 'insurance_claims'
];

// Mapping route prefixes to canonical PHI resource names
const ROUTE_TO_PHI_MAP = {
    'patients': 'patients',
    'admissions': 'admissions',
    'prescriptions': 'prescriptions',
    'lab': 'lab_results',
    'lab_results': 'lab_results',
    'radiology': 'radiology_results',
    'radiology_results': 'radiology_results',
    'vitals': 'vitals',
    'diagnoses': 'diagnoses',
    'medical_history': 'medical_history',
    'clinical': 'clinical',
    'appointments': 'appointments',
    'opd': 'opd_visits',
    'opd_visits': 'opd_visits',
    'billing': 'invoices',
    'finance': 'invoices',
    'invoices': 'invoices',
    'insurance': 'insurance_claims',
    'insurance_claims': 'insurance_claims'
};

// Actions to log
const LOGGABLE_ACTIONS = {
    POST: 'CREATE',
    GET: 'READ',
    PUT: 'UPDATE',
    PATCH: 'UPDATE',
    DELETE: 'DELETE'
};

/**
 * Extract canonical resource type from URL
 * e.g., /api/patients/123 -> 'patients'
 */
const extractResourceType = (url) => {
    const match = url.match(/\/api\/([^\/\?]+)/);
    if (!match) return 'unknown';
    const raw = match[1].toLowerCase();
    return ROUTE_TO_PHI_MAP[raw] || raw;
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
 * Create audit log entry with SHA-256 hash chaining
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
        const timestamp = new Date();
        const prevHash = await getLatestHash(pool);
        const recordHash = computeRecordHash({
            prevHash,
            userId,
            action,
            resourceType,
            resourceId,
            timestamp
        });

        const detailsObj = metadata || {};
        if (oldValue) detailsObj.old_value = oldValue;
        if (newValue) detailsObj.new_value = newValue;

        await pool.query(`
            INSERT INTO audit_logs (
                user_id, user_name, user_role, ip_address, user_agent,
                action, resource_type, resource_id, entity_type, entity_id,
                details, metadata, hospital_id, is_phi,
                created_at, prev_hash, record_hash
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        `, [
            userId,
            username || 'anonymous',
            userRole || 'unknown',
            ipAddress,
            userAgent,
            action,
            resourceType,
            resourceId ? String(resourceId) : null,
            resourceType, // entity_type compatibility
            resourceId ? String(resourceId) : null, // entity_id compatibility
            JSON.stringify(detailsObj),
            JSON.stringify(metadata || {}),
            hospitalId || null,
            isPhi || false,
            timestamp,
            prevHash,
            recordHash
        ]);

        return { prevHash, recordHash };
    } catch (error) {
        logger.error('[Audit] Failed to log:', { error: error.message });
        // Fail-safe: Audit failure should never break the request
        return null;
    }
};

/**
 * Audit Middleware - attach to routes that need logging
 */
const auditMiddleware = (req, res, next) => {
    // Resolve full path accurately across mounted sub-routers
    const fullPath = req.originalUrl || (req.baseUrl ? req.baseUrl + req.path : req.path);

    // Skip non-API requests
    if (!fullPath.startsWith('/api/')) {
        return next();
    }

    const resourceType = extractResourceType(fullPath);
    const action = LOGGABLE_ACTIONS[req.method];

    // Skip if not a loggable action
    if (!action) {
        return next();
    }

    const isPhi = PHI_RESOURCES.includes(resourceType) || resourceType === 'clinical';

    // Skip read operations on non-PHI resources to prevent log bloat
    if (action === 'READ' && !isPhi) {
        return next();
    }

    // Capture original response
    const originalSend = res.send;
    
    res.send = function(body) {
        const resId = extractResourceId(fullPath) || req.body?.id || req.params?.id;

        logAudit({
            userId: req.user?.id || null,
            username: req.user?.username || 'anonymous',
            userRole: req.user?.role || 'unknown',
            ipAddress: req.ip || req.connection?.remoteAddress,
            userAgent: req.get ? req.get('User-Agent') : req.headers?.['user-agent'],
            action: action,
            resourceType: resourceType,
            resourceId: resId,
            oldValue: null,
            newValue: (action === 'CREATE' || action === 'UPDATE') ? req.body : null,
            metadata: {
                statusCode: res.statusCode,
                method: req.method,
                path: fullPath,
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
    const canonicalType = ROUTE_TO_PHI_MAP[resourceType] || resourceType;
    return await logAudit({
        userId: req.user?.id,
        username: req.user?.username,
        userRole: req.user?.role,
        ipAddress: req.ip,
        userAgent: req.get ? req.get('User-Agent') : req.headers?.['user-agent'],
        action: action,
        resourceType: canonicalType,
        resourceId: resourceId,
        oldValue: details.oldValue,
        newValue: details.newValue,
        metadata: details.metadata,
        hospitalId: req.hospital_id,
        isPhi: PHI_RESOURCES.includes(canonicalType)
    });
};

module.exports = {
    auditMiddleware,
    logAudit,
    logEvent,
    PHI_RESOURCES,
    ROUTE_TO_PHI_MAP
};
