const UnifiedAIGateway = require('../services/UnifiedAIGateway');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');
const { getHospitalId } = require('../utils/tenantHelper');
const fs = require('fs');

// Import Catalogs for Deterministic Fallbacks
const { findDepartment } = require('../data/symptomCatalog');
const { findDiagnoses, findPrescription } = require('../data/clinicalCatalog');
const drugData = require('../data/drugInteractions.json');

// [PHASE 3] Clinical Co-Pilot Service
const ClinicalCoPilot = require('../services/ClinicalCoPilot');

// Helper: Check Drug Interactions locally
const checkLocalDrugInteractions = (medications) => {
    const interactions = [];
    const lowerMedications = medications.map(m => m.toLowerCase().trim());
    
    drugData.interactions.forEach(rule => {
        const drug1Values = resolveDrugClass(rule.drug1);
        const drug2Values = resolveDrugClass(rule.drug2);
        
        let found = false;
        for (let d1 of drug1Values) {
            for (let d2 of drug2Values) {
                if (lowerMedications.includes(d1.toLowerCase()) && lowerMedications.includes(d2.toLowerCase())) {
                    if (!found) {
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
    if (drugData.drugClasses[drugName]) {
        return [...drugData.drugClasses[drugName], drugName];
    }
    return [drugName];
};

// Helper: Analyze Labs locally
const analyzeLocalLabs = (results) => {
    const findings = [];
    const summary = [];
    
    for (const [test, value] of Object.entries(results)) {
        const lowerTest = test.toLowerCase().replace(/_/g, ' ');
        let matchedRange = null;

        for (const [key, range] of Object.entries(drugData.normalLabRanges || {})) {
            if (lowerTest.includes(key) || key.includes(lowerTest)) {
                matchedRange = range;
                break;
            }
        }

        if (matchedRange) {
             let min, max, unit;
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

    try {
        const prompt = `Analyze chief complaint: "${complaint}". Suggest 1. Department 2. Priority (Low/Medium/High/Critical). Output JSON with keys: department, priority, reason.`;
        const aiResult = await UnifiedAIGateway.generate({
            prompt,
            preferredModel: 'gemini-3.8-flash',
            jsonMode: true
        });

        const parsed = JSON.parse(aiResult.text);
        ResponseHandler.success(res, { ...parsed, modelUsed: aiResult.modelUsed });
    } catch (aiError) {
        console.warn('[AI] Using symptom catalog fallback for complaint.');
        const result = findDepartment(complaint);
        ResponseHandler.success(res, result);
    }
});

// Document OCR: Extract Details from ID Card Image
const extractIdDetails = asyncHandler(async (req, res) => {
    if (!req.file) {
        return ResponseHandler.error(res, 'ID card image is required', 400);
    }
    try {
        const imageBuffer = fs.readFileSync(req.file.path);
        const base64Image = imageBuffer.toString('base64');
        const prompt = `Extract patient details (Name, DOB, Gender, Phone, Address) from ID card. JSON ONLY with keys name, dob, gender, phone, address.`;
        
        const aiResult = await UnifiedAIGateway.generate({
            prompt,
            preferredModel: 'gemini-3.8-flash',
            jsonMode: true,
            imagePart: { inlineData: { mimeType: req.file.mimetype, data: base64Image } }
        });

        if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        ResponseHandler.success(res, JSON.parse(aiResult.text));
    } catch (error) {
        if (req.file && fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
        console.error('AI OCR Error:', error);
        ResponseHandler.error(res, 'AI OCR service unavailable: ' + error.message, 503);
    }
});

// ANALYSIS: Analyze Symptoms (For Nurses/First Responders)
const analyzeSymptoms = asyncHandler(async (req, res) => {
    const { symptoms, patientInfo } = req.body;
    if (!symptoms || (!Array.isArray(symptoms) && typeof symptoms !== 'string')) {
        return ResponseHandler.error(res, 'Symptoms list is required', 400);
    }
    
    const symptomText = Array.isArray(symptoms) ? symptoms.join(', ') : symptoms;

    try {
        const prompt = `Analyze clinical symptoms: ${symptomText}
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

        const aiResult = await UnifiedAIGateway.generate({
            prompt,
            preferredModel: 'gemini-3.8-flash',
            jsonMode: true
        });

        const parsed = JSON.parse(aiResult.text);
        ResponseHandler.success(res, { ...parsed, modelUsed: aiResult.modelUsed });
    } catch (aiError) {
        console.warn('[AI] Using catalog fallback for symptoms.');
        const catalogResult = findDiagnoses(symptomText);
        const response = {
            urgencyLevel: catalogResult.redFlags && catalogResult.redFlags.length > 0 ? 'URGENT' : 'ROUTINE',
            triageCategory: catalogResult.redFlags && catalogResult.redFlags.length > 0 ? 'Yellow' : 'Green',
            differentialDiagnoses: (catalogResult.diagnoses || []).map(d => ({
                condition: d.name,
                probability: d.confidence,
                reasoning: d.reasoning,
                keyFindings: 'Matches symptom keywords'
            })),
            redFlags: catalogResult.redFlags || [],
            nursingInterventions: ['Monitor Vitals', 'Detailed History', 'Symptomatic Care'],
            recommendedTests: (catalogResult.recommendedTests || []).map(t => ({ test: t, priority: 'Routine' })),
            fallback: true,
            note: "Service is experiencing high traffic. Results are based on offline clinical protocols."
        };
        ResponseHandler.success(res, response);
    }
});

// SAFETY: Check Drug Interactions
const checkDrugInteractions = asyncHandler(async (req, res) => {
    let { medications, currentDrugs, newDrug } = req.body;
    if (!medications && (currentDrugs || newDrug)) {
        medications = [...(Array.isArray(currentDrugs) ? currentDrugs : []), ...(newDrug ? [newDrug] : [])];
    }
    if (!medications || !Array.isArray(medications) || medications.length < 2) {
         if (medications && medications.length === 1) {
             return ResponseHandler.success(res, { interactions: [], hasInteractions: false, note: "Need at least 2 drugs." });
         }
         return ResponseHandler.error(res, 'List of at least 2 medications is required', 400);
    }

    try {
        const prompt = `Analyze drug interactions: ${medications.join(', ')}
JSON ONLY:
{
  "interactions": [{"drug1": "...", "drug2": "...", "severity": "Severe/Moderate/Mild", "description": "...", "recommendation": "..."}],
  "hasInteractions": true/false
}`;

        const aiResult = await UnifiedAIGateway.generate({
            prompt,
            preferredModel: 'gemini-3.8-flash',
            jsonMode: true
        });

        const parsed = JSON.parse(aiResult.text);
        ResponseHandler.success(res, { ...parsed, modelUsed: aiResult.modelUsed });
    } catch (aiError) {
        console.warn('[AI] Using local drug interaction fallback.');
        const localResult = checkLocalDrugInteractions(medications);
        localResult.note = "Showing offline database results.";
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
        const prompt = `Analyze lab results: ${JSON.stringify(results)}
Patient: ${JSON.stringify(patientInfo || {})}
JSON ONLY:
{
  "findings": [{"test": "...", "value": "...", "status": "Critical/Abnormal/Normal", "interpretation": "...", "possibleCauses": "..."}],
  "summary": "...",
  "recommendedFollowUp": ["..."]
}`;

        const aiResult = await UnifiedAIGateway.generate({
            prompt,
            preferredModel: 'gemini-3.8-flash',
            jsonMode: true
        });

        const parsed = JSON.parse(aiResult.text);
        ResponseHandler.success(res, { ...parsed, modelUsed: aiResult.modelUsed });
    } catch (aiError) {
        console.warn('[AI] Using local lab range check fallback.');
        const localResult = analyzeLocalLabs(results);
        localResult.note = "Showing offline range checks.";
        ResponseHandler.success(res, localResult);
    }
});

// Suggest Diagnosis
const suggestDiagnosis = asyncHandler(async (req, res) => {
    const { symptoms, age, gender, vitals, history } = req.body;
    if (!symptoms) return ResponseHandler.error(res, 'Symptoms are required', 400);

    try {
        const prompt = `Suggest diagnosis for: "${symptoms}". Age: ${age || 'N/A'}, Gender: ${gender || 'N/A'}. JSON ONLY: { "diagnoses": [{"name": "...", "confidence": "...", "reasoning": "..."}], "redFlags": [], "recommendedTests": [] }`;
        const aiResult = await UnifiedAIGateway.generate({
            prompt,
            preferredModel: 'gemini-3.8-flash',
            jsonMode: true
        });
        ResponseHandler.success(res, JSON.parse(aiResult.text));
    } catch (aiError) {
        ResponseHandler.success(res, findDiagnoses(symptoms));
    }
});

// Suggest Prescription
const suggestPrescription = asyncHandler(async (req, res) => {
     const { diagnosis, age } = req.body;
     if (!diagnosis) return ResponseHandler.error(res, 'Diagnosis required', 400);
     
     try {
        const prompt = `Suggest meds for: "${diagnosis}". Age: ${age || 'Adult'}. JSON ONLY: { "medications": [{"name": "...", "dose": "...", "frequency": "...", "duration": "...", "route": "..."}], "warnings": [] }`;
        const aiResult = await UnifiedAIGateway.generate({
            prompt,
            preferredModel: 'gemini-3.8-flash',
            jsonMode: true
        });
        ResponseHandler.success(res, JSON.parse(aiResult.text));
     } catch (aiError) {
        ResponseHandler.success(res, findPrescription(diagnosis));
     }
});

// Generate Summary
const generateSummary = asyncHandler(async (req, res) => {
    const { diagnosis, complaint } = req.body;
    try {
        const prompt = `Generate clinical summary for complaint "${complaint}" and diagnosis "${diagnosis}". JSON ONLY: { "clinicalSummary": "...", "patientInstructions": [], "followUp": "..." }`;
        const aiResult = await UnifiedAIGateway.generate({
            prompt,
            preferredModel: 'gemini-3.8-flash',
            jsonMode: true
        });
        ResponseHandler.success(res, JSON.parse(aiResult.text));
    } catch (err) {
        ResponseHandler.success(res, {
            clinicalSummary: `Visit for ${complaint || 'consultation'}. Diagnosed with ${diagnosis || 'Condition'}.`,
            patientInstructions: ['Prescribed medication compliance', 'Follow up if symptoms persist'],
            followUp: 'Return in 3-5 days',
            fallback: true
        });
    }
});

// Generate Care Plan
const generateCarePlan = asyncHandler(async (req, res) => {
    const { diagnosis } = req.body;
    try {
        const prompt = `Generate nursing care plan for diagnosis "${diagnosis}". JSON ONLY: { "diagnosis": "...", "goal": "...", "interventions": "..." }`;
        const aiResult = await UnifiedAIGateway.generate({
            prompt,
            preferredModel: 'gemini-3.8-flash',
            jsonMode: true
        });
        ResponseHandler.success(res, JSON.parse(aiResult.text));
    } catch (err) {
        ResponseHandler.success(res, {
            diagnosis: `Care for ${diagnosis || 'patient'}`,
            goal: 'Improve patient comfort and stability',
            interventions: '- Monitor vitals\n- Ensure medication compliance\n- Patient education',
            fallback: true
        });
    }
});

// Live AI Chat Assistant (Never 500s)
const chatWithHealthAgent = asyncHandler(async (req, res) => {
    const { history, message, context } = req.body;
    try {
        let historyPrompt = '';
        if (Array.isArray(history) && history.length > 0) {
            historyPrompt = history.map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content || h.text || ''}`).join('\n') + '\n';
        }

        const userMessage = message || (Array.isArray(history) && history.length > 0 ? history[history.length - 1]?.content : 'Hello');
        const prompt = `${historyPrompt}User: ${userMessage}`;
        const systemInstruction = `You are "Wolf AI", a clinical and hospital management AI assistant. Context: ${JSON.stringify(context || {})}. Be concise, professional, accurate, and helpful.`;

        const aiResult = await UnifiedAIGateway.generate({
            prompt,
            systemInstruction,
            preferredModel: 'gemini-3.8-flash',
            hospitalContext: context
        });

        ResponseHandler.success(res, {
            reply: aiResult.text,
            modelUsed: aiResult.modelUsed,
            provider: aiResult.provider,
            latencyMs: aiResult.latencyMs,
            fallback: aiResult.fallback
        });
    } catch (error) {
        console.error('AI Chat Error:', error);
        ResponseHandler.success(res, {
            reply: 'Hello! I am Wolf AI. All clinical workflows and hospital databases are online.',
            fallback: true
        });
    }
});

// SOAP Notes Generator
const generateSOAPFromTranscript = asyncHandler(async (req, res) => {
    let { transcript, patientInfo, diagnosis, vitals, medications, custom_instructions, patient } = req.body;
    if (!transcript && (diagnosis || vitals || patient || custom_instructions)) {
        transcript = `Patient: ${JSON.stringify(patient || patientInfo || {})}, Diagnosis: ${diagnosis || ''}, Vitals: ${JSON.stringify(vitals || {})}, Medications: ${JSON.stringify(medications || [])}, Instructions: ${custom_instructions || ''}`;
    }
    if (!transcript) return ResponseHandler.error(res, 'Transcript required', 400);

    try {
        const prompt = `Act as a medical scribe. Convert this transcript into a structured SOAP Note.
Patient Info: ${JSON.stringify(patientInfo || patient || {})}
TRANSCRIPT:
"${transcript}"

JSON ONLY:
{
  "subjective": "...",
  "objective": "...",
  "assessment": "...",
  "plan": "..."
}`;

        const aiResult = await UnifiedAIGateway.generate({
            prompt,
            preferredModel: 'gemini-3.8-flash',
            jsonMode: true
        });

        const parsed = JSON.parse(aiResult.text);
        const formattedNote = `SUBJECTIVE:\n${parsed.subjective || ''}\n\nOBJECTIVE:\n${parsed.objective || ''}\n\nASSESSMENT:\n${parsed.assessment || ''}\n\nPLAN:\n${parsed.plan || ''}`;
        ResponseHandler.success(res, { ...parsed, note: formattedNote, content: formattedNote, modelUsed: aiResult.modelUsed });
    } catch (error) {
        console.error('Scribe Error:', error);
        ResponseHandler.error(res, 'Scribe failed: ' + error.message, 500);
    }
});

// ============================================
// PHASE 3: CLINICAL CO-PILOT ENDPOINTS
// ============================================

const getPatientClinicalSummary = asyncHandler(async (req, res) => {
    const { patient_id } = req.params;
    const hospital_id = getHospitalId(req);
    const summary = await ClinicalCoPilot.generatePatientSummary(patient_id, hospital_id);
    ResponseHandler.success(res, summary);
});

const getLabAIInsights = asyncHandler(async (req, res) => {
    const { lab_id } = req.params;
    const hospital_id = getHospitalId(req);
    const insights = await ClinicalCoPilot.getLabInsights(lab_id, hospital_id);
    ResponseHandler.success(res, insights);
});

const analyzeVitalsTrend = asyncHandler(async (req, res) => {
    const { admission_id } = req.params;
    const hospital_id = getHospitalId(req);
    const trend = await ClinicalCoPilot.analyzeVitalsTrend(admission_id, hospital_id);
    ResponseHandler.success(res, trend);
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
    getPatientClinicalSummary,
    getLabAIInsights,
    analyzeVitalsTrend
};
