const { GoogleGenerativeAI } = require('@google/generative-ai');
const dotenv = require('dotenv');
dotenv.config();

const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const { getHospitalId } = require('../utils/tenantHelper');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Import Catalogs for Fallback
const { findDepartment } = require('../data/symptomCatalog');
const { findDiagnoses, findPrescription } = require('../data/clinicalCatalog');
const drugData = require('../data/drugInteractions.json');

// [PHASE 3] Clinical Co-Pilot Service
const ClinicalCoPilot = require('../services/ClinicalCoPilot');

// Helper: Check Drug Interactions locally
const checkLocalDrugInteractions = (medications) => {
    const interactions = [];
    const lowerMedications = medications.map(m => m.toLowerCase().trim());
    
    // Check exact pairs
    drugData.interactions.forEach(rule => {
        const drug1Values = resolveDrugClass(rule.drug1);
        const drug2Values = resolveDrugClass(rule.drug2);
        
        let found = false;
        
        // Check if any pair matches
        for(let d1 of drug1Values) {
            for(let d2 of drug2Values) {
                if (lowerMedications.includes(d1.toLowerCase()) && lowerMedications.includes(d2.toLowerCase())) {
                    if(!found) { // Avoid duplicate reporting for same rule
                         interactions.push({
                            drug1: rule.drug1,
                            drug2: rule.drug2,
                            severity: rule.severity,
                            description: rule.description,
                            recommendation: rule.recommendation
                        });
                        found = true;
                    }
                }
            }
        }
    });

    return {
        interactions,
        hasInteractions: interactions.length > 0,
        fallback: true
    };
};

const resolveDrugClass = (drugName) => {
    // If it's a class key, return all drugs in that class
    if (drugData.drugClasses[drugName]) {
        return [...drugData.drugClasses[drugName], drugName]; // Include the class name itself just in case
    }
    return [drugName];
};

// Helper: Analyze Labs locally
const analyzeLocalLabs = (results) => {
    const findings = [];
    const summary = [];
    
    for (const [test, value] of Object.entries(results)) {
        const lowerTest = test.toLowerCase().replace(/_/g, ' ');
        // Try to match with known ranges
        let matchedRange = null;
        let matchedKey = null;

        for (const [key, range] of Object.entries(drugData.normalLabRanges)) {
            if (lowerTest.includes(key) || key.includes(lowerTest)) {
                matchedRange = range;
                matchedKey = key;
                break;
            }
        }

        if (matchedRange) {
             // Handle gender-specific
             let min, max, unit;
             // Assume generic or male for range check if gender unknown
             if (matchedRange.male) {
                 min = matchedRange.male.min;
                 max = matchedRange.male.max;
                 unit = matchedRange.male.unit;
             } else {
                 min = matchedRange.min;
                 max = matchedRange.max;
                 unit = matchedRange.unit;
             }

             if (value < min) {
                 findings.push({ test: test, value: value, status: 'Abnormal (Low)', interpretation: `Below normal range (${min}-${max} ${unit})` });
                 summary.push(`${test} is low.`);
             } else if (value > max) {
                 findings.push({ test: test, value: value, status: 'Abnormal (High)', interpretation: `Above normal range (${min}-${max} ${unit})` });
                 summary.push(`${test} is high.`);
             } else {
                 findings.push({ test: test, value: value, status: 'Normal', interpretation: `Within normal range (${min}-${max} ${unit})` });
             }
        } else {
            findings.push({ test: test, value: value, status: 'Unknown', interpretation: 'Reference range not available locally.' });
        }
    }

    return {
        findings,
        summary: summary.length > 0 ? "Potential abnormalities detected: " + summary.join(' ') : "No obvious abnormalities found in local check.",
        recommendedFollowUp: ["Review with doctor"],
        fallback: true
    };
};

// Smart Triage: Analyze Chief Complaint
const analyzeComplaint = asyncHandler(async (req, res) => {
    const { complaint } = req.body;
    if (!complaint) {
        return ResponseHandler.error(res, 'Complaint text is required', 400);
    }

    // Try Gemini API first
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const prompt = `
You are a hospital triage assistant. Analyze: "${complaint}"
Suggest 1. Department 2. Priority (Low/Medium/High/Critical).
JSON ONLY: {"department": "...", "priority": "...", "reason": "..."}`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text().trim();
        const cleanJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        ResponseHandler.success(res, JSON.parse(cleanJson));

    } catch (aiError) {
        console.warn('Gemini API unavailable, using symptom catalog fallback.');
        const result = findDepartment(complaint);
        ResponseHandler.success(res, result);
    }
});

// Document OCR: Extract Details from ID Card Image
const extractIdDetails = asyncHandler(async (req, res) => {
    if (!req.file) {
        return ResponseHandler.error(res, 'ID card image is required', 400);
    }
    // No local fallback for OCR possible without external lib
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const fs = require('fs');
        const imageBuffer = fs.readFileSync(req.file.path);
        const base64Image = imageBuffer.toString('base64');
        
        const prompt = `Extract patient details (Name, DOB, Gender, Phone, Address) from ID card. JSON ONLY.`;
        
         const result = await model.generateContent([
            prompt,
            { inlineData: { mimeType: req.file.mimetype, data: base64Image } }
        ]);
        
        const responseText = result.response.text().trim();
         const cleanJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
         ResponseHandler.success(res, JSON.parse(cleanJson));
    } catch (error) {
        console.error('AI OCR Error:', error);
         // Clean failure for OCR
         ResponseHandler.error(res, 'AI OCR service unavailable', 503);
    }
});

// ANALYSIS: Analyze Symptoms (For Nurses/First Responders)
const analyzeSymptoms = asyncHandler(async (req, res) => {
    const { symptoms, patientInfo } = req.body;
    if (!symptoms || !Array.isArray(symptoms)) {
         // Try to handle string input if coming from simple form
         if(typeof req.body.symptoms === 'string') {
             // re-assign for logic below, though request usually sends array
         } else {
            return ResponseHandler.error(res, 'Symptoms list is required', 400);
         }
    }
    
    const symptomText = Array.isArray(symptoms) ? symptoms.join(', ') : symptoms;

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const prompt = `
Analyze clinical symptoms: ${symptomText}
Patient: ${JSON.stringify(patientInfo || {})}
JSON ONLY:
{
  "urgencyLevel": "...",
  "triageCategory": "...",
  "differentialDiagnoses": [{"condition": "...", "probability": "...", "reasoning": "...", "keyFindings": "..."}],
  "redFlags": ["..."],
  "nursingInterventions": ["..."],
  "recommendedTests": [{"test": "...", "priority": "..."}]
}`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text().trim();
        const cleanJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        ResponseHandler.success(res, JSON.parse(cleanJson));

    } catch (aiError) {
        console.warn('Gemini API unavailable for symptoms, using catalog fallback.');
        
        // Use clinicalCatalog.findDiagnoses
        const catalogResult = findDiagnoses(symptomText);
        
        // Transform catalog result to match expected API response structure
        const response = {
            urgencyLevel: catalogResult.redFlags && catalogResult.redFlags.length > 0 ? 'URGENT' : 'ROUTINE',
            triageCategory: catalogResult.redFlags && catalogResult.redFlags.length > 0 ? 'Yellow' : 'Green',
            differentialDiagnoses: catalogResult.diagnoses.map(d => ({
                condition: d.name,
                probability: d.confidence,
                reasoning: d.reasoning,
                keyFindings: 'Matches symptom keywords'
            })),
            redFlags: catalogResult.redFlags,
            nursingInterventions: ['Monitor Vitals', 'Detailed History', 'Symptomatic Care'], // Generic fallback
            recommendedTests: catalogResult.recommendedTests.map(t => ({ test: t, priority: 'Routine' })),
            fallback: true,
            note: "Service is experiencing high traffic. Results are based on offline clinical protocols."
        };
        
        ResponseHandler.success(res, response);
    }
});

// SAFETY: Check Drug Interactions
const checkDrugInteractions = asyncHandler(async (req, res) => {
    const { medications } = req.body;
    if (!medications || !Array.isArray(medications) || medications.length < 2) {
         if (medications && medications.length === 1) {
             return ResponseHandler.success(res, { interactions: [], hasInteractions: false, note: "Need at least 2 drugs." });
         }
         return ResponseHandler.error(res, 'List of at least 2 medications is required', 400);
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const prompt = `
Analyze drug interactions: ${medications.join(', ')}
JSON ONLY:
{
  "interactions": [{"drug1": "...", "drug2": "...", "severity": "Severe/Moderate/Mild", "description": "...", "recommendation": "..."}],
  "hasInteractions": true/false
}`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text().trim();
        const cleanJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        ResponseHandler.success(res, JSON.parse(cleanJson));

    } catch (aiError) {
         console.warn('Gemini API unavailable for drugs, simple lookup fallback.');
         const localResult = checkLocalDrugInteractions(medications);
         localResult.note = "Service high traffic. Showing offline database results.";
         ResponseHandler.success(res, localResult);
    }
});

// LABS: Analyze Lab Results
const analyzeLabResults = asyncHandler(async (req, res) => {
    const { results, patientInfo } = req.body; 

    if (!results) {
        return ResponseHandler.error(res, 'Lab results are required', 400);
    }

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const prompt = `
Analyze lab results: ${JSON.stringify(results)}
Patient: ${JSON.stringify(patientInfo || {})}
JSON ONLY:
{
  "findings": [{"test": "...", "value": "...", "status": "Critical/Abnormal/Normal", "interpretation": "...", "possibleCauses": "..."}],
  "summary": "...",
  "recommendedFollowUp": ["..."]
}`;

        const result = await model.generateContent(prompt);
        const responseText = result.response.text().trim();
        const cleanJson = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        ResponseHandler.success(res, JSON.parse(cleanJson));

    } catch (aiError) {
        console.warn('Gemini API unavailable for labs, simple range check fallback.');
        const localResult = analyzeLocalLabs(results);
        localResult.note = "Service high traffic. Showing offline range checks.";
        ResponseHandler.success(res, localResult);
    }
});

// ============================================
// PHASE 2 FUNCTIONS (using imports)
// ============================================

const suggestDiagnosis = asyncHandler(async (req, res) => {
    const { symptoms, age, gender, vitals, history } = req.body;
    if (!symptoms) return ResponseHandler.error(res, 'Symptoms are required', 400);

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const prompt = `Suggest diagnosis for: "${symptoms}". JSON ONLY: { "diagnoses": [{"name": "...", "confidence": "...", "reasoning": "..."}], "redFlags": [], "recommendedTests": [] }`;
        
        const result = await model.generateContent(prompt);
         const cleanJson = result.response.text().trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
         ResponseHandler.success(res, JSON.parse(cleanJson));
    } catch (aiError) {
         console.warn('Gemini API unavailable, diagnosis catalog fallback.');
         ResponseHandler.success(res, findDiagnoses(symptoms));
    }
});

const suggestPrescription = asyncHandler(async (req, res) => {
     const { diagnosis, age } = req.body;
     if (!diagnosis) return ResponseHandler.error(res, 'Diagnosis required', 400);
     
     try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const prompt = `Suggest meds for: "${diagnosis}". JSON ONLY: { "medications": [{"name": "...", "dose": "...", "frequency": "...", "duration": "...", "route": "..."}], "warnings": [] }`;
        const result = await model.generateContent(prompt);
        const cleanJson = result.response.text().trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        ResponseHandler.success(res, JSON.parse(cleanJson));
     } catch (aiError) {
         console.warn('Gemini API unavailable, prescription catalog fallback.');
         ResponseHandler.success(res, findPrescription(diagnosis));
     }
});

const generateSummary = asyncHandler(async (req, res) => {
     // Keep existing logic or simple fallback
      const { diagnosis, complaint } = req.body;
     try {
         const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
         const prompt = `Generate summary. JSON ONLY: { "clinicalSummary": "...", "patientInstructions": [], "followUp": "..." }`;
         const result = await model.generateContent(prompt);
         const cleanJson = result.response.text().trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
         ResponseHandler.success(res, JSON.parse(cleanJson));
     } catch (err) {
         ResponseHandler.success(res, {
                clinicalSummary: `Visit for ${complaint || 'consultation'}. Diagnosed with ${diagnosis || 'Condition'}.`,
                patientInstructions: ['Prescribed medication compliance', 'Follow up if symptoms persist'],
                followUp: 'Return in 3-5 days',
                fallback: true
         });
     }
});

const generateCarePlan = asyncHandler(async (req, res) => {
     const { diagnosis } = req.body;
      try {
         const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
         const prompt = `Generate care plan. JSON ONLY: { "diagnosis": "...", "goal": "...", "interventions": "..." }`;
         const result = await model.generateContent(prompt);
         const cleanJson = result.response.text().trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
         ResponseHandler.success(res, JSON.parse(cleanJson));
     } catch (err) {
         ResponseHandler.success(res, {
                diagnosis: `Care for ${diagnosis || 'patient'}`,
                goal: 'Improve patient comfort and stability',
                interventions: '- Monitor vitals\n- Ensure medication compliance\n- Patient education',
                fallback: true
         });
     }
});


const chatWithHealthAgent = asyncHandler(async (req, res) => {
    const { history, message, context } = req.body;
    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        
        let chatHistory = history.map(h => ({
            role: h.role === 'user' ? 'user' : 'model',
            parts: [{ text: h.content }]
        }));

        const chat = model.startChat({
            history: chatHistory,
            generationConfig: {
                maxOutputTokens: 500,
            },
        });

        const systemPrompt = `You are "Wolf AI", a clinical assistant. Context: ${JSON.stringify(context || {})}. Be concise, professional, and clinical.`;
        
        const result = await chat.sendMessage(systemPrompt + "\nUser: " + message);
        const response = result.response.text();
        
        ResponseHandler.success(res, { reply: response });
    } catch (error) {
        console.error('AI Chat Error:', error);
        ResponseHandler.error(res, 'AI Chat failed', 500);
    }
});

const generateSOAPFromTranscript = asyncHandler(async (req, res) => {
    const { transcript, patientInfo } = req.body;
    if (!transcript) return ResponseHandler.error(res, 'Transcript required', 400);

    try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
        const prompt = `
        Act as a medical scribe. Convert this transcript into a structured SOAP Note.
        Patient Info: ${JSON.stringify(patientInfo || {})}
        TRANSCRIPT:
        "${transcript}"
        
        JSON ONLY:
        {
          "subjective": "...",
          "objective": "...",
          "assessment": "...",
          "plan": "..."
        }`;

        const result = await model.generateContent(prompt);
        const cleanJson = result.response.text().trim().replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
        ResponseHandler.success(res, JSON.parse(cleanJson));
    } catch (error) {
        console.error('Scribe Error:', error);
        ResponseHandler.error(res, 'Scribe failed: ' + error.message, 500);
    }
});

// ============================================
// PHASE 3: CLINICAL CO-PILOT ENDPOINTS
// ============================================

/**
 * GET /api/ai/patient/:patient_id/summary
 * Generate AI clinical summary for a patient
 */
const getPatientClinicalSummary = asyncHandler(async (req, res) => {
    const { patient_id } = req.params;
    const hospitalId = getHospitalId(req);
    
    const summary = await ClinicalCoPilot.generatePatientSummary(patient_id, hospitalId);
    
    if (summary.error) {
        return ResponseHandler.error(res, summary.error, 400);
    }
    
    ResponseHandler.success(res, summary);
});

/**
 * GET /api/ai/lab/:lab_id/insights
 * Generate AI insights for a specific lab result
 */
const getLabAIInsights = asyncHandler(async (req, res) => {
    const { lab_id } = req.params;
    const hospitalId = getHospitalId(req);
    
    const insights = await ClinicalCoPilot.generateLabInsights(lab_id, hospitalId);
    ResponseHandler.success(res, insights);
});

/**
 * GET /api/ai/admission/:admission_id/vitals-trend
 * Analyze vitals trend for an admission
 */
const analyzeVitalsTrend = asyncHandler(async (req, res) => {
    const { admission_id } = req.params;
    const hospitalId = getHospitalId(req);
    
    const analysis = await ClinicalCoPilot.analyzeVitalsTrend(admission_id, hospitalId);
    ResponseHandler.success(res, analysis);
});

module.exports = {
    analyzeComplaint,
    extractIdDetails,
    analyzeSymptoms,
    checkDrugInteractions,
    analyzeLabResults,
    suggestDiagnosis,
    suggestPrescription,
    generateSummary,
    generateCarePlan,
    chatWithHealthAgent,
    generateSOAPFromTranscript,
    // Phase 3: Clinical Co-Pilot
    getPatientClinicalSummary,
    getLabAIInsights,
    analyzeVitalsTrend
};
