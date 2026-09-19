/**
 * Blood Bank Routes
 * WOLF HMS - Phase 1
 */

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/authMiddleware');
const bloodBankController = require('../controllers/bloodBankController');

// All routes require authentication
router.use(protect);

// ============================================
// DASHBOARD
// ============================================
router.get('/dashboard', bloodBankController.getDashboardStats);

// ============================================
// DONORS
// ============================================
router.get('/donors', bloodBankController.getDonors);
router.post('/donors', authorize('admin', 'blood_bank_tech'), bloodBankController.registerDonor);
router.get('/donors/:id', bloodBankController.getDonorById);
router.put('/donors/:id/eligibility', authorize('admin', 'blood_bank_tech'), bloodBankController.updateDonorEligibility);

// ============================================
// INVENTORY
// ============================================
router.get('/inventory', bloodBankController.getInventorySummary);
router.get('/units', bloodBankController.getBloodUnits);
router.post('/units', authorize('admin', 'blood_bank_tech'), bloodBankController.addBloodUnit);
router.put('/units/:id', authorize('admin', 'blood_bank_tech'), bloodBankController.updateUnitStatus);
router.post('/units/:id/separate', authorize('admin', 'blood_bank_tech'), bloodBankController.separateComponents);

// ============================================
// REQUESTS
// ============================================
router.get('/requests', bloodBankController.getPendingRequests);
router.post('/requests', authorize('admin', 'blood_bank_tech', 'doctor', 'nurse'), bloodBankController.createRequest);
router.put('/requests/:id/process', authorize('admin', 'blood_bank_tech'), bloodBankController.processRequest);
router.post('/issue', authorize('admin', 'blood_bank_tech'), bloodBankController.issueBlood);

// ============================================
// COMPONENT TYPES
// ============================================
router.get('/component-types', bloodBankController.getComponentTypes);

// ============================================
// PHASE 2: TTI TESTING
// ============================================
router.get('/testing/pending', bloodBankController.getUnitsForTesting);
router.post('/testing/tti', authorize('admin', 'blood_bank_tech', 'lab_tech'), bloodBankController.recordTTIResults);

// ============================================
// PHASE 2: CROSS-MATCHING
// ============================================
router.post('/cross-match', authorize('admin', 'blood_bank_tech'), bloodBankController.performCrossMatch);
router.post('/crossmatch', authorize('admin', 'blood_bank_tech'), bloodBankController.performCrossMatch);
router.get('/cross-match/:request_id', bloodBankController.getCrossMatches);
router.get('/crossmatch/:request_id', bloodBankController.getCrossMatches);

// ============================================
// PHASE 2: TRANSFUSION
// ============================================
router.get('/transfusions/active', bloodBankController.getActiveTransfusions);
router.post('/transfusions/start', authorize('admin', 'blood_bank_tech', 'nurse'), bloodBankController.startTransfusion);
router.post('/transfusion/start', authorize('admin', 'blood_bank_tech', 'nurse'), bloodBankController.startTransfusion);
router.put('/transfusions/:id/vitals', authorize('admin', 'blood_bank_tech', 'nurse'), bloodBankController.updateTransfusionVitals);
router.put('/transfusions/:id/complete', authorize('admin', 'blood_bank_tech', 'nurse'), bloodBankController.completeTransfusion);
router.post('/transfusion/complete', authorize('admin', 'blood_bank_tech', 'nurse'), (req, res, next) => {
    if (req.body.request_id && !req.params.id) {
        req.params.id = req.body.request_id;
    }
    return bloodBankController.completeTransfusion(req, res, next);
});

// Surgical Blood Reserve
router.post('/reserve', authorize('admin', 'blood_bank_tech', 'doctor', 'nurse'), async (req, res, next) => {
    try {
        const { patient_id, surgery_id, blood_group, components, notes } = req.body;
        const hospitalId = req.hospital_id || req.user?.hospital_id || 1;
        if (surgery_id) {
            req.body.blood_group_required = blood_group;
            req.body.prbc_units_required = components?.prbc || 1;
            return bloodBankController.createSurgeryBloodRequirement(req, res, next);
        }
        const db = require('../db');
        const result = await db.pool.query(
            `INSERT INTO blood_requests (patient_id, department, blood_group_required, component_type_id, units_required, priority, indication, cross_match_required, status, requested_by, hospital_id)
             VALUES ($1, 'Surgery', $2, 1, 1, 'Urgent', COALESCE($3, 'Surgical Reserve'), true, 'Pending', $4, $5) RETURNING *`,
            [patient_id, blood_group, notes, req.user?.id, hospitalId]
        );
        res.status(201).json({ success: true, message: 'Blood reserved successfully', request: result.rows[0] });
    } catch (err) {
        console.error('[BloodBank Reserve Error]:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Emergency MTP Release
router.post('/emergency-release', authorize('admin', 'blood_bank_tech', 'doctor', 'nurse'), async (req, res) => {
    try {
        const { patient_id, blood_group, mtp_package, indication, attending_physician } = req.body;
        const hospitalId = req.hospital_id || req.user?.hospital_id || 1;
        const db = require('../db');
        const result = await db.pool.query(
            `INSERT INTO blood_requests (patient_id, department, blood_group_required, component_type_id, units_required, priority, indication, status, requested_by, hospital_id)
             VALUES ($1, 'Emergency/MTP', $2, 1, 4, 'Emergency', COALESCE($3, 'Massive Transfusion Protocol Activated'), 'Approved', $4, $5) RETURNING *`,
            [patient_id, blood_group || 'O-', `MTP Tier ${mtp_package || 1}: ${indication || 'Trauma'} (Dr. ${attending_physician || 'On-Duty'})`, req.user?.id, hospitalId]
        );
        res.status(201).json({
            success: true,
            message: 'MTP Emergency protocol activated. Units dispatched.',
            release: result.rows[0],
            countdown_seconds: 300
        });
    } catch (err) {
        console.error('[Emergency Blood Release Error]:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// ============================================
// PHASE 2: REACTIONS
// ============================================
router.post('/reactions', authorize('admin', 'blood_bank_tech', 'nurse', 'doctor'), bloodBankController.reportReaction);
router.get('/reactions', bloodBankController.getReactions);

// ============================================
// PHASE 3: AI FEATURES
// ============================================
router.get('/ai/forecast', bloodBankController.getDemandForecast);
router.get('/ai/expiry-analysis', bloodBankController.getExpiryAnalysis);
router.get('/ai/donor-recall', bloodBankController.getDonorRecallList);

// ============================================
// PHASE 4: eRaktKosh COMPLIANCE
// ============================================
router.get('/eraktkosh/inventory', bloodBankController.getERaktKoshInventory);
router.get('/eraktkosh/donors', bloodBankController.getERaktKoshDonors);
router.get('/eraktkosh/units', bloodBankController.getERaktKoshUnits);
router.get('/naco/report', authorize('admin', 'blood_bank_tech'), bloodBankController.getNACOReport);
router.get('/public/availability', bloodBankController.getPublicStockAvailability);

// ============================================
// PHASE 5: PRICING & BILLING
// ============================================
router.get('/pricing', bloodBankController.getPricingList);
router.post('/billing/transfusion', authorize('admin', 'blood_bank_tech', 'nurse'), bloodBankController.billTransfusion);
router.get('/patient/:patient_id/exemption', bloodBankController.checkPatientExemption);

// ============================================
// PHASE 6: PATIENT INTEGRATION
// ============================================
router.get('/patient/:patient_id/blood-profile', bloodBankController.getPatientBloodProfile);
router.get('/patient/:patient_id/transfusion-history', bloodBankController.getPatientTransfusionHistory);
router.put('/patient/:patient_id/blood-group', authorize('admin', 'blood_bank_tech', 'lab_tech'), bloodBankController.updatePatientBloodGroup);

// ============================================
// PHASE 8: OT/SURGERY INTEGRATION
// ============================================
router.get('/surgery/standards', bloodBankController.getSurgeryBloodStandards);
router.post('/surgery/requirements', authorize('admin', 'blood_bank_tech', 'doctor'), bloodBankController.createSurgeryBloodRequirement);
router.get('/surgery/:surgery_id/blood', bloodBankController.getSurgeryBloodRequirement);
router.put('/surgery/requirements/:id/checklist', authorize('admin', 'blood_bank_tech', 'nurse'), bloodBankController.updatePreOpChecklist);
router.post('/surgery/prepare-blood', authorize('admin', 'blood_bank_tech'), bloodBankController.prepareSurgeryBlood);

// ============================================
// PHASE 11: BEDSIDE TRANSFUSION BCMA VERIFICATION
// ============================================
router.post('/bedside/start-transfusion', protect, authorize('admin', 'blood_bank_tech', 'nurse'), bloodBankController.bedsideVerifyAndStartTransfusion);

// ============================================
// PHASE 9: ISBT 128 COMPLIANCE (NABH Standard)
// ============================================
const BloodBankService = require('../services/BloodBankService');
const { getHospitalId } = require('../utils/tenantHelper');

// POST /api/blood-bank/isbt/register
//   Register a blood unit by scanning three ISBT 128 barcodes.
router.post('/isbt/register', protect, authorize('admin', 'blood_bank_tech'), async (req, res) => {
    try {
        const hospitalId = getHospitalId(req);
        const {
            dinBarcode, productBarcode, bloodGroupBarcode,
            donorId, volume_ml, storageLocation, bagNumber, collectionDate
        } = req.body;

        if (!dinBarcode || !productBarcode || !bloodGroupBarcode) {
            return res.status(400).json({
                success: false,
                message: 'All three ISBT barcodes are required: dinBarcode, productBarcode, bloodGroupBarcode'
            });
        }

        const result = await BloodBankService.registerISBTUnit(
            dinBarcode, productBarcode, bloodGroupBarcode, hospitalId,
            {
                donorId: donorId || null,
                volume_ml: volume_ml || 450,
                storageLocation: storageLocation || null,
                bagNumber: bagNumber || null,
                createdBy: req.user?.id || null,
                collectionDate: collectionDate || null
            }
        );

        if (!result.success) {
            return res.status(409).json({
                success: false,
                message: result.message
            });
        }

        return res.status(201).json({
            success: true,
            message: result.message,
            data: { unit: result.unit, parsed: result.parsed }
        });
    } catch (error) {
        console.error('[ISBT Register] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error during ISBT unit registration.'
        });
    }
});

// POST /api/blood-bank/isbt/cross-match
//   Secure cross-match with TTI hard-lock guardrail.
//   The guardrail checks TTI results, expiry, and status BEFORE allowing cross-match.
router.post('/isbt/cross-match', protect, authorize('admin', 'blood_bank_tech'), async (req, res) => {
    try {
        const hospitalId = getHospitalId(req);
        const {
            requestId, isbtDinScanned, patientId, patientSampleId,
            method, result, interpretation,
            immediateSpin, incubation37c, agsPhase, antibodyDetected, reactionStrength
        } = req.body;

        if (!requestId || !isbtDinScanned) {
            return res.status(400).json({
                success: false,
                message: 'requestId and isbtDinScanned are required.'
            });
        }

        const crossMatchResult = await BloodBankService.secureCrossMatch(
            parseInt(requestId),
            String(isbtDinScanned),
            req.user?.id || null,
            hospitalId,
            {
                patientId: patientId || null,
                patientSampleId: patientSampleId || null,
                method: method || 'Tube',
                result: result || 'Compatible',
                interpretation: interpretation || null,
                immediateSpin: immediateSpin || null,
                incubation37c: incubation37c || null,
                agsPhase: agsPhase || null,
                antibodyDetected: antibodyDetected || false,
                reactionStrength: reactionStrength || null
            }
        );

        if (!crossMatchResult.success) {
            return res.status(409).json({
                success: false,
                blocked: true,
                reason: crossMatchResult.reason,
                message: crossMatchResult.message,
                data: {
                    reactiveMarkers: crossMatchResult.reactiveMarkers || null,
                    expiryDate: crossMatchResult.expiryDate || null
                }
            });
        }

        return res.status(201).json({
            success: true,
            message: crossMatchResult.message,
            data: { crossMatch: crossMatchResult.crossMatch, unit: crossMatchResult.unit }
        });
    } catch (error) {
        console.error('[ISBT Cross-Match] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error during secure cross-match.'
        });
    }
});

// ============================================
// PHASE 10: IOT COLD-CHAIN THERMAL QUARANTINE
// ============================================

// POST /api/blood-bank/iot/temperature
//   Log a temperature reading from an IoT sensor on storage equipment.
//   If the reading is out of range, automatically triggers quarantine of all
//   affected blood units and sets the equipment alarm.
router.post('/iot/temperature', protect, authorize('admin', 'blood_bank_tech', 'system_iot'), async (req, res) => {
    try {
        const hospitalId = getHospitalId(req);
        const { equipmentId, temperature, recordedBy } = req.body;

        if (!equipmentId || temperature === undefined || temperature === null) {
            return res.status(400).json({
                success: false,
                message: 'equipmentId and temperature are required.'
            });
        }

        const parsedTemp = parseFloat(temperature);
        if (isNaN(parsedTemp)) {
            return res.status(400).json({
                success: false,
                message: 'temperature must be a valid number.'
            });
        }

        const result = await BloodBankService.logEquipmentTemperature(
            parseInt(equipmentId),
            parsedTemp,
            recordedBy || req.user?.id || null,
            hospitalId
        );

        if (result.thermal_breach) {
            return res.status(200).json({
                success: true,
                thermal_breach: true,
                message: result.message
            });
        }

        return res.status(200).json({
            success: true,
            thermal_breach: false,
            message: result.message
        });
    } catch (error) {
        console.error('[IoT Temperature] Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Server error during temperature logging.'
        });
    }
});

module.exports = router;
