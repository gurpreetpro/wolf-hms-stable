/**
 * Admin Migration Routes
 * 
 * Allows running database migrations via API from within the cloud environment
 * Protected by admin secret key
 */

const express = require('express');
const router = express.Router();
const { pool } = require('../db');
const fs = require('fs');
const path = require('path');

// Admin secret for migration access
const ADMIN_SECRET = process.env.ADMIN_MIGRATE_SECRET || 'wolf-migrate-2026';

// Middleware to verify admin secret
const verifyAdminSecret = (req, res, next) => {
    const secret = req.headers['x-migrate-secret'] || req.query.secret;
    if (secret !== ADMIN_SECRET) {
        return res.status(403).json({ error: 'Unauthorized' });
    }
    next();
};

/**
 * POST /api/admin/run-migration
 * Run a specific migration file
 */
router.post('/run-migration', verifyAdminSecret, async (req, res) => {
    const { filename } = req.body;
    
    if (!filename) {
        return res.status(400).json({ error: 'Migration filename required' });
    }
    
    // Security: only allow .sql files from migrations folder
    if (!filename.endsWith('.sql') || filename.includes('..')) {
        return res.status(400).json({ error: 'Invalid migration filename' });
    }
    
    const migrationPath = path.join(__dirname, '..', 'migrations', filename);
    
    if (!fs.existsSync(migrationPath)) {
        return res.status(404).json({ error: `Migration file not found: ${filename}` });
    }
    
    const sql = fs.readFileSync(migrationPath, 'utf8');
    const client = await pool.connect();
    const results = [];
    
    try {
        await client.query('BEGIN');
        
        // Split by semicolon, filter empty and comments
        const statements = sql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0 && !s.startsWith('--') && !s.startsWith('RAISE'));
        
        for (let i = 0; i < statements.length; i++) {
            const stmt = statements[i] + ';';
            const preview = stmt.substring(0, 80).replace(/\s+/g, ' ');
            
            try {
                await client.query(stmt);
                results.push({ index: i + 1, status: 'success', preview });
            } catch (err) {
                if (err.message.includes('already exists') || err.message.includes('duplicate')) {
                    results.push({ index: i + 1, status: 'skipped', preview, reason: 'already exists' });
                } else {
                    throw err;
                }
            }
        }
        
        await client.query('COMMIT');
        
        res.json({
            success: true,
            message: `Migration ${filename} completed`,
            statements: statements.length,
            results
        });
        
    } catch (err) {
        await client.query('ROLLBACK');
        res.status(500).json({
            success: false,
            error: err.message,
            results
        });
    } finally {
        client.release();
    }
});

/**
 * GET /api/admin/list-migrations
 * List available migration files
 */
router.get('/list-migrations', verifyAdminSecret, async (req, res) => {
    const migrationsDir = path.join(__dirname, '..', 'migrations');
    
    try {
        const files = fs.readdirSync(migrationsDir)
            .filter(f => f.endsWith('.sql'))
            .sort();
        
        res.json({ success: true, migrations: files });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * POST /api/admin/run-sql
 * Run arbitrary SQL (use with caution)
 */
router.post('/run-sql', verifyAdminSecret, async (req, res) => {
    const { sql } = req.body;
    
    if (!sql) {
        return res.status(400).json({ error: 'SQL required' });
    }
    
    try {
        const result = await pool.query(sql);
        res.json({
            success: true,
            rowCount: result.rowCount,
            rows: result.rows?.slice(0, 100) // Limit output
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
