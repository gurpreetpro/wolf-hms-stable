/**
 * Lab Test Parameters Routes
 * API endpoints for managing test definitions and instrument mappings
 */

const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const authMiddleware = require('../middleware/authMiddleware');

// Get all test parameters (grouped by test name)
router.get('/parameters', authMiddleware.protect, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM lab_parameters 
            ORDER BY test_name, display_order
        `);
        
        // Group by test name
        const grouped = {};
        result.rows.forEach(row => {
            if (!grouped[row.test_name]) {
                grouped[row.test_name] = [];
            }
            grouped[row.test_name].push(row);
        });
        
        res.json({
            total: result.rows.length,
            tests: Object.keys(grouped).length,
            grouped,
            flat: result.rows
        });
    } catch (error) {
        console.error('Get parameters error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get parameters for a specific test
router.get('/parameters/:testName', authMiddleware.protect, async (req, res) => {
    try {
        const { testName } = req.params;
        
        // First try exact match
        let result = await pool.query(
            'SELECT * FROM lab_parameters WHERE test_name = $1 ORDER BY display_order',
            [testName]
        );
        
        // If no exact match, try case-insensitive
        if (result.rows.length === 0) {
            result = await pool.query(
                'SELECT * FROM lab_parameters WHERE LOWER(test_name) = LOWER($1) ORDER BY display_order',
                [testName]
            );
        }
        
        // If still no match, try partial match
        if (result.rows.length === 0) {
            result = await pool.query(
                'SELECT * FROM lab_parameters WHERE LOWER(test_name) LIKE $1 ORDER BY display_order',
                [`%${testName.toLowerCase()}%`]
            );
        }
        
        // Return empty array if not found - frontend will use hardcoded definitions
        if (result.rows.length === 0) {
            return res.json([]);
        }
        
        res.json(result.rows);
    } catch (error) {
        console.error('Get test parameters error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Add a new test parameter
router.post('/parameters', authMiddleware.protect, async (req, res) => {
    try {
        const { 
            test_name, param_key, param_label, param_type, unit,
            reference_min, reference_max, reference_text, category,
            display_order, is_required, loinc_code, critical_low, critical_high
        } = req.body;

        const result = await pool.query(`
            INSERT INTO lab_parameters 
            (test_name, param_key, param_label, param_type, unit, reference_min, reference_max, 
             reference_text, category, display_order, is_required, loinc_code, critical_low, critical_high)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
            RETURNING *
        `, [test_name, param_key, param_label, param_type || 'number', unit, 
            reference_min, reference_max, reference_text, category,
            display_order || 0, is_required || false, loinc_code, critical_low, critical_high]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Add parameter error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update a test parameter
router.put('/parameters/:id', authMiddleware.protect, async (req, res) => {
    try {
        const { id } = req.params;
        const updates = req.body;
        
        const setClauses = [];
        const values = [];
        let i = 1;
        
        for (const [key, value] of Object.entries(updates)) {
            setClauses.push(`${key} = $${i}`);
            values.push(value);
            i++;
        }
        
        values.push(id);
        
        const result = await pool.query(`
            UPDATE lab_parameters 
            SET ${setClauses.join(', ')}, updated_at = NOW()
            WHERE id = $${i}
            RETURNING *
        `, values);

        res.json(result.rows[0]);
    } catch (error) {
        console.error('Update parameter error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete a test parameter
router.delete('/parameters/:id', authMiddleware.protect, async (req, res) => {
    try {
        await pool.query('DELETE FROM lab_parameters WHERE id = $1', [req.params.id]);
        res.json({ message: 'Parameter deleted' });
    } catch (error) {
        console.error('Delete parameter error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all instrument mappings
router.get('/mappings', authMiddleware.protect, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT * FROM instrument_test_mapping 
            ORDER BY manufacturer, model, instrument_code
        `);
        res.json(result.rows);
    } catch (error) {
        console.error('Get mappings error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Add instrument mapping
router.post('/mappings', authMiddleware.protect, async (req, res) => {
    try {
        const { manufacturer, model, instrument_code, wolf_param_key, wolf_test_name, unit_conversion } = req.body;

        const result = await pool.query(`
            INSERT INTO instrument_test_mapping 
            (manufacturer, model, instrument_code, wolf_param_key, wolf_test_name, unit_conversion)
            VALUES ($1, $2, $3, $4, $5, $6)
            RETURNING *
        `, [manufacturer, model, instrument_code, wolf_param_key, wolf_test_name, unit_conversion || {}]);

        res.status(201).json(result.rows[0]);
    } catch (error) {
        console.error('Add mapping error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete instrument mapping
router.delete('/mappings/:id', authMiddleware.protect, async (req, res) => {
    try {
        await pool.query('DELETE FROM instrument_test_mapping WHERE id = $1', [req.params.id]);
        res.json({ message: 'Mapping deleted' });
    } catch (error) {
        console.error('Delete mapping error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get categories (for filtering)
router.get('/categories', authMiddleware.protect, async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT DISTINCT category FROM lab_parameters 
            WHERE category IS NOT NULL 
            ORDER BY category
        `);
        res.json(result.rows.map(r => r.category));
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
});

// Bulk import parameters (JSON)
router.post('/parameters/import', authMiddleware.protect, async (req, res) => {
    try {
        const { parameters } = req.body;
        let imported = 0;

        for (const p of parameters) {
            await pool.query(`
                INSERT INTO lab_parameters 
                (test_name, param_key, param_label, param_type, unit, reference_min, reference_max, category)
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                ON CONFLICT DO NOTHING
            `, [p.test_name, p.param_key, p.param_label, p.param_type || 'number', 
                p.unit, p.reference_min, p.reference_max, p.category]);
            imported++;
        }

        res.json({ message: `Imported ${imported} parameters` });
    } catch (error) {
        console.error('Import error:', error);
        res.status(500).json({ message: 'Import failed' });
    }
});

module.exports = router;
