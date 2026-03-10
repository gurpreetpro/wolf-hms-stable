const pool = require('../config/db');
const { v4: uuidv4 } = require('uuid');
const { addToInvoice } = require('../services/billingService');
const { getHospitalId } = require('../utils/tenantHelper');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

// Get available time slots for a doctor on a specific date - Multi-Tenant
const getAvailableSlots = asyncHandler(async (req, res) => {
    const { doctor_id, date } = req.query;
    const hospitalId = getHospitalId(req);

    const allSlots = [
        '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
        '12:00', '12:30', '14:00', '14:30', '15:00', '15:30',
        '16:00', '16:30', '17:00'
    ];

    const bookedResult = await pool.query(
        `SELECT appointment_time FROM appointments 
            WHERE doctor_id = $1 AND appointment_date = $2 
            AND status NOT IN ('Cancelled', 'No Show')
            AND (hospital_id = $3 OR hospital_id IS NULL)`,
        [doctor_id, date, hospitalId]
    );

    const bookedSlots = bookedResult.rows.map(r => r.appointment_time.slice(0, 5));
    const availableSlots = allSlots.filter(slot => !bookedSlots.includes(slot));

    ResponseHandler.success(res, { available_slots: availableSlots, booked_slots: bookedSlots });
});

// Get all appointments (with filters) - Multi-Tenant
const getAppointments = asyncHandler(async (req, res) => {
    const { date, doctor_id, status } = req.query;
    const hospitalId = getHospitalId(req);

    let query = `
        SELECT a.id, a.patient_id, p.name as patient_name, p.phone as patient_phone,
            p.age as patient_age, p.gender as patient_gender,
            a.doctor_id, u.name as doctor_name, a.department,
            a.appointment_date, a.appointment_time, a.status, a.reason, a.notes, a.created_at
        FROM appointments a
        LEFT JOIN patients p ON a.patient_id = p.id
        LEFT JOIN users u ON a.doctor_id = u.id
        WHERE (a.hospital_id = $1 OR a.hospital_id IS NULL)
    `;
    const params = [hospitalId];
    let paramIndex = 2;

    if (date) {
        query += ` AND a.appointment_date = $${paramIndex}`;
        params.push(date);
        paramIndex++;
    }
    if (doctor_id) {
        query += ` AND a.doctor_id = $${paramIndex}`;
        params.push(doctor_id);
        paramIndex++;
    }
    if (status) {
        query += ` AND a.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
    }

    query += ' ORDER BY a.appointment_date, a.appointment_time';
    const result = await pool.query(query, params);
    ResponseHandler.success(res, result.rows);
});

// Create a new appointment - Multi-Tenant
const createAppointment = asyncHandler(async (req, res) => {
    const { patient_id, doctor_id, department, appointment_date, appointment_time, reason, notes } = req.body;
    const info = req.user || { id: null };
    const hospitalId = getHospitalId(req);

    const existing = await pool.query(
        `SELECT id FROM appointments 
            WHERE doctor_id = $1 AND appointment_date = $2 AND appointment_time = $3
            AND status NOT IN ('Cancelled', 'No Show')
            AND (hospital_id = $4 OR hospital_id IS NULL)`,
        [doctor_id, appointment_date, appointment_time, hospitalId]
    );

    if (existing.rows.length > 0) {
        return ResponseHandler.error(res, 'This time slot is already booked', 400);
    }

    const result = await pool.query(
        `INSERT INTO appointments (patient_id, doctor_id, department, appointment_date, appointment_time, reason, notes, status, hospital_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, 'Scheduled', $8) RETURNING *`,
        [patient_id, doctor_id, department, appointment_date, appointment_time, reason, notes, hospitalId]
    );

    // Add to invoice
    await addToInvoice(patient_id, null, `Consultation Fee (${department})`, 1, 500.00, info.id, hospitalId);

    ResponseHandler.success(res, { appointment: result.rows[0] }, 'Appointment booked successfully', 201);
});

// Update appointment status - Multi-Tenant
const updateAppointmentStatus = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { status, notes } = req.body;
    const hospitalId = getHospitalId(req);

    const result = await pool.query(
        `UPDATE appointments SET status = $1, notes = COALESCE($2, notes), updated_at = NOW()
            WHERE id = $3 AND (hospital_id = $4 OR hospital_id IS NULL) RETURNING *`,
        [status, notes, id, hospitalId]
    );

    if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'Appointment not found', 404);
    }

    ResponseHandler.success(res, { appointment: result.rows[0] }, 'Appointment updated successfully');
});

// Get today's appointments summary - Multi-Tenant
const getTodaysSummary = asyncHandler(async (req, res) => {
    const today = new Date().toISOString().split('T')[0];
    const hospitalId = getHospitalId(req);
    const summary = await pool.query(
        `SELECT 
            COUNT(*) FILTER (WHERE status = 'Scheduled') as scheduled,
            COUNT(*) FILTER (WHERE status = 'Completed') as completed,
            COUNT(*) FILTER (WHERE status = 'Cancelled') as cancelled,
            COUNT(*) FILTER (WHERE status = 'No Show') as no_show,
            COUNT(*) as total
            FROM appointments
            WHERE appointment_date = $1 AND (hospital_id = $2 OR hospital_id IS NULL)`,
        [today, hospitalId]
    );
    ResponseHandler.success(res, summary.rows[0]);
});

// Get doctors list (for dropdown) - Multi-Tenant
const getDoctors = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const result = await pool.query(
        `SELECT id, name, email, department, COALESCE(consultation_fee, 500) as consultation_fee FROM users 
            WHERE role = 'doctor' AND (hospital_id = $1 OR hospital_id IS NULL) ORDER BY name`,
        [hospitalId]
    );
    ResponseHandler.success(res, result.rows);
});

module.exports = {
    getAvailableSlots, getAppointments, createAppointment,
    updateAppointmentStatus, getTodaysSummary, getDoctors
};
