const { pool } = require('../db');
const { getHospitalId } = require('../utils/tenantHelper');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

// Get all care plan templates - Multi-Tenant
const getCarePlanTemplates = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req);
    const result = await pool.query('SELECT * FROM care_plan_templates WHERE (hospital_id = $1) ORDER BY name', [hospitalId]);
    ResponseHandler.success(res, result.rows);
});

// Assign a plan to a patient - Multi-Tenant
const assignCarePlan = asyncHandler(async (req, res) => {
    const { template_id, patient_id, admission_id, custom_items } = req.body;
    const assigned_by = req.user.id;
    const hospitalId = getHospitalId(req);
    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        let planItems = custom_items || [];
        if (planItems.length === 0) {
            const tmplRes = await client.query('SELECT items_json FROM care_plan_templates WHERE id = $1', [template_id]);
            if (tmplRes.rows.length > 0) {
                planItems = tmplRes.rows[0].items_json.map(item => ({ ...item, status: 'Pending', completed_at: null }));
            }
        }

        const result = await client.query(
            `INSERT INTO patient_care_plans 
            (template_id, patient_id, admission_id, status, start_date, custom_items_json, assigned_by, hospital_id)
            VALUES ($1, $2, $3, 'Active', CURRENT_DATE, $4, $5, $6) RETURNING *`,
            [template_id, patient_id, admission_id, JSON.stringify(planItems), assigned_by, hospitalId]
        );

        await client.query('COMMIT');

        if (req.io) req.io.emit('clinical_update', { type: 'care_plan_assigned', admission_id });
        ResponseHandler.success(res, result.rows[0], 'Care plan assigned successfully', 201);
    } catch (err) {
        await client.query('ROLLBACK');
        throw err; // Re-throw for asyncHandler
    } finally {
        client.release();
    }
});

// Get active plans for a patient - Multi-Tenant
const getPatientCarePlans = asyncHandler(async (req, res) => {
    const { admission_id } = req.params;
    const hospitalId = getHospitalId(req);

    const result = await pool.query(
        `SELECT pcp.*, cpt.name as template_name, cpt.description as template_description
            FROM patient_care_plans pcp
            JOIN care_plan_templates cpt ON pcp.template_id = cpt.id
            WHERE pcp.admission_id = $1 AND (pcp.hospital_id = $2 OR pcp.hospital_id IS NULL)
            ORDER BY pcp.created_at DESC`,
        [admission_id, hospitalId]
    );
    ResponseHandler.success(res, result.rows);
});

// Update plan progress - Multi-Tenant
const updateCarePlanProgress = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { items_json, status } = req.body;
    const hospitalId = getHospitalId(req);

    const total = items_json.length;
    const completed = items_json.filter(i => i.status === 'Completed').length;
    const progress = total === 0 ? 0 : Math.round((completed / total) * 100);

    const result = await pool.query(
        `UPDATE patient_care_plans SET custom_items_json = $1, progress = $2, status = COALESCE($3, status), updated_at = NOW()
            WHERE id = $4 AND (hospital_id = $5) RETURNING *`,
        [JSON.stringify(items_json), progress, status, id, hospitalId]
    );

    if (result.rows.length === 0) {
        return ResponseHandler.error(res, 'Care plan not found', 404);
    }

    ResponseHandler.success(res, result.rows[0], 'Care plan updated successfully');
});

module.exports = { getCarePlanTemplates, assignCarePlan, getPatientCarePlans, updateCarePlanProgress };
