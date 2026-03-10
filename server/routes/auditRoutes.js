/**
 * Audit Trail API Routes
 * Gold Standard Phase 4 - View and export audit logs
 */
const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const { protect, authorize } = require('../middleware/authMiddleware');

// All routes require admin authorization
router.use(protect);
router.use(authorize('admin'));

/**
 * Get audit logs with filtering and pagination
 */
router.get('/logs', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 50, 
            action, 
            entity_type, 
            user_id, 
            from_date, 
            to_date,
            search 
        } = req.query;

        const offset = (page - 1) * limit;
        let query = `
            SELECT 
                id, action, entity_type, entity_id, 
                user_id, user_name, user_role,
                description, ip_address, created_at
            FROM audit_logs
            WHERE 1=1
        `;
        let countQuery = 'SELECT COUNT(*) as total FROM audit_logs WHERE 1=1';
        const params = [];
        let paramIndex = 1;

        // Apply filters
        if (action) {
            query += ` AND action = $${paramIndex}`;
            countQuery += ` AND action = $${paramIndex}`;
            params.push(action);
            paramIndex++;
        }

        if (entity_type) {
            query += ` AND entity_type = $${paramIndex}`;
            countQuery += ` AND entity_type = $${paramIndex}`;
            params.push(entity_type);
            paramIndex++;
        }

        if (user_id) {
            query += ` AND user_id = $${paramIndex}`;
            countQuery += ` AND user_id = $${paramIndex}`;
            params.push(user_id);
            paramIndex++;
        }

        if (from_date) {
            query += ` AND created_at >= $${paramIndex}`;
            countQuery += ` AND created_at >= $${paramIndex}`;
            params.push(from_date);
            paramIndex++;
        }

        if (to_date) {
            query += ` AND created_at <= $${paramIndex}`;
            countQuery += ` AND created_at <= $${paramIndex}`;
            params.push(to_date);
            paramIndex++;
        }

        if (search) {
            query += ` AND (user_name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
            countQuery += ` AND (user_name ILIKE $${paramIndex} OR description ILIKE $${paramIndex})`;
            params.push(`%${search}%`);
            paramIndex++;
        }

        // Get total count
        const countResult = await pool.query(countQuery, params);
        const total = parseInt(countResult.rows[0]?.total) || 0;

        // Get paginated results
        query += ` ORDER BY created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
        params.push(limit, offset);

        const result = await pool.query(query, params);

        res.json({
            logs: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (err) {
        console.error('Get audit logs error:', err);
        res.status(500).json({ message: 'Failed to fetch audit logs' });
    }
});

/**
 * Get audit log details including full values
 */
router.get('/logs/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT * FROM audit_logs WHERE id = $1',
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Audit log not found' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error('Get audit log detail error:', err);
        res.status(500).json({ message: 'Failed to fetch audit log' });
    }
});

/**
 * Get audit statistics
 */
router.get('/stats', async (req, res) => {
    try {
        const { days = 7 } = req.query;

        // Actions by type in last N days
        const actionStats = await pool.query(`
            SELECT action, COUNT(*) as count
            FROM audit_logs
            WHERE created_at >= NOW() - INTERVAL '${days} days'
            GROUP BY action
            ORDER BY count DESC
            LIMIT 10
        `);

        // Activity by user
        const userStats = await pool.query(`
            SELECT user_name, user_role, COUNT(*) as count
            FROM audit_logs
            WHERE created_at >= NOW() - INTERVAL '${days} days' AND user_name IS NOT NULL
            GROUP BY user_name, user_role
            ORDER BY count DESC
            LIMIT 10
        `);

        // Activity by day
        const dailyStats = await pool.query(`
            SELECT DATE(created_at) as date, COUNT(*) as count
            FROM audit_logs
            WHERE created_at >= NOW() - INTERVAL '${days} days'
            GROUP BY DATE(created_at)
            ORDER BY date ASC
        `);

        res.json({
            period_days: parseInt(days),
            action_breakdown: actionStats.rows,
            user_activity: userStats.rows,
            daily_trend: dailyStats.rows
        });
    } catch (err) {
        console.error('Get audit stats error:', err);
        res.status(500).json({ message: 'Failed to fetch audit stats' });
    }
});

/**
 * Export audit logs as CSV
 */
router.get('/export', async (req, res) => {
    try {
        const { from_date, to_date, action, entity_type } = req.query;

        let query = `
            SELECT 
                id, action, entity_type, entity_id,
                user_name, user_role, description,
                ip_address, created_at
            FROM audit_logs
            WHERE 1=1
        `;
        const params = [];
        let paramIndex = 1;

        if (from_date) {
            query += ` AND created_at >= $${paramIndex}`;
            params.push(from_date);
            paramIndex++;
        }

        if (to_date) {
            query += ` AND created_at <= $${paramIndex}`;
            params.push(to_date);
            paramIndex++;
        }

        if (action) {
            query += ` AND action = $${paramIndex}`;
            params.push(action);
            paramIndex++;
        }

        if (entity_type) {
            query += ` AND entity_type = $${paramIndex}`;
            params.push(entity_type);
            paramIndex++;
        }

        query += ' ORDER BY created_at DESC LIMIT 10000';

        const result = await pool.query(query, params);

        // Generate CSV
        const headers = ['ID', 'Action', 'Entity Type', 'Entity ID', 'User', 'Role', 'Description', 'IP', 'Timestamp'];
        const rows = result.rows.map(r => [
            r.id,
            r.action,
            r.entity_type,
            r.entity_id || '',
            r.user_name || '',
            r.user_role || '',
            (r.description || '').replace(/,/g, ';'),
            r.ip_address || '',
            new Date(r.created_at).toISOString()
        ]);

        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');

        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=audit_logs_${new Date().toISOString().split('T')[0]}.csv`);
        res.send(csv);
    } catch (err) {
        console.error('Export audit logs error:', err);
        res.status(500).json({ message: 'Failed to export audit logs' });
    }
});

module.exports = router;
