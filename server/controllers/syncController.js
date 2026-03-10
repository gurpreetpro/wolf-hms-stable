const pool = require('../config/db');
const asyncHandler = require('express-async-handler');

// SECURITY: Hardcoded key for this specific migration operation
// In production, use properly managed secrets.
const SYNC_SECRET = 'WolfHMS_Migration_Secret_2026';

const restoreData = asyncHandler(async (req, res) => {
    const { secret, hospitals, users, patients } = req.body;

    if (secret !== SYNC_SECRET) {
        return res.status(403).json({ message: 'Invalid Sync Secret' });
    }

    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        let log = [];

        // 1. Sync Hospitals
        if (hospitals && hospitals.length > 0) {
            for (const h of hospitals) {
                await client.query(`
                    INSERT INTO hospitals (id, code, name, subscription_tier)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (id) DO UPDATE SET 
                        code = EXCLUDED.code,
                        name = EXCLUDED.name,
                        subscription_tier = EXCLUDED.subscription_tier
                `, [h.id, h.code, h.name, h.subscription_tier]);
            }
            log.push(`Synced ${hospitals.length} hospitals`);
        }

        // 2. Sync Users
        if (users && users.length > 0) {
            for (const u of users) {
                // Handle potential nulls
                 await client.query(`
                    INSERT INTO users (id, username, email, password, role, hospital_id, is_active, full_name, department)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
                    ON CONFLICT (id) DO UPDATE SET 
                        username = EXCLUDED.username,
                        email = EXCLUDED.email,
                        password = EXCLUDED.password,
                        role = EXCLUDED.role,
                        hospital_id = EXCLUDED.hospital_id,
                        is_active = EXCLUDED.is_active,
                        full_name = EXCLUDED.full_name,
                        department = EXCLUDED.department
                `, [u.id, u.username, u.email, u.password, u.role, u.hospital_id, u.is_active, u.full_name, u.department]);
            }
             log.push(`Synced ${users.length} users`);
        }

        // 3. Sync Patients
        if (patients && patients.length > 0) {
             for (const p of patients) {
                await client.query(`
                    INSERT INTO patients (id, name, dob, gender, phone, address, history_json, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    ON CONFLICT (id) DO UPDATE SET 
                        name = EXCLUDED.name,
                        dob = EXCLUDED.dob,
                        gender = EXCLUDED.gender,
                        phone = EXCLUDED.phone,
                        address = EXCLUDED.address,
                        history_json = EXCLUDED.history_json
                `, [p.id, p.name, p.dob, p.gender, p.phone, p.address, p.history_json, p.created_at]);
             }
             log.push(`Synced ${patients.length} patients`);
        }

        await client.query('COMMIT');
        
        res.json({ success: true, log });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Sync Error:', err);
        res.status(500).json({ message: err.message });
    } finally {
        client.release();
    }
});

// Execute raw SQL for migration purposes
const executeSql = asyncHandler(async (req, res) => {
    const { secret, sql } = req.body;

    if (secret !== SYNC_SECRET) {
        return res.status(403).json({ success: false, message: 'Invalid Sync Secret' });
    }

    if (!sql) {
        return res.status(400).json({ success: false, message: 'SQL query is required' });
    }

    try {
        const result = await pool.query(sql);
        res.json({ 
            success: true, 
            rowCount: result.rowCount,
            rows: result.rows || []
        });
    } catch (err) {
        console.error('SQL Execution Error:', err);
        res.status(500).json({ 
            success: false, 
            message: err.message,
            detail: err.detail 
        });
    }
});

module.exports = { restoreData, executeSql };
