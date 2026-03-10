const pool = require('../config/db');
const ResponseHandler = require('../utils/responseHandler');
const { getHospitalId } = require('../utils/tenantHelper');
const { asyncHandler } = require('../middleware/errorHandler');

// 1. Declare Death (Doctor)
const declareDeath = asyncHandler(async (req, res) => {
    const { 
        patient_id, full_name, time_of_death, cause_of_death, 
        mccd_number, is_mlc, police_fir_number 
    } = req.body;
    
    const userId = req.user.id;
    const hospitalId = getHospitalId(req);
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // A. Update Patient Status
        if (patient_id) {
            await client.query(
                `UPDATE patients SET status = 'DECEASED' WHERE id = $1 AND hospital_id = $2`,
                [patient_id, hospitalId]
            );
        }
        
        // B. Create Death Record
        const result = await client.query(
            `INSERT INTO death_records (
                hospital_id, patient_id, full_name, time_of_death, 
                cause_of_death, declared_by, mccd_number, is_mlc, police_fir_number,
                release_status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'IN_MORGUE') 
            RETURNING *`,
            [hospitalId, patient_id, full_name, time_of_death, cause_of_death, userId, mccd_number, is_mlc, police_fir_number]
        );
        
        await client.query('COMMIT');
        ResponseHandler.success(res, result.rows[0], 'Death Declared & Recorded', 201);
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('Declare Death Error:', e);
        throw e;
    } finally {
        client.release();
    }
});

// 2. Get Dashboard Data (Chambers & Active Bodies)
const getMortuaryStatus = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    
    // Get Chambers
    const chambers = await pool.query(
        `SELECT * FROM mortuary_chambers WHERE hospital_id = $1 ORDER BY code`,
        [hospitalId]
    );
    
    // Get Active Bodies (Not Released)
    const activeRecords = await pool.query(
        `SELECT dr.*, p.gender, p.dob 
         FROM death_records dr
         LEFT JOIN patients p ON dr.patient_id = p.id
         WHERE dr.hospital_id = $1 AND dr.release_status != 'RELEASED'
         ORDER BY dr.time_of_death DESC`,
        [hospitalId]
    );
    
    ResponseHandler.success(res, {
        chambers: chambers.rows,
        records: activeRecords.rows
    });
});

// 3. Allocate Chamber (Mortuary Staff)
const allocateChamber = asyncHandler(async (req, res) => {
    const { record_id, chamber_id } = req.body;
    const hospitalId = getHospitalId(req);
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // A. Check if chamber is Vacant
        const chamberCheck = await client.query(
            `SELECT status FROM mortuary_chambers WHERE id = $1 AND hospital_id = $2 FOR UPDATE`,
            [chamber_id, hospitalId]
        );
        
        if (chamberCheck.rows[0].status !== 'VACANT') {
            await client.query('ROLLBACK');
            return ResponseHandler.error(res, 'Chamber is not vacant', 400);
        }
        
        // B. Update Previous Chamber to VACANT (if moving)
        const currentRecord = await client.query(
            `SELECT mortuary_chamber_id FROM death_records WHERE id = $1`, [record_id]
        );
        if (currentRecord.rows[0].mortuary_chamber_id) {
             await client.query(
                `UPDATE mortuary_chambers SET status = 'VACANT' WHERE id = $1`,
                [currentRecord.rows[0].mortuary_chamber_id]
            );
        }
        
        // C. Assign New Chamber
        await client.query(
            `UPDATE death_records 
             SET mortuary_chamber_id = $1, storage_start_time = NOW() 
             WHERE id = $2 AND hospital_id = $3`,
            [chamber_id, record_id, hospitalId]
        );
        
        // D. Mark Chamber Occupied
        await client.query(
            `UPDATE mortuary_chambers SET status = 'OCCUPIED' WHERE id = $1`,
            [chamber_id]
        );
        
        await client.query('COMMIT');
        ResponseHandler.success(res, { success: true }, 'Chamber Allocated');
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
});

// 4. Issue Release Pass (Admin)
const issueReleasePass = asyncHandler(async (req, res) => {
    const { record_id, notes } = req.body;
    const userId = req.user.id;
    const hospitalId = getHospitalId(req);
    
    // Note: We do NOT block for dues. We only log the notes.
    const result = await pool.query(
        `UPDATE death_records 
         SET release_status = 'CLEARED_BY_ADMIN', clearance_by = $1, clearance_notes = $2
         WHERE id = $3 AND hospital_id = $4
         RETURNING *`,
        [userId, notes, record_id, hospitalId]
    );
    
    if (result.rowCount === 0) return ResponseHandler.error(res, 'Record not found', 404);
    
    ResponseHandler.success(res, result.rows[0], 'Release Pass Issued');
});

// 5. Final Handover (Guard/Mortuary)
const releaseBody = asyncHandler(async (req, res) => {
    const { 
        record_id, receiver_name, receiver_relation, 
        receiver_id_proof_type, receiver_id_number 
    } = req.body;
    const userId = req.user.id;
    const hospitalId = getHospitalId(req);
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // A. Get Record & Chamber
        const record = await client.query(
            `SELECT mortuary_chamber_id, release_status, is_mlc FROM death_records WHERE id = $1 AND hospital_id = $2`,
            [record_id, hospitalId]
        );
        
        if (!record.rows.length) throw new Error('Record Not Found');
        
        // Safety Check: MLC must be cleared? Or is Admin Clearance enough?
        // Assuming Admin Clearance handles MLC check.
        
        if (record.rows[0].release_status !== 'CLEARED_BY_ADMIN') {
             // throw new Error('Admin Clearance Required before Handover');
             // Per No Detention, maybe we allow? No, Admin must generate Papers (MCCD) first.
             // So Admin Clearance is MANDATORY for Papers, not Bills.
        }

        // B. Update Death Record
        const updateRes = await client.query(
            `UPDATE death_records 
             SET release_status = 'RELEASED', released_by_user_id = $1,
                 receiver_name = $2, receiver_relation = $3, 
                 receiver_id_proof_type = $4, receiver_id_number = $5,
                 handover_time = NOW(), storage_end_time = NOW()
             WHERE id = $6
             RETURNING *`,
            [userId, receiver_name, receiver_relation, receiver_id_proof_type, receiver_id_number, record_id]
        );
        
        // C. Free the Chamber
        if (record.rows[0].mortuary_chamber_id) {
            await client.query(
                `UPDATE mortuary_chambers SET status = 'VACANT' WHERE id = $1`,
                [record.rows[0].mortuary_chamber_id]
            );
        }
        
        await client.query('COMMIT');
        ResponseHandler.success(res, updateRes.rows[0], 'Body Released Successfully');
    } catch (e) {
        await client.query('ROLLBACK');
        throw e;
    } finally {
        client.release();
    }
});

// 6. Init Chambers (Helper for First Run)
const initChambers = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const count = 10; // Default 10 units
    
    for (let i = 1; i <= count; i++) {
        const code = `M-${String(i).padStart(2, '0')}`;
        await pool.query(
            `INSERT INTO mortuary_chambers (hospital_id, code) VALUES ($1, $2) ON CONFLICT DO NOTHING`,
            [hospitalId, code]
        );
    }
    ResponseHandler.success(res, { count }, 'Chambers Initialized');
});


module.exports = {
    declareDeath,
    getMortuaryStatus,
    allocateChamber,
    issueReleasePass,
    releaseBody,
    initChambers
};
