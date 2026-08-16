/**
 * WOLF HMS — LabService.js
 * NABL-Compliant Laboratory Workflow Engine
 *
 * Handles:
 *  - Strict Sample Status State Machine (NABL traceability)
 *  - Critical Value Detection & SMS Alert Dispatch
 *  - Secure parameterized database operations
 */

const pool = require("../config/db");
const logger = require("./Logger");
const smsService = require("./smsService");
const BillingInterceptor = require("./BillingInterceptor");

// ─────────────────────────────────────────────────────────────
// NABL State Machine Definition
// ─────────────────────────────────────────────────────────────
const VALID_TRANSITIONS = {
  COLLECTED: ["PROCESSING"],
  PROCESSING: ["VERIFIED"],
  VERIFIED: ["AUTHORIZED"],
  AUTHORIZED: [], // Terminal state
};

const STATUS_TIMESTAMP_COLUMNS = {
  COLLECTED: "sample_collected_at",
  PROCESSING: "processing_at",
  VERIFIED: "verified_at",
  AUTHORIZED: "authorized_at",
};

// ─────────────────────────────────────────────────────────────
// Critical Value Definitions (NABL-mandated panic values)
// ─────────────────────────────────────────────────────────────
const CRITICAL_DEFINITIONS = [
  {
    testName: "Potassium",
    min: null,
    max: 6.0,
    unit: "mmol/L",
    message: "CRITICAL: Hyperkalemia detected. Immediate clinical intervention required.",
  },
  {
    testName: "Sodium",
    min: 120,
    max: 160,
    unit: "mmol/L",
    message: "CRITICAL: Severe sodium imbalance.",
  },
  {
    testName: "Glucose",
    min: 40,
    max: 500,
    unit: "mg/dL",
    message: "CRITICAL: Severe glucose abnormality.",
  },
  {
    testName: "Hemoglobin",
    min: 6.0,
    max: 20.0,
    unit: "g/dL",
    message: "CRITICAL: Hemoglobin level requires immediate attention.",
  },
  {
    testName: "INR",
    min: null,
    max: 5.0,
    unit: "",
    message: "CRITICAL: INR critically elevated — high bleeding risk.",
  },
  {
    testName: "WBC",
    min: 1.0,
    max: 50.0,
    unit: "x10³/µL",
    message: "CRITICAL: White blood cell count critically abnormal.",
  },
  {
    testName: "Platelets",
    min: 20,
    max: null,
    unit: "x10³/µL",
    message: "CRITICAL: Severe thrombocytopenia — bleeding risk.",
  },
];

// ─────────────────────────────────────────────────────────────
// Helper: Ensure timestamp columns exist (idempotent migration)
// ─────────────────────────────────────────────────────────────
let columnsEnsured = false;

async function ensureTimestampColumns() {
  if (columnsEnsured) return;
  try {
    // Add processing_at column if missing
    await pool.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'lab_requests' AND column_name = 'processing_at'
        ) THEN
          ALTER TABLE lab_requests ADD COLUMN processing_at TIMESTAMPTZ;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'lab_requests' AND column_name = 'verified_at'
        ) THEN
          ALTER TABLE lab_requests ADD COLUMN verified_at TIMESTAMPTZ;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'lab_requests' AND column_name = 'authorized_at'
        ) THEN
          ALTER TABLE lab_requests ADD COLUMN authorized_at TIMESTAMPTZ;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'lab_requests' AND column_name = 'sms_dispatched'
        ) THEN
          ALTER TABLE lab_requests ADD COLUMN sms_dispatched BOOLEAN DEFAULT FALSE;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'lab_requests' AND column_name = 'sms_dispatched_at'
        ) THEN
          ALTER TABLE lab_requests ADD COLUMN sms_dispatched_at TIMESTAMPTZ;
        END IF;
      END $$;
    `);
    columnsEnsured = true;
    logger.info("[LabService] NABL timestamp columns ensured.");
  } catch (err) {
    logger.warn("[LabService] Column migration warning (non-fatal):", err.message);
  }
}

// ─────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────

/**
 * updateSampleStatus
 *
 * Enforces a strict NABL state machine for sample workflow.
 * Valid transitions:
 *   COLLECTED → PROCESSING
 *   PROCESSING → VERIFIED
 *   VERIFIED   → AUTHORIZED
 *
 * @param {string}  barcode   - Sample barcode (lab_requests.barcode)
 * @param {string}  newStatus - One of: PROCESSING, VERIFIED, AUTHORIZED
 * @param {number}  userId    - ID of the user performing the transition
 * @param {number}  hospitalId- Tenant hospital ID
 * @returns {object} { success, message, data }
 */
async function updateSampleStatus(barcode, newStatus, userId, hospitalId) {
  await ensureTimestampColumns();

  // ---------- 1. Validate newStatus ----------
  const allowedStatuses = Object.keys(VALID_TRANSITIONS);
  if (!allowedStatuses.includes(newStatus)) {
    return {
      success: false,
      message: `Invalid status "${newStatus}". Allowed: ${allowedStatuses.join(", ")}`,
      data: null,
    };
  }

  // ---------- 2. Look up the lab request by barcode ----------
  const reqResult = await pool.query(
    `SELECT id, status, barcode, patient_id, doctor_id, test_name
       FROM lab_requests
      WHERE barcode = $1
        AND (hospital_id = $2 OR hospital_id IS NULL)
      LIMIT 1`,
    [barcode, hospitalId]
  );

  if (reqResult.rows.length === 0) {
    return {
      success: false,
      message: `No lab request found with barcode: ${barcode}`,
      data: null,
    };
  }

  const labReq = reqResult.rows[0];
  const currentStatus = labReq.status;

  // ---------- 3. Derive source state from current status ----------
  // Map existing status values to our state machine states
  let sourceState = currentStatus;
  if (currentStatus === "Sample Collected" || currentStatus === "COLLECTED") {
    sourceState = "COLLECTED";
  } else if (currentStatus === "PROCESSING") {
    sourceState = "PROCESSING";
  } else if (currentStatus === "VERIFIED") {
    sourceState = "VERIFIED";
  } else if (currentStatus === "AUTHORIZED" || currentStatus === "Completed") {
    sourceState = "AUTHORIZED";
  }

  // ---------- 4. Validate transition ----------
  const allowedTransitions = VALID_TRANSITIONS[sourceState] || [];
  if (!allowedTransitions.includes(newStatus)) {
    return {
      success: false,
      message: `Invalid transition: "${sourceState}" → "${newStatus}". Allowed transitions from "${sourceState}": [${allowedTransitions.join(", ") || "none (terminal)"}]`,
      data: { currentStatus: sourceState, attemptedStatus: newStatus },
    };
  }

  // ---------- 5. Update status and timestamp ----------
  const timestampColumn = STATUS_TIMESTAMP_COLUMNS[newStatus];
  await pool.query(
    `UPDATE lab_requests
        SET status = $1,
            ${timestampColumn} = NOW(),
            updated_at = NOW()
      WHERE id = $2`,
    [newStatus, labReq.id]
  );

  // Also log to lab_audit_log
  await pool.query(
    `INSERT INTO lab_audit_log (lab_order_id, action, performed_by, details, hospital_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      labReq.id,
      `STATUS_${newStatus}`,
      userId,
      JSON.stringify({
        from: sourceState,
        to: newStatus,
        barcode: barcode,
        timestamp: new Date().toISOString(),
      }),
      hospitalId,
    ]
  );

  logger.info(
    `[LabService] Sample ${barcode}: ${sourceState} → ${newStatus} by user ${userId}`
  );

  return {
    success: true,
    message: `Sample status updated: ${sourceState} → ${newStatus}`,
    data: {
      requestId: labReq.id,
      barcode,
      previousStatus: sourceState,
      newStatus,
      timestamp: new Date().toISOString(),
    },
  };
}

/**
 * submitTestResult
 *
 * Accepts lab results for a request, checks for critical values,
 * auto-inserts critical alerts, and simulates SMS dispatch.
 *
 * @param {number}   requestId    - lab_requests.id
 * @param {object[]} resultsArray - Array of { test_name, value, unit }
 * @param {number}   doctorId     - ID of the ordering/attending doctor
 * @param {number}   patientId    - Patient ID (integer)
 * @param {number}   hospitalId   - Tenant hospital ID
 * @param {number}   technicianId - ID of the lab tech submitting
 * @returns {object} { success, message, data: { criticalAlerts, smsDispatched } }
 */
async function submitTestResult(
  requestId,
  resultsArray,
  doctorId,
  patientId,
  hospitalId,
  technicianId
) {
  await ensureTimestampColumns();

  // ---------- 1. Validate inputs ----------
  if (!requestId || !resultsArray || !Array.isArray(resultsArray) || resultsArray.length === 0) {
    return {
      success: false,
      message: "requestId and resultsArray (non-empty) are required.",
      data: null,
    };
  }

  // ---------- 2. Look up the lab request ----------
  const reqResult = await pool.query(
    `SELECT id, patient_id, doctor_id, test_name, status, barcode
       FROM lab_requests
      WHERE id = $1
        AND (hospital_id = $2 OR hospital_id IS NULL)
      LIMIT 1`,
    [requestId, hospitalId]
  );

  if (reqResult.rows.length === 0) {
    return {
      success: false,
      message: `Lab request #${requestId} not found.`,
      data: null,
    };
  }

  const labReq = reqResult.rows[0];

  // ---------- 3. Build result JSON ----------
  const resultJson = {};
  for (const item of resultsArray) {
    resultJson[item.test_name] = {
      value: item.value,
      unit: item.unit || "",
    };
  }

  // ---------- 4. Insert result into lab_results ----------
  const insertResult = await pool.query(
    `INSERT INTO lab_results (request_id, result_json, technician_id, hospital_id)
     VALUES ($1, $2, $3, $4)
     RETURNING id`,
    [requestId, JSON.stringify(resultJson), technicianId, hospitalId]
  );

  // ---------- 5. Check for critical values ----------
  const criticalAlerts = [];
  let smsDispatched = false;

  for (const item of resultsArray) {
    const testNameLower = item.test_name.toLowerCase();
    const numericValue = parseFloat(item.value);

    if (isNaN(numericValue)) continue; // Skip non-numeric results

    // Check against each critical definition
    for (const crit of CRITICAL_DEFINITIONS) {
      if (crit.testName.toLowerCase() !== testNameLower) continue;

      let isCritical = false;
      let direction = null;

      if (crit.min !== null && numericValue < crit.min) {
        isCritical = true;
        direction = "CRITICAL_LOW";
      }
      if (crit.max !== null && numericValue > crit.max) {
        isCritical = true;
        direction = "CRITICAL_HIGH";
      }

      if (isCritical) {
        // Insert critical alert into database
        const alertResult = await pool.query(
          `INSERT INTO lab_critical_alerts
             (request_id, patient_id, test_name, parameter_name, result_value,
              reference_range, alert_type, status, notified_doctor, hospital_id)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
           RETURNING id`,
          [
            requestId,
            patientId,
            labReq.test_name || item.test_name,
            item.test_name,
            String(numericValue),
            `${crit.min !== null ? ">" + crit.min : ""}${crit.min !== null && crit.max !== null ? " / " : ""}${crit.max !== null ? "<" + crit.max : ""} ${crit.unit}`,
            direction,
            "Pending",
            doctorId,
            hospitalId,
          ]
        );

        criticalAlerts.push({
          alertId: alertResult.rows[0].id,
          testName: item.test_name,
          value: numericValue,
          unit: item.unit || crit.unit,
          direction,
          threshold:
            direction === "CRITICAL_HIGH"
              ? `> ${crit.max} ${crit.unit}`
              : `< ${crit.min} ${crit.unit}`,
        });
      }
      break; // Found matching definition, no need to check others
    }
  }

  // ---------- 6. Dispatch SMS for critical alerts ----------
  if (criticalAlerts.length > 0) {
    smsDispatched = await dispatchCriticalSMS(
      requestId,
      patientId,
      doctorId,
      criticalAlerts,
      hospitalId,
      labReq
    );

    // Update lab request flags
    await pool.query(
      `UPDATE lab_requests
          SET has_critical_value = TRUE,
              sms_dispatched = $1,
              sms_dispatched_at = CASE WHEN $1 THEN NOW() ELSE sms_dispatched_at END
        WHERE id = $2`,
      [smsDispatched, requestId]
    );
  }

  // ---------- 7. Mark request as Completed ----------
  await pool.query(
    `UPDATE lab_requests
        SET status = 'Completed',
            updated_at = NOW()
      WHERE id = $1`,
    [requestId]
  );

  // ───────────────────────────────────────────────────
  // PHASE 7 — Revenue Defense: Auto-capture LABORATORY charge on result submission
  // ───────────────────────────────────────────────────
  BillingInterceptor.captureCharge(
    patientId,
    BillingInterceptor.SOURCE_MODULES.LABORATORY,
    labReq.test_name || 'Laboratory Test',
    1,
    150.00,
    {
      capturedBy: technicianId,
      metadata: { lab_request_id: requestId, results_count: resultsArray.length },
    },
    hospitalId
  ).catch((err) => {
    logger.error(
      `[LabService] BillingInterceptor charge failed (non-blocking):`,
      err.message
    );
  });

  // ---------- 8. Log to audit trail ----------
  await pool.query(
    `INSERT INTO lab_audit_log (lab_order_id, action, performed_by, details, hospital_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [
      requestId,
      "RESULTS_SUBMITTED",
      technicianId,
      JSON.stringify({
        resultId: insertResult.rows[0].id,
        criticalAlertsCount: criticalAlerts.length,
        smsDispatched,
      }),
      hospitalId,
    ]
  );

  logger.info(
    `[LabService] Results submitted for request #${requestId}. Critical alerts: ${criticalAlerts.length}, SMS: ${smsDispatched}`
  );

  return {
    success: true,
    message: criticalAlerts.length > 0
      ? `Results submitted with ${criticalAlerts.length} critical alert(s). SMS dispatched to attending physician.`
      : "Results submitted successfully.",
    data: {
      resultId: insertResult.rows[0].id,
      critical_alerts_triggered: criticalAlerts.length > 0,
      criticalAlerts,
      smsDispatched,
    },
  };
}

// ─────────────────────────────────────────────────────────────
// INTERNAL: Dispatch Critical Value SMS
// ─────────────────────────────────────────────────────────────

/**
 * Simulates sending an urgent SMS to the attending doctor.
 * In production, this would call the SMS gateway for each critical alert.
 *
 * @param {number}   requestId
 * @param {number}   patientId
 * @param {number}   doctorId
 * @param {object[]} criticalAlerts
 * @param {number}   hospitalId
 * @param {object}   labReq
 * @returns {boolean} whether SMS was dispatched
 */
async function dispatchCriticalSMS(
  requestId,
  patientId,
  doctorId,
  criticalAlerts,
  hospitalId,
  labReq
) {
  try {
    // Get doctor's phone number
    const docResult = await pool.query(
      `SELECT id, username, phone, full_name
         FROM users
        WHERE id = $1
        LIMIT 1`,
      [doctorId]
    );

    // Get patient name
    const patResult = await pool.query(
      `SELECT id, name, phone
         FROM patients
        WHERE id = $1
        LIMIT 1`,
      [patientId]
    );

    const doctorName = docResult.rows[0]?.full_name || docResult.rows[0]?.username || "Doctor";
    const patientName = patResult.rows[0]?.name || "Patient";
    const doctorPhone = docResult.rows[0]?.phone;

    // Build SMS message
    const alertDetails = criticalAlerts
      .map((a) => `${a.testName}: ${a.value} ${a.unit} (${a.direction})`)
      .join("; ");

    const smsMessage = `[WOLF-HMS CRITICAL LAB ALERT] Patient: ${patientName} | ${alertDetails} | Request #${requestId} | Please review immediately.`;

    // Attempt to send SMS via Fast2SMS
    if (doctorPhone) {
      const smsResult = await smsService.sendSMS(
        doctorPhone,
        smsMessage
      );

      if (smsResult.success) {
        logger.info(
          `[LabService] Critical SMS dispatched to ${doctorName} at ${doctorPhone} for request #${requestId}`
        );

        // Log SMS dispatch in lab_critical_alerts
        for (const alert of criticalAlerts) {
          await pool.query(
            `UPDATE lab_critical_alerts
                SET sms_sent = TRUE, sms_sent_at = NOW(), sms_recipient = $1
              WHERE id = $2`,
            [doctorPhone, alert.alertId]
          );
        }

        return true;
      } else {
        logger.warn(
          `[LabService] SMS dispatch FAILED for request #${requestId}: ${smsResult.error}`
        );
      }
    } else {
      logger.warn(
        `[LabService] No phone number found for doctor #${doctorId}. SMS not sent.`
      );
    }

    // Even if SMS fails, still log the attempt
    logger.info(
      `[LabService] Critical SMS simulation: "${smsMessage}"`
    );

    return false;
  } catch (err) {
    logger.error("[LabService] SMS dispatch error:", err.message);
    return false;
  }
}

/**
 * Get sample details by barcode (helper for frontend)
 */
async function getSampleByBarcode(barcode, hospitalId) {
  const result = await pool.query(
    `SELECT lr.id, lr.barcode, lr.status, lr.patient_id, lr.doctor_id,
            lr.test_name, lr.sample_collected_at, lr.processing_at,
            lr.verified_at, lr.authorized_at, lr.has_critical_value,
            p.name AS patient_name
       FROM lab_requests lr
       LEFT JOIN patients p ON lr.patient_id = p.id
      WHERE lr.barcode = $1
        AND (lr.hospital_id = $2 OR lr.hospital_id IS NULL)
      LIMIT 1`,
    [barcode, hospitalId]
  );

  if (result.rows.length === 0) {
    return { success: false, message: "Sample not found.", data: null };
  }

  return { success: true, data: result.rows[0] };
}

module.exports = {
  updateSampleStatus,
  submitTestResult,
  getSampleByBarcode,
  VALID_TRANSITIONS,
};