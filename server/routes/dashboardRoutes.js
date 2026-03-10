/**
 * Dashboard Routes
 * Provides real-time statistics and KPIs for the Wolf HMS dashboard
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { protect } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../middleware/errorHandler');

// Dashboard Stats - Real Data
router.get('/stats', protect, asyncHandler(async (req, res) => {
    const hospitalId = req.hospital_id || 1;
    const today = new Date().toISOString().split('T')[0];

    // Parallel queries for performance
    const [patientsToday, activeAdmissions, pendingLabs, opdQueue] = await Promise.all([
        pool.query(
            `SELECT COUNT(*) FROM patients WHERE hospital_id = $1 AND DATE(created_at) = $2`,
            [hospitalId, today]
        ),
        pool.query(
            `SELECT COUNT(*) FROM admissions WHERE hospital_id = $1 AND status = 'Admitted'`,
            [hospitalId]
        ),
        pool.query(
            `SELECT COUNT(*) FROM lab_orders WHERE hospital_id = $1 AND status IN ('Pending', 'Sample Collected')`,
            [hospitalId]
        ),
        pool.query(
            `SELECT COUNT(*) FROM opd_visits WHERE hospital_id = $1 AND visit_date = $2 AND status = 'Waiting'`,
            [hospitalId, today]
        )
    ]);

    res.json({
        success: true,
        data: {
            patients_today: parseInt(patientsToday.rows[0]?.count || 0),
            admissions_active: parseInt(activeAdmissions.rows[0]?.count || 0),
            lab_pending: parseInt(pendingLabs.rows[0]?.count || 0),
            opd_queue: parseInt(opdQueue.rows[0]?.count || 0)
        }
    });
}));

// Dashboard KPIs - Real Data
router.get('/kpi', protect, asyncHandler(async (req, res) => {
    const hospitalId = req.hospital_id || 1;
    const today = new Date().toISOString().split('T')[0];

    // Parallel queries
    const [revenueToday, bedOccupancy, avgWaitTime] = await Promise.all([
        pool.query(
            `SELECT COALESCE(SUM(total_amount), 0) as revenue FROM invoices 
             WHERE hospital_id = $1 AND DATE(generated_at) = $2`,
            [hospitalId, today]
        ),
        pool.query(
            `SELECT 
                COUNT(*) FILTER (WHERE status = 'Occupied') as occupied,
                COUNT(*) as total
             FROM beds 
             WHERE hospital_id = $1`,
            [hospitalId]
        ),
        pool.query(
            `SELECT AVG(EXTRACT(EPOCH FROM (consultation_time - check_in_time)) / 60) as avg_wait
             FROM opd_visits 
             WHERE hospital_id = $1 AND visit_date = $2 AND consultation_time IS NOT NULL`,
            [hospitalId, today]
        )
    ]);

    const occupiedBeds = parseInt(bedOccupancy.rows[0]?.occupied || 0);
    const totalBeds = parseInt(bedOccupancy.rows[0]?.total || 1);
    const occupancyRate = Math.round((occupiedBeds / totalBeds) * 100);

    res.json({
        success: true,
        data: {
            revenue_today: parseFloat(revenueToday.rows[0]?.revenue || 0),
            occupancy_rate: occupancyRate,
            avg_wait_time: Math.round(avgWaitTime.rows[0]?.avg_wait || 0),
            occupied_beds: occupiedBeds,
            total_beds: totalBeds
        }
    });
}));

// Department-wise summary
router.get('/departments', protect, asyncHandler(async (req, res) => {
    const hospitalId = req.hospital_id || 1;
    const today = new Date().toISOString().split('T')[0];

    const departments = await pool.query(`
        SELECT 
            department,
            COUNT(*) FILTER (WHERE status = 'Waiting') as waiting,
            COUNT(*) FILTER (WHERE status = 'In Consultation') as in_progress,
            COUNT(*) FILTER (WHERE status = 'Completed') as completed
        FROM opd_visits 
        WHERE hospital_id = $1 AND visit_date = $2
        GROUP BY department
        ORDER BY department
    `, [hospitalId, today]);

    res.json({
        success: true,
        data: departments.rows
    });
}));

// Recent activity feed
router.get('/activity', protect, asyncHandler(async (req, res) => {
    const hospitalId = req.hospital_id || 1;
    const limit = parseInt(req.query.limit) || 20;

    const activity = await pool.query(`
        SELECT 'admission' as type, 'New Admission' as action, p.name, a.created_at as timestamp
        FROM admissions a
        JOIN patients p ON a.patient_id = p.id
        WHERE a.hospital_id = $1
        ORDER BY a.created_at DESC
        LIMIT $2
    `, [hospitalId, limit]);

    res.json({
        success: true,
        data: activity.rows
    });
}));

// Debug Ping
router.get('/ping', (req, res) => res.json({ status: 'Dashboard Routes OK', timestamp: new Date() }));

module.exports = router;
