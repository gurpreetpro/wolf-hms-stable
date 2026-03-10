const pool = require('../config/db');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * Patient Merge Controller — Phase G1.4
 * Enterprise feature: Merge duplicate patient records with full audit trail.
 * 
 * Tables affected during merge:
 *   admissions, opd_visits, lab_requests, vitals_logs, payments,
 *   invoices, invoice_items, care_tasks, bed_history, clinical_vitals,
 *   clinical_history, prescriptions, drug_logs, radiology_orders
 */

// Tables that reference patient_id and need to be migrated during merge
const PATIENT_TABLES = [
    'admissions',
    'opd_visits',
    'lab_requests',
    'vitals_logs',
    'payments',
    'invoices',
    'care_tasks',
    'clinical_vitals',
    'clinical_history',
    'drug_logs',
    'radiology_orders',
    'patient_documents',
    'prescriptions',
    'dietary_orders',
    'discharge_plans',
    'emergency_logs',
    'blood_requests',
    'blood_transfusions',
    'insurance_claims',
    'insurance_preauth'
];

/**
 * GET /api/patients/duplicates
 * Find potential duplicate patients using fuzzy matching
 */
const findDuplicates = asyncHandler(async (req, res) => {
    const hospitalId = req.hospital_id;
    const { name, phone, dob } = req.query;

    let query = `
        SELECT p1.id, p1.name, p1.phone, p1.uhid, p1.dob, p1.gender, p1.abha_id, p1.created_at,
               COUNT(DISTINCT ov.id) as visit_count,
               COUNT(DISTINCT a.id) as admission_count
        FROM patients p1
        LEFT JOIN opd_visits ov ON ov.patient_id = p1.id
        LEFT JOIN admissions a ON a.patient_id = p1.id
        WHERE p1.hospital_id = $1
    `;
    const params = [hospitalId];

    if (name) {
        params.push(`%${name}%`);
        query += ` AND p1.name ILIKE $${params.length}`;
    }
    if (phone) {
        params.push(phone);
        query += ` AND p1.phone = $${params.length}`;
    }
    if (dob) {
        params.push(dob);
        query += ` AND p1.dob = $${params.length}`;
    }

    query += ` GROUP BY p1.id ORDER BY p1.name, p1.created_at`;

    const result = await pool.query(query, params);

    // Auto-detect duplicates: same phone OR (same name + same DOB)
    const patients = result.rows;
    const duplicateGroups = [];
    const processed = new Set();

    for (let i = 0; i < patients.length; i++) {
        if (processed.has(patients[i].id)) continue;

        const group = [patients[i]];
        for (let j = i + 1; j < patients.length; j++) {
            if (processed.has(patients[j].id)) continue;

            const samePhone = patients[i].phone && patients[i].phone === patients[j].phone;
            const sameName = patients[i].name.toLowerCase() === patients[j].name.toLowerCase();
            const sameDob = patients[i].dob && patients[j].dob &&
                new Date(patients[i].dob).toISOString().split('T')[0] ===
                new Date(patients[j].dob).toISOString().split('T')[0];

            if (samePhone || (sameName && sameDob)) {
                group.push(patients[j]);
                processed.add(patients[j].id);
            }
        }

        if (group.length > 1) {
            duplicateGroups.push(group);
        }
        processed.add(patients[i].id);
    }

    ResponseHandler.success(res, {
        total_patients: patients.length,
        duplicate_groups: duplicateGroups.length,
        groups: duplicateGroups
    });
});

/**
 * POST /api/patients/merge
 * Merge patient B (source) into patient A (target/surviving)
 * All records from B are moved to A, and B is soft-deleted.
 * 
 * Body: { surviving_id, merged_id, reason }
 */
const mergePatients = asyncHandler(async (req, res) => {
    const { surviving_id, merged_id, reason } = req.body;
    const hospitalId = req.hospital_id;
    const userId = req.user?.id;

    if (!surviving_id || !merged_id) {
        return ResponseHandler.error(res, 'Both surviving_id and merged_id are required', 400);
    }
    if (surviving_id === merged_id) {
        return ResponseHandler.error(res, 'Cannot merge a patient into themselves', 400);
    }

    // Verify both patients exist and belong to this hospital
    const [survivingRes, mergedRes] = await Promise.all([
        pool.query('SELECT * FROM patients WHERE id = $1::text::uuid AND hospital_id = $2', [surviving_id, hospitalId]).catch(() => ({ rows: [] })),
        pool.query('SELECT * FROM patients WHERE id = $1::text::uuid AND hospital_id = $2', [merged_id, hospitalId]).catch(() => ({ rows: [] }))
    ]);

    if (survivingRes.rows.length === 0) {
        return ResponseHandler.error(res, `Surviving patient (ID: ${surviving_id}) not found`, 404);
    }
    if (mergedRes.rows.length === 0) {
        return ResponseHandler.error(res, `Source patient (ID: ${merged_id}) not found`, 404);
    }

    const survivingPatient = survivingRes.rows[0];
    const mergedPatient = mergedRes.rows[0];

    // Check if source patient is already merged
    if (mergedPatient.phone && mergedPatient.phone.startsWith('MERGED-')) {
        return ResponseHandler.error(res, 'This patient has already been merged', 400);
    }

    const client = await pool.connect();

    try {
        await client.query('BEGIN');

        // Archive the source patient's full data
        const mergedData = {
            patient: mergedPatient,
            merge_timestamp: new Date().toISOString(),
            surviving_patient: {
                id: survivingPatient.id,
                name: survivingPatient.name,
                uhid: survivingPatient.uhid
            }
        };

        const tablesUpdated = [];
        let totalRecords = 0;

        // Move all records from source → surviving
        for (const table of PATIENT_TABLES) {
            try {
                const result = await client.query(
                    `UPDATE ${table} SET patient_id = $1 WHERE patient_id = $2`,
                    [surviving_id, merged_id]
                );
                if (result.rowCount > 0) {
                    tablesUpdated.push({ table, records: result.rowCount });
                    totalRecords += result.rowCount;
                }
            } catch (tableErr) {
                // Table might not have patient_id column — skip silently
                console.log(`[Merge] Skipped ${table}: ${tableErr.message}`);
            }
        }

        // If source has ABHA but surviving doesn't, transfer it
        if (mergedPatient.abha_id && !survivingPatient.abha_id) {
            await client.query(
                'UPDATE patients SET abha_id = $1, abha_address = $2 WHERE id = $3',
                [mergedPatient.abha_id, mergedPatient.abha_address, surviving_id]
            );
            tablesUpdated.push({ table: 'patients (ABHA transfer)', records: 1 });
        }

        // Soft-delete the merged patient
        await client.query(
            `UPDATE patients SET 
                phone = $1, 
                name = $2,
                abha_id = NULL
             WHERE id = $3`,
            [`MERGED-${merged_id}-INTO-${surviving_id}`, `[MERGED] ${mergedPatient.name}`, merged_id]
        );

        // Create audit record
        await client.query(
            `INSERT INTO patient_merges 
                (surviving_patient_id, merged_patient_id, merged_uhid, merged_by, merge_reason, merged_data, tables_updated, records_moved, hospital_id) 
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
            [
                surviving_id, merged_id, mergedPatient.uhid,
                userId, reason || 'Duplicate patient merge',
                JSON.stringify(mergedData),
                JSON.stringify(tablesUpdated),
                totalRecords, hospitalId
            ]
        );

        // Log to audit_logs
        try {
            await client.query(
                `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, details, hospital_id)
                 VALUES ($1, $2, $3, $4, $5, $6)`,
                [
                    userId, 'PATIENT_MERGE', 'patient', surviving_id,
                    JSON.stringify({
                        merged_patient_id: merged_id,
                        merged_uhid: mergedPatient.uhid,
                        surviving_uhid: survivingPatient.uhid,
                        records_moved: totalRecords,
                        tables: tablesUpdated.map(t => t.table)
                    }),
                    hospitalId
                ]
            );
        } catch (auditErr) {
            console.error('[Merge] Audit log failed:', auditErr.message);
        }

        await client.query('COMMIT');

        ResponseHandler.success(res, {
            surviving_patient: {
                id: survivingPatient.id,
                name: survivingPatient.name,
                uhid: survivingPatient.uhid
            },
            merged_patient: {
                id: mergedPatient.id,
                name: mergedPatient.name,
                uhid: mergedPatient.uhid
            },
            records_moved: totalRecords,
            tables_updated: tablesUpdated
        }, `Patient ${mergedPatient.uhid} merged into ${survivingPatient.uhid} — ${totalRecords} records transferred`);

    } catch (err) {
        await client.query('ROLLBACK');
        console.error('[Merge] CRITICAL ERROR:', err);
        return ResponseHandler.error(res, `Merge failed: ${err.message}`, 500);
    } finally {
        client.release();
    }
});

/**
 * GET /api/patients/merge-history
 * View all patient merges for audit
 */
const getMergeHistory = asyncHandler(async (req, res) => {
    const hospitalId = req.hospital_id;

    const result = await pool.query(`
        SELECT pm.*,
               sp.name as surviving_name, sp.uhid as surviving_uhid,
               u.username as merged_by_name
        FROM patient_merges pm
        LEFT JOIN patients sp ON pm.surviving_patient_id::text = sp.id::text
        LEFT JOIN users u ON pm.merged_by::text = u.id::text
        WHERE pm.hospital_id = $1
        ORDER BY pm.created_at DESC
        LIMIT 100
    `, [hospitalId]);

    ResponseHandler.success(res, result.rows);
});

module.exports = { findDuplicates, mergePatients, getMergeHistory };
