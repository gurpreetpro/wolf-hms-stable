const express = require('express');
const router = express.Router();
const { getUsers, getPendingUsers, updateApprovalStatus } = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');
const pool = require('../config/db');
const { clearPermissionCache } = require('../middleware/permissionMiddleware');

// Only Admin can access this
router.get('/users', protect, authorize('admin', 'receptionist'), getUsers);
// [FIX] Missing endpoint for Staff Management page
router.get('/staff', protect, authorize('admin', 'receptionist'), getUsers);

// NEW: Activity Logs & Recovery
const { getLogs, getAnalytics, getRecentPatients, getDailyTasks, getStats, forceCreatePatient } = require('../controllers/adminController');
const { backdateAdmission, voidAdmission } = require('../controllers/admissionController');

router.get('/logs', protect, authorize('admin'), getLogs);
router.get('/analytics', protect, authorize('admin'), getAnalytics);

// Dashboard Stats & Widgets
router.get('/stats', protect, authorize('admin'), getStats);
router.get('/recent-patients', protect, authorize('admin'), getRecentPatients);
router.get('/tasks', protect, authorize('admin'), getDailyTasks);

// User Approval Management
router.get('/pending-approvals', protect, authorize('admin'), getPendingUsers);
router.put('/users/:id/approval', protect, authorize('admin'), updateApprovalStatus);

// ====================================
// PHASE 5: Data Recovery Console
// ====================================
router.post('/recovery/patients', protect, authorize('admin'), forceCreatePatient);
router.post('/recovery/admissions', protect, authorize('admin'), backdateAdmission);
router.delete('/recovery/admissions/:id', protect, authorize('admin'), voidAdmission);

// ====================================
// PHASE 1: Permission Management APIs
// ====================================

/**
 * GET /api/admin/permissions/:role
 * Get permissions for a specific role
 */
router.get('/permissions/:role', protect, authorize('admin'), async (req, res) => {
    try {
        const { role } = req.params;
        const result = await pool.query(`
            SELECT module, can_create, can_read, can_update, can_delete, can_export
            FROM role_permissions
            WHERE role = $1 AND (hospital_id = $2)
            ORDER BY module
        `, [role, req.hospital_id]);

        const permissions = {};
        result.rows.forEach(row => {
            permissions[row.module] = {
                create: row.can_create,
                read: row.can_read,
                update: row.can_update,
                delete: row.can_delete,
                export: row.can_export
            };
        });

        res.json({ role, permissions });
    } catch (error) {
        console.error('[Permissions] Get error:', error);
        res.status(500).json({ message: 'Failed to fetch permissions' });
    }
});

/**
 * PUT /api/admin/permissions/:role
 * Update permissions for a role
 */
router.put('/permissions/:role', protect, authorize('admin'), async (req, res) => {
    try {
        const { role } = req.params;
        const { permissions } = req.body;

        if (!permissions || typeof permissions !== 'object') {
            return res.status(400).json({ message: 'Invalid permissions data' });
        }

        // Upsert each module permission
        for (const [module, perms] of Object.entries(permissions)) {
            await pool.query(`
                INSERT INTO role_permissions (role, module, can_create, can_read, can_update, can_delete, can_export, hospital_id)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT (role, module, hospital_id) 
                DO UPDATE SET 
                    can_create = $3, can_read = $4, can_update = $5, can_delete = $6, can_export = $7
            `, [role, module, perms.create || false, perms.read || false, perms.update || false, perms.delete || false, perms.export || false, req.hospital_id]);
        }

        // Clear cache to apply changes immediately
        clearPermissionCache();

        res.json({ message: 'Permissions updated successfully' });
    } catch (error) {
        console.error('[Permissions] Update error:', error);
        res.status(500).json({ message: 'Failed to update permissions' });
    }
});

/**
 * GET /api/admin/roles
 * Get all available roles
 */
router.get('/roles', protect, authorize('admin'), async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT DISTINCT role FROM role_permissions ORDER BY role
        `);
        res.json({ roles: result.rows.map(r => r.role) });
    } catch (error) {
        console.error('[Roles] Get error:', error);
        res.status(500).json({ message: 'Failed to fetch roles' });
    }
});

module.exports = router;
