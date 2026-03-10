const { pool } = require('../db');

class CentralAuditService {
    
    /**
     * Log a sensitive action to the immutable audit trail.
     * @param {string} action - The action performed (e.g., 'VIEW_VIP_RECORD', 'REFUND_PROCESSED')
     * @param {string} userId - Who performed the action
     * @param {Object} details - JSON details of the action
     * @param {string} resourceType - Target resource (e.g., 'PATIENT', 'INVOICE')
     * @param {string} resourceId - Target ID
     * @param {string} hospitalId - Tenant ID
     * @param {string} ipAddress - Client IP
     */
    static async log(action, userId, details, resourceType, resourceId, hospitalId, ipAddress = null) {
        try {
            // [SECURITY] Add cryptographic hash in future phases for tamper-evidence
            
            await pool.query(
                `INSERT INTO audit_logs 
                (action, performed_by, details, resource_type, resource_id, hospital_id, ip_address, created_at) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
                [action, userId, JSON.stringify(details), resourceType, resourceId, hospitalId, ipAddress]
            );
            
            // Console log for dev tracking
            console.log(`[AUDIT] 🔒 ${action} by User ${userId} on ${resourceType}:${resourceId}`);
            
        } catch (error) {
            // Audit failure is CRITICAL. In high-security mode, we might want to throw.
            // For now, we log to stderr so monitoring tools pick it up.
            console.error('[CRITICAL AUDIT FAILURE]', error);
        }
    }

    /**
     * Retrieve audit logs for a specific resource
     */
    static async getLogsForResource(resourceType, resourceId, hospitalId) {
        const result = await pool.query(
            `SELECT a.*, u.username as performed_by_name 
             FROM audit_logs a 
             LEFT JOIN users u ON a.performed_by = u.id 
             WHERE a.resource_type = $1 AND a.resource_id = $2 AND a.hospital_id = $3 
             ORDER BY a.created_at DESC`,
            [resourceType, resourceId, hospitalId]
        );
        return result.rows;
    }
}

module.exports = CentralAuditService;
