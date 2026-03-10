const pool = require('../config/db');
const ResponseHandler = require('../utils/responseHandler');
const { getHospitalId } = require('../utils/tenantHelper');
const { asyncHandler } = require('../middleware/errorHandler');

// --- Init Schema (MVP) ---
const initLogisticsDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS keys_inventory (
                id SERIAL PRIMARY KEY, key_name VARCHAR(50), status VARCHAR(20) DEFAULT 'AVAILABLE',
                current_holder VARCHAR(100), hospital_id INTEGER
            );
            CREATE TABLE IF NOT EXISTS key_logs (
                id SERIAL PRIMARY KEY, key_id INTEGER, action VARCHAR(20), person_name VARCHAR(100),
                guard_id INTEGER, timestamp TIMESTAMP DEFAULT NOW(), hospital_id INTEGER
            );
            CREATE TABLE IF NOT EXISTS packages (
                id SERIAL PRIMARY KEY, recipient_name VARCHAR(100), courier_name VARCHAR(50),
                tracking_no VARCHAR(100), status VARCHAR(20) DEFAULT 'RECEIVED', guard_id INTEGER,
                created_at TIMESTAMP DEFAULT NOW(), hospital_id INTEGER
            );
            CREATE TABLE IF NOT EXISTS lost_found (
                id SERIAL PRIMARY KEY, item_name VARCHAR(100), description TEXT, status VARCHAR(20) DEFAULT 'FOUND',
                founder_name VARCHAR(100), location_found VARCHAR(100), guard_id INTEGER,
                created_at TIMESTAMP DEFAULT NOW(), hospital_id INTEGER
            );
        `);
        console.log('[Logistics] DB Schema Verified');
    } catch (e) { console.error('[Logistics] DB Init Error', e); }
};
// initLogisticsDB();

// --- Key Management - Multi-Tenant ---
const getKeys = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const result = await pool.query("SELECT * FROM keys_inventory WHERE (hospital_id = $1 OR hospital_id IS NULL) ORDER BY id", [hospitalId]);
    ResponseHandler.success(res, result.rows);
});

const checkoutKey = asyncHandler(async (req, res) => {
    const { key_id, holder_name } = req.body;
    const guard_id = req.user.id;
    const hospitalId = getHospitalId(req);

    try {
        await pool.query('BEGIN');
        const updateRes = await pool.query(
            "UPDATE keys_inventory SET status = 'CHECKED_OUT', current_holder = $1 WHERE id = $2 AND status = 'AVAILABLE' AND (hospital_id = $3 OR hospital_id IS NULL) RETURNING *",
            [holder_name, key_id, hospitalId]
        );
        if (updateRes.rowCount === 0) {
            await pool.query('ROLLBACK');
            return ResponseHandler.error(res, 'Key not available or invalid', 400);
        }
        await pool.query(
            "INSERT INTO key_logs (key_id, action, person_name, guard_id, hospital_id) VALUES ($1, 'CHECKOUT', $2, $3, $4)",
            [key_id, holder_name, guard_id, hospitalId]
        );
        await pool.query('COMMIT');
        ResponseHandler.success(res, updateRes.rows[0], 'Key Checked Out');
    } catch (e) { 
        await pool.query('ROLLBACK');
        throw e;
    }
});

const returnKey = asyncHandler(async (req, res) => {
    const { key_id } = req.body;
    const guard_id = req.user.id;
    const hospitalId = getHospitalId(req);

    try {
        await pool.query('BEGIN');
        const realUpdate = await pool.query(
            "UPDATE keys_inventory SET status='AVAILABLE', current_holder=NULL WHERE id=$1 AND status='CHECKED_OUT' AND (hospital_id = $2 OR hospital_id IS NULL) RETURNING *",
            [key_id, hospitalId]
        );
        if (realUpdate.rowCount === 0) {
            await pool.query('ROLLBACK');
            return ResponseHandler.error(res, 'Key not checked out', 400);
        }
        await pool.query(
            "INSERT INTO key_logs (key_id, action, person_name, guard_id, hospital_id) VALUES ($1, 'RETURN', 'GUARD_RETURN', $2, $3)",
            [key_id, guard_id, hospitalId]
        );
        await pool.query('COMMIT');
        ResponseHandler.success(res, realUpdate.rows[0], 'Key Returned');
    } catch (e) {
        await pool.query('ROLLBACK');
        throw e;
    }
});

// --- Packages - Multi-Tenant ---
const logPackage = asyncHandler(async (req, res) => {
    const { recipient_name, courier_name, tracking_no } = req.body;
    const guard_id = req.user.id;
    const hospitalId = getHospitalId(req);

    const result = await pool.query(
        `INSERT INTO packages (recipient_name, courier_name, tracking_no, guard_id, hospital_id) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [recipient_name, courier_name, tracking_no, guard_id, hospitalId]
    );
    ResponseHandler.success(res, result.rows[0], 'Package Logged');
});

const getPackages = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const result = await pool.query("SELECT * FROM packages WHERE (hospital_id = $1 OR hospital_id IS NULL) ORDER BY created_at DESC LIMIT 50", [hospitalId]);
    ResponseHandler.success(res, result.rows);
});

// --- Lost & Found - Multi-Tenant ---
const logLostItem = asyncHandler(async (req, res) => {
    const { item_name, description, location_found, founder_name } = req.body;
    const guard_id = req.user.id;
    const hospitalId = getHospitalId(req);

    const result = await pool.query(
        `INSERT INTO lost_found (item_name, description, location_found, founder_name, guard_id, hospital_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [item_name, description, location_found, founder_name, guard_id, hospitalId]
    );
    ResponseHandler.success(res, result.rows[0], 'Item Logged');
});

module.exports = { getKeys, checkoutKey, returnKey, logPackage, getPackages, logLostItem };
