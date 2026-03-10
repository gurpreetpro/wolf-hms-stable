/**
 * Audit Logging Middleware and Utilities
 * Gold Standard Phase 4 - Comprehensive audit trail
 */
const { pool } = require('../db');

/**
 * Log an audit event to the database
 */
const logAudit = async ({
    action,
    entityType,
    entityId,
    userId,
    userName,
    userRole,
    oldValue = null,
    newValue = null,
    ipAddress = null,
    description = null
}) => {
    try {
        await pool.query(`
            INSERT INTO audit_logs 
            (action, entity_type, entity_id, user_id, user_name, user_role, old_value, new_value, ip_address, description)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        `, [
            action,
            entityType,
            entityId,
            userId,
            userName,
            userRole,
            oldValue ? JSON.stringify(oldValue) : null,
            newValue ? JSON.stringify(newValue) : null,
            ipAddress,
            description
        ]);
    } catch (err) {
        console.error('Audit log error:', err);
        // Don't throw - audit logging should never break main functionality
    }
};

/**
 * Audit logging middleware - auto-logs API requests
 */
const auditMiddleware = (entityType) => {
    return async (req, res, next) => {
        // Store original json function
        const originalJson = res.json.bind(res);
        
        // Capture response for logging
        res.json = (data) => {
            // Log successful mutations
            if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method) && res.statusCode < 400) {
                const action = {
                    'POST': 'CREATE',
                    'PUT': 'UPDATE',
                    'DELETE': 'DELETE',
                    'PATCH': 'UPDATE'
                }[req.method];

                logAudit({
                    action,
                    entityType,
                    entityId: data?.id || req.params?.id,
                    userId: req.user?.id,
                    userName: req.user?.username,
                    userRole: req.user?.role,
                    oldValue: null, // Would need to fetch before update
                    newValue: req.body,
                    ipAddress: req.ip || req.connection?.remoteAddress,
                    description: `${action} ${entityType} via API`
                });
            }
            
            return originalJson(data);
        };
        
        next();
    };
};

/**
 * Common audit actions
 */
const AuditActions = {
    // Authentication
    LOGIN: 'LOGIN',
    LOGOUT: 'LOGOUT',
    LOGIN_FAILED: 'LOGIN_FAILED',
    PASSWORD_CHANGE: 'PASSWORD_CHANGE',
    
    // Patient
    PATIENT_REGISTER: 'PATIENT_REGISTER',
    PATIENT_UPDATE: 'PATIENT_UPDATE',
    
    // Visit
    VISIT_CREATE: 'VISIT_CREATE',
    VISIT_CANCEL: 'VISIT_CANCEL',
    VISIT_COMPLETE: 'VISIT_COMPLETE',
    
    // Billing
    PAYMENT_RECEIVED: 'PAYMENT_RECEIVED',
    REFUND_ISSUED: 'REFUND_ISSUED',
    RECEIPT_GENERATED: 'RECEIPT_GENERATED',
    RECEIPT_REPRINTED: 'RECEIPT_REPRINTED',
    
    // Clinical
    VITALS_RECORDED: 'VITALS_RECORDED',
    MEDICATION_GIVEN: 'MEDICATION_GIVEN',
    LAB_ORDERED: 'LAB_ORDERED',
    LAB_RESULT_ENTERED: 'LAB_RESULT_ENTERED',
    
    // Ward
    ADMISSION: 'ADMISSION',
    DISCHARGE: 'DISCHARGE',
    TRANSFER: 'TRANSFER',
    
    // Emergency
    EMERGENCY_TRIGGERED: 'EMERGENCY_TRIGGERED',
    EMERGENCY_RESOLVED: 'EMERGENCY_RESOLVED'
};

/**
 * Entity types for audit logging
 */
const AuditEntities = {
    USER: 'user',
    PATIENT: 'patient',
    VISIT: 'opd_visit',
    ADMISSION: 'admission',
    PAYMENT: 'payment',
    RECEIPT: 'receipt',
    LAB_ORDER: 'lab_order',
    PRESCRIPTION: 'prescription',
    VITALS: 'vitals',
    EMERGENCY: 'emergency'
};

module.exports = {
    logAudit,
    auditMiddleware,
    AuditActions,
    AuditEntities
};
