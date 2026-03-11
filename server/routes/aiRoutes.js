const express = require('express');
const router = express.Router();
const aiController = require('../controllers/aiController');
const aiService = require('../services/aiService');
const { authenticateToken } = require('../middleware/authMiddleware');

// Legacy route (aiService)
router.post('/parse-prescription', (req, res) => {
    try {
        const { text } = req.body;
        if (!text) {
            return res.status(400).json({ success: false, error: 'Text is required' });
        }
        const result = aiService.parsePrescriptionText(text);
        res.json({ success: true, data: result });
    } catch (error) {
        console.error('AI Parse Error:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// ============================================
// AI CONTROLLER ROUTES
// ============================================

// Triage & Symptoms
router.post('/triage', aiController.analyzeComplaint);
router.post('/analyze-symptoms', aiController.analyzeSymptoms);

// Diagnosis & Prescription
router.post('/suggest-diagnosis', aiController.suggestDiagnosis);
router.post('/suggest-prescription', aiController.suggestPrescription);

// Drug Safety
router.post('/drug-interactions', aiController.checkDrugInteractions);

// Lab Analysis
router.post('/analyze-labs', aiController.analyzeLabResults);

// Documentation
router.post('/generate-summary', aiController.generateSummary);
router.post('/generate-care-plan', aiController.generateCarePlan);
router.post('/generate-soap', aiController.generateSOAPFromTranscript);

// Chat
router.post('/chat', aiController.chatWithHealthAgent);

// OCR
router.post('/extract-id', aiController.extractIdDetails);

// ============================================
// PHASE 3: CLINICAL CO-PILOT ROUTES
// ============================================

// Patient Clinical Summary (AI-generated from labs, vitals, meds)
router.get('/patient/:patient_id/summary', authenticateToken, aiController.getPatientClinicalSummary);

// Lab Insights (AI interpretation of specific lab result)
router.get('/lab/:lab_id/insights', authenticateToken, aiController.getLabAIInsights);

// Vitals Trend Analysis (AI analysis of vitals over time)
router.get('/admission/:admission_id/vitals-trend', authenticateToken, aiController.analyzeVitalsTrend);

module.exports = router;
