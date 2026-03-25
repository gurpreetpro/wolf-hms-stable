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
            WHERE (hospital_id = $1)
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

// [ENTERPRISE] Wolf Runner: Scan & Receive Inventory Transfer
// When the truck arrives at the Spoke clinic, the staff scans the barcode to physically accept the transfer.
router.post('/transfers/:id/scan-receive', protect, async (req, res) => {
    const transferId = req.params.id;
    const hospitalId = req.hospital_id; // Must match target_hospital_id
    
    const client = await pool.connect();
    try {
        await client.query('BEGIN');
        
        // 1. Verify transfer exists and is in transit
        const transferRes = await client.query(
            `SELECT * FROM inventory_transfers WHERE id = $1 AND target_hospital_id = $2`, 
            [transferId, hospitalId]
        );
        
        if (transferRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, message: 'Transfer not found or not destined for this hospital.' });
        }
        
        const transfer = transferRes.rows[0];
        
        if (transfer.status === 'RECEIVED') {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: 'Transfer has already been received.' });
        }
        
        if (transfer.status !== 'IN_TRANSIT') {
            await client.query('ROLLBACK');
            return res.status(400).json({ success: false, message: `Cannot receive transfer in ${transfer.status} state. Must be IN_TRANSIT.` });
        }

        // 2. We need to increment the Spoke's inventory.
        // First, check if the item already exists in the Spoke's inventory_items table
        // We assume items have a unique 'name' or a shared 'sku' across the network.
        // For simplicity in this bounded context, we will clone the source item's metadata if missing, or update quantity if exists.
        
        const sourceItemRes = await client.query(`SELECT * FROM inventory_items WHERE id = $1`, [transfer.item_id]);
        if (sourceItemRes.rows.length === 0) {
            await client.query('ROLLBACK');
            return res.status(500).json({ success: false, message: 'Critical error: Source item metadata not found.' });
        }
        const sourceItem = sourceItemRes.rows[0];

        // Find match in Spoke
        const targetItemRes = await client.query(
            `SELECT * FROM inventory_items WHERE name = $1 AND hospital_id = $2`,
            [sourceItem.name, hospitalId]
        );

        if (targetItemRes.rows.length > 0) {
            // Update existing
            await client.query(
                `UPDATE inventory_items SET quantity = quantity + $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
                [transfer.quantity, targetItemRes.rows[0].id]
            );
        } else {
            // Create new item in Spoke's ledger
            await client.query(
                `INSERT INTO inventory_items (name, category, description, unit, unit_price, quantity, reorder_level, location, hospital_id)
                 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
                [sourceItem.name, sourceItem.category, sourceItem.description, sourceItem.unit, sourceItem.unit_price, transfer.quantity, sourceItem.reorder_level || 10, 'Receiving Bay', hospitalId]
            );
        }
        
        // 3. Update Transfer Status to RECEIVED
        await client.query(
            `UPDATE inventory_transfers 
             SET status = 'RECEIVED', received_at = CURRENT_TIMESTAMP, received_by = $1, updated_at = CURRENT_TIMESTAMP
             WHERE id = $2`,
            [req.user ? req.user.id : null, transferId]
        );
        
        await client.query('COMMIT');
        
        res.json({ 
            success: true, 
            message: 'Inventory successfully received and ledger updated.',
            transferId: transferId
        });
        
    } catch (e) {
        await client.query('ROLLBACK');
        console.error('[WolfRunner] Scan-Receive Error:', e);
        res.status(500).json({ success: false, error: e.message });
    } finally {
        client.release();
    }
});

module.exports = router;
