/**
 * WOLF HMS — Billing Interceptor Routes (Phase 7: Revenue Defense)
 *
 * Exposes the live folio ledger to the front desk and billing dashboard.
 *
 * Endpoints:
 *   GET  /api/billing/folio/:patientId   — View patient's live folio + transactions
 *   POST /api/billing/folio               — Open a new folio for a patient
 *   PUT  /api/billing/folio/:folioId/close — Close a folio at discharge
 */

const express = require("express");
const router = express.Router();
const { protect, authorize } = require("../middleware/authMiddleware");
const { getHospitalId } = require("../utils/tenantHelper");
const BillingInterceptor = require("../services/BillingInterceptor");
const ResponseHandler = require("../utils/responseHandler");

// ─────────────────────────────────────────────────────────────
// GET /api/billing/folio/:patientId
//   Fetch all folios and the live open folio with transactions.
//   Used by the front desk to show accumulating charges in real-time.
// ─────────────────────────────────────────────────────────────
router.get(
  "/folio/:patientId",
  protect,
  authorize("admin", "receptionist", "billing", "doctor", "nurse"),
  async (req, res) => {
    try {
      const { patientId } = req.params;
      const hospitalId = getHospitalId(req);

      if (!patientId) {
        return ResponseHandler.error(res, "Patient ID is required.", 400);
      }

      const result = await BillingInterceptor.getFolio(patientId, hospitalId);

      if (!result.success) {
        return ResponseHandler.error(res, result.message, 404);
      }

      ResponseHandler.success(res, result.data);
    } catch (error) {
      console.error("[GET /folio/:patientId] Error:", error);
      ResponseHandler.error(res, "Server error fetching patient folio.", 500);
    }
  }
);

// ─────────────────────────────────────────────────────────────
// POST /api/billing/folio
//   Manually open a new folio for a patient (e.g. at admission or
//   OPD registration). Idempotent — returns existing OPEN folio if
//   one already exists.
// ─────────────────────────────────────────────────────────────
router.post(
  "/folio",
  protect,
  authorize("admin", "receptionist", "billing"),
  async (req, res) => {
    try {
      const { patientId, admissionId } = req.body;
      const hospitalId = getHospitalId(req);

      if (!patientId || isNaN(parseInt(patientId))) {
        return ResponseHandler.error(res, "Valid patientId (numeric) is required.", 400);
      }

      const result = await BillingInterceptor.createFolio(
        parseInt(patientId),
        admissionId || null,
        hospitalId
      );

      if (!result.success) {
        return ResponseHandler.error(res, result.message, 400);
      }

      ResponseHandler.success(
        res,
        result.data,
        result.data.is_new ? "Folio created successfully." : "Existing open folio found.",
        201
      );
    } catch (error) {
      console.error("[POST /folio] Error:", error);
      ResponseHandler.error(res, "Server error creating folio.", 500);
    }
  }
);

// ─────────────────────────────────────────────────────────────
// PUT /api/billing/folio/:folioId/close
//   Close a folio at discharge. Marks CLOSED and does NOT delete
//   data (immutable audit trail).
// ─────────────────────────────────────────────────────────────
router.put(
  "/folio/:folioId/close",
  protect,
  authorize("admin", "receptionist", "billing"),
  async (req, res) => {
    try {
      const { folioId } = req.params;
      const hospitalId = getHospitalId(req);

      if (!folioId || isNaN(parseInt(folioId))) {
        return ResponseHandler.error(res, "Valid folioId is required.", 400);
      }

      const result = await BillingInterceptor.closeFolio(parseInt(folioId), hospitalId);

      if (!result.success) {
        return ResponseHandler.error(res, result.message, 404);
      }

      ResponseHandler.success(res, result.data, "Folio closed successfully.");
    } catch (error) {
      console.error("[PUT /folio/:folioId/close] Error:", error);
      ResponseHandler.error(res, "Server error closing folio.", 500);
    }
  }
);

module.exports = router;
