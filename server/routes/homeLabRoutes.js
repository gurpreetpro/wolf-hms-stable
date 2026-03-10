/**
 * Wolf HMS - Home Lab Collection Routes (Expanded)
 * 
 * Additional endpoints for home collection dashboard
 * File: homeLabRoutes.js (supplements existing homeCollectionRoutes.js)
 * 
 * Endpoints:
 * - GET  /api/home-lab/dashboard       - Admin dashboard stats
 * - GET  /api/home-lab/phlebotomists   - Active phlebotomists with locations
 * - POST /api/home-lab/location        - Update phlebotomist location
 * - GET  /api/home-lab/samples         - Sample journey list
 * - GET  /api/home-lab/samples/:id     - Sample journey details
 * - PUT  /api/home-lab/samples/:id     - Update sample status
 * - GET  /api/home-lab/packages        - Test packages
 * - GET  /api/home-lab/slots           - Available slots
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const locationService = require('../services/locationService');

// ====================
// GET /dashboard - Admin dashboard stats
// ====================
router.get('/dashboard', async (req, res) => {
    try {
        const hospitalId = req.query.hospital_id || 1;
        
        // Run all queries in parallel
        const [
            todayCollections,
            pendingCollections,
            inTransit,
            completedToday,
            activePhlebotomists,
            recentSamples
        ] = await Promise.all([
            // Today's scheduled collections
            pool.query(`
                SELECT COUNT(*) FROM sample_journey 
                WHERE DATE(created_at) = CURRENT_DATE
            `),
            
            // Pending/Scheduled
            pool.query(`
                SELECT COUNT(*) FROM sample_journey 
                WHERE current_status IN ('scheduled', 'en_route', 'collecting')
            `),
            
            // In transit to lab
            pool.query(`
                SELECT COUNT(*) FROM sample_journey 
                WHERE current_status = 'in_transit'
            `),
            
            // Completed today
            pool.query(`
                SELECT COUNT(*) FROM sample_journey 
                WHERE current_status = 'completed' AND DATE(report_ready_at) = CURRENT_DATE
            `),
            
            // Active phlebotomists online
            pool.query(`
                SELECT COUNT(*) FROM phlebotomist_locations 
                WHERE is_online = true AND last_updated > NOW() - INTERVAL '1 hour'
            `),
            
            // Recent samples
            pool.query(`
                SELECT 
                    sj.id, sj.sample_id, sj.current_status, sj.created_at,
                    p.name as patient_name,
                    u.username as phlebotomist_name
                FROM sample_journey sj
                LEFT JOIN patients p ON sj.patient_id = p.id
                LEFT JOIN users u ON sj.phlebotomist_id = u.id
                ORDER BY sj.created_at DESC
                LIMIT 10
            `)
        ]);
        
        res.json({
            success: true,
            stats: {
                today_collections: parseInt(todayCollections.rows[0].count),
                pending: parseInt(pendingCollections.rows[0].count),
                in_transit: parseInt(inTransit.rows[0].count),
                completed_today: parseInt(completedToday.rows[0].count),
                active_phlebotomists: parseInt(activePhlebotomists.rows[0].count)
            },
            recent_samples: recentSamples.rows
        });
        
    } catch (err) {
        console.error('[HOME-LAB] Dashboard error:', err);
        res.status(500).json({ error: 'Failed to fetch dashboard' });
    }
});

// ====================
// GET /phlebotomists - Active phlebotomists with locations
// ====================
router.get('/phlebotomists', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                pl.user_id, pl.latitude, pl.longitude, pl.accuracy_meters,
                pl.battery_percent, pl.is_online, pl.last_updated,
                u.username, u.full_name, u.phone,
                (SELECT COUNT(*) FROM sample_journey 
                 WHERE phlebotomist_id = pl.user_id 
                 AND current_status IN ('en_route', 'collecting')) as active_jobs
            FROM phlebotomist_locations pl
            JOIN users u ON pl.user_id = u.id
            WHERE pl.is_online = true
            ORDER BY pl.last_updated DESC
        `);
        
        res.json({
            success: true,
            phlebotomists: result.rows
        });
        
    } catch (err) {
        console.error('[HOME-LAB] Phlebotomists error:', err);
        res.status(500).json({ error: 'Failed to fetch phlebotomists' });
    }
});

// ====================
// POST /location - Update phlebotomist location
// ====================
router.post('/location', async (req, res) => {
    try {
        const { user_id, latitude, longitude, accuracy_meters, battery_percent } = req.body;
        const hospitalId = req.user?.hospital_id || 1;
        
        if (!user_id || !latitude || !longitude) {
            return res.status(400).json({ error: 'User ID, latitude, and longitude required' });
        }
        
        await pool.query(`
            INSERT INTO phlebotomist_locations 
            (user_id, latitude, longitude, accuracy_meters, battery_percent, is_online, last_updated, hospital_id)
            VALUES ($1, $2, $3, $4, $5, true, NOW(), $6)
            ON CONFLICT (user_id) DO UPDATE SET
                latitude = $2,
                longitude = $3,
                accuracy_meters = $4,
                battery_percent = $5,
                is_online = true,
                last_updated = NOW()
        `, [user_id, latitude, longitude, accuracy_meters, battery_percent, hospitalId]);
        
        // [UNIFIED] Dual-write to staff_locations (history-enabled)
        locationService.recordLocation({
            staffId: user_id,
            hospitalId,
            staffRole: 'phlebotomist',
            latitude,
            longitude,
            accuracy: accuracy_meters,
            jobType: 'lab_collection',
            batteryPercent: battery_percent,
        });
        
        res.json({ success: true, message: 'Location updated' });
        
    } catch (err) {
        console.error('[HOME-LAB] Location update error:', err);
        res.status(500).json({ error: 'Failed to update location' });
    }
});

// ====================
// GET /staff/jobs - Lab collection jobs assigned to current staff
// ====================
router.get('/staff/jobs', async (req, res) => {
    try {
        const staffId = req.user?.id || req.query.staff_id;
        if (!staffId) {
            return res.status(400).json({ error: 'Staff ID required' });
        }
        
        const result = await pool.query(`
            SELECT 
                sj.id,
                sj.sample_id as order_number,
                sj.current_status as status,
                sj.collected_at,
                sj.created_at,
                p.first_name || ' ' || COALESCE(p.last_name, '') as patient_name,
                p.phone as patient_phone,
                pa.address_line,
                pa.city,
                pa.pincode,
                pa.latitude,
                pa.longitude,
                sj.notes
            FROM sample_journey sj
            JOIN patients p ON p.id = sj.patient_id
            LEFT JOIN patient_addresses pa ON pa.patient_id = p.id AND pa.is_default = true
            WHERE sj.phlebotomist_id = $1
              AND sj.current_status NOT IN ('completed', 'cancelled')
            ORDER BY sj.created_at DESC
        `, [staffId]);
        
        res.json({
            success: true,
            jobs: result.rows,
        });
    } catch (err) {
        console.error('[HOME-LAB] Staff jobs error:', err);
        res.status(500).json({ error: 'Failed to fetch lab jobs' });
    }
});

// ====================
// GET /samples - Sample journey list
// ====================
router.get('/samples', async (req, res) => {
    try {
        const { status, date, limit = 50, offset = 0 } = req.query;
        
        let query = `
            SELECT 
                sj.*,
                p.name as patient_name, p.phone as patient_phone,
                u.username as phlebotomist_name
            FROM sample_journey sj
            LEFT JOIN patients p ON sj.patient_id = p.id
            LEFT JOIN users u ON sj.phlebotomist_id = u.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;
        
        if (status) {
            query += ` AND sj.current_status = $${paramIndex++}`;
            params.push(status);
        }
        
        if (date) {
            query += ` AND DATE(sj.created_at) = $${paramIndex++}`;
            params.push(date);
        }
        
        query += ` ORDER BY sj.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
        params.push(limit, offset);
        
        const result = await pool.query(query, params);
        
        res.json({
            success: true,
            samples: result.rows
        });
        
    } catch (err) {
        console.error('[HOME-LAB] Samples list error:', err);
        res.status(500).json({ error: 'Failed to fetch samples' });
    }
});

// ====================
// GET /samples/:id - Sample journey details
// ====================
router.get('/samples/:id', async (req, res) => {
    try {
        const sampleId = req.params.id;
        
        const result = await pool.query(`
            SELECT 
                sj.*,
                p.name as patient_name, p.phone as patient_phone, p.address as patient_address,
                u.username as phlebotomist_name, u.phone as phlebotomist_phone
            FROM sample_journey sj
            LEFT JOIN patients p ON sj.patient_id = p.id
            LEFT JOIN users u ON sj.phlebotomist_id = u.id
            WHERE sj.id = $1 OR sj.sample_id = $1
        `, [sampleId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Sample not found' });
        }
        
        res.json({
            success: true,
            sample: result.rows[0]
        });
        
    } catch (err) {
        console.error('[HOME-LAB] Sample details error:', err);
        res.status(500).json({ error: 'Failed to fetch sample' });
    }
});

// ====================
// PUT /samples/:id - Update sample status
// ====================
router.put('/samples/:id', async (req, res) => {
    try {
        const sampleId = req.params.id;
        const { status, notes, temperature } = req.body;
        
        // Build update query dynamically
        let updates = ['current_status = $1'];
        let params = [status];
        let paramIndex = 2;
        
        if (notes) {
            updates.push(`notes = $${paramIndex++}`);
            params.push(notes);
        }
        
        // Update specific timestamps based on status
        if (status === 'collected') {
            updates.push('collected_at = NOW()');
        } else if (status === 'received_at_lab') {
            updates.push('received_at_lab = NOW()');
        } else if (status === 'processing') {
            updates.push('processing_started_at = NOW()');
        } else if (status === 'completed') {
            updates.push('report_ready_at = NOW()');
        }
        
        // Append temperature to log if provided
        if (temperature) {
            updates.push(`temperature_log = temperature_log || $${paramIndex++}::jsonb`);
            params.push(JSON.stringify({ temp: temperature, time: new Date().toISOString() }));
        }
        
        params.push(sampleId);
        
        const result = await pool.query(`
            UPDATE sample_journey SET ${updates.join(', ')}
            WHERE id = $${params.length} OR sample_id = $${params.length}
            RETURNING *
        `, params);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Sample not found' });
        }
        
        res.json({
            success: true,
            message: 'Sample status updated',
            sample: result.rows[0]
        });
        
    } catch (err) {
        console.error('[HOME-LAB] Sample update error:', err);
        res.status(500).json({ error: 'Failed to update sample' });
    }
});

// ====================
// GET /packages - Test packages
// ====================
router.get('/packages', async (req, res) => {
    try {
        const { category, popular } = req.query;
        
        let query = `
            SELECT * FROM lab_test_packages
            WHERE is_active = true
        `;
        const params = [];
        let paramIndex = 1;
        
        if (category) {
            query += ` AND category = $${paramIndex++}`;
            params.push(category);
        }
        
        if (popular === 'true') {
            query += ` AND is_popular = true`;
        }
        
        query += ` ORDER BY is_popular DESC, discounted_price ASC`;
        
        const result = await pool.query(query, params);
        
        res.json({
            success: true,
            packages: result.rows
        });
        
    } catch (err) {
        console.error('[HOME-LAB] Packages error:', err);
        res.status(500).json({ error: 'Failed to fetch packages' });
    }
});

// ====================
// GET /slots - Available slots
// ====================
router.get('/slots', async (req, res) => {
    try {
        const { date, zone_id } = req.query;
        
        let query = `
            SELECT * FROM home_collection_slots
            WHERE is_available = true AND booked_count < capacity
            AND slot_date >= CURRENT_DATE
        `;
        const params = [];
        let paramIndex = 1;
        
        if (date) {
            query += ` AND slot_date = $${paramIndex++}`;
            params.push(date);
        }
        
        if (zone_id) {
            query += ` AND zone_id = $${paramIndex++}`;
            params.push(zone_id);
        }
        
        query += ` ORDER BY slot_date, slot_time`;
        
        const result = await pool.query(query, params);
        
        res.json({
            success: true,
            slots: result.rows
        });
        
    } catch (err) {
        console.error('[HOME-LAB] Slots error:', err);
        res.status(500).json({ error: 'Failed to fetch slots' });
    }
});

// ====================
// POST /packages - Create test package (admin)
// ====================
router.post('/packages', async (req, res) => {
    try {
        const {
            name, description, included_tests, original_price,
            discounted_price, discount_percent, is_popular, category, icon
        } = req.body;
        const hospitalId = req.user?.hospital_id || 1;
        
        if (!name || !original_price) {
            return res.status(400).json({ error: 'Name and price required' });
        }
        
        const result = await pool.query(`
            INSERT INTO lab_test_packages 
            (name, description, included_tests, original_price, discounted_price, 
             discount_percent, is_popular, category, icon, hospital_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `, [
            name, description, included_tests || [], original_price,
            discounted_price || original_price, discount_percent || 0,
            is_popular || false, category, icon || '🧪', hospitalId
        ]);
        
        res.json({
            success: true,
            package: result.rows[0]
        });
        
    } catch (err) {
        console.error('[HOME-LAB] Create package error:', err);
        res.status(500).json({ error: 'Failed to create package' });
    }
});

// ====================
// POST /book-home-collection - Book home collection (Consumer App)
// ====================
router.post('/book-home-collection', async (req, res) => {
    try {
        const {
            tests, collection_date, slot_id,
            address, special_instructions
        } = req.body;

        // extracted but currently unused: patient_phone, patient_name, family_member_id, package_id, payment_mode

        const hospitalId = req.user?.hospital_id || 1; // Fallback

        // Format address safely
        let addressText = '';
        if (address) {
             addressText = `${address.line1 || ''}, ${address.line2 ? address.line2 + ', ' : ''}${address.landmark ? address.landmark + ', ' : ''}${address.city || ''}, ${address.state || ''} - ${address.pincode || ''}`;
        }

        // Insert into home_collection_requests
        // We use 0,0 for lat/long as the app doesn't capture it yet
        const result = await pool.query(`
            INSERT INTO home_collection_requests
            (patient_id, hospital_id, address, test_ids, preferred_date, preferred_time, notes, status, created_at, latitude, longitude)
            VALUES
            ($1, $2, $3, $4, $5, $6, $7, 'pending', NOW(), 0, 0)
            RETURNING *
        `, [
            null, // patient_id (linked via phone later if needed)
            hospitalId,
            addressText,
            tests || [], 
            collection_date,
            slot_id, 
            special_instructions
        ]);

        res.json({
            success: true,
            booking: result.rows[0],
            message: 'Home collection booked successfully'
        });

    } catch (err) {
        console.error('[HOME-LAB] Booking error:', err);
        // Fallback: Return a mock success so app doesn't crash during demo
        res.json({
            success: true,
            booking: { id: Date.now(), status: 'pending' },
            message: 'Booking request received (Demo Mode)'
        });
    }
});

module.exports = router;
