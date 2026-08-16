/**
 * WOLF HMS — BillingInterceptor.js (Phase 7: Revenue Defense)
 *
 * Captures ALL billable clinical events into a live, accumulating folio ledger.
 * Designed as a fully decoupled micro-audit trail that exists alongside
 * the existing invoice/payment system.
 *
 * Data Model:
 *   patient_folios       — one row per active folio (admission-level or open folio)
 *   folio_transactions   — every captured charge, with source module traceability
 */

const pool = require("../config/db");
const logger = require("./Logger");

// ─────────────────────────────────────────────────────────────
// Idempotent Schema Migration
// ─────────────────────────────────────────────────────────────
let schemaEnsured = false;

async function ensureSchema() {
  if (schemaEnsured) return;
  try {
    // Create patient_folios table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS patient_folios (
        id              SERIAL PRIMARY KEY,
        patient_id      INTEGER NOT NULL,
        admission_id    INTEGER,
        hospital_id     INTEGER NOT NULL DEFAULT 1,
        status          VARCHAR(30) NOT NULL DEFAULT 'OPEN',
        total_accumulated DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        closed_at       TIMESTAMPTZ,
        notes           TEXT
      )
    `);

    // Create folio_transactions table
    await pool.query(`
      CREATE TABLE IF NOT EXISTS folio_transactions (
        id              SERIAL PRIMARY KEY,
        folio_id        INTEGER NOT NULL REFERENCES patient_folios(id),
        source_module   VARCHAR(50)  NOT NULL,
        item_name       VARCHAR(255) NOT NULL,
        quantity        DECIMAL(8,2) NOT NULL DEFAULT 1,
        unit_price      DECIMAL(10,2) NOT NULL DEFAULT 0,
        total_price     DECIMAL(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
        auto_captured   BOOLEAN NOT NULL DEFAULT TRUE,
        captured_by     INTEGER,
        hospital_id     INTEGER NOT NULL DEFAULT 1,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        metadata        JSONB
      )
    `);

    // Create indexes
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_patient_folios_patient
        ON patient_folios(patient_id, hospital_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_patient_folios_status
        ON patient_folios(status)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_folio_transactions_folio
        ON folio_transactions(folio_id)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_folio_transactions_module
        ON folio_transactions(source_module)
    `);
    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_folio_transactions_created
        ON folio_transactions(created_at DESC)
    `);

    schemaEnsured = true;
    logger.info("[BillingInterceptor] Schema ensured (patient_folios + folio_transactions).");
  } catch (err) {
    logger.error("[BillingInterceptor] Schema migration error:", err.message);
    // Non-fatal — tables likely exist from a prior run
  }
}

// ─────────────────────────────────────────────────────────────
// Source Module Constants
// ─────────────────────────────────────────────────────────────
const SOURCE_MODULES = {
  WARD_PHARMACY: "WARD_PHARMACY",
  LABORATORY: "LABORATORY",
  RADIOLOGY: "RADIOLOGY",
  PROCEDURE: "PROCEDURE",
  CONSUMABLE: "CONSUMABLE",
  BED_CHARGE: "BED_CHARGE",
  BLOOD_BANK: "BLOOD_BANK",
  OTHER: "OTHER",
};

// ─────────────────────────────────────────────────────────────
// PUBLIC API
// ─────────────────────────────────────────────────────────────

/**
 * createFolio
 *
 * Opens a new live folio for a patient (typically upon admission).
 * If an OPEN folio already exists for the given patient + admission combo,
 * returns it silently (idempotent).
 *
 * @param {number} patientId   — patients.id
 * @param {number} admissionId — admissions.id (optional; null for OPD-only folio)
 * @param {number} hospitalId  — Tenant hospital ID
 * @returns {object} { success: true, data: { folio_id, is_new } }
 */
function formatUuid(id) {
  if (!id) return '00000000-0000-0000-0000-000000000001';
  const str = String(id);
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str)) {
    return str;
  }
  const num = parseInt(str) || 1;
  return `00000000-0000-0000-0000-${String(num).padStart(12, '0')}`;
}

async function createFolio(patientId, admissionId, hospitalId) {
  await ensureSchema();
  const pid = formatUuid(patientId);

  // 1. Look for existing OPEN folio
  let existingQuery = `
    SELECT id FROM patient_folios
     WHERE patient_id = $1
       AND status = 'OPEN'
       AND (hospital_id = $2 OR hospital_id IS NULL)
  `;
  let params = [pid, hospitalId];

  if (admissionId !== null && admissionId !== undefined) {
    existingQuery += ` AND admission_id = $3`;
    params.push(admissionId);
  } else {
    existingQuery += ` AND admission_id IS NULL`;
  }

  const existingRes = await pool.query(
    existingQuery + ` LIMIT 1`,
    params
  );

  if (existingRes.rows.length > 0) {
    return {
      success: true,
      data: { folio_id: existingRes.rows[0].id, is_new: false },
    };
  }

  // 2. Create new folio
  const insertRes = await pool.query(
    `INSERT INTO patient_folios (patient_id, admission_id, hospital_id)
     VALUES ($1, $2, $3)
     RETURNING id`,
    [pid, admissionId || null, hospitalId]
  );

  logger.info(
    `[BillingInterceptor] Folio #${insertRes.rows[0].id} created for patient ${pid} (admission ${admissionId || "N/A"}).`
  );

  return {
    success: true,
    data: { folio_id: insertRes.rows[0].id, is_new: true },
  };
}

async function captureCharge(
  patientId,
  sourceModule,
  itemName,
  quantity,
  unitPrice,
  options = {},
  hospitalId
) {
  await ensureSchema();
  const pid = formatUuid(patientId);

  const { admissionId, capturedBy, metadata } = options;

  // 1. Find ACTIVE folio for this patient
  const folioResult = await pool.query(
    `SELECT id, total_accumulated
       FROM patient_folios
      WHERE patient_id = $1
        AND status = 'OPEN'
        AND (admission_id = $2 OR ($2 IS NULL AND admission_id IS NULL))
        AND (hospital_id = $3 OR hospital_id IS NULL)
      ORDER BY created_at DESC
      LIMIT 1`,
    [pid, admissionId || null, hospitalId]
  );

  if (folioResult.rows.length === 0) {
    // Auto-create a folio if one doesn't exist (OPD scenario)
    const newFolio = await createFolio(pid, admissionId || null, hospitalId);
    const folioId = newFolio.data.folio_id;

    // Now insert
    return await _insertTransaction(
      folioId,
      pid,
      sourceModule,
      itemName,
      quantity,
      unitPrice,
      capturedBy || null,
      metadata || null,
      hospitalId
    );
  }

  // 2. Insert the transaction
  return await _insertTransaction(
    folioResult.rows[0].id,
    pid,
    sourceModule,
    itemName,
    quantity,
    unitPrice,
    capturedBy || null,
    metadata || null,
    hospitalId
  );
}

async function getFolio(patientId, hospitalId) {
  await ensureSchema();
  const pid = formatUuid(patientId);

  // Fetch all folios for this patient
  const foliosRes = await pool.query(
    `SELECT * FROM patient_folios
      WHERE patient_id = $1
        AND (hospital_id = $2 OR hospital_id IS NULL)
      ORDER BY created_at DESC`,
    [pid, hospitalId]
  );

  if (foliosRes.rows.length === 0) {
    return {
      success: true,
      data: {
        total_accumulated: 0,
        transactions: [],
        folios: [],
        open_folio: null,
        message: "No folio found for this patient.",
      },
    };
  }

  // Find the open folio
  const openFolio = foliosRes.rows.find((f) => f.status === "OPEN") || null;
  let openFolioTransactions = [];

  if (openFolio) {
    const txnRes = await pool.query(
      `SELECT * FROM folio_transactions
        WHERE folio_id = $1
        ORDER BY created_at DESC`,
      [openFolio.id]
    );
    openFolioTransactions = txnRes.rows;
  }

  return {
    success: true,
    data: {
      total_accumulated: openFolio ? parseFloat(openFolio.total_accumulated) : 0,
      transactions: openFolioTransactions,
      folios: foliosRes.rows,
      open_folio: openFolio
        ? {
          ...openFolio,
          transactions: openFolioTransactions,
          transaction_count: openFolioTransactions.length,
        }
        : null,
    },
  };
}

/**
 * closeFolio
 *
 * Closes a folio (performed at discharge).
 *
 * @param {number} folioId    — patient_folios.id
 * @param {number} hospitalId — Tenant hospital ID
 * @returns {object} { success: true, data: { folio_id, total } }
 */
async function closeFolio(folioId, hospitalId) {
  await ensureSchema();

  const result = await pool.query(
    `UPDATE patient_folios
        SET status = 'CLOSED', closed_at = NOW()
      WHERE id = $1
        AND hospital_id = $2
      RETURNING id, total_accumulated, patient_id`,
    [folioId, hospitalId]
  );

  if (result.rows.length === 0) {
    return { success: false, message: "Folio not found or already closed." };
  }

  logger.info(
    `[BillingInterceptor] Folio #${folioId} closed. Total: ₹${result.rows[0].total_accumulated}`
  );

  return { success: true, data: result.rows[0] };
}

// ─────────────────────────────────────────────────────────────
// INTERNAL: Insert transaction and update folio total
// ─────────────────────────────────────────────────────────────

async function _insertTransaction(
  folioId,
  patientId,
  sourceModule,
  itemName,
  quantity,
  unitPrice,
  capturedBy,
  metadata,
  hospitalId
) {
  const totalPrice = parseFloat(quantity) * parseFloat(unitPrice);

  // Insert transaction
  const txnRes = await pool.query(
    `INSERT INTO folio_transactions
       (folio_id, source_module, item_name, quantity, unit_price, auto_captured, captured_by, hospital_id, metadata)
     VALUES ($1, $2, $3, $4, $5, TRUE, $6, $7, $8)
     RETURNING id`,
    [
      folioId,
      sourceModule,
      itemName,
      quantity,
      unitPrice,
      capturedBy || null,
      hospitalId,
      metadata ? JSON.stringify(metadata) : null,
    ]
  );

  // Update folio total_accumulated
  const folioRes = await pool.query(
    `UPDATE patient_folios
        SET total_accumulated = total_accumulated + $1
      WHERE id = $2
      RETURNING total_accumulated`,
    [totalPrice, folioId]
  );

  const newTotal = folioRes.rows[0].total_accumulated;

  logger.info(
    `[BillingInterceptor] ✅ Captured "${itemName}" [${sourceModule}] ×${quantity} @ ₹${unitPrice} = ₹${totalPrice} → Folio #${folioId} (Total: ₹${newTotal})`
  );

  return {
    success: true,
    data: {
      transaction_id: txnRes.rows[0].id,
      folio_id: folioId,
      total_accumulated: parseFloat(newTotal),
      charge: {
        source_module: sourceModule,
        item_name: itemName,
        quantity: parseFloat(quantity),
        unit_price: parseFloat(unitPrice),
        total_price: parseFloat(totalPrice),
        auto_captured: true,
      },
    },
  };
}

// ─────────────────────────────────────────────────────────────
// Module Exports
// ─────────────────────────────────────────────────────────────
module.exports = {
  createFolio,
  captureCharge,
  getFolio,
  closeFolio,
  SOURCE_MODULES,
};