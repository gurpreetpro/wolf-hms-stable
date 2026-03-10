const { pool } = require('../db');
const { sendSMS, sendWhatsApp } = require('../services/notificationService');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

// Register Patient & Create OPD Visit - MULTI-TENANT
const registerOPD = asyncHandler(async (req, res) => {
    const { name, dob, gender, phone, complaint, doctor_id, abha_id } = req.body;
    const hospitalId = req.hospital_id;
    console.log(`[DEBUG] registerOPD - Phone: ${phone}, Name: ${name}, Hospital: ${hospitalId}`);

    // Check if patient exists by phone IN THIS HOSPITAL
    let patientRes = await pool.query('SELECT * FROM patients WHERE phone = $1 AND hospital_id = $2', [phone, hospitalId]);
    let patientId;
    
    if (patientRes.rows.length > 0) {
        const existingPatient = patientRes.rows.find(p => p.name.toLowerCase() === name.toLowerCase());
        if (existingPatient) { 
            patientId = existingPatient.id; 
        } else { 
            return ResponseHandler.error(res, `Phone number ${phone} is already registered to ${patientRes.rows[0].name}. Please use a different number.`, 400); 
        }
    } else {
        // [G2.1] Enhanced Duplicate Detection — check name+DOB and name+gender+partial-phone
        const fuzzyCheck = await pool.query(
            `SELECT id, name, phone, uhid, dob, gender FROM patients 
             WHERE hospital_id = $1 AND deleted_at IS NULL AND (
                (LOWER(name) = LOWER($2) AND dob = $3)
                OR (LOWER(name) = LOWER($2) AND gender = $4 AND phone LIKE '%' || RIGHT($5, 4))
             ) LIMIT 5`,
            [hospitalId, name, dob || null, gender || null, phone || '']
        );

        // If potential duplicates found AND caller hasn't confirmed override
        if (fuzzyCheck.rows.length > 0 && !req.body.confirm_not_duplicate) {
            return ResponseHandler.success(res, {
                potentialDuplicates: fuzzyCheck.rows,
                message: 'Potential duplicate patients found. Set confirm_not_duplicate=true to proceed.'
            }, 'Duplicate check warning', 200);
        }

        // Get hospital details & settings
        const hospitalRes = await pool.query('SELECT code, settings FROM hospitals WHERE id = $1', [hospitalId]);
        const hospitalCode = hospitalRes.rows[0]?.code?.toUpperCase() || 'HMS';
        const settings = hospitalRes.rows[0]?.settings || {};
        
        // [NEW] Customizable UHID Logic
        const uhidConfig = settings.uhid_format || {};
        const prefix = uhidConfig.prefix || hospitalCode; // Default to Hospital Code
        const separator = uhidConfig.separator || '-';
        const suffixType = uhidConfig.suffix || 'YEAR'; // YEAR, NONE
        const seqLength = parseInt(uhidConfig.length) || 4;
        const startSequence = parseInt(uhidConfig.start_sequence) || 1; // [NEW] Custom starting number
        
        const currentYear = new Date().getFullYear();
        // Suffix logic: Standard is /YEAR. If config says YEAR, we append /+Year.
        // If config says NONE, we append nothing.
        const suffix = suffixType === 'YEAR' ? `/${currentYear}` : ''; 
        
        // Pattern for Search: PREFIX[SEP]%%%%%[SUFFIX]
        // Example: KOK-%%%%%/2026
        const searchPattern = `${prefix}${separator}%${suffix}`;
        
        // [GAP FILLING LOGIC] Reuse deleted UHIDs
        const allUhidsRes = await pool.query(
            "SELECT uhid FROM patients WHERE uhid LIKE $1 AND hospital_id = $2", 
            [searchPattern, hospitalId]
        );

        const usedSeqs = allUhidsRes.rows.map(r => {
            // Parse sequence based on expected format
            // Format: PREFIX-SEQ/SUFFIX
            // We strip Prefix+Sep from start, and Suffix from end
            let core = r.uhid;
            if (core.startsWith(`${prefix}${separator}`)) {
                core = core.substring(prefix.length + separator.length);
            }
            if (suffix && core.endsWith(suffix)) {
                core = core.substring(0, core.length - suffix.length);
            }
            // What remains should be the number
            return parseInt(core, 10);
        }).filter(n => !isNaN(n)).sort((a, b) => a - b);

        // [UPDATED] Start from configured start_sequence instead of 1
        let nextSeq = startSequence;
        for (const seq of usedSeqs) {
            if (seq === nextSeq) {
                nextSeq++;
            } else if (seq > nextSeq) {
                // Gap found! nextSeq is available
                break;
            }
        }
        
        const nextUhid = `${prefix}${separator}${String(nextSeq).padStart(seqLength, '0')}${suffix}`;

        // [G1.2] Check ABHA duplicate before creating patient
        if (abha_id) {
            const abhaCheck = await pool.query(
                'SELECT id, name, uhid FROM patients WHERE abha_id = $1 AND hospital_id = $2',
                [abha_id, hospitalId]
            );
            if (abhaCheck.rows.length > 0) {
                return ResponseHandler.error(res, `ABHA ID ${abha_id} is already registered to ${abhaCheck.rows[0].name} (${abhaCheck.rows[0].uhid})`, 400);
            }
        }

        // Create new patient (WITH hospital_id, uhid, and abha_id)
        const newPatient = await pool.query(
            'INSERT INTO patients (name, dob, gender, phone, history_json, hospital_id, uhid, abha_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, uhid, abha_id', 
            [name, dob || null, gender, phone, JSON.stringify({ complaint }), hospitalId, nextUhid, abha_id || null]
        );
        patientId = newPatient.rows[0].id;

        // [ENTERPRISE] EMPI Integration
        try {
            const EmpiService = require('../services/EmpiService');
            const names = name.split(' ');
            const firstName = names[0];
            const lastName = names.length > 1 ? names.slice(1).join(' ') : '';
            // Run asynchronously to not block response
            EmpiService.processPatientRegistration({
                id: patientId,
                first_name: firstName,
                last_name: lastName,
                phone: phone,
                date_of_birth: dob ? new Date(dob) : new Date(), 
                gender: gender
            }, hospitalId).catch(err => console.error('[EMPI] Async Error:', err));
        } catch (empiError) {
            console.error('[EMPI] Failed to init registration:', empiError);
        }
    }
    
    // Fetch full patient data (including UHID) for response
    const fullPatientRes = await pool.query('SELECT id, name, phone, uhid, dob, gender, abha_id FROM patients WHERE id = $1', [patientId]);
    const fullPatient = fullPatientRes.rows[0] || { id: patientId, name, phone };
    
    const docId = doctor_id || 2;
    // Verify doctor belongs to hospital? ideally yes.
    // Fetch doctor details INCLUDING consultation fee
    const docRes = await pool.query('SELECT username, department, consultation_fee FROM users WHERE id = $1', [docId]);
    const department = docRes.rows[0]?.department || 'General Medicine';
    const doctorName = docRes.rows[0]?.username || 'Doctor';
    const doctorConsultationFee = parseFloat(docRes.rows[0]?.consultation_fee) || 500;
    
    // Get next token for today (Scoped to hospital)
    const tokenRes = await pool.query(
        `SELECT MAX(v.token_number) as max_token 
            FROM opd_visits v 
            JOIN users u ON v.doctor_id = u.id 
            WHERE v.visit_date = CURRENT_DATE AND u.department = $1 AND v.hospital_id = $2`, 
        [department, hospitalId]
    );
    const nextToken = (tokenRes.rows[0].max_token || 0) + 1;
    
    const consultation_type = req.body.consultation_type || 'in-person';

    // [FIX] IDEMPOTENCY CHECK: multiple clicks from frontend shouldn't create multiple visits
    const existingVisit = await pool.query(
        "SELECT * FROM opd_visits WHERE patient_id = $1 AND doctor_id = $2 AND visit_date = CURRENT_DATE AND hospital_id = $3",
        [patientId, docId, hospitalId]
    );

    if (existingVisit.rows.length > 0) {
        // Return existing visit instead of creating duplicate
        const visit = existingVisit.rows[0];
        
        // Return full response as if it was just created (200 OK)
        return ResponseHandler.success(res, { 
            patient: fullPatient, 
            visit: { ...visit, doctor_name: doctorName }, 
            token: visit.token_number,
            payment: null, // Don't process payment again
            isDuplicate: true,
            message: 'Appointment already exists for today'
        }, 'Appointment already exists for today details fetched.', 200);   
    }
    
    // Create visit (WITH hospital_id)
    const visit = await pool.query(
        'INSERT INTO opd_visits (patient_id, doctor_id, token_number, status, consultation_type, hospital_id, complaint) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *', 
        [patientId, docId, nextToken, 'Waiting', consultation_type, hospitalId, complaint]
    );
    
    // Process payment if provided - NOW CREATES INVOICE TOO
    let paymentRecord = null;
    let invoiceId = null;
    if (req.body.paymentDetails) {
        const { amount, mode, transactionId } = req.body.paymentDetails;
        if (mode && mode.toLowerCase() !== 'free' && parseFloat(amount) > 0) {
            
            // [PHASE 6] OPD Insurance Warning
            // If patient is insured but paying cash, we might want to alert (or just log)
             try {
                const InsuranceWorkflowService = require('../services/insurance/InsuranceWorkflowService');
                const policy = await InsuranceWorkflowService.checkCoverage(patientId);
                if (policy) {
                    console.log(`[OPD] ⚠️ Insured Patient ${patientId} is paying CASH/UPI.`);
                    // We could potentially set invoice to 'Claimable' if mode was 'Insurance'
                }
            } catch (e) { /* Ignore */ }

            // [BILLING UNIFICATION] Create invoice via billingService
            const { addToInvoice, recordPayment } = require('../services/billingService');
            const description = `OPD Consultation - Dr. ${doctorName}${req.body.department ? ` (${req.body.department})` : ''}`;
            invoiceId = await addToInvoice(
                patientId, 
                null,  // No admission for OPD
                description,
                1, 
                parseFloat(amount), 
                req.user?.id, 
                hospitalId
            );
            
            // Record payment with invoice link (Auto-updates invoice status)
            paymentRecord = await recordPayment({
                invoice_id: invoiceId,
                patient_id: patientId,
                amount: parseFloat(amount),
                payment_mode: mode,
                transaction_id: transactionId || null,
                created_by: req.user ? req.user.id : null,
                hospital_id: hospitalId,
                visit_id: visit.rows[0].id,
                notes: 'OPD Registration Payment'
            });
        }
    }
    
    // Log vitals if provided (Can add hospital_id if vitals logs table has it? Assuming implicit link via patient)
    if (req.body.vitals) {
        const { bp, temp, weight, spo2, heart_rate } = req.body.vitals;
        if (bp || temp || weight || spo2 || heart_rate) { 
            await pool.query(
                'INSERT INTO vitals_logs (patient_id, bp, temp, spo2, heart_rate, recorded_by) VALUES ($1, $2, $3, $4, $5, $6)', 
                [patientId, bp, temp, spo2, heart_rate, req.user ? req.user.id : null]
            ); 
        }
    }
    
    if (req.io) req.io.emit('opd_update', { type: 'registration', patient_id: patientId, hospital_id: hospitalId });
    
    // Send notifications
    const smsMessage = `Welcome to WOLF HMS. Your appointment with Dr. ${doctorName} is confirmed. Token: ${nextToken}.`;
    sendSMS(phone, smsMessage).catch(console.error);
    sendWhatsApp(phone, `Welcome to WOLF HMS! 🏥\n\nYour appointment is confirmed.\nToken: *${nextToken}*\nDoctor: Dr. ${doctorName}\n\nPlease arrive 15 mins early.`).catch(console.error);
    
    // Return full patient data including UHID
    ResponseHandler.success(res, { 
        patient: fullPatient, 
        visit: { ...visit.rows[0], doctor_name: doctorName }, 
        token: nextToken, 
        payment: paymentRecord 
    }, 'Patient registered successfully', 201);
});

// Cancel Visit - PRODUCTION SAFE
const cancelVisit = asyncHandler(async (req, res) => {
    const { visit_id } = req.body;

    const hospitalId = req.hospital_id;
    const result = await pool.query(
        "UPDATE opd_visits SET status = 'Cancelled' WHERE id = $1 AND hospital_id = $2 RETURNING *", 
        [visit_id, hospitalId]
    );
    if (result.rows.length === 0) return ResponseHandler.error(res, 'Visit not found', 404);
    
    let refundResult = null;
    if (req.body.refundDetails) {
        const { amount, reason } = req.body.refundDetails;
        const payCheck = await pool.query('SELECT * FROM payments WHERE visit_id = $1', [visit_id]);
        if (payCheck.rows.length > 0) {
            const originalPayment = payCheck.rows[0]; 
            const refundAmount = parseFloat(amount || 0);
            let newStatus = 'Refunded'; 
            if (refundAmount === 0) newStatus = 'Forfeited'; 
            else if (refundAmount < parseFloat(originalPayment.amount)) newStatus = 'Partially Refunded';
            const payUpdate = await pool.query(
                `UPDATE payments SET refund_amount = $1, refund_reason = $2, refund_date = CURRENT_TIMESTAMP, status = $3 WHERE visit_id = $4 RETURNING *`, 
                [refundAmount, reason || 'Cancellation Refund', newStatus, visit_id]
            );
            refundResult = payUpdate.rows[0];
        }
    }
    if (req.io) req.io.emit('opd_update', { type: 'cancellation', visit_id });
    ResponseHandler.success(res, { visit: result.rows[0], refund: refundResult }, 'Appointment cancelled successfully');
});

// Get OPD Queue - MULTI-TENANT
// Get OPD Queue - MULTI-TENANT
const getQueue = asyncHandler(async (req, res) => {
    const hospitalId = req.hospital_id;
    
    // [FIX] DATA LEAK: Doctors should only see their own patients
    // Receptions/Admins can see all
    let query = `
        SELECT v.*, p.name as patient_name, p.phone, p.uhid, p.gender, p.dob, u.department 
        FROM opd_visits v 
        JOIN patients p ON v.patient_id = p.id 
        JOIN users u ON v.doctor_id = u.id
        WHERE v.visit_date = CURRENT_DATE 
            AND v.status != 'Completed' 
            AND v.status != 'Cancelled' 
            AND v.status != 'Rescheduled'
            AND v.hospital_id = $1
    `;
    const params = [hospitalId];

    if (req.user && req.user.role === 'doctor') {
        query += ` AND v.doctor_id = $2`;
        params.push(req.user.id);
        console.log(`[OPD] Filtering queue for Doctor ${req.user.username} (ID: ${req.user.id})`);
    }

    query += ` ORDER BY v.token_number ASC`;

    const result = await pool.query(query, params);
    ResponseHandler.success(res, result.rows);
});

// Create Demo Patient - MULTI-TENANT
const createDemoPatient = asyncHandler(async (req, res) => {
    const hospitalId = req.hospital_id;

    const demoId = Date.now().toString().slice(-6);
    const demoNames = ['John Smith', 'Sarah Johnson', 'Michael Chen', 'Emily Davis', 'David Wilson'];
    const randomName = demoNames[Math.floor(Math.random() * demoNames.length)];
    const randomAge = 25 + Math.floor(Math.random() * 50);
    const randomGender = Math.random() > 0.5 ? 'Male' : 'Female';
    
    // Get hospital code and settings for UHID
    const hospitalRes = await pool.query('SELECT code, settings FROM hospitals WHERE id = $1', [hospitalId]);
    const hospitalCode = hospitalRes.rows[0]?.code?.toUpperCase() || 'HMS';
    const settings = hospitalRes.rows[0]?.settings || {};
    
    // [UPDATED] Use hospital-level UHID config like registerOPD
    const uhidConfig = settings.uhid_format || {};
    const prefix = uhidConfig.prefix || hospitalCode;
    const separator = uhidConfig.separator || '-';
    const suffixType = uhidConfig.suffix || 'YEAR';
    const seqLength = parseInt(uhidConfig.length) || 4;
    const startSequence = parseInt(uhidConfig.start_sequence) || 1;
    
    const currentYear = new Date().getFullYear();
    const suffix = suffixType === 'YEAR' ? `/${currentYear}` : '';
    const searchPattern = `${prefix}${separator}%${suffix}`;
    
    // Get max UHID for THIS hospital only
    const maxUhidRes = await pool.query(
        "SELECT uhid FROM patients WHERE uhid LIKE $1 AND hospital_id = $2", 
        [searchPattern, hospitalId]
    );
    
    // Parse used sequences
    const usedSeqs = maxUhidRes.rows.map(r => {
        let core = r.uhid;
        if (core.startsWith(`${prefix}${separator}`)) {
            core = core.substring(prefix.length + separator.length);
        }
        if (suffix && core.endsWith(suffix)) {
            core = core.substring(0, core.length - suffix.length);
        }
        return parseInt(core, 10);
    }).filter(n => !isNaN(n)).sort((a, b) => a - b);
    
    // Find next available sequence starting from startSequence
    let nextSeq = startSequence;
    for (const seq of usedSeqs) {
        if (seq === nextSeq) nextSeq++;
        else if (seq > nextSeq) break;
    }
    const nextUhid = `${prefix}${separator}${String(nextSeq).padStart(seqLength, '0')}${suffix}`;

    const patientResult = await pool.query(
        `INSERT INTO patients (name, dob, gender, phone, history_json, hospital_id, uhid) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`, 
        [`${randomName} (Demo)`, new Date(new Date().getFullYear() - randomAge, 0, 1), randomGender, `DEMO-${demoId}`, JSON.stringify({ isDemo: true, complaint: 'Fever, headache, fatigue', allergies: ['Penicillin'], createdAt: new Date().toISOString() }), hospitalId, nextUhid]
    );
    const patient = patientResult.rows[0];
    
    // Find a doctor in THIS hospital's General Medicine department
    const tokenRes = await pool.query(
        `SELECT MAX(v.token_number) as max_token FROM opd_visits v JOIN users u ON v.doctor_id = u.id WHERE v.visit_date = CURRENT_DATE AND u.department = 'General Medicine' AND v.hospital_id = $1`,
        [hospitalId]
    );
    const nextToken = (tokenRes.rows[0].max_token || 0) + 1;
    
    // Find a doctor to assign (fallback to first available doctor in department for this hospital?)
    // Assuming doctor_id 2 exists is dangerous. Let's find a valid doctor.
    const docRes = await pool.query(
        "SELECT id FROM users WHERE department = 'General Medicine' AND hospital_id = $1 LIMIT 1",
        [hospitalId]
    );
    const docId = docRes.rows[0]?.id || 2; // Fallback to 2 if none found (legacy)

    const visitResult = await pool.query(
        'INSERT INTO opd_visits (patient_id, doctor_id, token_number, status, hospital_id) VALUES ($1, $2, $3, $4, $5) RETURNING *', 
        [patient.id, docId, nextToken, 'Waiting', hospitalId]
    );
    
    await pool.query(
        'INSERT INTO vitals_logs (patient_id, bp, temp, spo2, heart_rate, recorded_by) VALUES ($1, $2, $3, $4, $5, $6)', 
        [patient.id, '120/80', '98.6', 97, 72, req.user?.id || null]
    );
    
    if (req.io) { 
        req.io.emit('opd_update', { type: 'demo_registration', patient_id: patient.id, hospital_id: hospitalId }); 
    }
    
    ResponseHandler.success(res, { 
        id: patient.id, 
        name: patient.name, 
        age: randomAge, 
        gender: randomGender, 
        phone: patient.phone, 
        token: nextToken, 
        visit: visitResult.rows[0], 
    }, 'Demo patient created!', 201);
});

// Reset Demo - MULTI-TENANT
const resetDemo = asyncHandler(async (req, res) => {
    const { patientId } = req.body;
    const hospitalId = req.hospital_id;

    if (patientId) {
        // Verify ownership first
        const check = await pool.query('SELECT id FROM patients WHERE id = $1 AND hospital_id = $2', [patientId, hospitalId]);
        if (check.rows.length === 0) return ResponseHandler.error(res, 'Patient not found or access denied', 404);

        await pool.query('DELETE FROM vitals_logs WHERE patient_id = $1', [patientId]);
        await pool.query('DELETE FROM care_tasks WHERE admission_id IN (SELECT id FROM admissions WHERE patient_id = $1)', [patientId]);
        await pool.query('DELETE FROM care_tasks WHERE patient_id = $1', [patientId]);
        await pool.query('DELETE FROM lab_requests WHERE patient_id = $1', [patientId]);
        await pool.query('DELETE FROM admissions WHERE patient_id = $1', [patientId]);
        await pool.query('DELETE FROM opd_visits WHERE patient_id = $1', [patientId]);
        await pool.query('DELETE FROM patients WHERE id = $1', [patientId]);
    } else {
        // Bulk delete demo users for THIS hospital
        await pool.query(`DELETE FROM vitals_logs WHERE patient_id IN (SELECT id FROM patients WHERE phone LIKE 'DEMO-%' AND hospital_id = $1)`, [hospitalId]);
        await pool.query(`DELETE FROM care_tasks WHERE admission_id IN (SELECT a.id FROM admissions a JOIN patients p ON a.patient_id = p.id WHERE p.phone LIKE 'DEMO-%' AND p.hospital_id = $1)`, [hospitalId]);
        await pool.query(`DELETE FROM care_tasks WHERE patient_id IN (SELECT id FROM patients WHERE phone LIKE 'DEMO-%' AND hospital_id = $1)`, [hospitalId]);
        await pool.query(`DELETE FROM lab_requests WHERE patient_id IN (SELECT id FROM patients WHERE phone LIKE 'DEMO-%' AND hospital_id = $1)`, [hospitalId]);
        await pool.query(`DELETE FROM admissions WHERE patient_id IN (SELECT id FROM patients WHERE phone LIKE 'DEMO-%' AND hospital_id = $1)`, [hospitalId]);
        await pool.query(`DELETE FROM opd_visits WHERE patient_id IN (SELECT id FROM patients WHERE phone LIKE 'DEMO-%' AND hospital_id = $1)`, [hospitalId]);
        await pool.query(`DELETE FROM patients WHERE phone LIKE 'DEMO-%' AND hospital_id = $1`, [hospitalId]);
    }
    ResponseHandler.success(res, null, 'Demo data reset successfully');
});

// Reschedule Visit - PRODUCTION SAFE
const rescheduleVisit = asyncHandler(async (req, res) => {
    const { visit_id, new_doctor_id, reason, new_date } = req.body;
    const targetDate = new_date || new Date().toISOString().split('T')[0];
    const client = await pool.connect();
    
    try {
        await client.query('BEGIN');
        
        const oldVisitRes = await client.query(
            `SELECT v.*, p.name as patient_name, p.phone as patient_phone FROM opd_visits v JOIN patients p ON v.patient_id = p.id WHERE v.id = $1 AND v.hospital_id = $2`, 
            [visit_id, req.hospital_id]
        );
        if (oldVisitRes.rows.length === 0) { 
            await client.query('ROLLBACK'); 
            return ResponseHandler.error(res, 'Visit not found', 404);
        }
        const oldVisit = oldVisitRes.rows[0];
        
        const docRes = await client.query('SELECT username, department FROM users WHERE id = $1', [new_doctor_id]);
        if (docRes.rows.length === 0) { 
            await client.query('ROLLBACK'); 
            return ResponseHandler.error(res, 'Doctor not found', 404);
        }
        const doctor = docRes.rows[0]; 
        const department = doctor.department || 'General Medicine';
        
        const tokenRes = await client.query(
            `SELECT MAX(v.token_number) as max_token FROM opd_visits v JOIN users u ON v.doctor_id = u.id WHERE v.visit_date = $1 AND u.department = $2`, 
            [targetDate, department]
        );
        const nextToken = (tokenRes.rows[0].max_token || 0) + 1;
        
        const newVisitRes = await client.query(
            'INSERT INTO opd_visits (patient_id, doctor_id, token_number, status, visit_date, hospital_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING *', 
            [oldVisit.patient_id, new_doctor_id, nextToken, 'Waiting', targetDate, req.hospital_id]
        );
        const newVisit = newVisitRes.rows[0];
        
        await client.query("UPDATE opd_visits SET status = 'Rescheduled' WHERE id = $1", [visit_id]);
        
        const payUpdate = await client.query(
            `UPDATE payments SET visit_id = $1, notes = COALESCE(notes, '') || ' [Rescheduled from Visit #${visit_id}: ${reason}]' WHERE visit_id = $2 RETURNING *`, 
            [newVisit.id, visit_id]
        );
        
        await client.query('COMMIT');
        
        const message = `Dear ${oldVisit.patient_name}, your appointment has been rescheduled to ${targetDate} with Dr. ${doctor.username}. Your Token is ${nextToken}.`;
        sendSMS(oldVisit.patient_phone, message).catch(console.error);
        
        if (req.io) req.io.emit('opd_update', { type: 'reschedule', old_visit: visit_id, new_visit: newVisit.id });
        
        ResponseHandler.success(res, { 
            old_visit_id: visit_id, 
            new_visit: newVisit, 
            payment_transfer: payUpdate.rowCount > 0, 
            notification_sent: true 
        }, 'Appointment rescheduled successfully');

    } catch (error) { 
        await client.query('ROLLBACK'); 
        console.error(error); 
        throw error; // Let asyncHandler handle it
    } finally { 
        client.release(); 
    }
});

// Get Appointments - MULTI-TENANT
const getAppointments = asyncHandler(async (req, res) => {
    const { start, end, doctor_id } = req.query;
    const hospitalId = req.hospital_id;
    let query = `SELECT v.*, p.name as patient_name, p.phone, u.username as doctor_name FROM opd_visits v JOIN patients p ON v.patient_id = p.id JOIN users u ON v.doctor_id = u.id WHERE v.hospital_id = $1`;
    const params = [hospitalId];
    
    if (start) { 
        params.push(start); 
        query += ` AND v.visit_date >= $${params.length}`; 
    }
    if (end) { 
        params.push(end); 
        query += ` AND v.visit_date <= $${params.length}`; 
    }
    if (doctor_id) { 
        params.push(doctor_id); 
        query += ` AND v.doctor_id = $${params.length}`; 
    }
    
    const { rows } = await pool.query(query, params);
    ResponseHandler.success(res, rows);
});

// Upload Document - PRODUCTION SAFE
const uploadDocument = asyncHandler(async (req, res) => {
    if (!req.file) return ResponseHandler.error(res, 'No file uploaded', 400);

    const { patient_id, document_type } = req.body;
    const result = await pool.query(
        `INSERT INTO patient_documents (patient_id, document_type, file_path, original_name) VALUES ($1, $2, $3, $4) RETURNING *`, 
        [patient_id, document_type, req.file.path, req.file.originalname]
    );
    ResponseHandler.success(res, { document: result.rows[0] }, 'Document uploaded successfully', 201);
});

module.exports = { registerOPD, getQueue, createDemoPatient, resetDemo, cancelVisit, rescheduleVisit, getAppointments, uploadDocument };
