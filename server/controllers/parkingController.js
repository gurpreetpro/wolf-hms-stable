const pool = require('../config/db');
const ResponseHandler = require('../utils/responseHandler');
const { getHospitalId } = require('../utils/tenantHelper');
const { asyncHandler } = require('../middleware/errorHandler');

// --- Init Schema (Helper for MVP) ---
const initParkingDB = async () => {
    try {
        await pool.query(`
            CREATE TABLE IF NOT EXISTS parking_sessions (
                id SERIAL PRIMARY KEY, vehicle_no VARCHAR(20) NOT NULL, vehicle_type VARCHAR(20) DEFAULT 'CAR',
                entry_time TIMESTAMP DEFAULT NOW(), exit_time TIMESTAMP, status VARCHAR(20) DEFAULT 'PARKED',
                amount_due DECIMAL(10,2) DEFAULT 0.00, payment_method VARCHAR(20), guard_id INTEGER, image_url TEXT, hospital_id INTEGER
            );
        `);
        console.log('[Parking] DB Schema Verified');
    } catch (e) { console.error('[Parking] DB Init Error', e); }
};
// initParkingDB();

const RATES = { CAR: 20, BIKE: 10, TRUCK: 50 };

// Vehicle Entry - Multi-Tenant
const vehicleEntry = asyncHandler(async (req, res) => {
    const { vehicle_no, vehicle_type, image_url } = req.body;
    const guard_id = req.user.id;
    const hospitalId = getHospitalId(req);

    if (!vehicle_no) return ResponseHandler.error(res, 'Vehicle Number required', 400);

    const existing = await pool.query(
        "SELECT * FROM parking_sessions WHERE vehicle_no = $1 AND status = 'PARKED' AND (hospital_id = $2 OR hospital_id IS NULL)",
        [vehicle_no, hospitalId]
    );
    if (existing.rows.length > 0) return ResponseHandler.error(res, 'Vehicle already marked as PARKED', 409);

    const result = await pool.query(
        `INSERT INTO parking_sessions (vehicle_no, vehicle_type, guard_id, image_url, status, hospital_id)
            VALUES ($1, $2, $3, $4, 'PARKED', $5) RETURNING *`,
        [vehicle_no.toUpperCase().replace(/\s/g, ''), vehicle_type || 'CAR', guard_id, image_url, hospitalId]
    );
    if (global.io) global.io.emit('parking_update', { type: 'ENTRY', data: result.rows[0] });
    ResponseHandler.success(res, result.rows[0], 'Vehicle Checked In', 201);
});

// Vehicle Exit Calculation - Multi-Tenant
const vehicleExitCalculation = asyncHandler(async (req, res) => {
    const { vehicle_no } = req.query;
    const hospitalId = getHospitalId(req);
    if (!vehicle_no) return ResponseHandler.error(res, 'Vehicle Number required', 400);

    const cleanNo = vehicle_no.toUpperCase().replace(/\s/g, '');
    const sessionRes = await pool.query(
        "SELECT * FROM parking_sessions WHERE vehicle_no = $1 AND status = 'PARKED' AND (hospital_id = $2 OR hospital_id IS NULL)",
        [cleanNo, hospitalId]
    );
    if (sessionRes.rows.length === 0) return ResponseHandler.error(res, 'Vehicle not found or already exited', 404);

    const session = sessionRes.rows[0];
    const entry = new Date(session.entry_time);
    const exit = new Date();
    const durationHrs = Math.max(0, (exit - entry) / (1000 * 60 * 60));
    const billedHours = Math.ceil(Math.max(1, durationHrs));
    const rate = RATES[session.vehicle_type] || RATES.CAR;
    const amount = billedHours * rate;

    ResponseHandler.success(res, {
        session_id: session.id, vehicle_no: session.vehicle_no, entry_time: session.entry_time, exit_time: exit,
        duration_formatted: `${Math.floor(durationHrs)}h ${Math.round((durationHrs % 1) * 60)}m`,
        rate_per_hour: rate, amount_due: amount
    });
});

// Confirm Exit - Multi-Tenant
const confirmExit = asyncHandler(async (req, res) => {
    const { session_id, payment_method, amount_paid } = req.body;
    const hospitalId = getHospitalId(req);

    const result = await pool.query(
        `UPDATE parking_sessions SET status = 'PAID', exit_time = NOW(), payment_method = $1, amount_due = $2
            WHERE id = $3 AND status = 'PARKED' AND (hospital_id = $4 OR hospital_id IS NULL) RETURNING *`,
        [payment_method || 'CASH', amount_paid, session_id, hospitalId]
    );
    if (result.rows.length === 0) return ResponseHandler.error(res, 'Session invalid or already closed', 400);
    if (global.io) global.io.emit('parking_update', { type: 'EXIT', data: result.rows[0] });
    ResponseHandler.success(res, result.rows[0], 'Exit Confirmed');
});

// Dashboard Stats - Multi-Tenant
const getParkingStats = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const parkedRes = await pool.query("SELECT * FROM parking_sessions WHERE status = 'PARKED' AND (hospital_id = $1 OR hospital_id IS NULL) ORDER BY entry_time DESC", [hospitalId]);
    const revenueRes = await pool.query("SELECT SUM(amount_due) as total FROM parking_sessions WHERE status = 'PAID' AND exit_time > NOW()::DATE AND (hospital_id = $1 OR hospital_id IS NULL)", [hospitalId]);
    ResponseHandler.success(res, { occupancy: parkedRes.rows.length, revenue_today: revenueRes.rows[0].total || 0, active_sessions: parkedRes.rows });
});

// Log Inspection - Multi-Tenant
const logInspection = asyncHandler(async (req, res) => {
    const { session_id, vehicle_no, damage_points } = req.body;
    const guard_id = req.user.id;
    const hospitalId = getHospitalId(req);

    const result = await pool.query(
        `INSERT INTO vehicle_inspections (session_id, vehicle_no, damage_points, guard_id, hospital_id) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [session_id, vehicle_no, JSON.stringify(damage_points || []), guard_id, hospitalId]
    );
    ResponseHandler.success(res, result.rows[0], 'Inspection Logged');
});

// Log Violation - Multi-Tenant
const logViolation = asyncHandler(async (req, res) => {
    const { vehicle_no, violation_type, photo_url } = req.body;
    const guard_id = req.user.id;
    const hospitalId = getHospitalId(req);

    const result = await pool.query(
        `INSERT INTO parking_violations (vehicle_no, violation_type, photo_url, guard_id, hospital_id) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
        [vehicle_no, violation_type, photo_url, guard_id, hospitalId]
    );
    ResponseHandler.success(res, result.rows[0], 'Violation Issued');
});

module.exports = { vehicleEntry, vehicleExitCalculation, confirmExit, getParkingStats, logInspection, logViolation };
