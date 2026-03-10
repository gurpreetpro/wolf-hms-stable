const express = require('express');
const router = express.Router();
const { searchPatients, getPatientById, updatePatient } = require('../controllers/patientController');
const { protect } = require('../middleware/authMiddleware');
const db = require('../db');
const whatsappService = require('../services/whatsappService');

// ====== PATIENT APP ENDPOINTS (Public - No Auth Required) ======
// IMPORTANT: These must come BEFORE the /:id wildcard route!

// Get doctors list for patient app
router.get('/doctors', async (req, res) => {
    try {
        // Use simpler query that works with core columns
        const result = await db.pool.query(`
            SELECT id, 
                   COALESCE(name, username) as name,
                   COALESCE(specialization, 'General') as specialty,
                   department,
                   500 as fee,
                   4.5 as rating,
                   gender
            FROM users 
            WHERE role = 'doctor'
            ORDER BY name
        `);
        console.log('📱 Doctors API called, found:', result.rows.length, 'doctors');
        res.json({ success: true, doctors: result.rows });
    } catch (error) {
        console.error('Get doctors error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get available time slots for a specific doctor
router.get('/doctor-slots/:doctorId', async (req, res) => {
    try {
        const { doctorId } = req.params;
        const { date } = req.query; // Format: YYYY-MM-DD
        
        // Get the day of week (0=Sunday, 1=Monday, etc.)
        const targetDate = date ? new Date(date) : new Date();
        const dayOfWeek = targetDate.getDay();
        
        // Get doctor's slots for this day
        const slotsResult = await db.pool.query(`
            SELECT id, day_of_week, start_time, end_time, slot_duration_minutes, max_patients
            FROM doctor_slots 
            WHERE doctor_id = $1 AND day_of_week = $2 AND is_active = true
            ORDER BY start_time
        `, [doctorId, dayOfWeek]);
        
        // Get already booked slots for this doctor on this date
        const bookedResult = await db.pool.query(`
            SELECT token_number, created_at
            FROM opd_visits 
            WHERE doctor_id = $1 AND DATE(visit_date) = $2
        `, [doctorId, date || new Date().toISOString().split('T')[0]]);
        
        const bookedCount = bookedResult.rows.length;
        
        // Generate available time slots
        const availableSlots = [];
        for (const slot of slotsResult.rows) {
            const startTime = slot.start_time;
            const endTime = slot.end_time;
            const duration = slot.slot_duration_minutes || 30;
            const maxPatients = slot.max_patients || 10;
            
            // Calculate available slots
            const remainingSlots = Math.max(0, maxPatients - bookedCount);
            
            availableSlots.push({
                startTime: startTime,
                endTime: endTime,
                duration: duration,
                availableSlots: remainingSlots,
                maxPatients: maxPatients
            });
        }
        
        // If no configured slots, return default slots
        if (availableSlots.length === 0) {
            const defaultSlots = [
                { startTime: '09:00', endTime: '12:00', availableSlots: 10, maxPatients: 10 },
                { startTime: '16:00', endTime: '19:00', availableSlots: 10, maxPatients: 10 }
            ];
            res.json({
                success: true,
                doctorId,
                date: date || new Date().toISOString().split('T')[0],
                dayOfWeek,
                slots: defaultSlots,
                bookedCount: bookedCount,
                isDefaultSlots: true
            });
            return;
        }
        
        console.log('📅 Doctor slots API called for doctor:', doctorId, 'Date:', date);
        
        res.json({
            success: true,
            doctorId,
            date: date || new Date().toISOString().split('T')[0],
            dayOfWeek,
            slots: availableSlots,
            bookedCount: bookedCount
        });
    } catch (error) {
        console.error('Get doctor slots error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Check if patient exists by phone (for login flow)
router.get('/check-patient', async (req, res) => {
    try {
        const { phone } = req.query;
        
        if (!phone) {
            return res.status(400).json({ success: false, error: 'Phone required' });
        }
        
        const result = await db.pool.query(
            'SELECT id, name, phone, dob, gender, address, history_json FROM patients WHERE phone = $1',
            [phone]
        );
        
        if (result.rows.length > 0) {
            const p = result.rows[0];
            // Calculate age from DOB
            let age = null;
            if (p.dob) {
                const birthDate = new Date(p.dob);
                const today = new Date();
                age = today.getFullYear() - birthDate.getFullYear();
                const m = today.getMonth() - birthDate.getMonth();
                if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
                    age--;
                }
            }
            // Extract blood group
            const bloodGroup = p.history_json?.blood_group || null;

            console.log('📱 Patient found:', p.name);
            res.json({ 
                success: true, 
                exists: true, 
                patient: {
                    ...p,
                    age,
                    blood_group: bloodGroup,
                    email: null // Email removed from system
                }
            });
        } else {
            console.log('📱 Patient not found for phone:', phone);
            res.json({ success: true, exists: false });
        }
    } catch (error) {
        console.error('Check patient error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Register new patient from mobile app
router.post('/register', async (req, res) => {
    try {
        const { phone, name, age, gender, address, blood_group } = req.body;
        
        if (!phone || !name) {
            return res.status(400).json({ success: false, error: 'Phone and name are required' });
        }

        // Calculate DOB from Age (Approximate Jan 1st)
        let dob = null;
        if (age) {
            const currentYear = new Date().getFullYear();
            const birthYear = currentYear - parseInt(age);
            dob = new Date(birthYear, 0, 1); // Jan 1st of birth year
        }

        // Prepare history_json with blood_group
        const historyJson = {
            blood_group: blood_group,
            source: 'mobile_app_registration'
        };
        
        // Check if patient already exists
        const existingPatient = await db.pool.query(
            'SELECT id, history_json FROM patients WHERE phone = $1',
            [phone]
        );
        
        if (existingPatient.rows.length > 0) {
            // Merge new history with existing
            const existingHistory = existingPatient.rows[0].history_json || {};
            const updatedHistory = { ...existingHistory, ...historyJson };

            // Update existing patient
            const updateResult = await db.pool.query(`
                UPDATE patients SET 
                    name = $1,
                    dob = $2,
                    gender = $3,
                    address = $4,
                    history_json = $5,
                    updated_at = NOW()
                WHERE phone = $6
                RETURNING id, name, phone, dob, gender, address, history_json
            `, [name, dob, gender, address, updatedHistory, phone]);
            
            const p = updateResult.rows[0];
            console.log('📱 Patient updated:', p.name);
            res.json({
                success: true,
                patientId: p.id,
                patient: {
                    ...p,
                    age: age, // Return sent age
                    blood_group: blood_group
                },
                message: 'Profile updated successfully'
            });
        } else {
            // Insert new patient
            const insertResult = await db.pool.query(`
                INSERT INTO patients (phone, name, dob, gender, address, history_json, created_at)
                VALUES ($1, $2, $3, $4, $5, $6, NOW())
                RETURNING id, name, phone, dob, gender, address, history_json
            `, [phone, name, dob, gender, address, historyJson]);
            
            const p = insertResult.rows[0];
            console.log('📱 New patient registered:', p.name);
            res.json({
                success: true,
                patientId: p.id,
                patient: {
                    ...p,
                    age: age,
                    blood_group: blood_group
                },
                message: 'Registration successful'
            });
        }
    } catch (error) {
        console.error('Register patient error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== APPOINTMENT BOOKING (Critical for Wolf Care App) ====================

// Book a new appointment (creates OPD visit)
router.post('/book-appointment', async (req, res) => {
    try {
        const { patientPhone, doctorId, date, time, consultationType, notes } = req.body;
        
        console.log('📱 [BOOKING-DEBUG] Full request body:', JSON.stringify(req.body));
        console.log('📱 [BOOKING-DEBUG] patientPhone:', patientPhone, 'doctorId:', doctorId, 'date:', date);
        
        if (!patientPhone || !doctorId || !date) {
            return res.status(400).json({ 
                success: false, 
                error: 'Patient phone, doctor ID, and date are required' 
            });
        }
        
        // Find patient by phone
        const patientResult = await db.pool.query(
            'SELECT id, name FROM patients WHERE phone = $1',
            [patientPhone]
        );
        
        if (patientResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Patient not found' });
        }
        
        const patient = patientResult.rows[0];
        
        // Find doctor and verify - INCLUDE hospital_id for multi-tenancy
        const doctorResult = await db.pool.query(
            'SELECT id, full_name, name, username, department, hospital_id FROM users WHERE id = $1 AND role = $2',
            [doctorId, 'doctor']
        );
        
        if (doctorResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Doctor not found' });
        }
        
        const doctor = doctorResult.rows[0];
        const doctorName = doctor.full_name || doctor.name || `Dr. ${doctor.username}`;
        const hospitalId = doctor.hospital_id || 1; // Default to hospital 1 if not set
        
        console.log('📱 Doctor found:', { doctorId, doctorName, hospitalId });
        
        // Generate token number for the day
        const tokenResult = await db.pool.query(`
            SELECT COALESCE(MAX(token_number), 0) + 1 as next_token 
            FROM opd_visits 
            WHERE doctor_id = $1 AND DATE(visit_date) = $2
        `, [doctorId, date]);
        
        const tokenNumber = tokenResult.rows[0].next_token;
        
        // Map consultationType from app to database
        const dbConsultationType = consultationType === 'video' || consultationType === 'teleconsultation' 
            ? 'teleconsultation' 
            : 'in-person';
        
        // Create OPD visit WITH hospital_id for multi-tenancy
        const insertResult = await db.pool.query(`
            INSERT INTO opd_visits (
                patient_id, doctor_id, visit_date, token_number, 
                status, consultation_type, notes, created_at, hospital_id
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), $8)
            RETURNING id, token_number, status, visit_date, consultation_type
        `, [patient.id, doctorId, date, tokenNumber, 'Waiting', dbConsultationType, notes || 'Booked via Wolf Care App', hospitalId]);
        
        const booking = insertResult.rows[0];
        
        console.log('✅ Appointment booked:', {
            bookingId: booking.id,
            patient: patient.name,
            doctor: doctorName,
            token: tokenNumber,
            date: date,
            type: dbConsultationType
        });
        
        res.json({
            success: true,
            booking: {
                id: booking.id,
                token_number: booking.token_number, // snake_case for app
                status: booking.status,
                date: booking.visit_date,
                time: time || 'TBD',
                consultation_type: booking.consultation_type, // snake_case
                doctor_name: doctorName, // snake_case for app
                doctor_id: doctorId,
                patient_name: patient.name, // snake_case
                hospital_id: hospitalId
            },
            message: `Appointment booked! Token #${tokenNumber}`
        });
    } catch (error) {
        console.error('Book appointment error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get patient's appointments
router.get('/my-appointments', async (req, res) => {
    try {
        const { phone } = req.query;
        
        if (!phone) {
            return res.status(400).json({ success: false, error: 'Phone required' });
        }
        
        // Find patient
        const patientResult = await db.pool.query(
            'SELECT id, name FROM patients WHERE phone = $1',
            [phone]
        );
        
        if (patientResult.rows.length === 0) {
            return res.json({ success: true, appointments: [] });
        }
        
        const patient = patientResult.rows[0];
        
        // Get appointments with doctor info
        const appointmentsResult = await db.pool.query(`
            SELECT 
                ov.id,
                ov.token_number,
                ov.status,
                ov.visit_date,
                ov.consultation_type,
                ov.notes,
                ov.complaint,
                ov.created_at,
                u.id as doctor_id,
                COALESCE(u.full_name, u.name, 'Dr. ' || u.username) as doctor_name,
                COALESCE(u.specialization, u.department) as specialty,
                u.department
            FROM opd_visits ov
            LEFT JOIN users u ON ov.doctor_id = u.id
            WHERE ov.patient_id = $1
            ORDER BY ov.visit_date DESC, ov.token_number DESC
            LIMIT 50
        `, [patient.id]);
        
        console.log('📱 My appointments called for:', patient.name, '- found:', appointmentsResult.rows.length);

        // [FIX] Fetch prescriptions and diagnosis for these visits
        const appointments = [];
        for (const apt of appointmentsResult.rows) {
            // [FIX] Fetch Prescriptions (Try Master Record first -> Fallback to Care Tasks)
            let prescriptionId = null;
            let prescriptions = [];

            // 1. Try Master Record (Enabled for Home Orders)
            const masterRx = await db.pool.query(`
                SELECT id, medications, diagnosis 
                FROM prescriptions 
                WHERE visit_id = $1 
                LIMIT 1
            `, [apt.id]);

            if (masterRx.rows.length > 0) {
                const rxRow = masterRx.rows[0];
                prescriptionId = rxRow.id;
                try {
                    prescriptions = typeof rxRow.medications === 'string' 
                        ? JSON.parse(rxRow.medications) 
                        : rxRow.medications;
                } catch (e) { console.error('JSON Parse Error for Rx:', e); }
                
                // If diagnosis is missing in visit but present in Rx, use it
                if (!apt.diagnosis && rxRow.diagnosis) {
                    apt.diagnosis = rxRow.diagnosis;
                }
            } else {
                // 2. Fallback to Care Tasks (Legacy)
                const rxRes = await db.pool.query(`
                    SELECT description 
                    FROM care_tasks 
                    WHERE patient_id = $1 
                    AND type = 'Medication' 
                    AND DATE(created_at) = DATE($2)
                `, [patient.id, apt.visit_date]);
    
                prescriptions = rxRes.rows.map(r => {
                    const parts = r.description.split(' - ');
                    return {
                        name: parts[0] || r.description,
                        dose: parts[1] || '',
                        freq: parts[2] || ''
                    };
                });
            }

            // Get Diagnosis from Patient History (Best Effort matching)
            // Since diagnosis is stored in history_json.last_diagnosis, we can only reliably get the *latest* one
            // OR if we start storing diagnosis in opd_visits (which we should).
            // For now, let's look at the 'complaint' we just added to opd_visits, 
            // and if 'notes' contains "Diagnosis:", parse it. 
            // Or assume the app uses 'complaint' as 'Diagnosis' for now?
            // User said "could not see diagnosis instruction"
            
            // Let's create a synthesized object
            appointments.push({
                id: apt.id,
                token_number: apt.token_number, // snake_case
                status: apt.status,
                date: apt.visit_date,
                time: 'TBD', 
                consultation_type: apt.consultation_type, // snake_case
                doctor_id: apt.doctor_id, // snake_case
                doctor_name: apt.doctor_name, // snake_case - CRITICAL for UI
                specialty: apt.specialty,
                department: apt.department,
                notes: apt.notes,
                complaint: apt.complaint, // [NEW] Added field
                diagnosis: apt.diagnosis || (apt.notes ? (apt.notes.match(/Diagnosis: (.*)/)?.[1] || null) : null),
                prescription_id: prescriptionId, // [NEW] For Medicine Orders
                prescriptions: prescriptions, // [NEW] Added array
                created_at: apt.created_at // snake_case
            });
        }
        
        res.json({
            success: true,
            patient_name: patient.name, // snake_case for app
            appointments: appointments
        });
    } catch (error) {
        console.error('Get my appointments error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Cancel appointment (for patients from app)
router.post('/cancel-appointment/:appointmentId', async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { phone } = req.body;
        
        console.log('📱 Cancel appointment request:', { appointmentId, phone });
        
        // Update the visit status to Cancelled
        const result = await db.pool.query(`
            UPDATE opd_visits 
            SET status = 'Cancelled', notes = COALESCE(notes, '') || ' [Cancelled by patient via app]'
            WHERE id = $1
            RETURNING id, status, visit_date
        `, [appointmentId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Appointment not found' });
        }
        
        console.log('❌ Appointment cancelled:', appointmentId);
        
        res.json({
            success: true,
            appointment: result.rows[0],
            message: 'Appointment cancelled successfully'
        });
    } catch (error) {
        console.error('Cancel appointment error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Reschedule appointment
router.put('/reschedule/:appointmentId', async (req, res) => {
    try {
        const { appointmentId } = req.params;
        const { newDate, phone } = req.body;
        
        if (!newDate) {
            return res.status(400).json({ success: false, error: 'New date required' });
        }
        
        // Update the visit date
        const result = await db.pool.query(`
            UPDATE opd_visits 
            SET visit_date = $1, notes = COALESCE(notes, '') || ' [Rescheduled]'
            WHERE id = $2
            RETURNING id, visit_date, token_number
        `, [newDate, appointmentId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Appointment not found' });
        }
        
        console.log('📅 Appointment rescheduled:', appointmentId, 'to', newDate);
        
        res.json({
            success: true,
            appointment: result.rows[0],
            message: 'Appointment rescheduled successfully'
        });
    } catch (error) {
        console.error('Reschedule appointment error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get patient profile by phone
router.get('/profile', async (req, res) => {
    try {
        const { phone } = req.query;
        
        if (!phone) {
            return res.status(400).json({ success: false, error: 'Phone required' });
        }
        
        const result = await db.pool.query(`
            SELECT id, name, phone, dob, gender, address, history_json, created_at
            FROM patients 
            WHERE phone = $1
        `, [phone]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Patient not found' });
        }
        
        const p = result.rows[0];
        // Calculate age
        let age = null;
        if (p.dob) {
            const birthDate = new Date(p.dob);
            const today = new Date();
            age = today.getFullYear() - birthDate.getFullYear();
        }
        
        // Get stats
        const [appointmentsCount, labCount, prescriptionsCount] = await Promise.all([
            db.pool.query('SELECT COUNT(*) FROM opd_visits WHERE patient_id = $1', [p.id]),
            db.pool.query('SELECT COUNT(*) FROM lab_requests WHERE patient_id = $1', [p.id]),
            db.pool.query('SELECT COUNT(*) FROM prescriptions p JOIN opd_visits ov ON p.visit_id = ov.id WHERE ov.patient_id = $1', [p.id])
        ]);
        
        console.log('📱 Profile fetched for:', p.name);
        
        res.json({
            success: true,
            patient: {
                ...p,
                age,
                blood_group: p.history_json?.blood_group,
                email: null
            },
            stats: {
                appointments: parseInt(appointmentsCount.rows[0].count) || 0,
                labReports: parseInt(labCount.rows[0].count) || 0,
                medications: parseInt(prescriptionsCount.rows[0].count) || 0
            }
        });
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ====== APPOINTMENT MANAGEMENT ENDPOINTS ======
// NOTE: Duplicate /book-appointment, /my-appointments, and /reschedule routes removed - use ones above

// ====== LAB RESULTS ENDPOINTS (Public - For Patient App) ======

// Get patient's lab orders by phone or patient ID
router.get('/lab-orders', async (req, res) => {
    try {
        const { phone, patientId } = req.query;
        
        if (!phone && !patientId) {
            return res.status(400).json({ success: false, error: 'Phone or patientId required' });
        }
        
        // First find patient
        let patient;
        if (patientId) {
            const result = await db.pool.query('SELECT id, name, phone FROM patients WHERE id = $1', [patientId]);
            patient = result.rows[0];
        } else {
            const result = await db.pool.query('SELECT id, name, phone FROM patients WHERE phone = $1', [phone]);
            patient = result.rows[0];
        }
        
        if (!patient) {
            return res.json({ success: true, labOrders: [], message: 'No patient found' });
        }
        
        // Get lab requests for this patient
        const labOrders = await db.pool.query(`
            SELECT 
                lr.id,
                lr.test_name,
                lr.status,
                lr.requested_at,
                lr.sample_collected_at,
                lr.report_generated_at,
                lr.has_critical_value,
                lr.payment_status,
                u.name as doctor_name,
                CASE WHEN lres.id IS NOT NULL THEN true ELSE false END as has_results
            FROM lab_requests lr
            LEFT JOIN users u ON lr.doctor_id = u.id
            LEFT JOIN lab_results lres ON lres.request_id = lr.id
            WHERE lr.patient_id = $1
            ORDER BY lr.requested_at DESC
        `, [patient.id]);
        
        console.log('📱 Lab orders API called for', patient.name, '- found:', labOrders.rows.length);
        
        res.json({ 
            success: true, 
            patientName: patient.name,
            labOrders: labOrders.rows 
        });
    } catch (error) {
        console.error('Get lab orders error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Alias: lab-report for Wolf Care app compatibility (app calls /lab-report, we have /lab-results)
router.get('/lab-report/:orderId', async (req, res) => {
    try {
        const requestId = req.params.orderId;
        
        // Get lab request info
        const requestResult = await db.pool.query(`
            SELECT 
                lr.*,
                u.name as doctor_name,
                p.name as patient_name,
                p.phone as patient_phone
            FROM lab_requests lr
            LEFT JOIN users u ON lr.doctor_id = u.id
            LEFT JOIN patients p ON lr.patient_id = p.id
            WHERE lr.id = $1
        `, [requestId]);
        
        if (requestResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Lab report not found' });
        }
        
        const labRequest = requestResult.rows[0];
        
        // Get result if exists
        const resultResult = await db.pool.query(
            'SELECT * FROM lab_results WHERE request_id = $1', [requestId]
        );
        
        let results = null;
        if (resultResult.rows.length > 0) {
            results = resultResult.rows[0].result_json;
        }
        
        console.log('📱 Lab report API called for request:', requestId);
        
        res.json({
            success: true,
            report: {
                testName: labRequest.test_name,
                status: labRequest.status,
                hasCriticalValue: labRequest.has_critical_value,
                requestedAt: labRequest.requested_at,
                collectedAt: labRequest.sample_collected_at,
                reportedAt: labRequest.report_generated_at,
                doctorName: labRequest.doctor_name,
                patientName: labRequest.patient_name,
                results: results,
                pdfUrl: resultResult.rows[0]?.file_path || null
            }
        });
    } catch (error) {
        console.error('Get lab report error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get specific lab result with detailed interpretation
router.get('/lab-results/:requestId', async (req, res) => {
    try {
        const { requestId } = req.params;
        
        // Get lab request info
        const requestResult = await db.pool.query(`
            SELECT 
                lr.*,
                u.name as doctor_name,
                p.name as patient_name,
                p.phone as patient_phone
            FROM lab_requests lr
            LEFT JOIN users u ON lr.doctor_id = u.id
            LEFT JOIN patients p ON lr.patient_id = p.id
            WHERE lr.id = $1
        `, [requestId]);
        
        if (requestResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Lab request not found' });
        }
        
        const labRequest = requestResult.rows[0];
        
        // Get result if exists
        const resultResult = await db.pool.query(`
            SELECT * FROM lab_results WHERE request_id = $1
        `, [requestId]);
        
        let results = null;
        if (resultResult.rows.length > 0) {
            results = resultResult.rows[0].result_json;
        }
        
        console.log('📱 Lab result API called for request:', requestId);
        
        res.json({
            success: true,
            testName: labRequest.test_name,
            status: labRequest.status,
            hasCriticalValue: labRequest.has_critical_value,
            requestedAt: labRequest.requested_at,
            collectedAt: labRequest.sample_collected_at,
            reportedAt: labRequest.report_generated_at,
            doctorName: labRequest.doctor_name,
            patientName: labRequest.patient_name,
            results: results,
            pdfUrl: resultResult.rows[0]?.file_path || null
        });
    } catch (error) {
        console.error('Get lab result error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get lab report as printable HTML (for PDF export)
router.get('/lab-report/:requestId/html', async (req, res) => {
    try {
        const { requestId } = req.params;
        
        // Get lab request with patient/doctor info
        const requestResult = await db.pool.query(`
            SELECT 
                lr.id, lr.patient_id, lr.test_name, lr.status,
                lr.requested_at, lr.report_generated_at,
                lr.has_critical_value,
                p.name as patient_name, p.phone, p.age, p.gender,
                u.name as doctor_name
            FROM lab_requests lr
            LEFT JOIN patients p ON lr.patient_id = p.id
            LEFT JOIN users u ON lr.doctor_id = u.id
            WHERE lr.id = $1
        `, [requestId]);
        
        if (requestResult.rows.length === 0) {
            return res.status(404).send('Lab report not found');
        }
        
        const report = requestResult.rows[0];
        
        // Get results
        const resultResult = await db.pool.query(`
            SELECT result_json FROM lab_results WHERE request_id = $1
        `, [requestId]);
        
        const resultJson = resultResult.rows[0]?.result_json || {};
        const parameters = resultJson.parameters || [];
        
        // Generate HTML report
        const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Lab Report - ${report.test_name}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; background: #f8fafc; }
        .report { background: white; max-width: 800px; margin: 0 auto; padding: 40px; border-radius: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
        .header { text-align: center; margin-bottom: 30px; border-bottom: 3px solid #10B981; padding-bottom: 20px; }
        .header h1 { color: #0d3d56; font-size: 28px; }
        .header .hospital { color: #10B981; font-size: 14px; margin-top: 5px; }
        .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
        .info-box { background: #f0fdf4; padding: 15px; border-radius: 8px; }
        .info-box label { color: #64748b; font-size: 12px; display: block; margin-bottom: 4px; }
        .info-box span { color: #0f172a; font-weight: 600; font-size: 16px; }
        .test-title { font-size: 22px; color: #0f172a; margin-bottom: 20px; text-align: center; }
        .critical-badge { background: #fef2f2; color: #dc2626; padding: 8px 16px; border-radius: 20px; display: inline-block; margin-bottom: 20px; }
        .results-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .results-table th { background: #0d3d56; color: white; padding: 12px; text-align: left; }
        .results-table td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
        .results-table tr:nth-child(even) { background: #f8fafc; }
        .value-normal { color: #10B981; font-weight: 600; }
        .value-high { color: #ef4444; font-weight: 600; }
        .value-low { color: #f59e0b; font-weight: 600; }
        .summary { background: #f0fdf4; padding: 20px; border-radius: 8px; border-left: 4px solid #10B981; margin-bottom: 30px; }
        .footer { text-align: center; color: #94a3b8; font-size: 12px; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e2e8f0; }
        @media print { 
            body { background: white; padding: 0; }
            .report { box-shadow: none; }
            .no-print { display: none; }
        }
        .print-btn { display: block; margin: 20px auto; padding: 12px 30px; background: #10B981; color: white; border: none; border-radius: 8px; font-size: 16px; cursor: pointer; }
        .print-btn:hover { background: #059669; }
    </style>
</head>
<body>
    <button class="print-btn no-print" onclick="window.print()">🖨️ Print / Save as PDF</button>
    <div class="report">
        <div class="header">
            <h1>🐺 Wolf Hospital</h1>
            <div class="hospital">Laboratory Report</div>
        </div>
        
        <div class="info-grid">
            <div class="info-box">
                <label>Patient Name</label>
                <span>${report.patient_name || 'N/A'}</span>
            </div>
            <div class="info-box">
                <label>Phone</label>
                <span>${report.phone || 'N/A'}</span>
            </div>
            <div class="info-box">
                <label>Doctor</label>
                <span>${report.doctor_name || 'N/A'}</span>
            </div>
            <div class="info-box">
                <label>Report Date</label>
                <span>${new Date(report.report_generated_at || report.requested_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
            </div>
        </div>
        
        <h2 class="test-title">${report.test_name}</h2>
        ${report.has_critical_value ? '<div style="text-align:center"><span class="critical-badge">⚠️ Contains Critical Values</span></div>' : ''}
        
        ${parameters.length > 0 ? `
        <table class="results-table">
            <thead>
                <tr>
                    <th>Parameter</th>
                    <th>Result</th>
                    <th>Unit</th>
                    <th>Normal Range</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
                ${parameters.map(p => `
                <tr>
                    <td>${p.name}</td>
                    <td class="value-${p.status || 'normal'}">${p.value}</td>
                    <td>${p.unit || ''}</td>
                    <td>${p.normalMin || ''} - ${p.normalMax || ''}</td>
                    <td class="value-${p.status || 'normal'}">${(p.status || 'normal').toUpperCase()}</td>
                </tr>
                `).join('')}
            </tbody>
        </table>
        ` : '<p style="text-align:center;color:#64748b;">Detailed results pending</p>'}
        
        ${resultJson.summary ? `
        <div class="summary">
            <strong>Summary:</strong> ${resultJson.summary}
        </div>
        ` : ''}
        
        <div class="footer">
            <p>This is a computer-generated report from Wolf HMS Laboratory Module</p>
            <p>Report ID: LAB-${requestId} | Generated on ${new Date().toLocaleString('en-IN')}</p>
        </div>
    </div>
</body>
</html>`;
        
        res.setHeader('Content-Type', 'text/html');
        res.send(html);
    } catch (error) {
        console.error('Generate lab report error:', error);
        res.status(500).send('Error generating report');
    }
});

// ====== PHARMACY ENDPOINTS (Public - For Patient App) ======

// Get patient's dispensed medications
router.get('/medications', async (req, res) => {
    try {
        const { phone, patientId } = req.query;
        
        if (!phone && !patientId) {
            return res.status(400).json({ success: false, error: 'Phone or patientId required' });
        }
        
        // Find patient
        let patient;
        if (patientId) {
            const result = await db.pool.query('SELECT id, name, phone FROM patients WHERE id = $1', [patientId]);
            patient = result.rows[0];
        } else {
            const result = await db.pool.query('SELECT id, name, phone FROM patients WHERE phone = $1', [phone]);
            patient = result.rows[0];
        }
        
        if (!patient) {
            return res.json({ success: true, medications: [], message: 'No patient found' });
        }
        
        // Get dispensed medications
        const medications = await db.pool.query(`
            SELECT 
                dl.id,
                dl.item_name as drug_name,
                dl.quantity,
                dl.dispensed_at,
                dl.notes as dosage_instructions,
                ii.generic_name,
                ii.is_controlled,
                ii.price_per_unit,
                u.name as dispensed_by_name
            FROM dispense_logs dl
            LEFT JOIN inventory_items ii ON dl.item_id = ii.id
            LEFT JOIN users u ON dl.dispensed_by = u.id
            WHERE dl.patient_id = $1
            ORDER BY dl.dispensed_at DESC
        `, [patient.id]);
        
        console.log('📱 Medications API called for', patient.name, '- found:', medications.rows.length);
        
        res.json({ 
            success: true, 
            patientName: patient.name,
            medications: medications.rows 
        });
    } catch (error) {
        console.error('Get medications error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get patient's prescriptions (Unified: Checks prescriptions table first, then care_tasks)
router.get('/prescriptions', async (req, res) => {
    try {
        let { phone, patientId } = req.query;

        if (!phone && !patientId) {
            return res.status(400).json({ success: false, error: 'Phone or patientId required' });
        }

        // Sanitize phone (remove +91, spaces, dashes)
        if (phone) {
            phone = phone.replace(/\D/g, '').slice(-10);
        }
        
        // Find patient
        let patient;
        if (patientId) {
            const result = await db.pool.query('SELECT id, name, phone FROM patients WHERE id = $1', [patientId]);
            patient = result.rows[0];
        } else {
            const result = await db.pool.query('SELECT id, name, phone FROM patients WHERE phone = $1', [phone]);
            patient = result.rows[0];
        }
        
        if (!patient) {
            return res.json({ success: true, prescriptions: [], message: 'No patient found' });
        }
        
        // 1. Try getting from prescriptions table (Hybrid: OPD JSON + IPD Rows)
        // We select medications (OPD JSON) 
        const prescriptionsResult = await db.pool.query(`
            SELECT 
                p.id,
                p.medications,
                p.created_at,
                u.name as doctor_name,
                'prescription' as type,
                'active' as status
            FROM prescriptions p
            LEFT JOIN users u ON p.doctor_id = u.id
            WHERE p.patient_id = $1
            ORDER BY p.created_at DESC
            LIMIT 50
        `, [patient.id]);

        let combinedPrescriptions = [];

        // Process prescriptions rows (OPD)
        for (const row of prescriptionsResult.rows) {
             if (row.medications && Array.isArray(row.medications)) {
                // Return the whole object as one prescription record
                // Frontend expects 'medicines' array and 'date'
                combinedPrescriptions.push({
                    id: row.id,
                    doctor_name: row.doctor_name,
                    date: row.created_at,
                    medicines: row.medications, // Pass the array directly
                    type: 'prescription',
                    status: 'active'
                });
            }
        }

        // 2. Fetch from care_tasks (IPD/Legacy - Case Insensitive)
        // Group these by date/doctor to form a "Prescription" object
        const careTasksResult = await db.pool.query(`
            SELECT 
                ct.id,
                ct.description,
                ct.status,
                ct.scheduled_time,
                ct.created_at,
                u.name as doctor_name,
                'care_task' as type
            FROM care_tasks ct
            LEFT JOIN users u ON ct.doctor_id = u.id
            WHERE ct.patient_id = $1 
            AND (ct.type ILIKE 'medication' OR ct.type ILIKE '%prescription%')
            ORDER BY ct.created_at DESC
            LIMIT 50
        `, [patient.id]);

        if (careTasksResult.rows.length > 0) {
             // Group by date (YYYY-MM-DD)
             const grouped = {};
             
             careTasksResult.rows.forEach(task => {
                 const dateKey = new Date(task.created_at).toISOString().split('T')[0];
                 const docName = task.doctor_name || 'Hospital Staff';
                 const groupKey = `${dateKey}_${docName}`;
                 
                 if (!grouped[groupKey]) {
                     grouped[groupKey] = {
                         id: `ipd_${task.id}`, // Use first task ID as base
                         doctor_name: docName,
                         date: task.created_at,
                         medicines: [],
                         type: 'care_task_group',
                         status: 'active'
                     };
                 }
                 
                 // Parse description "Name - Dose - Freq"
                 const parts = task.description ? task.description.split('-') : ['Unknown'];
                 const name = parts[0]?.trim();
                 const dose = parts[1]?.trim();
                 
                 grouped[groupKey].medicines.push({
                     name: name,
                     dose: dose,
                     description: task.description,
                     status: task.status
                 });
             });
             
             combinedPrescriptions = [...combinedPrescriptions, ...Object.values(grouped)];
        }
        
        // Sort by created_at desc
        combinedPrescriptions.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        console.log('📱 Prescriptions API called for', patient.name, '- found:', combinedPrescriptions.length);
        
        res.json({ 
            success: true, 
            patientName: patient.name,
            prescriptions: combinedPrescriptions
        });
    } catch (error) {
        console.error('Get prescriptions error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Download prescription as PDF
const { generatePrescriptionPdf } = require('../services/prescriptionPdfService');

router.get('/prescriptions/:id/pdf', async (req, res) => {
    try {
        const prescriptionId = req.params.id;

        // 1. Fetch prescription with joined data
        const rxResult = await db.pool.query(`
            SELECT 
                p.id, p.diagnosis, p.medications, p.notes, p.created_at, p.hospital_id,
                pt.name as patient_name, pt.uhid, pt.dob, pt.gender,
                u.name as doctor_name,
                u.license_number as doctor_reg_no
            FROM prescriptions p
            LEFT JOIN patients pt ON p.patient_id = pt.id
            LEFT JOIN users u ON p.doctor_id = u.id
            WHERE p.id = $1
        `, [prescriptionId]);

        if (rxResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Prescription not found' });
        }

        const rx = rxResult.rows[0];

        // 2. Fetch hospital profile
        let hospital = { name: 'Hospital' };
        if (rx.hospital_id) {
            const hospResult = await db.pool.query(`
                SELECT name, 
                       settings->>'tagline' as tagline,
                       settings->>'address' as address,
                       settings->>'city' as city,
                       settings->>'state' as state,
                       settings->>'pincode' as pincode,
                       settings->>'phone' as phone,
                       settings->>'email' as email,
                       settings->>'website' as website,
                       settings->>'logo_url' as logo_url
                FROM hospitals WHERE id = $1
            `, [rx.hospital_id]);
            if (hospResult.rows.length > 0) {
                hospital = { name: hospResult.rows[0].name, ...hospResult.rows[0] };
            }
        }

        // 3. Fetch latest vitals for patient
        let vitals = null;
        try {
            const vitResult = await db.pool.query(`
                SELECT bp, heart_rate, temp, weight, spo2
                FROM vitals_logs
                WHERE patient_id = (SELECT patient_id FROM prescriptions WHERE id = $1)
                ORDER BY recorded_at DESC LIMIT 1
            `, [prescriptionId]);
            if (vitResult.rows.length > 0) {
                vitals = vitResult.rows[0];
            }
        } catch (vitErr) {
            // Vitals are optional, don't fail
            console.warn('Could not fetch vitals for PDF:', vitErr.message);
        }

        // 4. Parse medications
        let medications = [];
        if (rx.medications) {
            medications = typeof rx.medications === 'string' 
                ? JSON.parse(rx.medications) 
                : rx.medications;
        }

        // 5. Generate PDF
        const pdfBuffer = await generatePrescriptionPdf({
            prescription: {
                id: rx.id,
                diagnosis: rx.diagnosis,
                medications: medications,
                created_at: rx.created_at,
                notes: rx.notes
            },
            patient: {
                name: rx.patient_name,
                uhid: rx.uhid,
                dob: rx.dob,
                gender: rx.gender
            },
            doctor: {
                name: rx.doctor_name ? `Dr. ${rx.doctor_name}` : null,
                reg_no: rx.doctor_reg_no
            },
            hospital: hospital,
            vitals: vitals
        });

        // 6. Send PDF
        const filename = `prescription_${rx.id}_${new Date(rx.created_at).toISOString().split('T')[0]}.pdf`;
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Length', pdfBuffer.length);
        res.send(pdfBuffer);

    } catch (error) {
        console.error('Prescription PDF error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ====== PUSH NOTIFICATION ENDPOINTS ======

// Register device push token
router.post('/register-device', async (req, res) => {
    try {
        const { phone, pushToken } = req.body;
        
        if (!phone || !pushToken) {
            return res.status(400).json({ success: false, error: 'Phone and pushToken required' });
        }
        
        // Update patient's push token (add column if not exists via simple approach)
        // For now, store in a simple key-value approach or patient meta
        // We'll use patients table assuming push_token column exists
        const result = await db.pool.query(`
            UPDATE patients SET push_token = $1, updated_at = NOW()
            WHERE phone = $2
            RETURNING id, name
        `, [pushToken, phone]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Patient not found' });
        }
        
        console.log('📱 Push token registered for', result.rows[0].name);
        res.json({ success: true, message: 'Device registered for push notifications' });
    } catch (error) {
        // If push_token column doesn't exist, try to add it
        if (error.message.includes('push_token')) {
            try {
                await db.pool.query(`ALTER TABLE patients ADD COLUMN IF NOT EXISTS push_token TEXT`);
                console.log('Added push_token column to patients table');
                // Retry
                const result = await db.pool.query(`
                    UPDATE patients SET push_token = $1 WHERE phone = $2 RETURNING id
                `, [req.body.pushToken, req.body.phone]);
                if (result.rows.length > 0) {
                    return res.json({ success: true, message: 'Device registered' });
                }
            } catch (e) {
                console.error('Error adding column:', e);
            }
        }
        console.error('Register device error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Send push notification to patient (internal use)
router.post('/send-push', async (req, res) => {
    try {
        const { phone, title, body, data } = req.body;
        
        if (!phone) {
            return res.status(400).json({ success: false, error: 'Phone required' });
        }
        
        // Get patient's push token
        const patient = await db.pool.query(`
            SELECT push_token FROM patients WHERE phone = $1
        `, [phone]);
        
        if (!patient.rows[0]?.push_token) {
            return res.status(404).json({ success: false, error: 'No push token for patient' });
        }
        
        const pushToken = patient.rows[0].push_token;
        
        // Send via Expo Push API
        const message = {
            to: pushToken,
            sound: 'default',
            title: title || 'Wolf Care',
            body: body || 'You have a new notification',
            data: data || {},
        };
        
        const response = await fetch('https://exp.host/--/api/v2/push/send', {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message),
        });
        
        const result = await response.json();
        console.log('📤 Push notification sent:', result);
        
        res.json({ success: true, result });
    } catch (error) {
        console.error('Send push error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ====== PATIENT APP - PAYMENT & BILLING ENDPOINTS (HMS Integration) ======

// Create invoice for appointment/service - syncs with HMS Finance Dashboard
router.post('/app/create-invoice', async (req, res) => {
    try {
        const { patientPhone, patientName, appointmentId, doctorName, department, amount, description, date, time } = req.body;
        
        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, error: 'Valid amount required' });
        }

        // Find patient
        let patientId = null;
        if (patientPhone) {
            const patientResult = await db.pool.query(
                'SELECT id FROM patients WHERE phone = $1',
                [patientPhone]
            );
            if (patientResult.rows.length > 0) {
                patientId = patientResult.rows[0].id;
            }
        }

        // Create invoice in HMS Finance system - using actual schema columns
        // Schema: id, admission_id, patient_id, total_amount, status, generated_at, generated_by
        const invoiceResult = await db.pool.query(`
            INSERT INTO invoices (patient_id, total_amount, status)
            VALUES ($1, $2, 'Pending')
            RETURNING id, total_amount, status, generated_at
        `, [patientId, amount]);

        const invoice = invoiceResult.rows[0];

        // Add invoice item with full description (this becomes the source of truth for what was paid for)
        const itemDescription = `Wolf Care App: ${description || 'Consultation'} - ${doctorName || 'Doctor'} on ${date || 'N/A'} at ${time || 'N/A'}`;
        await db.pool.query(`
            INSERT INTO invoice_items (invoice_id, description, quantity, unit_price, total_price)
            VALUES ($1, $2, 1, $3, $4)
        `, [invoice.id, itemDescription, amount, amount]);

        console.log('💰 Invoice created from Wolf Care App:', invoice.id, '- Amount: ₹' + amount);

        res.json({
            success: true,
            invoiceId: invoice.id,
            amount: invoice.total_amount,
            status: invoice.status,
            message: 'Invoice created in HMS Finance Dashboard'
        });
    } catch (error) {
        console.error('Create invoice error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create Razorpay payment order
router.post('/app/payment/order', async (req, res) => {
    try {
        const { amount, invoiceId, patientId, description } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, error: 'Valid amount required' });
        }

        // For Razorpay integration, create order via payment gateway
        // For now, create a simulated order ID for demo
        const orderId = `order_WC${Date.now()}`;
        
        console.log('💳 Payment order created:', orderId, '- Amount: ₹' + amount);

        res.json({
            success: true,
            orderId: orderId,
            amount: amount * 100, // Razorpay expects paise
            currency: 'INR',
            invoiceId: invoiceId,
            description: description || 'Wolf Care Payment',
            key: process.env.RAZORPAY_KEY_ID || 'rzp_test_demo', // Return Razorpay key for client
            prefill: {
                name: '',
                contact: '',
                email: ''
            }
        });
    } catch (error) {
        console.error('Create payment order error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Verify Razorpay payment (after checkout)
router.post('/app/payment/verify', async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, invoiceId, amount } = req.body;

        // In production, verify signature using Razorpay SDK
        // For demo, accept any payment
        const verified = razorpay_payment_id ? true : false;

        if (verified || razorpay_order_id) {
            // Update invoice status if invoice exists
            if (invoiceId) {
                await db.pool.query(`
                    UPDATE invoices SET status = 'Paid', amount_paid = total_amount
                    WHERE id = $1
                `, [invoiceId]);
            }

            // Record payment - using actual payments table schema (visit_id, patient_id, amount, payment_mode, transaction_id, status, notes)
            const paymentRef = razorpay_payment_id || `WC_${Date.now()}`;
            
            await db.pool.query(`
                INSERT INTO payments (amount, payment_mode, transaction_id, status, notes)
                VALUES ($1, 'Online', $2, 'Completed', 'Paid via Wolf Care App - Razorpay')
            `, [amount || 0, paymentRef]);

            console.log('✅ Payment verified:', paymentRef);

            res.json({
                success: true,
                verified: true,
                paymentId: paymentRef,
                message: 'Payment verified and recorded in HMS'
            });
        } else {
            res.status(400).json({
                success: false,
                verified: false,
                error: 'Payment verification failed'
            });
        }
    } catch (error) {
        console.error('Verify payment error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Record payment against invoice (manual/fallback)
router.post('/app/payment/record/:invoiceId', async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const { amount, paymentMode, referenceNumber, notes } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, error: 'Valid amount required' });
        }

        // Check if invoice exists
        const invoiceCheck = await db.pool.query(
            'SELECT id, total_amount, amount_paid, status FROM invoices WHERE id = $1',
            [invoiceId]
        );

        if (invoiceCheck.rows.length === 0) {
            // Create a generic payment record without invoice for demo
            console.log('💰 Recording payment without invoice (demo mode):', amount);
            return res.json({
                success: true,
                message: 'Payment recorded (demo mode)',
                paymentMode: paymentMode,
                amount: amount
            });
        }

        const invoice = invoiceCheck.rows[0];
        const newAmountPaid = parseFloat(invoice.amount_paid || 0) + parseFloat(amount);
        const newStatus = newAmountPaid >= parseFloat(invoice.total_amount) ? 'Paid' : 'Partial';

        // Record payment - using actual payments table schema (visit_id, patient_id, amount, payment_mode, transaction_id, status, notes)
        const transactionId = referenceNumber || `WC_${Date.now()}`;
        const paymentResult = await db.pool.query(`
            INSERT INTO payments (amount, payment_mode, transaction_id, status, notes)
            VALUES ($1, $2, $3, 'Completed', $4)
            RETURNING id
        `, [amount, paymentMode || 'Online', transactionId, notes || `Wolf Care App Payment - Invoice #${invoiceId}`]);

        // Update invoice
        await db.pool.query(`
            UPDATE invoices SET amount_paid = $1, status = $2 WHERE id = $3
        `, [newAmountPaid, newStatus, invoiceId]);

        console.log('💰 Payment recorded:', paymentResult.rows[0].id, '- Invoice:', invoiceId, '- Status:', newStatus);

        res.json({
            success: true,
            paymentId: paymentResult.rows[0].id,
            invoiceId: invoiceId,
            invoiceStatus: newStatus,
            amountPaid: newAmountPaid,
            message: 'Payment recorded in HMS Finance Dashboard'
        });
    } catch (error) {
        console.error('Record payment error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get Razorpay configuration for client
router.get('/app/payment/config', async (req, res) => {
    try {
        res.json({
            success: true,
            key: process.env.RAZORPAY_KEY_ID || 'rzp_test_demo',
            name: 'Wolf Hospital',
            description: 'Wolf HMS Payment Gateway',
            theme: {
                color: '#10B981'
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ====== SOCKET.IO NOTIFICATION ENDPOINTS (For Testing) ======

// Test endpoint: Notify patient of lab result
router.post('/notify-lab', async (req, res) => {
    try {
        const { phone, testName, hasCritical } = req.body;
        
        if (!phone) {
            return res.status(400).json({ success: false, error: 'Phone required' });
        }
        
        // Emit to patient's room
        req.io.to(`patient:${phone}`).emit('lab:result_ready', {
            type: 'lab',
            title: '🧪 Lab Result Ready',
            message: `Your ${testName || 'test'} results are now available`,
            hasCritical: hasCritical || false,
            timestamp: new Date().toISOString()
        });
        
        console.log('📢 Notification sent to patient:', phone);
        res.json({ success: true, message: `Notification sent to patient:${phone}` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Test endpoint: Notify patient of medication dispense
router.post('/notify-pharmacy', async (req, res) => {
    try {
        const { phone, drugName, quantity } = req.body;
        
        if (!phone) {
            return res.status(400).json({ success: false, error: 'Phone required' });
        }
        
        // Emit to patient's room
        req.io.to(`patient:${phone}`).emit('pharmacy:dispensed', {
            type: 'pharmacy',
            title: '💊 Medication Ready',
            message: `Your ${drugName || 'medication'} (Qty: ${quantity || 1}) is ready for pickup`,
            timestamp: new Date().toISOString()
        });
        
        console.log('📢 Pharmacy notification sent to patient:', phone);
        res.json({ success: true, message: `Notification sent to patient:${phone}` });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ====== PATIENT APP - PHARMACY ENDPOINTS (Public) ======
// route moved to bottom with other pharmacy endpoints

// ====== PATIENT APP - BILLING ENDPOINTS (Public) ======

// Get patient's billing history by phone
router.get('/billing-history', async (req, res) => {
    try {
        const { phone, patientId } = req.query;
        
        if (!phone && !patientId) {
            return res.status(400).json({ success: false, error: 'Phone or patientId required' });
        }
        
        // Find patient
        let patient;
        if (phone) {
            const result = await db.pool.query('SELECT * FROM patients WHERE phone = $1', [phone]);
            patient = result.rows[0];
        } else {
            const result = await db.pool.query('SELECT * FROM patients WHERE id = $1', [patientId]);
            patient = result.rows[0];
        }
        
        if (!patient) {
            return res.json({ success: true, bills: [], message: 'No patient found' });
        }
        
        // Get payment history
        const bills = await db.pool.query(`
            SELECT 
                p.id,
                p.amount,
                p.payment_mode,
                p.status,
                p.transaction_id,
                p.created_at,
                ov.token_number,
                u.name as doctor_name,
                'OPD Consultation' as service_type
            FROM payments p
            LEFT JOIN opd_visits ov ON p.visit_id = ov.id
            LEFT JOIN users u ON ov.doctor_id = u.id
            WHERE p.patient_id = $1
            ORDER BY p.created_at DESC
            LIMIT 50
        `, [patient.id]);
        
        console.log('📱 Billing history API called for', patient.name, '- found:', bills.rows.length);
        
        res.json({
            success: true,
            patientName: patient.name,
            bills: bills.rows
        });
    } catch (error) {
        console.error('Get billing history error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ====== PROTECTED ROUTES (Require Auth) ======

// Search patients (for receptionist, doctors, etc.)
router.get('/search', protect, searchPatients);


// Get patient by ID - MUST come after specific routes to avoid catching /doctors
router.get('/:id', protect, getPatientById);

// Update patient details
router.put('/:id', protect, updatePatient);

// Get patient visit history
router.get('/:id/visits', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.pool.query(`
            SELECT 
                v.id,
                v.token_number,
                v.visit_date,
                v.status,
                v.consultation_type,
                u.username as doctor_name,
                u.department,
                p.amount,
                p.payment_mode
            FROM opd_visits v
            LEFT JOIN users u ON v.doctor_id = u.id
            LEFT JOIN payments p ON p.visit_id = v.id
            WHERE v.patient_id = $1
            ORDER BY v.visit_date DESC, v.id DESC
        `, [id]);
        res.json(result.rows);
    } catch (error) {
        console.error('Get patient visits error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get patient payment history
router.get('/:id/payments', protect, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.pool.query(`
            SELECT 
                p.id,
                p.amount,
                p.payment_mode,
                p.reference_number as transaction_id,
                p.status,
                p.received_at as created_at,
                v.token_number,
                v.visit_date
            FROM payments p
            LEFT JOIN opd_visits v ON p.visit_id = v.id
            WHERE p.patient_id = $1
            ORDER BY p.received_at DESC
        `, [id]);
        res.json(result.rows);
    } catch (error) {
        console.error('Get patient payments error:', error.message, error.stack);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// ====== PATIENT APP - PRESCRIPTION ENDPOINTS ======

// Get patient's prescriptions by phone (REMOVED - HANDLED ABOVE)
// router.get('/prescriptions', ...

// ====== PATIENT APP - PHARMACY ENDPOINTS ======

// Get patient's pharmacy orders by phone
router.get('/pharmacy-orders', async (req, res) => {
    try {
        let { phone, patientId } = req.query;
        
        if (!phone && !patientId) {
            return res.status(400).json({ success: false, error: 'Phone or patientId required' });
        }

        // Sanitize phone
        if (phone) {
            phone = phone.replace(/\D/g, '').slice(-10);
        }
        
        // Find patient
        let patient;
        if (phone) {
            const result = await db.pool.query('SELECT * FROM patients WHERE phone = $1', [phone]);
            patient = result.rows[0];
        } else {
            const result = await db.pool.query('SELECT * FROM patients WHERE id = $1', [patientId]);
            patient = result.rows[0];
        }
        
        if (!patient) {
            return res.json({ success: true, orders: [], message: 'No patient found' });
        }
        
        // Get pharmacy orders - check if pharmacy_orders table exists
        const orders = await db.pool.query(`
            SELECT 
                po.id,
                po.status,
                po.total_amount,
                po.created_at,
                po.dispensed_at,
                u.name as dispensed_by
            FROM pharmacy_orders po
            LEFT JOIN users u ON po.dispensed_by = u.id
            WHERE po.patient_id = $1
            ORDER BY po.created_at DESC
            LIMIT 30
        `, [patient.id]);
        
        console.log('📱 Pharmacy orders API called for', patient.name, '- found:', orders.rows.length);
        
        res.json({
            success: true,
            patientName: patient.name,
            orders: orders.rows
        });
    } catch (error) {
        console.error('Get pharmacy orders error:', error);
        // Return empty array if table doesn't exist
        res.json({ success: true, orders: [], message: 'Pharmacy orders not available' });
    }
});

// Get pharmacy order details with items
router.get('/pharmacy-orders/:orderId', async (req, res) => {
    try {
        const { orderId } = req.params;
        
        // Get order details
        const orderResult = await db.pool.query(`
            SELECT 
                po.*,
                p.name as patient_name,
                p.phone as patient_phone,
                u.name as dispensed_by_name
            FROM pharmacy_orders po
            LEFT JOIN patients p ON po.patient_id = p.id
            LEFT JOIN users u ON po.dispensed_by = u.id
            WHERE po.id = $1
        `, [orderId]);
        
        if (orderResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Order not found' });
        }
        
        // Get order items
        const items = await db.pool.query(`
            SELECT 
                poi.id,
                poi.medication_name,
                poi.quantity,
                poi.unit_price,
                poi.total_price
            FROM pharmacy_order_items poi
            WHERE poi.order_id = $1
        `, [orderId]);
        
        console.log('📱 Pharmacy order details API called for order:', orderId);
        
        res.json({
            success: true,
            order: orderResult.rows[0],
            items: items.rows
        });
    } catch (error) {
        console.error('Get pharmacy order details error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ====== PATIENT APP - BILLING HISTORY ======

// Get patient's billing history by phone
router.get('/billing-history', async (req, res) => {
    try {
        const { phone, patientId } = req.query;
        
        if (!phone && !patientId) {
            return res.status(400).json({ success: false, error: 'Phone or patientId required' });
        }
        
        // Find patient
        let patient;
        if (phone) {
            const result = await db.pool.query('SELECT * FROM patients WHERE phone = $1', [phone]);
            patient = result.rows[0];
        } else {
            const result = await db.pool.query('SELECT * FROM patients WHERE id = $1', [patientId]);
            patient = result.rows[0];
        }
        
        if (!patient) {
            return res.json({ success: true, bills: [], message: 'No patient found' });
        }
        
        // Get payment history
        const bills = await db.pool.query(`
            SELECT 
                p.id,
                p.amount,
                p.payment_mode,
                p.status,
                p.transaction_id,
                p.created_at,
                ov.token_number,
                u.name as doctor_name,
                'OPD Consultation' as service_type
            FROM payments p
            LEFT JOIN opd_visits ov ON p.visit_id = ov.id
            LEFT JOIN users u ON ov.doctor_id = u.id
            WHERE p.patient_id = $1
            ORDER BY p.created_at DESC
            LIMIT 50
        `, [patient.id]);
        
        console.log('📱 Billing history API called for', patient.name, '- found:', bills.rows.length);
        
        res.json({
            success: true,
            patientName: patient.name,
            bills: bills.rows
        });
    } catch (error) {
        console.error('Get billing history error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== PAYMENT ENDPOINTS (For Wolf Care App) ====================

// Create invoice for appointment/service
router.post('/app/create-invoice', async (req, res) => {
    try {
        const { patientId, patientPhone, doctorId, amount, serviceType, description } = req.body;
        
        // Find patient
        let patient;
        if (patientPhone) {
            const result = await db.pool.query('SELECT id, name FROM patients WHERE phone = $1', [patientPhone]);
            patient = result.rows[0];
        } else if (patientId) {
            const result = await db.pool.query('SELECT id, name FROM patients WHERE id = $1', [patientId]);
            patient = result.rows[0];
        }
        
        if (!patient) {
            return res.status(404).json({ success: false, error: 'Patient not found' });
        }
        
        // Create invoice
        const invoice = await db.pool.query(`
            INSERT INTO invoices (patient_id, doctor_id, amount, description, status, created_at)
            VALUES ($1, $2, $3, $4, 'pending', NOW())
            RETURNING id, amount, status, created_at
        `, [patient.id, doctorId || null, amount || 0, description || serviceType || 'Consultation']);
        
        console.log('📱 Invoice created:', invoice.rows[0].id, 'for patient:', patient.name);
        
        res.json({
            success: true,
            invoice: invoice.rows[0],
            patientName: patient.name
        });
    } catch (error) {
        console.error('Create invoice error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Create Razorpay payment order
router.post('/app/payment/order', async (req, res) => {
    try {
        const { amount, invoiceId, description, patientPhone } = req.body;
        
        // In production, this would call Razorpay API
        // For now, return a mock order for testing
        const mockOrderId = 'order_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        console.log('📱 Payment order created:', mockOrderId, 'Amount:', amount);
        
        res.json({
            success: true,
            order: {
                id: mockOrderId,
                amount: amount * 100, // Razorpay uses paise
                currency: 'INR',
                receipt: invoiceId || 'receipt_' + Date.now(),
                notes: { description, patientPhone }
            }
        });
    } catch (error) {
        console.error('Create payment order error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Verify Razorpay payment
router.post('/app/payment/verify', async (req, res) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, invoiceId } = req.body;
        
        // In production, verify signature with Razorpay
        // For now, accept all payments as successful for testing
        console.log('📱 Payment verified:', razorpay_payment_id, 'for order:', razorpay_order_id);
        
        // Update invoice status if provided
        if (invoiceId) {
            await db.pool.query(
                'UPDATE invoices SET status = $1, payment_id = $2, updated_at = NOW() WHERE id = $3',
                ['paid', razorpay_payment_id, invoiceId]
            );
        }
        
        res.json({
            success: true,
            verified: true,
            paymentId: razorpay_payment_id,
            message: 'Payment verified successfully'
        });
    } catch (error) {
        console.error('Verify payment error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Record payment against invoice
router.post('/app/payment/record/:invoiceId', async (req, res) => {
    try {
        const { invoiceId } = req.params;
        const { amount, paymentMode, transactionId } = req.body;
        
        // Update invoice
        const invoice = await db.pool.query(`
            UPDATE invoices 
            SET status = 'paid', payment_mode = $1, payment_id = $2, updated_at = NOW()
            WHERE id = $3
            RETURNING *
        `, [paymentMode || 'online', transactionId || null, invoiceId]);
        
        if (invoice.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Invoice not found' });
        }
        
        console.log('📱 Payment recorded for invoice:', invoiceId);
        
        res.json({
            success: true,
            invoice: invoice.rows[0],
            message: 'Payment recorded successfully'
        });
    } catch (error) {
        console.error('Record payment error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// Get Razorpay config for client SDK
router.get('/app/payment/config', async (req, res) => {
    try {
        // Return Razorpay key (public key is safe to expose)
        // In production, this would come from environment variables
        res.json({
            success: true,
            config: {
                key: process.env.RAZORPAY_KEY_ID || 'rzp_test_demo',
                currency: 'INR',
                name: 'Wolf Hospital',
                description: 'Healthcare Payment',
                theme: {
                    color: '#14b8a6'
                }
            }
        });
    } catch (error) {
        console.error('Get payment config error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

module.exports = router;

