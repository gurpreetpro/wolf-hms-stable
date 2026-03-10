const pool = require('../config/db');
const ResponseHandler = require('../utils/responseHandler');
const { getHospitalId } = require('../utils/tenantHelper');
const { asyncHandler } = require('../middleware/errorHandler');

// Log New Visitor (Check-in)
const logVisitor = asyncHandler(async (req, res) => {
    // 1. Extract Data
    const { full_name, phone, photo_url, purpose, department, patient_id } = req.body;
    const userId = req.user.id; // Guard or Receptionist
    const hospitalId = getHospitalId(req);

    const client = await pool.connect();
    try {
        await client.query('BEGIN');

        // 2. Resolve Visitor (Person)
        // Check if visitor exists by phone number in this hospital
        let visitorId;
        const visitorCheck = await client.query(
            'SELECT id, is_blacklisted FROM visitors WHERE phone = $1 AND hospital_id = $2',
            [phone, hospitalId]
        );

        if (visitorCheck.rows.length > 0) {
            // Visitor Exists
            if (visitorCheck.rows[0].is_blacklisted) {
                await client.query('ROLLBACK');
                return ResponseHandler.error(res, 'SECURITY ALERT: Visitor is Blacklisted', 403);
            }
            visitorId = visitorCheck.rows[0].id;
            // Optional: Update photo/name if changed? For now, we assume simple re-entry.
        } else {
            // Create New Visitor
            const newVisitor = await client.query(
                `INSERT INTO visitors (hospital_id, full_name, phone, photo_url)
                 VALUES ($1, $2, $3, $4) RETURNING id`,
                [hospitalId, full_name, phone, photo_url]
            );
            visitorId = newVisitor.rows[0].id;
        }

        // 3. Create Visit (Event)
        const newVisit = await client.query(
            `INSERT INTO visits (
                hospital_id, visitor_id, status, purpose,
                department, patient_id, check_in_by, check_in_time
            ) VALUES ($1, $2, 'CHECKED_IN', $3, $4, $5, $6, NOW()) RETURNING *`,
            [hospitalId, visitorId, purpose, department, patient_id, userId]
        );

        await client.query('COMMIT');
        
        // Return combined data
        const responseData = {
            visit: newVisit.rows[0],
            visitor_id: visitorId,
            full_name: full_name
        };
        ResponseHandler.success(res, responseData, 'Visitor Checked In', 201);

    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Visitor Log Error:', e);
        throw e; // Handled by asyncHandler
    } finally {
        client.release();
    }
});

// Get Active Visitors (Currently Inside)
const getActiveVisitors = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    
    // Join visits and visitors
    const result = await pool.query(`
        SELECT 
            v.id as visit_id,
            v.check_in_time,
            v.purpose,
            v.department,
            p.full_name,
            p.phone,
            p.photo_url,
            p.is_blacklisted
        FROM visits v
        JOIN visitors p ON v.visitor_id = p.id
        WHERE v.status = 'CHECKED_IN'
        AND v.hospital_id = $1
        ORDER BY v.check_in_time DESC
    `, [hospitalId]);

    ResponseHandler.success(res, result.rows);
});

// Checkout Visitor
const checkoutVisitor = asyncHandler(async (req, res) => {
    const { id } = req.params; // This is VISIT ID, not Visitor ID
    const userId = req.user.id;
    const hospitalId = getHospitalId(req);

    const result = await pool.query(
        `UPDATE visits 
         SET status = 'CHECKED_OUT', exit_time = NOW(), check_out_by = $1
         WHERE id = $2 AND hospital_id = $3
         RETURNING *`,
        [userId, id, hospitalId]
    );

    if (result.rowCount === 0) {
        return ResponseHandler.error(res, 'Visit not found or already closed', 404);
    }
    
    ResponseHandler.success(res, result.rows[0], 'Visitor Checked Out');
});

// Mock Invite (Stub for now)
const createInvite = asyncHandler(async (req, res) => {
    // TODO: Phase 2 - Pre-scheduled invites
    ResponseHandler.success(res, { code: '123456' }, 'Invites coming in Phase 2');
});

const getInvites = asyncHandler(async (req, res) => {
    ResponseHandler.success(res, [], 'Invites coming in Phase 2');
});

const searchPatients = asyncHandler(async (req, res) => {
    const { query } = req.query;
    const hospitalId = getHospitalId(req);

    if (!query || query.length < 3) return ResponseHandler.success(res, []);

    const result = await pool.query(
        `SELECT id, name, phone, gender, dob FROM patients 
         WHERE (name ILIKE $1 OR phone ILIKE $1) AND hospital_id = $2 
         LIMIT 10`,
        [`%${query}%`, hospitalId]
    );

    ResponseHandler.success(res, result.rows);
});

module.exports = { logVisitor, getActiveVisitors, checkoutVisitor, createInvite, getInvites, searchPatients };
