const pool = require('../config/db');

const AuditService = {
    /**
     * Log an action to the database
     * @param {string} action - Action name (e.g., 'LOGIN', 'VIEW_PATIENT')
     * @param {string} entityType - Entity type (e.g., 'USER', 'PATIENT')
     * @param {string|number} entityId - Entity ID
     * @param {Object} details - Additional details (JSON)
     * @param {Object} req - Express request object (optional, for pulling context)
     */
    log: async (action, entityType, entityId, details, req = null) => {
        try {
            // Extract context from request if available
            const userId = req?.user?.id || null;
            const userName = req?.user?.username || 'SYSTEM'; // or 'Public'
            const hospitalId = req?.hospital_id || null;
            const ipAddress = req?.ip || req?.connection?.remoteAddress || null;

            // Sanitize details if necessary (e.g., remove password)
            if (details && details.password) delete details.password;

            const query = `
                INSERT INTO audit_logs 
                (user_id, user_name, action, entity_type, entity_id, details, ip_address, hospital_id) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
            `;

            await pool.query(query, [
                userId,
                userName,
                action,
                entityType,
                String(entityId), // Ensure string for flexibility
                JSON.stringify(details || {}),
                ipAddress,
                hospitalId
            ]);
        } catch (err) {
            // Fail silently to avoid blocking main flow, but log to console
            console.error('AUDIT LOG FAILURE:', err.message);
        }
    }
};

module.exports = AuditService;
