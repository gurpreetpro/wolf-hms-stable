const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const pool = require('../config/db');

// Get All Inventory Items
router.get('/', protect, async (req, res) => {
    try {
        const hospitalId = req.user?.hospital_id || 1;
        const result = await pool.query(`
            SELECT * FROM inventory_items 
            WHERE (hospital_id = $1 OR hospital_id IS NULL)
            ORDER BY name
        `, [hospitalId]);
        res.json({ success: true, data: result.rows });
    } catch (e) {
        console.error('Inventory fetch error:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

// Get Inventory Categories
router.get('/categories', protect, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT DISTINCT category FROM inventory_items WHERE category IS NOT NULL ORDER BY category
        `);
        res.json({ success: true, data: result.rows.map(r => r.category) });
    } catch (e) {
        console.error('Inventory categories error:', e);
        res.status(500).json({ success: false, error: e.message });
    }
});

module.exports = router;
