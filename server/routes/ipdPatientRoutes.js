/**
 * Wolf Care - IPD Patient Routes
 * 
 * API endpoints for admitted patients ("My Stay")
 * 
 * Features:
 * - Check admission status
 * - Get vitals history
 * - View diet plan
 * - Track discharge progress
 * - View current charges
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { verifyToken } = require('../services/otpAuthService');

// Middleware to verify patient token
const authenticatePatient = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    
    if (!decoded) {
        return res.status(401).json({ error: 'Invalid token' });
    }
    
    req.user = decoded;
    next();
};

/**
 * @route   GET /api/ipd/admission-status
 * @desc    Check if patient is currently admitted
 * @access  Private (Patient)
 */
router.get('/admission-status', authenticatePatient, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                a.id as admission_id,
                a.admission_date,
                a.diagnosis,
                a.status,
                a.bed_number,
                a.treating_doctor_id,
                u.username as doctor_name,
                u.department,
                w.name as ward_name,
                b.bed_type,
                b.daily_rate,
                a.hospital_id
            FROM admissions a
            LEFT JOIN users u ON a.treating_doctor_id = u.id
            LEFT JOIN beds b ON a.bed_number = b.bed_number
            LEFT JOIN wards w ON b.ward_id = w.id
            WHERE a.patient_id = $1 
              AND a.status = 'Admitted'
            ORDER BY a.admission_date DESC
            LIMIT 1
        `, [req.user.id]);
        
        if (result.rows.length === 0) {
            return res.json({
                success: true,
                isAdmitted: false,
                message: 'No active admission found'
            });
        }
        
        const admission = result.rows[0];
        
        // Calculate days admitted
        const admissionDate = new Date(admission.admission_date);
        const now = new Date();
        const daysAdmitted = Math.floor((now - admissionDate) / (1000 * 60 * 60 * 24));
        
        res.json({
            success: true,
            isAdmitted: true,
            admission: {
                id: admission.admission_id,
                admissionDate: admission.admission_date,
                daysAdmitted,
                diagnosis: admission.diagnosis,
                status: admission.status,
                bed: {
                    number: admission.bed_number,
                    type: admission.bed_type,
                    dailyRate: admission.daily_rate,
                    ward: admission.ward_name
                },
                doctor: {
                    id: admission.treating_doctor_id,
                    name: admission.doctor_name,
                    department: admission.department
                }
            }
        });
    } catch (err) {
        console.error('[IPD] Admission status error:', err);
        res.status(500).json({ error: 'Failed to check admission status' });
    }
});

/**
 * @route   GET /api/ipd/vitals
 * @desc    Get vitals history for current admission
 * @access  Private (Patient)
 */
router.get('/vitals', authenticatePatient, async (req, res) => {
    try {
        // First get active admission
        const admissionResult = await pool.query(`
            SELECT id FROM admissions 
            WHERE patient_id = $1 AND status = 'Admitted'
            ORDER BY admission_date DESC LIMIT 1
        `, [req.user.id]);
        
        if (admissionResult.rows.length === 0) {
            return res.status(404).json({ error: 'No active admission' });
        }
        
        const admissionId = admissionResult.rows[0].id;
        
        // Get vitals for this admission (last 48 hours)
        const result = await pool.query(`
            SELECT 
                id, recorded_at, temperature, pulse, bp_systolic, bp_diastolic,
                respiratory_rate, spo2, blood_sugar, weight, notes
            FROM vitals_logs
            WHERE patient_id = $1 
              AND recorded_at >= NOW() - INTERVAL '48 hours'
            ORDER BY recorded_at DESC
            LIMIT 50
        `, [req.user.id]);
        
        // Calculate averages
        const vitals = result.rows;
        const avgVitals = {
            temperature: 0,
            pulse: 0,
            bpSystolic: 0,
            bpDiastolic: 0,
            spo2: 0
        };
        
        let count = { temp: 0, pulse: 0, bp: 0, spo2: 0 };
        
        vitals.forEach(v => {
            if (v.temperature) { avgVitals.temperature += parseFloat(v.temperature); count.temp++; }
            if (v.pulse) { avgVitals.pulse += parseInt(v.pulse); count.pulse++; }
            if (v.bp_systolic) { avgVitals.bpSystolic += parseInt(v.bp_systolic); count.bp++; }
            if (v.bp_diastolic) { avgVitals.bpDiastolic += parseInt(v.bp_diastolic); }
            if (v.spo2) { avgVitals.spo2 += parseInt(v.spo2); count.spo2++; }
        });
        
        if (count.temp) avgVitals.temperature = (avgVitals.temperature / count.temp).toFixed(1);
        if (count.pulse) avgVitals.pulse = Math.round(avgVitals.pulse / count.pulse);
        if (count.bp) {
            avgVitals.bpSystolic = Math.round(avgVitals.bpSystolic / count.bp);
            avgVitals.bpDiastolic = Math.round(avgVitals.bpDiastolic / count.bp);
        }
        if (count.spo2) avgVitals.spo2 = Math.round(avgVitals.spo2 / count.spo2);
        
        // Get latest vitals
        const latest = vitals[0] || null;
        
        res.json({
            success: true,
            vitals: {
                latest,
                history: vitals,
                averages: avgVitals,
                totalRecords: vitals.length
            }
        });
    } catch (err) {
        console.error('[IPD] Vitals error:', err);
        res.status(500).json({ error: 'Failed to get vitals' });
    }
});

/**
 * @route   GET /api/ipd/diet-plan
 * @desc    Get current diet plan
 * @access  Private (Patient)
 */
router.get('/diet-plan', authenticatePatient, async (req, res) => {
    try {
        // Get diet plan from care_tasks or dedicated diet table
        const result = await pool.query(`
            SELECT 
                ct.id, ct.task_type, ct.description, ct.scheduled_time,
                ct.status, ct.notes, ct.created_at
            FROM care_tasks ct
            JOIN admissions a ON ct.admission_id = a.id
            WHERE a.patient_id = $1 
              AND a.status = 'Admitted'
              AND ct.task_type = 'Diet'
              AND ct.scheduled_time >= CURRENT_DATE
            ORDER BY ct.scheduled_time
        `, [req.user.id]);
        
        // Group by meal time
        const meals = {
            breakfast: [],
            lunch: [],
            evening_snack: [],
            dinner: []
        };
        
        result.rows.forEach(task => {
            const hour = new Date(task.scheduled_time).getHours();
            if (hour >= 6 && hour < 10) meals.breakfast.push(task);
            else if (hour >= 12 && hour < 15) meals.lunch.push(task);
            else if (hour >= 16 && hour < 18) meals.evening_snack.push(task);
            else if (hour >= 19 && hour < 22) meals.dinner.push(task);
        });
        
        // Get dietary restrictions from care plan
        const restrictionsResult = await pool.query(`
            SELECT dietary_restrictions, allergy_notes 
            FROM care_plans cp
            JOIN admissions a ON cp.admission_id = a.id
            WHERE a.patient_id = $1 AND a.status = 'Admitted'
            ORDER BY cp.created_at DESC LIMIT 1
        `, [req.user.id]);
        
        const restrictions = restrictionsResult.rows[0] || {};
        
        res.json({
            success: true,
            dietPlan: {
                meals,
                restrictions: restrictions.dietary_restrictions,
                allergies: restrictions.allergy_notes,
                totalMeals: result.rows.length
            }
        });
    } catch (err) {
        console.error('[IPD] Diet plan error:', err);
        res.status(500).json({ error: 'Failed to get diet plan' });
    }
});

/**
 * @route   GET /api/ipd/discharge-progress
 * @desc    Get discharge readiness and pending items
 * @access  Private (Patient)
 */
router.get('/discharge-progress', authenticatePatient, async (req, res) => {
    try {
        const admissionResult = await pool.query(`
            SELECT id, admission_date, treating_doctor_id
            FROM admissions 
            WHERE patient_id = $1 AND status = 'Admitted'
            ORDER BY admission_date DESC LIMIT 1
        `, [req.user.id]);
        
        if (admissionResult.rows.length === 0) {
            return res.status(404).json({ error: 'No active admission' });
        }
        
        const admission = admissionResult.rows[0];
        
        // Check discharge requirements
        const checks = {
            doctorClearance: false,
            vitalsStable: false,
            billSettled: false,
            medicationReady: false,
            dischargeOrderSigned: false
        };
        
        // 1. Check if doctor has marked patient for discharge
        const dischargeOrder = await pool.query(`
            SELECT id FROM care_tasks 
            WHERE admission_id = $1 
              AND task_type = 'Discharge Order'
              AND status = 'Completed'
        `, [admission.id]);
        checks.dischargeOrderSigned = dischargeOrder.rows.length > 0;
        checks.doctorClearance = dischargeOrder.rows.length > 0;
        
        // 2. Check vitals stability (last 3 readings all normal)
        const vitalsCheck = await pool.query(`
            SELECT temperature, pulse, bp_systolic, spo2
            FROM vitals_logs
            WHERE patient_id = $1
            ORDER BY recorded_at DESC
            LIMIT 3
        `, [req.user.id]);
        
        if (vitalsCheck.rows.length >= 3) {
            const allNormal = vitalsCheck.rows.every(v => 
                (!v.temperature || (v.temperature >= 97 && v.temperature <= 99)) &&
                (!v.pulse || (v.pulse >= 60 && v.pulse <= 100)) &&
                (!v.bp_systolic || (v.bp_systolic >= 90 && v.bp_systolic <= 140)) &&
                (!v.spo2 || v.spo2 >= 95)
            );
            checks.vitalsStable = allNormal;
        }
        
        // 3. Check bill status
        const billCheck = await pool.query(`
            SELECT SUM(total_amount) as total, SUM(paid_amount) as paid
            FROM invoices
            WHERE patient_id = $1 AND admission_id = $2
        `, [req.user.id, admission.id]);
        
        const bill = billCheck.rows[0];
        checks.billSettled = !bill.total || parseFloat(bill.total) <= parseFloat(bill.paid || 0);
        
        // 4. Check if discharge medication is ready
        const medCheck = await pool.query(`
            SELECT id FROM prescriptions 
            WHERE admission_id = $1 
              AND prescription_type = 'Discharge'
              AND status = 'Dispensed'
        `, [admission.id]);
        checks.medicationReady = medCheck.rows.length > 0;
        
        // Calculate overall progress
        const completedSteps = Object.values(checks).filter(v => v).length;
        const totalSteps = Object.keys(checks).length;
        const progressPercent = Math.round((completedSteps / totalSteps) * 100);
        
        res.json({
            success: true,
            dischargeProgress: {
                percent: progressPercent,
                completedSteps,
                totalSteps,
                checks,
                estimatedDischarge: checks.doctorClearance ? 'Pending final clearance' : 'Not yet initiated',
                pendingAmount: bill.total ? (parseFloat(bill.total) - parseFloat(bill.paid || 0)).toFixed(2) : '0.00'
            }
        });
    } catch (err) {
        console.error('[IPD] Discharge progress error:', err);
        res.status(500).json({ error: 'Failed to get discharge progress' });
    }
});

/**
 * @route   GET /api/ipd/current-charges
 * @desc    Get running bill / current charges
 * @access  Private (Patient)
 */
router.get('/current-charges', authenticatePatient, async (req, res) => {
    try {
        const admissionResult = await pool.query(`
            SELECT id, admission_date, bed_number
            FROM admissions 
            WHERE patient_id = $1 AND status = 'Admitted'
            ORDER BY admission_date DESC LIMIT 1
        `, [req.user.id]);
        
        if (admissionResult.rows.length === 0) {
            return res.status(404).json({ error: 'No active admission' });
        }
        
        const admission = admissionResult.rows[0];
        
        // Get pending charges
        const chargesResult = await pool.query(`
            SELECT 
                id, charge_type, description, amount, quantity, 
                total_amount, created_at, status
            FROM pending_charges
            WHERE admission_id = $1
            ORDER BY created_at DESC
        `, [admission.id]);
        
        // Group charges by type
        const chargesByType = {};
        let totalPending = 0;
        
        chargesResult.rows.forEach(charge => {
            const type = charge.charge_type || 'Other';
            if (!chargesByType[type]) {
                chargesByType[type] = { items: [], subtotal: 0 };
            }
            chargesByType[type].items.push(charge);
            chargesByType[type].subtotal += parseFloat(charge.total_amount);
            totalPending += parseFloat(charge.total_amount);
        });
        
        // Get paid invoices
        const paidResult = await pool.query(`
            SELECT SUM(paid_amount) as total_paid
            FROM invoices
            WHERE admission_id = $1
        `, [admission.id]);
        
        const totalPaid = parseFloat(paidResult.rows[0]?.total_paid || 0);
        
        // Estimate bed charges
        const bedResult = await pool.query(`
            SELECT daily_rate FROM beds WHERE bed_number = $1
        `, [admission.bed_number]);
        
        const dailyRate = parseFloat(bedResult.rows[0]?.daily_rate || 0);
        const daysAdmitted = Math.ceil(
            (new Date() - new Date(admission.admission_date)) / (1000 * 60 * 60 * 24)
        );
        const estimatedBedCharges = dailyRate * daysAdmitted;
        
        res.json({
            success: true,
            charges: {
                byType: chargesByType,
                summary: {
                    totalPending,
                    totalPaid,
                    estimatedBedCharges,
                    estimatedTotal: totalPending + estimatedBedCharges,
                    balance: totalPending + estimatedBedCharges - totalPaid
                },
                daysAdmitted,
                dailyBedRate: dailyRate
            }
        });
    } catch (err) {
        console.error('[IPD] Charges error:', err);
        res.status(500).json({ error: 'Failed to get charges' });
    }
});

module.exports = router;
