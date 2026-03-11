const { pool } = require('../db');
const { getHospitalId } = require('../utils/tenantHelper');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

// Get all order sets - Multi-Tenant
const getOrderSets = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const result = await pool.query('SELECT * FROM order_sets WHERE (hospital_id = $1) ORDER BY category, name', [hospitalId]);
    ResponseHandler.success(res, result.rows);
});

// Apply an order set - Multi-Tenant
const applyOrderSet = asyncHandler(async (req, res) => {
    const { admission_id, patient_id, order_set_id, items } = req.body;
    const doctor_id = req.user.id;
    const hospitalId = getHospitalId(req);
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        let itemsToProcess = items;
        if (!itemsToProcess) {
            const setResult = await client.query('SELECT items_json FROM order_sets WHERE id = $1', [order_set_id]);
            if (setResult.rows.length === 0) {
                await client.query('ROLLBACK');
                return ResponseHandler.error(res, 'Order set not found', 404);
            }
            itemsToProcess = setResult.rows[0].items_json;
        }

        const results = [];

        for (const item of itemsToProcess) {
            if (item.type === 'medication') {
                const medRes = await client.query(
                    `INSERT INTO care_tasks (patient_id, admission_id, doctor_id, type, description, scheduled_time, status, hospital_id)
                     VALUES ($1, $2, $3, 'Medication', $4, NOW(), 'Pending', $5) RETURNING id`,
                    [patient_id, admission_id, doctor_id, `${item.drug_name} ${item.dosage} ${item.frequency} - ${item.duration}`, hospitalId]
                );
                results.push({ type: 'Medication', id: medRes.rows[0].id });
            } else if (item.type === 'lab') {
                const labRes = await client.query(
                    `INSERT INTO lab_requests (patient_id, doctor_id, test_name, priority, status, requested_at, hospital_id)
                     VALUES ($1, $2, $3, $4, 'Pending', NOW(), $5) RETURNING id`,
                    [patient_id, doctor_id, item.test_name, item.priority || 'Routine', hospitalId]
                );
                results.push({ type: 'Lab', id: labRes.rows[0].id });
            }
        }

        await client.query('COMMIT');
        if (req.io) req.io.emit('clinical_update', { type: 'orders_placed', admission_id });
        ResponseHandler.success(res, { message: 'Order set applied successfully', results }, 'Order set applied successfully', 201);
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Error applying order set:', err);
        throw err;
    } finally {
        client.release();
    }
});

module.exports = { getOrderSets, applyOrderSet };
