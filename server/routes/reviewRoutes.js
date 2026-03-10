/**
 * Wolf HMS - Doctor Reviews Routes
 * 
 * API for doctor reviews from Wolf Care patient app
 * 
 * Endpoints:
 * - POST /api/reviews/submit           - Submit a review
 * - GET  /api/reviews/doctor/:id       - Get reviews for a doctor
 * - GET  /api/reviews/doctor/:id/summary - Get rating summary
 * - POST /api/reviews/:id/helpful      - Mark review as helpful
 * - POST /api/reviews/:id/report       - Report a review
 * - DELETE /api/reviews/:id            - Delete own review
 * - GET  /api/reviews/pending          - Admin: Get pending moderation
 * - PUT  /api/reviews/:id/moderate     - Admin: Moderate review
 * - GET  /api/reviews/can-review       - Check if patient can review
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { verifyToken } = require('../services/otpAuthService');

// ====================
// Middleware: Patient Auth
// ====================
const authenticatePatient = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'No token provided' });
        }
        
        const token = authHeader.split(' ')[1];
        const decoded = verifyToken(token);
        
        if (!decoded) {
            return res.status(401).json({ error: 'Invalid token' });
        }
        
        req.patient = decoded;
        next();
    } catch (err) {
        res.status(401).json({ error: 'Authentication failed' });
    }
};

// ====================
// POST /submit - Submit a review
// ====================
router.post('/submit', authenticatePatient, async (req, res) => {
    try {
        const { doctor_id, appointment_id, rating, title, comment, tags, is_anonymous } = req.body;
        const patientId = req.patient.id;
        const hospitalId = req.patient.hospital_id || 1;
        
        if (!doctor_id || !rating || rating < 1 || rating > 5) {
            return res.status(400).json({ 
                success: false, 
                error: 'Doctor ID and rating (1-5) are required' 
            });
        }
        
        // Check if patient can review (had appointment with doctor)
        const eligibility = await pool.query(`
            SELECT id FROM appointments 
            WHERE patient_id = $1 AND doctor_id = $2 AND status = 'Completed'
            LIMIT 1
        `, [patientId, doctor_id]);
        
        if (eligibility.rows.length === 0 && !appointment_id) {
            return res.status(403).json({ 
                success: false, 
                error: 'You can only review doctors you have visited' 
            });
        }
        
        // Check for recent duplicate
        const existing = await pool.query(`
            SELECT id FROM doctor_reviews 
            WHERE doctor_id = $1 AND patient_id = $2 
            AND created_at > NOW() - INTERVAL '30 days'
            AND status = 'active'
        `, [doctor_id, patientId]);
        
        if (existing.rows.length > 0) {
            return res.status(409).json({ 
                success: false, 
                error: 'You have already reviewed this doctor recently' 
            });
        }
        
        // Insert review
        const result = await pool.query(`
            INSERT INTO doctor_reviews 
            (doctor_id, patient_id, appointment_id, rating, title, comment, tags, is_anonymous, hospital_id)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING id, rating, title, created_at
        `, [doctor_id, patientId, appointment_id, rating, title, comment, tags || [], is_anonymous || false, hospitalId]);
        
        res.json({
            success: true,
            message: 'Review submitted successfully',
            review: result.rows[0]
        });
        
    } catch (err) {
        console.error('[REVIEWS] Submit error:', err);
        res.status(500).json({ success: false, error: 'Failed to submit review' });
    }
});

// ====================
// GET /doctor/:id - Get reviews for a doctor
// ====================
router.get('/doctor/:id', async (req, res) => {
    try {
        const doctorId = req.params.id;
        const { limit = 10, offset = 0, sort = 'recent' } = req.query;
        
        let orderBy = 'created_at DESC';
        if (sort === 'helpful') orderBy = 'helpful_count DESC, created_at DESC';
        if (sort === 'rating_high') orderBy = 'rating DESC, created_at DESC';
        if (sort === 'rating_low') orderBy = 'rating ASC, created_at DESC';
        
        const result = await pool.query(`
            SELECT 
                r.id, r.rating, r.title, r.comment, r.tags, r.helpful_count,
                r.is_anonymous, r.created_at,
                CASE WHEN r.is_anonymous THEN 'Anonymous' ELSE p.name END as patient_name
            FROM doctor_reviews r
            LEFT JOIN patients p ON r.patient_id = p.id
            WHERE r.doctor_id = $1 AND r.status = 'active'
            ORDER BY ${orderBy}
            LIMIT $2 OFFSET $3
        `, [doctorId, limit, offset]);
        
        const countResult = await pool.query(`
            SELECT COUNT(*) as total FROM doctor_reviews 
            WHERE doctor_id = $1 AND status = 'active'
        `, [doctorId]);
        
        res.json({
            success: true,
            reviews: result.rows,
            total: parseInt(countResult.rows[0].total),
            limit: parseInt(limit),
            offset: parseInt(offset)
        });
        
    } catch (err) {
        console.error('[REVIEWS] Fetch error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch reviews' });
    }
});

// ====================
// GET /doctor/:id/summary - Get rating summary
// ====================
router.get('/doctor/:id/summary', async (req, res) => {
    try {
        const doctorId = req.params.id;
        
        const result = await pool.query(`
            SELECT * FROM doctor_rating_summary WHERE doctor_id = $1
        `, [doctorId]);
        
        if (result.rows.length === 0) {
            return res.json({
                success: true,
                summary: {
                    total_reviews: 0,
                    avg_rating: 0,
                    distribution: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
                }
            });
        }
        
        const row = result.rows[0];
        res.json({
            success: true,
            summary: {
                total_reviews: parseInt(row.total_reviews),
                avg_rating: parseFloat(row.avg_rating),
                distribution: {
                    5: parseInt(row.five_star),
                    4: parseInt(row.four_star),
                    3: parseInt(row.three_star),
                    2: parseInt(row.two_star),
                    1: parseInt(row.one_star)
                }
            }
        });
        
    } catch (err) {
        console.error('[REVIEWS] Summary error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch summary' });
    }
});

// ====================
// POST /:id/helpful - Mark review as helpful
// ====================
router.post('/:id/helpful', authenticatePatient, async (req, res) => {
    try {
        const reviewId = req.params.id;
        const patientId = req.patient.id;
        
        // Toggle helpful
        const existing = await pool.query(`
            SELECT id FROM review_helpful WHERE review_id = $1 AND patient_id = $2
        `, [reviewId, patientId]);
        
        if (existing.rows.length > 0) {
            await pool.query(`
                DELETE FROM review_helpful WHERE review_id = $1 AND patient_id = $2
            `, [reviewId, patientId]);
            
            res.json({ success: true, action: 'removed', message: 'Helpful removed' });
        } else {
            await pool.query(`
                INSERT INTO review_helpful (review_id, patient_id) VALUES ($1, $2)
            `, [reviewId, patientId]);
            
            res.json({ success: true, action: 'added', message: 'Marked as helpful' });
        }
        
    } catch (err) {
        console.error('[REVIEWS] Helpful error:', err);
        res.status(500).json({ success: false, error: 'Failed to update helpful' });
    }
});

// ====================
// POST /:id/report - Report a review
// ====================
router.post('/:id/report', authenticatePatient, async (req, res) => {
    try {
        const reviewId = req.params.id;
        const { reason, details } = req.body;
        const reporterId = req.patient.id;
        
        if (!reason) {
            return res.status(400).json({ success: false, error: 'Report reason is required' });
        }
        
        // Check if already reported by this user
        const existing = await pool.query(`
            SELECT id FROM review_reports 
            WHERE review_id = $1 AND reporter_id = $2 AND status = 'pending'
        `, [reviewId, reporterId]);
        
        if (existing.rows.length > 0) {
            return res.status(409).json({ success: false, error: 'You have already reported this review' });
        }
        
        await pool.query(`
            INSERT INTO review_reports (review_id, reporter_id, reason, details)
            VALUES ($1, $2, $3, $4)
        `, [reviewId, reporterId, reason, details]);
        
        res.json({ success: true, message: 'Review reported for moderation' });
        
    } catch (err) {
        console.error('[REVIEWS] Report error:', err);
        res.status(500).json({ success: false, error: 'Failed to report review' });
    }
});

// ====================
// DELETE /:id - Delete own review
// ====================
router.delete('/:id', authenticatePatient, async (req, res) => {
    try {
        const reviewId = req.params.id;
        const patientId = req.patient.id;
        
        const result = await pool.query(`
            UPDATE doctor_reviews 
            SET status = 'deleted', updated_at = NOW()
            WHERE id = $1 AND patient_id = $2 AND status = 'active'
            RETURNING id
        `, [reviewId, patientId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Review not found or already deleted' });
        }
        
        res.json({ success: true, message: 'Review deleted' });
        
    } catch (err) {
        console.error('[REVIEWS] Delete error:', err);
        res.status(500).json({ success: false, error: 'Failed to delete review' });
    }
});

// ====================
// GET /can-review - Check if patient can review doctor
// ====================
router.get('/can-review', authenticatePatient, async (req, res) => {
    try {
        const { doctor_id } = req.query;
        const patientId = req.patient.id;
        
        if (!doctor_id) {
            return res.status(400).json({ success: false, error: 'Doctor ID required' });
        }
        
        // Check completed appointment
        const appointment = await pool.query(`
            SELECT id, date FROM appointments 
            WHERE patient_id = $1 AND doctor_id = $2 AND status = 'Completed'
            ORDER BY date DESC LIMIT 1
        `, [patientId, doctor_id]);
        
        // Check existing recent review
        const existing = await pool.query(`
            SELECT id FROM doctor_reviews 
            WHERE doctor_id = $1 AND patient_id = $2 
            AND created_at > NOW() - INTERVAL '30 days' AND status = 'active'
        `, [doctor_id, patientId]);
        
        const canReview = appointment.rows.length > 0 && existing.rows.length === 0;
        
        res.json({
            success: true,
            can_review: canReview,
            reason: !appointment.rows.length 
                ? 'No completed appointment with this doctor' 
                : existing.rows.length > 0 
                    ? 'Already reviewed this doctor recently' 
                    : null,
            last_appointment: appointment.rows[0] || null
        });
        
    } catch (err) {
        console.error('[REVIEWS] Can review error:', err);
        res.status(500).json({ success: false, error: 'Failed to check eligibility' });
    }
});

// ====================
// ADMIN: GET /pending - Get reviews pending moderation
// ====================
router.get('/pending', async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT 
                r.id, r.rating, r.title, r.comment, r.is_anonymous, r.status, r.created_at,
                p.name as patient_name,
                u.username as doctor_name,
                COUNT(rr.id) as report_count
            FROM doctor_reviews r
            LEFT JOIN patients p ON r.patient_id = p.id
            LEFT JOIN users u ON r.doctor_id = u.id
            LEFT JOIN review_reports rr ON r.id = rr.review_id AND rr.status = 'pending'
            WHERE r.status = 'reported'
            GROUP BY r.id, p.name, u.username
            ORDER BY report_count DESC, r.created_at DESC
        `);
        
        res.json({
            success: true,
            reviews: result.rows
        });
        
    } catch (err) {
        console.error('[REVIEWS] Pending error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch pending reviews' });
    }
});

// ====================
// ADMIN: PUT /:id/moderate - Moderate a review
// ====================
router.put('/:id/moderate', async (req, res) => {
    try {
        const reviewId = req.params.id;
        const { action, admin_notes } = req.body; // action: 'approve', 'hide', 'delete'
        const adminId = req.user?.id || 1;
        
        let newStatus;
        if (action === 'approve') newStatus = 'active';
        else if (action === 'hide') newStatus = 'hidden';
        else if (action === 'delete') newStatus = 'deleted';
        else {
            return res.status(400).json({ success: false, error: 'Invalid action' });
        }
        
        // Update review
        await pool.query(`
            UPDATE doctor_reviews 
            SET status = $1, updated_at = NOW()
            WHERE id = $2
        `, [newStatus, reviewId]);
        
        // Update all pending reports for this review
        await pool.query(`
            UPDATE review_reports 
            SET status = 'reviewed', reviewed_by = $1, reviewed_at = NOW(), admin_notes = $2
            WHERE review_id = $3 AND status = 'pending'
        `, [adminId, admin_notes, reviewId]);
        
        res.json({ success: true, message: `Review ${action}d successfully` });
        
    } catch (err) {
        console.error('[REVIEWS] Moderate error:', err);
        res.status(500).json({ success: false, error: 'Failed to moderate review' });
    }
});

// ====================
// GET /all - Admin: Get all reviews with filters
// ====================
router.get('/all', async (req, res) => {
    try {
        const { doctor_id, status, limit = 50, offset = 0 } = req.query;
        
        let query = `
            SELECT 
                r.id, r.rating, r.title, r.comment, r.tags, r.helpful_count,
                r.is_anonymous, r.status, r.created_at,
                p.name as patient_name, p.phone as patient_phone,
                u.username as doctor_name
            FROM doctor_reviews r
            LEFT JOIN patients p ON r.patient_id = p.id
            LEFT JOIN users u ON r.doctor_id = u.id
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;
        
        if (doctor_id) {
            query += ` AND r.doctor_id = $${paramIndex++}`;
            params.push(doctor_id);
        }
        
        if (status) {
            query += ` AND r.status = $${paramIndex++}`;
            params.push(status);
        }
        
        query += ` ORDER BY r.created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex}`;
        params.push(limit, offset);
        
        const result = await pool.query(query, params);
        
        res.json({
            success: true,
            reviews: result.rows
        });
        
    } catch (err) {
        console.error('[REVIEWS] All error:', err);
        res.status(500).json({ success: false, error: 'Failed to fetch reviews' });
    }
});

module.exports = router;
