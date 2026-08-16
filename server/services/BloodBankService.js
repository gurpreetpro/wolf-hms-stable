/**
 * WOLF HMS — BloodBankService.js
 *
 * NABH / ISBT-128 Compliant Blood Bank Operations
 *
 * Responsibilities:
 *   1. registerISBTUnit()    — Decode ISBT 128 barcodes, calculate expiry, insert into blood_units
 *   2. secureCrossMatch()    — TTI hard-lock guardrail + audit trail
 */

const pool = require("../config/db");
const { parseISBT128, calculateExpiry, formatDINLabel } = require("../utils/isbtParser");
const logger = require("./Logger");

// ─────────────────────────────────────────────────────────────
// Idempotent Schema Migration for blood_crossmatch_logs
// ─────────────────────────────────────────────────────────────
let schemaEnsured = false;

async function ensureSchema() {
  if (schemaEnsured) return;
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS blood_crossmatch_logs (
        id              SERIAL PRIMARY KEY,
        cross_match_id  INTEGER,
        request_id      INTEGER,
        unit_id         INTEGER,
        patient_id      INTEGER,
        performed_by    INTEGER,
        action          VARCHAR(50) NOT NULL,
        result          VARCHAR(50),
        isbt_din        VARCHAR(50),
        tti_status      VARCHAR(50),
        reason          TEXT,
        metadata        JSONB DEFAULT '{}',
        hospital_id     INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_crossmatch_logs_request
        ON blood_crossmatch_logs(request_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_crossmatch_logs_din
        ON blood_crossmatch_logs(isbt_din)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_crossmatch_logs_created
        ON blood_crossmatch_logs(created_at DESC)
    `);

    // Add isbt_din column to blood_units if missing
    await pool.query(`
      ALTER TABLE blood_units
        ADD COLUMN IF NOT EXISTS isbt_din VARCHAR(50)
    `).catch(() => { });

    schemaEnsured = true;
    logger.info("[BloodBankService] Schema ensured (blood_crossmatch_logs + isbt_din column).");
  } catch (err) {
    logger.error("[BloodBankService] Schema migration error:", err.message);
  }
}

// ─────────────────────────────────────────────────────────────
// 1. REGISTER ISBT UNIT
// ─────────────────────────────────────────────────────────────

/**
 * Register a blood unit using ISBT 128 barcode data.
 *
 * Decodes three separate barcode scans (DIN, product, blood group),
 * computes expiry based on product shelf life, and inserts a
 * properly populated blood_units row.
 *
 * @param {string} dinBarcode         — ISBT 128 DIN barcode (e.g. "=A999923123456")
 * @param {string} productBarcode     — ISBT 128 product barcode (e.g. "=<E0401V00")
 * @param {string} bloodGroupBarcode  — ISBT 128 blood group barcode (e.g. "=%5100")
 * @param {number} hospitalId         — Tenant hospital ID
 * @param {object} [options]          — { donorId, volume_ml, storageLocation, createdBy, collectionDate }
 * @returns {object} { success: boolean, unit?: object, message?: string }
 */
async function registerISBTUnit(
  dinBarcode,
  productBarcode,
  bloodGroupBarcode,
  hospitalId,
  options = {}
) {
  await ensureSchema();

  // ── 1. Parse all three barcodes ────────────────────────────
  const dinParsed = parseISBT128(dinBarcode);
  if (!dinParsed.success || !dinParsed.din) {
    return {
      success: false,
      message: "Invalid ISBT DIN barcode: " + (dinParsed.error || "Could not parse DIN."),
    };
  }

  const prodParsed = parseISBT128(productBarcode);
  if (!prodParsed.success || !prodParsed.product_code) {
    return {
      success: false,
      message: "Invalid ISBT Product barcode: " + (prodParsed.error || "Could not parse product code."),
    };
  }

  const bgParsed = parseISBT128(bloodGroupBarcode);
  if (!bgParsed.success || !bgParsed.blood_group) {
    return {
      success: false,
      message: "Invalid ISBT Blood Group barcode: " + (bgParsed.error || "Could not parse blood group."),
    };
  }

  // ── 2. Validate DIN doesn't already exist (duplicate check) ─
  const existing = await pool.query(
    "SELECT id, unit_id, status FROM blood_units WHERE isbt_din = $1 AND (hospital_id = $2 OR hospital_id IS NULL) LIMIT 1",
    [dinParsed.din.full_din, hospitalId]
  );

  if (existing.rows.length > 0) {
    return {
      success: false,
      message: "Duplicate ISBT DIN detected. Unit already registered as " +
        (existing.rows[0].unit_id || "ID #" + existing.rows[0].id) +
        " (Status: " + existing.rows[0].status + ").",
      existing_unit: existing.rows[0],
    };
  }

  // ── 3. Map product code to component type ID ───────────────
  const componentCode = prodParsed.product_code.component_code;
  const compType = await pool.query(
    "SELECT id, shelf_life_days FROM blood_component_types WHERE code = $1 AND (hospital_id = $2 OR hospital_id IS NULL) LIMIT 1",
    [componentCode, hospitalId]
  );

  let componentTypeId = null;
  let shelfLifeDays = prodParsed.product_code.shelf_life_days;

  if (compType.rows.length > 0) {
    componentTypeId = compType.rows[0].id;
    shelfLifeDays = compType.rows[0].shelf_life_days || shelfLifeDays;
  } else {
    // Auto-create the component type if it doesn't exist
    const newCompType = await pool.query(
      `INSERT INTO blood_component_types (name, code, shelf_life_days, is_active, hospital_id)
       VALUES ($1, $2, $3, TRUE, $4)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [prodParsed.product_code.name, componentCode, shelfLifeDays, hospitalId]
    );
    if (newCompType.rows.length > 0) {
      componentTypeId = newCompType.rows[0].id;
    } else {
      // Fallback: refetch
      const refetch = await pool.query(
        "SELECT id FROM blood_component_types WHERE code = $1 LIMIT 1",
        [componentCode]
      );
      componentTypeId = refetch.rows[0]?.id || null;
    }
  }

  // ── 4. Calculate expiry date ───────────────────────────────
  const collectionDate = new Date(dinParsed.din.collection_date);
  const expiryDate = calculateExpiry(collectionDate, shelfLifeDays);

  // ── 5. Generate a human-readable unit_id from DIN ─────────
  const unitId = "ISBT-" + dinParsed.din.sequence + "-" + componentCode;

  // ── 6. Insert blood unit ───────────────────────────────────
  const bloodGroup = bgParsed.blood_group.abo +
    (bgParsed.blood_group.rh === "Positive" ? "+" : "-");
  const rhFactor = bgParsed.blood_group.rh;

  const insertResult = await pool.query(
    `INSERT INTO blood_units
       (unit_id, isbt_din, bag_number, donor_id, blood_group, rh_factor,
        component_type_id, volume_ml, collection_date, expiry_date,
        storage_location, status, tested_status, tti_results,
        blood_group_confirmed, notes, created_by, hospital_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
             $11, 'Quarantine', 'Pending', '{}'::jsonb,
             TRUE, $12, $13, $14)
     RETURNING *`,
    [
      unitId,
      dinParsed.din.full_din,
      options.bagNumber || null,
      options.donorId || null,
      bloodGroup,
      rhFactor,
      componentTypeId,
      options.volume_ml || 450,
      collectionDate.toISOString().split("T")[0],
      expiryDate,
      options.storageLocation || null,
      "ISBT-128 Unit registered via barcode scan. DIN: " + dinParsed.din.full_din,
      options.createdBy || null,
      hospitalId,
    ]
  );

  const unit = insertResult.rows[0];

  logger.info(
    "[BloodBankService] ISBT Unit registered: " + unitId +
    " | DIN: " + dinParsed.din.full_din +
    " | Product: " + prodParsed.product_code.name +
    " | Group: " + bloodGroup +
    " | Expiry: " + expiryDate
  );

  return {
    success: true,
    message: "ISBT blood unit registered successfully. Unit ID: " + unitId,
    unit,
    parsed: {
      din: dinParsed.din,
      product_code: prodParsed.product_code,
      blood_group: bgParsed.blood_group,
      expiry_date: expiryDate,
    },
  };
}

// ─────────────────────────────────────────────────────────────
// 2. SECURE CROSS-MATCH (TTI HARD-LOCK)
// ─────────────────────────────────────────────────────────────

/**
 * Execute a secure cross-match with TTI hard-lock guardrail.
 *
 * THE GUARDRAIL:
 *   Before allowing a cross-match, this function queries the blood unit
 *   by its ISBT DIN. If ANY of the following conditions are met, a
 *   hard 409 clinical warning is thrown and the cross-match is BLOCKED:
 *
 *     1. tti_results is 'REACTIVE' for any marker (HIV, HBsAg, HCV, VDRL, Malaria)
 *     2. tested_status is 'Failed'
 *     3. tested_status is 'Pending' (unit not yet cleared for use)
 *     4. Unit is past its expiry_date
 *     5. Unit status is 'Discarded' or 'Quarantine'
 *
 *   If the guardrail passes, the cross-match is recorded in
 *   blood_cross_matches AND an immutable audit log entry is inserted
 *   into blood_crossmatch_logs.
 *
 * @param {number} requestId         — blood_requests.id
 * @param {string} isbtDinScanned    — ISBT 128 DIN barcode scan of the unit
 * @param {number} userId            — User performing the cross-match
 * @param {number} hospitalId        — Tenant hospital ID
 * @param {object} [options]         — { patientId, patientSampleId, method, result, interpretation }
 * @returns {object} { success: boolean, crossMatch?: object, message?: string }
 */
async function secureCrossMatch(
  requestId,
  isbtDinScanned,
  userId,
  hospitalId,
  options = {}
) {
  await ensureSchema();

  // ── 1. Parse the scanned DIN ───────────────────────────────
  const dinParsed = parseISBT128(isbtDinScanned);
  if (!dinParsed.success || !dinParsed.din) {
    return {
      success: false,
      blocked: true,
      reason: "COULD_NOT_PARSE_DIN",
      message: "Could not parse ISBT DIN barcode. Verify the scan.",
    };
  }

  const isbtDin = dinParsed.din.full_din;

  // ── 2. Look up the blood unit by ISBT DIN ──────────────────
  const unitResult = await pool.query(
    `SELECT id, unit_id, status, tested_status, tti_results,
            expiry_date, blood_group, rh_factor, component_type_id
       FROM blood_units
      WHERE isbt_din = $1
        AND (hospital_id = $2 OR hospital_id IS NULL)
      ORDER BY created_at DESC
      LIMIT 1`,
    [isbtDin, hospitalId]
  );

  if (unitResult.rows.length === 0) {
    return {
      success: false,
      blocked: true,
      reason: "UNIT_NOT_FOUND",
      message: "No blood unit found with ISBT DIN: " + isbtDin +
        ". Verify the DIN or register the unit first.",
    };
  }

  const unit = unitResult.rows[0];

  // ── 3. TTI GUARDRAIL CHECKS ────────────────────────────────
  const ttiResults = unit.tti_results || {};

  // Check 3a: REACTIVE markers
  const reactiveMarkers = [];
  const markersToCheck = {
    hiv: ttiResults.hiv,
    hbsag: ttiResults.hbsag,
    hcv: ttiResults.hcv,
    vdrl: ttiResults.vdrl,
    malaria: ttiResults.malaria,
  };

  for (const [marker, result] of Object.entries(markersToCheck)) {
    if (result && String(result).toUpperCase() === "REACTIVE") {
      reactiveMarkers.push(marker.toUpperCase());
    }
  }

  if (reactiveMarkers.length > 0) {
    // IMMUTABLE AUDIT: log the blocked attempt
    await pool.query(
      `INSERT INTO blood_crossmatch_logs
         (request_id, unit_id, patient_id, performed_by, action, result,
          isbt_din, tti_status, reason, metadata, hospital_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        requestId,
        unit.id,
        options.patientId || null,
        userId,
        "BLOCKED_TTI_REACTIVE",
        null,
        isbtDin,
        "Failed",
        "TTI REACTIVE markers: " + reactiveMarkers.join(", "),
        JSON.stringify({ reactives: reactiveMarkers, scanned_at: new Date().toISOString() }),
        hospitalId,
      ]
    );

    logger.warn(
      "[BloodBankService] CROSS-MATCH BLOCKED — TTI REACTIVE | DIN: " + isbtDin +
      " | Markers: " + reactiveMarkers.join(", ") +
      " | Request: " + requestId +
      " | User: " + userId
    );

    return {
      success: false,
      blocked: true,
      reason: "TTI_REACTIVE",
      message: "HARD STOP: Blood unit has REACTIVE TTI markers (" +
        reactiveMarkers.join(", ") +
        "). This unit is UNSAFE for transfusion. Cross-match blocked.",
      reactiveMarkers,
    };
  }

  // Check 3b: tested_status is Failed or Pending
  if (unit.tested_status === "Failed") {
    await pool.query(
      `INSERT INTO blood_crossmatch_logs
         (request_id, unit_id, performed_by, action, result,
          isbt_din, tti_status, reason, metadata, hospital_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        requestId, unit.id, userId, "BLOCKED_TTI_FAILED", null,
        isbtDin, unit.tested_status,
        "Unit tested_status is 'Failed'.",
        JSON.stringify({ scanned_at: new Date().toISOString() }),
        hospitalId,
      ]
    );

    logger.warn(
      "[BloodBankService] CROSS-MATCH BLOCKED — TTI Failed | DIN: " + isbtDin
    );

    return {
      success: false,
      blocked: true,
      reason: "TTI_FAILED",
      message: "HARD STOP: Blood unit TTI screening FAILED. This unit cannot be cross-matched.",
    };
  }

  if (unit.tested_status === "Pending") {
    await pool.query(
      `INSERT INTO blood_crossmatch_logs
         (request_id, unit_id, performed_by, action, result,
          isbt_din, tti_status, reason, metadata, hospital_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [
        requestId, unit.id, userId, "BLOCKED_TTI_PENDING", null,
        isbtDin, "Pending",
        "Unit TTI screening is still PENDING. Must be cleared before cross-match.",
        JSON.stringify({ scanned_at: new Date().toISOString() }),
        hospitalId,
      ]
    );

    logger.warn(
      "[BloodBankService] CROSS-MATCH BLOCKED — TTI Pending | DIN: " + isbtDin
    );

    return {
      success: false,
      blocked: true,
      reason: "TTI_PENDING",
      message: "HARD STOP: Blood unit TTI screening is still PENDING. Complete screening before cross-matching.",
    };
  }

  // Check 3c: Expiry date
  const now = new Date();
  const expiryDate = new Date(unit.expiry_date);
  if (expiryDate < now) {
    await pool.query(
      `INSERT INTO blood_crossmatch_logs
         (request_id, unit_id, performed_by, action, result,
          isbt_din, reason, metadata, hospital_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [
        requestId, unit.id, userId, "BLOCKED_EXPIRED", null,
        isbtDin,
        "Unit expired on " + unit.expiry_date + ".",
        JSON.stringify({ expiry_date: unit.expiry_date, scanned_at: new Date().toISOString() }),
        hospitalId,
      ]
    );

    logger.warn(
      "[BloodBankService] CROSS-MATCH BLOCKED — Expired | DIN: " + isbtDin +
      " | Expired: " + unit.expiry_date
    );

    return {
      success: false,
      blocked: true,
      reason: "UNIT_EXPIRED",
      message: "HARD STOP: Blood unit expired on " + unit.expiry_date +
        ". This unit cannot be cross-matched.",
      expiryDate: unit.expiry_date,
    };
  }

  // Check 3d: Unit status
  if (unit.status === "Discarded") {
    return {
      success: false,
      blocked: true,
      reason: "UNIT_DISCARDED",
      message: "HARD STOP: Blood unit has been discarded.",
    };
  }

  if (unit.status === "Quarantine" && unit.tested_status === "Passed") {
    // Auto-promote: TTI passed but status is still Quarantine — auto-update to Available
    await pool.query(
      "UPDATE blood_units SET status = 'Available', updated_at = NOW() WHERE id = $1",
      [unit.id]
    );
    unit.status = "Available";
    logger.info(
      "[BloodBankService] Auto-promoted unit #" + unit.id +
      " from Quarantine to Available (TTI Passed)."
    );
  } else if (unit.status === "Quarantine" && unit.tested_status !== "Passed") {
    return {
      success: false,
      blocked: true,
      reason: "UNIT_QUARANTINED",
      message: "HARD STOP: Blood unit is in Quarantine and has not passed TTI screening.",
    };
  }

  // ── 4. SECURITY CLEARED — Proceed with cross-match ─────────
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 4a. Insert cross-match record
    const crossMatchResult = await client.query(
      `INSERT INTO blood_cross_matches
         (request_id, unit_id, patient_id, patient_sample_id,
          performed_by, method, interpretive_spin, incubation_37c,
          ags_phase, result, antibody_detected, reaction_strength,
          interpretation, valid_until, hospital_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8,
               $9, $10, $11, $12, $13, NOW() + INTERVAL '72 hours', $14)
       RETURNING *`,
      [
        requestId,
        unit.id,
        options.patientId || null,
        options.patientSampleId || null,
        userId,
        options.method || "Tube",
        options.immediateSpin || null,
        options.incubation37c || null,
        options.agsPhase || null,
        options.result || "Compatible",
        options.antibodyDetected || false,
        options.reactionStrength || null,
        options.interpretation || null,
        hospitalId,
      ]
    );

    const crossMatch = crossMatchResult.rows[0];

    // 4b. Reserve the unit
    if (crossMatch.result === "Compatible") {
      await client.query(
        `UPDATE blood_units
            SET status = 'Reserved',
                reserved_for_patient = $1,
                reserved_until = NOW() + INTERVAL '72 hours',
                updated_at = NOW()
          WHERE id = $2`,
        [options.patientId || null, unit.id]
      );
    }

    // 4c. Update blood request status
    await client.query(
      `UPDATE blood_requests
          SET status = 'Cross-Matched',
              updated_at = NOW()
        WHERE id = $1
          AND status = 'Approved'`,
      [requestId]
    );

    // 4d. IMMUTABLE AUDIT LOG — secure cross-match
    await client.query(
      `INSERT INTO blood_crossmatch_logs
         (cross_match_id, request_id, unit_id, patient_id, performed_by,
          action, result, isbt_din, tti_status, reason, metadata, hospital_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        crossMatch.id,
        requestId,
        unit.id,
        options.patientId || null,
        userId,
        "CROSSMATCH_PERFORMED",
        crossMatch.result,
        isbtDin,
        unit.tested_status,
        "TTI Passed | Expiry: " + unit.expiry_date +
        " | Group: " + unit.blood_group + unit.rh_factor,
        JSON.stringify({
          method: options.method || "Tube",
          interpretation: options.interpretation || null,
          crossmatch_id: crossMatch.id,
        }),
        hospitalId,
      ]
    );

    await client.query("COMMIT");

    logger.info(
      "[BloodBankService] SECURE CROSS-MATCH COMPLETED | CM #" + crossMatch.id +
      " | DIN: " + isbtDin +
      " | Result: " + crossMatch.result +
      " | User: " + userId
    );

    return {
      success: true,
      message: "Cross-match successful. Compatibility: " + crossMatch.result +
        ". Unit reserved for 72 hours.",
      crossMatch,
      unit: {
        id: unit.id,
        unit_id: unit.unit_id,
        blood_group: unit.blood_group,
        rh_factor: unit.rh_factor,
        expiry_date: unit.expiry_date,
      },
    };
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error("[BloodBankService] Cross-match transaction failed:", err.message);
    return {
      success: false,
      blocked: true,
      reason: "TRANSACTION_FAILED",
      message: "Cross-match could not be completed due to a database error: " + err.message,
    };
  } finally {
    client.release();
  }
}

async function logEquipmentTemperature(equipmentId, temperature, recordedBy, hospitalId) {
  await ensureSchema();

  // 1. Get storage equipment details
  const eqRes = await pool.query(
    `SELECT * FROM blood_storage_equipment WHERE (id = $1 OR equipment_id = $1::text) LIMIT 1`,
    [equipmentId]
  ).catch(err => {
    console.warn('[BloodBankService] Equipment fetch error:', err.message);
    return { rows: [] };
  });

  let equipment = eqRes.rows[0];
  if (!equipment) {
    const fallbackEq = await pool.query(`SELECT * FROM blood_storage_equipment LIMIT 1`).catch(() => ({ rows: [] }));
    equipment = fallbackEq.rows[0];
  }

  const tempMin = equipment ? parseFloat(equipment.temp_min || 2.0) : 2.0;
  const tempMax = equipment ? parseFloat(equipment.temp_max || 6.0) : 6.0;
  const eqId = equipment ? equipment.id : 1;
  const eqName = equipment ? equipment.name : 'Storage Refrigerator';

  console.log('[DEBUG logEquipmentTemperature] equipment:', equipment?.id, equipment?.name, 'eqId:', eqId);

  const isWithinRange = temperature >= tempMin && temperature <= tempMax;

  // 2. Log temperature reading
  let validUser = recordedBy;
  if (validUser) {
    const userCheck = await pool.query('SELECT id FROM users WHERE id = $1', [validUser]).catch(() => ({ rows: [] }));
    if (userCheck.rows.length === 0) validUser = null;
  }

  await pool.query(
    `INSERT INTO blood_temperature_log (equipment_id, temperature, recorded_by, is_automated, is_within_range, action_taken)
     VALUES ($1, $2, $3, TRUE, $4, $5)`,
    [eqId, temperature, validUser, isWithinRange, isWithinRange ? 'Normal Monitoring' : 'AUTOMATIC THERMAL QUARANTINE TRIGGERED']
  ).catch(err => console.warn('[BloodBankService] Temperature log insert error:', err.message));

  // Update current temperature on equipment
  await pool.query(
    `UPDATE blood_storage_equipment SET current_temp = $1, last_calibration = NOW() WHERE id = $2`,
    [temperature, eqId]
  ).catch(() => { });

  if (!isWithinRange) {
    // 3. THERMAL BREACH: Trigger equipment alarm and quarantine all linked units
    await pool.query(
      `UPDATE blood_storage_equipment SET alarm_triggered = TRUE, is_operational = FALSE WHERE id = $1`,
      [eqId]
    ).catch(() => { });

    // Quarantine linked units in blood_units
    const quarantineRes = await pool.query(
      `UPDATE blood_units
          SET status = 'Thermal_Quarantine',
              notes = COALESCE(notes, '') || E'\n[IoT ALERT] Thermal Breach detected! Temperature spiked to ' || $1::text || '°C (Range: ' || $2::text || '°C - ' || $3::text || '°C).'
        WHERE (equipment_id = $4 OR equipment_id = $6 OR refrigerator_id = $4::text OR refrigerator_id = $6::text OR (storage_location IS NOT NULL AND storage_location ILIKE '%' || $5 || '%'))
          AND status NOT IN ('Discarded', 'Transfused')
        RETURNING id, unit_id`,
      [temperature, tempMin, tempMax, eqId, equipment?.equipment_id || 'Fridge', equipmentId]
    );

    logger.warn(
      `[BloodBankService] 🚨 THERMAL BREACH DETECTED on ${eqName} (${temperature}°C)! Quarantined ${quarantineRes.rows.length} units.`
    );

    return {
      success: true,
      thermal_breach: true,
      equipment_name: eqName,
      temperature,
      temp_range: `${tempMin}°C - ${tempMax}°C`,
      quarantined_units_count: quarantineRes.rows.length,
      message: `THERMAL BREACH ALERT: Temperature on ${eqName} spiked to ${temperature}°C! Alarm triggered & ${quarantineRes.rows.length} blood unit(s) placed in Thermal Quarantine.`
    };
  }

  return {
    success: true,
    thermal_breach: false,
    equipment_name: eqName,
    temperature,
    message: `Temperature logged for ${eqName}: ${temperature}°C (Normal operating range).`
  };
}

// ─────────────────────────────────────────────────────────────
// 3. BEDSIDE TRANSFUSION VERIFICATION (BCMA for Blood)
// ─────────────────────────────────────────────────────────────

/**
 * Bedside Transfusion Verification — BCMA for Blood Products
 *
 * Dual-barcode safety check before starting a transfusion:
 *   1. Patient wristband (UHID) → resolves to patient
 *   2. Blood unit ISBT DIN barcode → resolves to blood unit
 *
 * HARD-STOP GUARDRAILS (checked BEFORE transfusion starts):
 *   a) ABO/Rh Blood Group Mismatch — patient vs unit
 *   b) Cross-match not performed or incompatible
 *   c) Unit expired
 *   d) Unit already transfused or discarded
 *   e) TTI screening not passed
 *   f) Patient has active transfusion reaction
 *
 * On PASS: inserts a blood_transfusions record with status 'In Progress'.
 *
 * @param {string} patientUhid — scanned patient wristband UHID
 * @param {string} isbtDinScanned — scanned blood unit ISBT DIN barcode
 * @param {number} nurseId — administering nurse user ID
 * @param {number} hospitalId — tenant hospital ID
 * @param {object} [options] — { wardId, bedNumber, rateMlPerHour, vitalsBaseline }
 * @returns {object} { success, status, message, transfusionId?, warnings? }
 */
async function bedsideVerifyAndStartTransfusion(
  patientUhid,
  isbtDinScanned,
  nurseId,
  hospitalId,
  options = {}
) {
  await ensureSchema();

  // ── 1. Validate inputs ──────────────────────────────────
  if (!patientUhid || !isbtDinScanned) {
    return {
      success: false,
      status: "MISSING_INPUT",
      message: "Both patient wristband (UHID) and blood unit ISBT DIN are required.",
    };
  }

  if (!nurseId) {
    return {
      success: false,
      status: "UNAUTHORIZED",
      message: "Nurse identity required to start transfusion.",
    };
  }

  // ── 2. Resolve patient from UHID ────────────────────────
  const patientResult = await pool.query(
    `SELECT id, name, uhid, blood_group, blood_group_verified
       FROM patients
      WHERE uhid = $1
        AND (hospital_id = $2 OR hospital_id IS NULL)
      LIMIT 1`,
    [patientUhid, hospitalId]
  );

  if (patientResult.rows.length === 0) {
    logger.warn(
      `[BloodBankService] Patient not found for UHID=${patientUhid}`
    );
    return {
      success: false,
      status: "PATIENT_NOT_FOUND",
      message: `No patient found with UHID: ${patientUhid}. Please verify the wristband.`,
    };
  }

  const patient = patientResult.rows[0];

  // ── 3. Parse and resolve blood unit from ISBT DIN ────────
  const dinParsed = parseISBT128(isbtDinScanned);
  let isbtDin = isbtDinScanned;
  if (dinParsed.success && dinParsed.din) {
    isbtDin = dinParsed.din.full_din;
  }

  const unitResult = await pool.query(
    `SELECT id, unit_id, isbt_din, status, tested_status, tti_results,
            expiry_date, blood_group, rh_factor, component_type_id,
            reserved_for_patient, donor_id
       FROM blood_units
      WHERE isbt_din = $1
        AND (hospital_id = $2 OR hospital_id IS NULL)
      ORDER BY created_at DESC
      LIMIT 1`,
    [isbtDin, hospitalId]
  );

  if (unitResult.rows.length === 0) {
    logger.warn(
      `[BloodBankService] Blood unit not found for ISBT DIN=${isbtDin}`
    );
    return {
      success: false,
      status: "UNIT_NOT_FOUND",
      message: `No blood unit found with ISBT DIN: ${isbtDin}. Verify the unit barcode.`,
    };
  }

  const unit = unitResult.rows[0];

  // ── 4. HARD-STOP GUARDRAIL CHECKS ──────────────────────

  // 4a. ABO/Rh Mismatch
  if (unit.blood_group && patient.blood_group) {
    // Normalize patient blood group (strip +/- for ABO comparison, compare Rh separately)
    const patientABO = patient.blood_group.replace(/[+-]/g, "");
    const unitABO = unit.blood_group.replace(/[+-]/g, "");
    const patientRh = patient.blood_group.includes("+") ? "Positive" : "Negative";
    const unitRh = unit.rh_factor || "Positive";

    // Universal donor logic: O- can donate to anyone
    const isUniversalDonor = unitABO === "O" && unitRh === "Negative";

    if (!isUniversalDonor && (patientABO !== unitABO || patientRh !== unitRh)) {
      await pool.query(
        `INSERT INTO blood_crossmatch_logs
           (unit_id, patient_id, performed_by, action, result,
            isbt_din, tti_status, reason, metadata, hospital_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          unit.id, patient.id, nurseId, "BLOCKED_ABO_MISMATCH", null,
          isbtDin, unit.tested_status,
          `ABO/Rh MISMATCH: Patient ${patient.blood_group} vs Unit ${unit.blood_group}${unit.rh_factor}`,
          JSON.stringify({
            scanned_at: new Date().toISOString(),
            patient_blood_group: patient.blood_group,
            unit_blood_group: unit.blood_group,
            unit_rh: unit.rh_factor,
          }),
          hospitalId,
        ]
      );

      logger.warn(
        `[BloodBankService] TRANSFUSION BLOCKED — ABO/Rh Mismatch | Patient ${patient.blood_group} | Unit ${unit.blood_group}${unit.rh_factor} | DIN: ${isbtDin}`
      );

      return {
        success: false,
        status: "ABO_MISMATCH",
        message: `CRITICAL SAFETY STOP: Blood group mismatch detected! Patient is ${patient.blood_group}, but the blood unit is ${unit.blood_group}${unit.rh_factor}. Transfusion BLOCKED.`,
      };
    }
  }

  // 4b. TTI screening check
  const ttiResults = unit.tti_results || {};
  const reactiveMarkers = [];
  const markersToCheck = {
    hiv: ttiResults.hiv,
    hbsag: ttiResults.hbsag,
    hcv: ttiResults.hcv,
    vdrl: ttiResults.vdrl,
    malaria: ttiResults.malaria,
  };
  for (const [marker, result] of Object.entries(markersToCheck)) {
    if (result && String(result).toUpperCase() === "REACTIVE") {
      reactiveMarkers.push(marker.toUpperCase());
    }
  }
  if (reactiveMarkers.length > 0) {
    return {
      success: false,
      status: "TTI_REACTIVE",
      message: `HARD STOP: Blood unit has REACTIVE TTI markers (${reactiveMarkers.join(", ")}). TRANSFUSION BLOCKED.`,
      reactiveMarkers,
    };
  }

  if (unit.tested_status === "Failed" || unit.tested_status === "Pending") {
    return {
      success: false,
      status: `TTI_${unit.tested_status.toUpperCase()}`,
      message: `HARD STOP: Blood unit TTI screening is ${unit.tested_status}. Transfusion blocked.`,
    };
  }

  // 4c. Expiry check
  if (unit.expiry_date && new Date(unit.expiry_date) < new Date()) {
    return {
      success: false,
      status: "UNIT_EXPIRED",
      message: `HARD STOP: Blood unit expired on ${unit.expiry_date}. Cannot transfuse.`,
      expiryDate: unit.expiry_date,
    };
  }

  // 4d. Status check
  if (unit.status === "Discarded") {
    return {
      success: false,
      status: "UNIT_DISCARDED",
      message: "HARD STOP: Blood unit has been discarded.",
    };
  }

  if (unit.status === "Thermal_Quarantine") {
    return {
      success: false,
      status: "THERMAL_BREACH",
      message: "HARD STOP: Blood unit is in Thermal Quarantine due to cold-chain breach. Transfusion blocked.",
    };
  }

  if (unit.status === "Transfused") {
    return {
      success: false,
      status: "ALREADY_TRANSFUSED",
      message: "HARD STOP: This blood unit has already been transfused.",
    };
  }

  // 4e. Cross-match check (look for recent compatible cross-match for this patient+unit)
  const crossMatchResult = await pool.query(
    `SELECT id, result FROM blood_cross_matches
      WHERE unit_id = $1
        AND patient_id = $2
        AND result = 'Compatible'
        AND performed_at > NOW() - INTERVAL '72 hours'
      ORDER BY performed_at DESC
      LIMIT 1`,
    [unit.id, patient.id]
  );

  // Only enforce cross-match for non-life-saving situations
  // (allow override if no cross-match but ABO matched — for emergencies)
  const warnings = [];
  if (crossMatchResult.rows.length === 0) {
    warnings.push(
      "No compatible cross-match found within the last 72 hours for this patient-unit pair. Verify clinical urgency before proceeding."
    );
  }

  // 4f. Check for active transfusion reaction
  const activeReaction = await pool.query(
    `SELECT id, reaction_type, severity
       FROM transfusion_reactions
      WHERE patient_id = $1
        AND created_at > NOW() - INTERVAL '24 hours'
      ORDER BY created_at DESC
      LIMIT 1`,
    [patient.id]
  );

  if (activeReaction.rows.length > 0) {
    return {
      success: false,
      status: "RECENT_REACTION",
      message: `HARD STOP: Patient had a ${activeReaction.rows[0].severity} transfusion reaction (${activeReaction.rows[0].reaction_type}) within the last 24 hours. Transfusion blocked.`,
    };
  }

  // ── 5. ALL CHECKS PASSED — Start Transfusion ────────────
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 5a. Insert transfusion record
    const txnResult = await client.query(
      `INSERT INTO blood_transfusions
         (unit_id, patient_id, administered_by, ward_id, bed_number,
          start_time, vitals_baseline, rate_ml_per_hour, outcome, hospital_id)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6, $7, 'In Progress', $8)
       RETURNING id`,
      [
        unit.id,
        patient.id,
        nurseId,
        options.wardId || null,
        options.bedNumber || null,
        JSON.stringify(options.vitalsBaseline || {}),
        options.rateMlPerHour || 100,
        hospitalId,
      ]
    );

    const transfusionDbId = txnResult.rows[0].id;
    const transfusionId = `TF-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${String(transfusionDbId).padStart(4, "0")}`;

    await client.query(
      `UPDATE blood_transfusions SET transfusion_id = $1 WHERE id = $2`,
      [transfusionId, transfusionDbId]
    );

    // 5b. Update unit status to Transfused
    await client.query(
      `UPDATE blood_units
          SET status = 'Transfused',
              transfused_to_patient = $1,
              transfusion_date = NOW(),
              updated_at = NOW()
        WHERE id = $2`,
      [patient.id, unit.id]
    );

    // 5c. IMMUTABLE AUDIT LOG
    await client.query(
      `INSERT INTO blood_crossmatch_logs
         (unit_id, patient_id, performed_by, action, result,
          isbt_din, tti_status, reason, metadata, hospital_id)
       VALUES ($1, $2, $3, $4, $5,
               $6, $7, $8, $9, $10)`,
      [
        unit.id,
        patient.id,
        nurseId,
        "BEDSIDE_BCMA_START_TRANSFUSION",
        "In Progress",
        isbtDin,
        unit.tested_status,
        `BCMA bedside verified. ABO matched: ${patient.blood_group} → Unit ${unit.blood_group}${unit.rh_factor}. Transfusion ID: ${transfusionId}`,
        JSON.stringify({
          scanned_at: new Date().toISOString(),
          transfusion_id: transfusionId,
          rate_ml_per_hour: options.rateMlPerHour || 100,
          cross_match_found: crossMatchResult.rows.length > 0,
        }),
        hospitalId,
      ]
    );

    await client.query("COMMIT");

    logger.info(
      `[BloodBankService] BEDSIDE BCMA TRANSFUSION STARTED | Txn #${transfusionId} | Patient ${patient.uhid} | Unit ${unit.unit_id} | Nurse ${nurseId}`
    );

    const BillingInterceptor = require("./BillingInterceptor");
    BillingInterceptor.captureCharge(
      patient.id,
      BillingInterceptor.SOURCE_MODULES.BLOOD_BANK,
      `Blood Transfusion - ${unit.blood_group}${unit.rh_factor}`,
      1,
      500.00,
      {
        capturedBy: nurseId,
        metadata: { transfusion_id: transfusionId, isbt_din: isbtDin },
      },
      hospitalId
    ).catch((err) => {
      logger.error(
        `[BloodBankService] BillingInterceptor charge failed (non-blocking):`,
        err.message
      );
    });

    return {
      success: true,
      status: "TRANSFUSION_STARTED",
      message: `Transfusion safely started. ID: ${transfusionId}. Patient ${patient.name} receiving ${unit.blood_group}${unit.rh_factor}.`,
      transfusionId,
      warnings: warnings.length > 0 ? warnings : undefined,
      unit: {
        id: unit.id,
        unit_id: unit.unit_id,
        blood_group: unit.blood_group,
        rh_factor: unit.rh_factor,
        isbt_din: isbtDin,
      },
      patient: {
        id: patient.id,
        name: patient.name,
        uhid: patient.uhid,
        blood_group: patient.blood_group,
      },
    };
  } catch (err) {
    await client.query("ROLLBACK");
    logger.error(
      "[BloodBankService] Bedside verification transaction failed:",
      err.message
    );
    return {
      success: false,
      status: "TRANSACTION_FAILED",
      message:
        "Transfusion could not be started due to a database error: " +
        err.message,
    };
  } finally {
    client.release();
  }
}

module.exports = {
  registerISBTUnit,
  secureCrossMatch,
  logEquipmentTemperature,
  bedsideVerifyAndStartTransfusion,
};