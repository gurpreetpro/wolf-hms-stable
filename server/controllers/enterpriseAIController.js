/**
 * Enterprise AI Controller — Phase 8
 * Exposes all 4 AI pillars via REST API endpoints
 */

const asyncHandler = require('express-async-handler');
const RevenueCycleAI = require('../services/ai/RevenueCycleAI');
const SupplyChainAI = require('../services/ai/SupplyChainAI');
const ClinicalPathwayAI = require('../services/ai/ClinicalPathwayAI');
const OperationalCommandCenter = require('../services/ai/OperationalCommandCenter');

// ══════════════════════════════════════════════════
// PILLAR 1: REVENUE CYCLE
// ══════════════════════════════════════════════════

const scrubClaim = asyncHandler(async (req, res) => {
    const hospitalId = req.user?.hospital_id || req.hospitalId || 1;
    const { invoiceId } = req.params;
    const result = await RevenueCycleAI.scrubClaim(parseInt(invoiceId), hospitalId);
    res.json(result);
});

const autoCodDRG = asyncHandler(async (req, res) => {
    const hospitalId = req.user?.hospital_id || req.hospitalId || 1;
    const { admissionId } = req.params;
    const result = await RevenueCycleAI.autoCodDRG(parseInt(admissionId), hospitalId);
    res.json(result);
});

const generateAppeal = asyncHandler(async (req, res) => {
    const hospitalId = req.user?.hospital_id || req.hospitalId || 1;
    const { invoiceId } = req.params;
    const { denialReason } = req.body;
    const result = await RevenueCycleAI.generateDenialAppeal(parseInt(invoiceId), denialReason || 'MEDICAL_NECESSITY', hospitalId);
    res.json(result);
});

const detectLeakage = asyncHandler(async (req, res) => {
    const hospitalId = req.user?.hospital_id || req.hospitalId || 1;
    const { admissionId } = req.params;
    const result = await RevenueCycleAI.detectLeakage(parseInt(admissionId), hospitalId);
    res.json(result);
});

// ══════════════════════════════════════════════════
// PILLAR 2: SUPPLY CHAIN
// ══════════════════════════════════════════════════

const forecastSurgical = asyncHandler(async (req, res) => {
    const hospitalId = req.user?.hospital_id || req.hospitalId || 1;
    const result = await SupplyChainAI.forecastSurgicalDemand(hospitalId);
    res.json(result);
});

const detectSpikes = asyncHandler(async (req, res) => {
    const hospitalId = req.user?.hospital_id || req.hospitalId || 1;
    const result = await SupplyChainAI.detectDiseaseSpikes(hospitalId);
    res.json(result);
});

const smartPO = asyncHandler(async (req, res) => {
    const hospitalId = req.user?.hospital_id || req.hospitalId || 1;
    const { itemName, quantity } = req.body;
    const result = await SupplyChainAI.smartPORecommendation(itemName, parseInt(quantity) || 100, hospitalId);
    res.json(result);
});

const expiryRisk = asyncHandler(async (req, res) => {
    const hospitalId = req.user?.hospital_id || req.hospitalId || 1;
    const { days } = req.query;
    const result = await SupplyChainAI.scanExpiryRisk(hospitalId, parseInt(days) || 90);
    res.json(result);
});

// ══════════════════════════════════════════════════
// PILLAR 3: CLINICAL AI
// ══════════════════════════════════════════════════

const checkPathway = asyncHandler(async (req, res) => {
    const hospitalId = req.user?.hospital_id || req.hospitalId || 1;
    const { admissionId } = req.params;
    const result = await ClinicalPathwayAI.checkPathwayAdherence(parseInt(admissionId), hospitalId);
    res.json(result);
});

const readmissionRisk = asyncHandler(async (req, res) => {
    const hospitalId = req.user?.hospital_id || req.hospitalId || 1;
    const { patientId } = req.params;
    const result = await ClinicalPathwayAI.predictReadmissionRisk(patientId, hospitalId);
    res.json(result);
});

const sepsisScreen = asyncHandler(async (req, res) => {
    const hospitalId = req.user?.hospital_id || req.hospitalId || 1;
    const { admissionId } = req.params;
    const result = await ClinicalPathwayAI.screenForSepsis(parseInt(admissionId), hospitalId);
    res.json(result);
});

// ══════════════════════════════════════════════════
// PILLAR 4: OPERATIONAL COMMAND CENTER
// ══════════════════════════════════════════════════

const bedIntelligence = asyncHandler(async (req, res) => {
    const hospitalId = req.user?.hospital_id || req.hospitalId || 1;
    const result = await OperationalCommandCenter.getBedIntelligence(hospitalId);
    res.json(result);
});

const staffWorkload = asyncHandler(async (req, res) => {
    const hospitalId = req.user?.hospital_id || req.hospitalId || 1;
    const result = await OperationalCommandCenter.analyzeStaffWorkload(hospitalId);
    res.json(result);
});

const erSurge = asyncHandler(async (req, res) => {
    const hospitalId = req.user?.hospital_id || req.hospitalId || 1;
    const result = await OperationalCommandCenter.predictERSurge(hospitalId);
    res.json(result);
});

const performanceScorecard = asyncHandler(async (req, res) => {
    const hospitalId = req.user?.hospital_id || req.hospitalId || 1;
    const result = await OperationalCommandCenter.getPerformanceScorecard(hospitalId);
    res.json(result);
});

module.exports = {
    // Revenue Cycle
    scrubClaim, autoCodDRG, generateAppeal, detectLeakage,
    // Supply Chain
    forecastSurgical, detectSpikes, smartPO, expiryRisk,
    // Clinical AI
    checkPathway, readmissionRisk, sepsisScreen,
    // Ops Center
    bedIntelligence, staffWorkload, erSurge, performanceScorecard,
};
