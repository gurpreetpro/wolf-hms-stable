const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// [MIGRATION] Phase 9B: Login Security Tables
router.get('/migrate-login-security', async (req, res) => {
    try {
        console.log('🔧 Running Login Security Migration...');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_count INT DEFAULT 0');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ');
        await pool.query('ALTER TABLE users ADD COLUMN IF NOT EXISTS last_failed_ip VARCHAR(45)');
        await pool.query(`
            CREATE TABLE IF NOT EXISTS login_audit_log (
                id SERIAL PRIMARY KEY,
                user_id INT,
                username VARCHAR(255),
                hospital_id INT,
                action VARCHAR(50) NOT NULL,
                ip_address VARCHAR(45),
                user_agent TEXT,
                created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
            )
        `);
        res.json({ success: true, message: 'Login security migration applied successfully' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

module.exports = router;
