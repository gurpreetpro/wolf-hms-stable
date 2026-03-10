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
router.get('/cross-match/:request_id', bloodBankController.getCrossMatches);

// ============================================
// PHASE 2: TRANSFUSION
// ============================================
router.get('/transfusions/active', bloodBankController.getActiveTransfusions);
router.post('/transfusions/start', authorize('admin', 'blood_bank_tech', 'nurse'), bloodBankController.startTransfusion);
router.put('/transfusions/:id/vitals', authorize('admin', 'blood_bank_tech', 'nurse'), bloodBankController.updateTransfusionVitals);
router.put('/transfusions/:id/complete', authorize('admin', 'blood_bank_tech', 'nurse'), bloodBankController.completeTransfusion);

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

module.exports = router;
