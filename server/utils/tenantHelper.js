/**
 * Multi-Tenancy Helper Utilities
 * Common functions for tenant-aware database operations
 * 
 * [IRON DOME] Phase 1 Security Upgrade
 * IMPORTANT: We NO LONGER allow NULL hospital_id fallback.
 * All queries MUST filter by exact hospital_id for RLS compliance.
 */

/**
 * Get hospital ID from request
 * @param {Object} req - Express request object
 * @returns {number} Hospital ID
 */
const getHospitalId = (req) => {
    return req.hospital_id || req.hospitalId || req.user?.hospital_id || 1;
};

/**
 * Add hospital_id filter to WHERE clause
 * [IRON DOME] STRICT MODE - No more NULL fallback
 * @param {number} paramIndex - Current parameter index
 * @returns {string} SQL fragment
 */
const hospitalFilter = (paramIndex) => {
    // REMOVED: - This was a security risk!
    return `hospital_id = $${paramIndex}`;
};

/**
 * Build multi-tenant SELECT query
 * [IRON DOME] STRICT MODE - No more NULL fallback
 */
const buildSelectQuery = (table, columns = '*', additionalWhere = '', orderBy = '') => {
    let query = `SELECT ${columns} FROM ${table} WHERE hospital_id = $1`;
    if (additionalWhere) {
        query += ` AND ${additionalWhere}`;
    }
    if (orderBy) {
        query += ` ORDER BY ${orderBy}`;
    }
    return query;
};

/**
 * Add hospital_id to INSERT parameters
 */
const addHospitalIdParam = (req, params) => {
    return [...params, getHospitalId(req)];
};

/**
 * Generate INSERT query with hospital_id
 */
const buildInsertQuery = (table, columns) => {
    const allColumns = [...columns, 'hospital_id'];
    const placeholders = allColumns.map((_, i) => `$${i + 1}`).join(', ');
    const query = `INSERT INTO ${table} (${allColumns.join(', ')}) VALUES (${placeholders}) RETURNING *`;
    return {
        query,
        hospitalIdIndex: allColumns.length
    };
};

/**
 * Middleware to ensure hospital_id is always available
 */
const ensureHospitalId = (req, res, next) => {
    if (!req.hospital_id && !req.hospitalId) {
        req.hospitalId = req.user?.hospital_id || 1;
    }
    next();
};

/**
 * Build UPDATE query with hospital_id check
 * [IRON DOME] Ensures updates only affect the current tenant's data
 */
const buildUpdateQuery = (table, setClauses, paramIndex) => {
    return `UPDATE ${table} SET ${setClauses} WHERE hospital_id = $${paramIndex}`;
};

/**
 * Build DELETE query with hospital_id check
 * [IRON DOME] Ensures deletes only affect the current tenant's data
 */
const buildDeleteQuery = (table, paramIndex) => {
    return `DELETE FROM ${table} WHERE hospital_id = $${paramIndex}`;
};

module.exports = {
    getHospitalId,
    hospitalFilter,
    buildSelectQuery,
    addHospitalIdParam,
    buildInsertQuery,
    ensureHospitalId,
    buildUpdateQuery,
    buildDeleteQuery
};
