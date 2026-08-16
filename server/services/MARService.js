// WOLF HMS — Medication Administration Record (MAR) Service
// Barcode Medication Administration (BCMA) — WOLF Ultimate Guardrails
const pool = require('../config/db');
const logger = require('./Logger');
const BillingInterceptor = require('./BillingInterceptor');

/**
 * Simulate a call to the "WOLF Ultimate Drug Interaction API".
 *
 * @param {string} drugBarcode — The scanned medication barcode (e.g. 'SKU-DANGER')
 * @param {string} patientUuid — UUID of the patient who is about to receive the drug
 * @param {number} nurseId     — ID of the administering nurse
 * @returns {Promise<{ safe: boolean, warnings: string[] }>}
 */
async function checkWolfUltimateDrugInteractionAPI(drugBarcode, patientUuid, nurseId) {
    logger.info(`[WOLF Ultimate] Checking drug interaction for barcode=${drugBarcode} patient=${patientUuid} nurse=${nurseId}`);

    // Simulated API latency
    await new Promise(resolve => setTimeout(resolve, 200));

    // -------------------------------------------------------------------
    // Simulated clinical rules engine (WOLF Ultimate)
    // In production this calls an external microservice or local ML model.
    // -------------------------------------------------------------------

    /** @type {string[]} */
    const warnings = [];

    // ---------------------------------------------------------
    // Rule 1: Known dangerous / flagged barcode
    // ---------------------------------------------------------
    if (drugBarcode === 'SKU-DANGER') {
        warnings.push('Drug Interaction Alert — ACTIVATED CHARCOAL BARIUM SULFATE RXN: Contraindicated. Patient allergy cross-match FAILED (Anaphylaxis Risk). Do NOT administer.');
    }

    // ---------------------------------------------------------
    // Rule 2: Expired / recalled batch (simulated prefix check)
    // ---------------------------------------------------------
    if (drugBarcode && drugBarcode.toUpperCase().startsWith('SKU-RECALL-')) {
        warnings.push('Batch Recall Warning — This medication batch has been RECALLED by manufacturer. Administration blocked.');
    }

    // ---------------------------------------------------------
    // Rule 3: Simulated allergy check (placeholder for real AI)
    // ---------------------------------------------------------
    if (drugBarcode && drugBarcode.toUpperCase().includes('PENICILLIN')) {
        warnings.push('Allergy Warning — Patient has documented Penicillin allergy. Cross-reference triggered.');
    }

    // ---------------------------------------------------------
    // Rule 4: Duplicate administration within 4 hours
    // ---------------------------------------------------------
    const recentResult = await pool.query(
        `SELECT COUNT(*) as recent_count
           FROM emar_logs
          WHERE patient_id = $1
            AND medication_name = (SELECT name FROM inventory_items WHERE barcode = $2 LIMIT 1)
            AND administered_at > NOW() - INTERVAL '4 hours'
            AND status = 'COMPLETED'`,
        [patientUuid, drugBarcode]
    );
    const recentCount = parseInt(recentResult.rows[0]?.recent_count || '0', 10);
    if (recentCount > 0) {
        warnings.push(`Potential Duplicate Dose — This medication was already administered within the last 4 hours (${recentCount} time${recentCount > 1 ? 's' : ''}). Please verify the order.`);
    }

    return {
        safe: warnings.length === 0,
        warnings
    };
}

/**
 * BCMA — Verify Scan and Administer
 *
 * Called when a nurse scans both the patient wristband and the medication barcode.
 * 1. Validates both inputs are present.
 * 2. Resolves patient identity from UHID.
 * 3. Resolves medication identity from barcode.
 * 4. Calls WOLF Ultimate Drug Interaction API.
 * 5. If safe, inserts a COMPLETED record into emar_logs.
 * 6. Returns outcome to caller.
 *
 * @param {string} patientUhid   — Scanned patient UHID (wristband)
 * @param {string} drugBarcode   — Scanned medication barcode
 * @param {number} nurseId       — ID of the administering nurse
 * @param {number} hospitalId    — Tenant hospital ID from middleware
 * @returns {Promise<{ success: boolean, status: string, message: string, warnings?: string[], logId?: number }>}
 */
async function verifyScanAndAdminister(patientUhid, drugBarcode, nurseId, hospitalId) {
    // -------------------------------------------------------
    // 1. Validate inputs
    // -------------------------------------------------------
    if (!patientUhid || !drugBarcode) {
        return {
            success: false,
            status: 'MISSING_INPUT',
            message: 'Both patient UHID and medication barcode are required.'
        };
    }

    if (!nurseId) {
        return {
            success: false,
            status: 'UNAUTHORIZED',
            message: 'Nurse identity required for medication administration.'
        };
    }

    // -------------------------------------------------------
    // 2. Resolve patient from UHID
    // -------------------------------------------------------
    const patientResult = await pool.query(
        `SELECT id, name, uhid
           FROM patients
          WHERE uhid = $1
            AND hospital_id = $2
          LIMIT 1`,
        [patientUhid, hospitalId]
    );

    if (patientResult.rows.length === 0) {
        logger.warn(`[MAR] Patient not found for UHID=${patientUhid} hospital=${hospitalId}`);
        return {
            success: false,
            status: 'PATIENT_NOT_FOUND',
            message: `No patient found with UHID: ${patientUhid}. Please verify the wristband.`
        };
    }

    const patient = patientResult.rows[0];

    // -------------------------------------------------------
    // 3. Resolve medication from barcode
    // -------------------------------------------------------
    const drugResult = await pool.query(
        `SELECT id, name, batch_number, barcode, expiry_date
           FROM inventory_items
          WHERE barcode = $1
            AND hospital_id = $2
          LIMIT 1`,
        [drugBarcode, hospitalId]
    );

    if (drugResult.rows.length === 0) {
        logger.warn(`[MAR] Drug not found for barcode=${drugBarcode} hospital=${hospitalId}`);
        return {
            success: false,
            status: 'DRUG_NOT_FOUND',
            message: `No medication found with barcode: ${drugBarcode}. Please verify the medication label.`
        };
    }

    const drug = drugResult.rows[0];

    // -------------------------------------------------------
    // 3.1 Check expiry
    // -------------------------------------------------------
    if (drug.expiry_date && new Date(drug.expiry_date) < new Date()) {
        return {
            success: false,
            status: 'DRUG_EXPIRED',
            message: `Medication "${drug.name}" (batch ${drug.batch_number}) EXPIRED on ${drug.expiry_date.toISOString().split('T')[0]}. Do NOT administer.`
        };
    }

    // -------------------------------------------------------
    // 4. Call WOLF Ultimate Drug Interaction API
    // -------------------------------------------------------
    logger.info(`[MAR] Calling WOLF Ultimate for patient=${patient.id} drug=${drug.name} barcode=${drugBarcode}`);
    const interactionResult = await checkWolfUltimateDrugInteractionAPI(drugBarcode, patient.id, nurseId);

    // -------------------------------------------------------
    // 5. If unsafe, block administration
    // -------------------------------------------------------
    if (!interactionResult.safe) {
        logger.warn(`[MAR] WOLF Ultimate BLOCKED administration: ${interactionResult.warnings.join('; ')}`);

        // Log an ATTEMPTED record for audit
        await pool.query(
            `INSERT INTO emar_logs
                (patient_id, medication_name, dosage, administered_by, status, notes, hospital_id)
             VALUES ($1, $2, $3, $4, 'BLOCKED', $5, $6)`,
            [patient.id, drug.name, 'As per order', nurseId,
            'BCMA blocked by WOLF Ultimate: ' + interactionResult.warnings[0].substring(0, 450),
                hospitalId]
        );

        return {
            success: false,
            status: 'CLINICAL_WARNING',
            message: 'Medication BLOCKED by WOLF Ultimate Guardrails.',
            warnings: interactionResult.warnings
        };
    }

    // -------------------------------------------------------
    // 6. Safe — Insert COMPLETED record into emar_logs
    // -------------------------------------------------------
    const insertResult = await pool.query(
        `INSERT INTO emar_logs
            (patient_id, medication_name, dosage, administered_by, status, notes, hospital_id)
         VALUES ($1, $2, 'As per order', $3, 'COMPLETED', $4, $5)
         RETURNING id`,
        [patient.id, drug.name, nurseId,
        `BCMA verified by WOLF Ultimate. Batch: ${drug.batch_number || 'N/A'}. Barcode: ${drugBarcode}`,
            hospitalId]
    );

    const logId = insertResult.rows[0].id;
    logger.info(`[MAR] COMPLETED — emar_logs.id=${logId} patient=${patient.id} drug=${drug.name} nurse=${nurseId}`);

    // ───────────────────────────────────────────────────
    // PHASE 7 — Revenue Defense: Auto-capture WARD_PHARMACY charge
    // ───────────────────────────────────────────────────
    BillingInterceptor.captureCharge(
        patient.id,
        BillingInterceptor.SOURCE_MODULES.WARD_PHARMACY,
        drug.name,
        1,
        50.00,
        { capturedBy: nurseId, metadata: { emar_log_id: logId, barcode: drugBarcode } },
        hospitalId
    ).catch(err => {
        logger.error(`[MAR] BillingInterceptor charge failed (non-blocking):`, err.message);
    });

    return {
        success: true,
        status: 'COMPLETED',
        message: `Medication "${drug.name}" successfully administered to ${patient.name}. Log #${logId}`,
        logId
    };
}

/**
 * Log a nursing shift handover.
 *
 * @param {object} params
 * @param {string} params.unit             — Ward/unit name
 * @param {string} params.shift            — e.g. 'Morning', 'Night'
 * @param {string} params.situation        — SBAR Situation summary
 * @param {object} params.background       — SBAR Background (JSON)
 * @param {object} params.assessment       — SBAR Assessment (JSON)
 * @param {string} params.recommendation   — SBAR Recommendation
 * @param {number} params.createdBy        — Nurse/user ID creating the handover
 * @param {number} params.hospitalId       — Tenant hospital ID
 * @returns {Promise<{ success: boolean, reportId: number, message: string }>}
 */
async function logHandover({ unit, shift, situation, background, assessment, recommendation, createdBy, hospitalId }) {
    // Validate required fields
    if (!unit || !shift || !situation || !createdBy) {
        return {
            success: false,
            reportId: null,
            message: 'Unit, shift, situation, and createdBy are required for shift handover.'
        };
    }

    const insertResult = await pool.query(
        `INSERT INTO handoff_reports
            (shift, unit, situation, background_json, assessment_json, recommendation, created_by, hospital_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING id`,
        [
            shift,
            unit,
            situation,
            JSON.stringify(background || {}),
            JSON.stringify(assessment || {}),
            recommendation || null,
            createdBy,
            hospitalId
        ]
    );

    const reportId = insertResult.rows[0].id;
    logger.info(`[MAR] Handover logged — reportId=${reportId} unit=${unit} shift=${shift} createdBy=${createdBy}`);

    return {
        success: true,
        reportId,
        message: `Shift handover logged successfully (Report #${reportId}).`
    };
}

module.exports = {
    verifyScanAndAdminister,
    logHandover,
    // Exported for testing
    _checkWolfUltimateDrugInteractionAPI: checkWolfUltimateDrugInteractionAPI
};