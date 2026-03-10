const pool = require('../config/db');
const { getHospitalId } = require('../utils/tenantHelper');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

// Issue Pass - Multi-Tenant
const issuePass = asyncHandler(async (req, res) => {
    const { admission_id, pass_type, holder_name, valid_hours } = req.body;
    const hospitalId = getHospitalId(req);
    const qr_code = `WARD:${pass_type}:${Math.floor(1000 + Math.random() * 9000)}`;
    
    let valid_until = null;
    if (pass_type === 'VISITOR') {
        const hours = valid_hours || 4;
        valid_until = new Date(Date.now() + hours * 60 * 60 * 1000);
    }

    const result = await pool.query(
        `INSERT INTO ward_passes (admission_id, pass_type, holder_name, qr_code, valid_until, hospital_id)
            VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
        [admission_id, pass_type, holder_name, qr_code, valid_until, hospitalId]
    );
    ResponseHandler.success(res, result.rows[0], 'Pass Issued');
});

// Verify Access - Multi-Tenant
const verifyAccess = asyncHandler(async (req, res) => {
    const { qr_code } = req.body;
    const guard_id = req.user.id;
    const hospitalId = getHospitalId(req);

    const passRes = await pool.query(
        "SELECT * FROM ward_passes WHERE qr_code = $1 AND (hospital_id = $2 OR hospital_id IS NULL)",
        [qr_code, hospitalId]
    );
    if (passRes.rows.length === 0) return ResponseHandler.error(res, 'INVALID PASS', 404);

    const pass = passRes.rows[0];
    if (!pass.is_active) {
        await logAccess(pass.id, 'DENIED', guard_id, 'Pass Deactivated');
        return ResponseHandler.error(res, 'PASS DEACTIVATED', 403);
    }
    if (pass.pass_type === 'VISITOR' && new Date() > new Date(pass.valid_until)) {
        await logAccess(pass.id, 'DENIED', guard_id, 'Pass Expired');
        return ResponseHandler.error(res, 'PASS EXPIRED', 403);
    }

    let newLocation = pass.current_location === 'INSIDE' ? 'OUTSIDE' : 'INSIDE';
    let action = newLocation === 'INSIDE' ? 'ENTRY' : 'EXIT';

    await pool.query("UPDATE ward_passes SET current_location = $1 WHERE id = $2 AND (hospital_id = $3 OR hospital_id IS NULL)", [newLocation, pass.id, hospitalId]);
    await logAccess(pass.id, action, guard_id, 'Success');

    ResponseHandler.success(res, { status: 'ALLOWED', action, holder: pass.holder_name, type: pass.pass_type, location: newLocation });
});

const logAccess = async (passId, action, guardId, reason) => {
    await pool.query(
        "INSERT INTO ward_access_logs (pass_id, action, guard_id, reason) VALUES ($1, $2, $3, $4)",
        [passId, action, guardId, reason]
    );
};

// Get Ward Stats - Multi-Tenant
const getWardStats = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    try {
        const result = await pool.query(`
            SELECT a.ward, COUNT(wp.id)::int as active_attendants FROM ward_passes wp
            JOIN admissions a ON wp.admission_id = a.id
            WHERE wp.current_location = 'INSIDE' AND (a.hospital_id = $1 OR a.hospital_id IS NULL)
            GROUP BY a.ward
        `, [hospitalId]);
        
        const byAdmission = await pool.query(`
            SELECT wp.admission_id, COUNT(wp.id)::int as count FROM ward_passes wp
            JOIN admissions a ON wp.admission_id = a.id
            WHERE wp.current_location = 'INSIDE' AND (a.hospital_id = $1 OR a.hospital_id IS NULL)
            GROUP BY wp.admission_id
        `, [hospitalId]);

        ResponseHandler.success(res, { by_ward: result.rows, by_admission: byAdmission.rows });
    } catch (e) {
        console.error(e);
        ResponseHandler.success(res, { by_ward: [], by_admission: [] }); 
    }
});

module.exports = { issuePass, verifyAccess, getWardStats };
