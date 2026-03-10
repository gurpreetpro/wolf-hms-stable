/**
 * Wolf HMS - Unified Location Service
 * 
 * Single entry point for all staff location writes across the ecosystem.
 * Writes to the unified `staff_locations` table (history-enabled) and
 * optionally to legacy tables for backward compatibility.
 * 
 * Usage:
 *   const locationService = require('./services/locationService');
 *   await locationService.recordLocation({ ... });
 *   const latest = await locationService.getLatestLocation(staffId);
 *   const trail = await locationService.getLocationTrail(jobId, jobType);
 */

const pool = require('../db');

/**
 * Record a staff location point (appended to history)
 */
async function recordLocation({
    staffId,
    hospitalId,
    staffRole,       // 'runner' | 'phlebotomist' | 'guard'
    latitude,
    longitude,
    accuracy,
    heading,
    speed,
    altitude,
    jobType,         // 'medicine_delivery' | 'lab_collection' | 'patrol'
    jobId,
    isOnline = true,
    batteryPercent,
    signalStrength,
}) {
    if (!latitude || !longitude) return null;

    try {
        const result = await pool.query(`
            INSERT INTO staff_locations 
                (staff_id, hospital_id, staff_role, latitude, longitude, 
                 accuracy_meters, heading, speed, altitude,
                 job_type, job_id, is_online, battery_percent, signal_strength)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING id, recorded_at
        `, [
            staffId, hospitalId || 1, staffRole,
            latitude, longitude, accuracy, heading, speed, altitude,
            jobType, jobId, isOnline, batteryPercent, signalStrength
        ]);

        return result.rows[0];
    } catch (err) {
        // Table might not exist yet (migration not run) — fail silently
        console.warn('[LOCATION-SERVICE] Record error (table may not exist):', err.message);
        return null;
    }
}

/**
 * Get latest location for a staff member
 */
async function getLatestLocation(staffId) {
    try {
        const result = await pool.query(`
            SELECT * FROM staff_locations 
            WHERE staff_id = $1 
            ORDER BY recorded_at DESC 
            LIMIT 1
        `, [staffId]);
        return result.rows[0] || null;
    } catch (err) {
        console.warn('[LOCATION-SERVICE] Get latest error:', err.message);
        return null;
    }
}

/**
 * Get location trail for route replay
 * Supports query by staffId with optional jobType, jobId, date range, and limit
 */
async function getLocationTrail(staffId, jobType, jobId, { from, to, limit } = {}) {
    try {
        let query = `
            SELECT latitude, longitude, speed as speed_kmh, heading, recorded_at
            FROM staff_locations 
            WHERE staff_id = $1
        `;
        const params = [staffId];
        let idx = 2;

        if (jobType) { query += ` AND job_type = $${idx++}`; params.push(jobType); }
        if (jobId)   { query += ` AND job_id = $${idx++}`;   params.push(jobId); }
        if (from)    { query += ` AND recorded_at >= $${idx++}`; params.push(from); }
        if (to)      { query += ` AND recorded_at <= $${idx++}`; params.push(to); }

        query += ` ORDER BY recorded_at ASC LIMIT $${idx}`;
        params.push(limit || 500);

        const result = await pool.query(query, params);
        return result.rows;
    } catch (err) {
        console.warn('[LOCATION-SERVICE] Trail error:', err.message);
        return [];
    }
}

/**
 * Get all online staff (admin dashboard)
 * hospitalId is optional — returns all hospitals if null
 */
async function getOnlineStaff(hospitalId, staffRole) {
    try {
        let query = `
            SELECT DISTINCT ON (staff_id) 
                sl.staff_id as id,
                u.username as name,
                sl.staff_role as role,
                sl.latitude, sl.longitude,
                sl.speed as speed_kmh,
                sl.recorded_at as last_updated,
                sl.is_online
            FROM staff_locations sl
            JOIN users u ON u.id = sl.staff_id
            WHERE sl.is_online = true
              AND sl.recorded_at > NOW() - INTERVAL '10 minutes'
        `;
        const params = [];
        let idx = 1;

        if (hospitalId) {
            query += ` AND sl.hospital_id = $${idx++}`;
            params.push(hospitalId);
        }
        if (staffRole) {
            query += ` AND sl.staff_role = $${idx++}`;
            params.push(staffRole);
        }

        query += ` ORDER BY sl.staff_id, sl.recorded_at DESC`;

        const result = await pool.query(query, params);
        return result.rows;
    } catch (err) {
        console.warn('[LOCATION-SERVICE] Online staff error:', err.message);
        return [];
    }
}

/**
 * Mark staff as offline (when they log out or go idle)
 */
async function markOffline(staffId) {
    try {
        await recordLocation({
            staffId,
            staffRole: 'unknown',
            latitude: 0,
            longitude: 0,
            isOnline: false,
        });
    } catch (err) {
        console.warn('[LOCATION-SERVICE] Mark offline error:', err.message);
    }
}

module.exports = {
    recordLocation,
    getLatestLocation,
    getLocationTrail,
    getOnlineStaff,
    markOffline,
};
