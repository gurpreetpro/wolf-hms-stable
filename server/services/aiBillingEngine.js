/**
 * AI Billing Engine Service
 * WOLF HMS - Phase 4 AI Billing
 * ML-based denial prediction, ICD-10 auto-coding, price optimization
 */

const pool = require('../config/db');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

class AIBillingEngine {
    constructor() {
        // Model weights (simplified for demo - in production use TensorFlow.js or call Python service)
        this.denialWeights = {
            no_preauth: 0.35,
            low_documentation: 0.25,
            high_amount: 0.15,
            missing_codes: 0.20,
            expired_policy: 0.40,
            procedure_mismatch: 0.25
        };

        // ICD-10 code database (subset for demo)
        this.icdDatabase = this.initializeICDDatabase();

        // Procedure code pricing
        this.procedurePricing = this.initializeProcedurePricing();
    }

    // ==========================================
    // DENIAL PREDICTION ENGINE
    // ==========================================

    /**
     * Predict denial probability for a claim
     * @param {object} claimData - Claim details
     * @returns {object} Prediction result with risk factors
     */
    async predictDenial(claimData) {
        const {
            claim_amount,
            preauth_approved,
            documentation_score,
            diagnosis_codes,
            procedure_codes,
            length_of_stay,
            room_type,
            patient_age,
            provider_id,
            policy_type
        } = claimData;

        let riskScore = 0;
        const riskFactors = [];
        const recommendations = [];

        // Factor 1: Pre-authorization status
        if (!preauth_approved) {
            riskScore += this.denialWeights.no_preauth * 100;
            riskFactors.push({
                factor: 'No Pre-Authorization',
                code: 'CO-15',
                impact: 'high',
                weight: 35
            });
            recommendations.push('Obtain pre-authorization before proceeding');
        }

        // Factor 2: Documentation quality
        const docScore = documentation_score || 70;
        if (docScore < 60) {
            riskScore += this.denialWeights.low_documentation * 100;
            riskFactors.push({
                factor: 'Low Documentation Score',
                code: 'CO-204',
                impact: 'high',
                weight: 25,
                details: `Score: ${docScore}/100`
            });
            recommendations.push('Improve clinical documentation before submission');
        } else if (docScore < 80) {
            riskScore += (this.denialWeights.low_documentation * 50);
            riskFactors.push({
                factor: 'Documentation Below Optimal',
                code: 'CO-16',
                impact: 'medium',
                weight: 12.5,
                details: `Score: ${docScore}/100`
            });
            recommendations.push('Consider adding detailed clinical notes');
        }

        // Factor 3: High claim amount
        if (claim_amount > 300000) {
            riskScore += this.denialWeights.high_amount * 100;
            riskFactors.push({
                factor: 'High Claim Amount',
                code: 'CO-45',
                impact: 'medium',
                weight: 15,
                details: `Amount: ₹${claim_amount.toLocaleString()}`
            });
            recommendations.push('Prepare itemized billing breakdown');
        } else if (claim_amount > 150000) {
            riskScore += (this.denialWeights.high_amount * 50);
        }

        // Factor 4: Missing/incomplete codes
        if (!diagnosis_codes || diagnosis_codes.length === 0) {
            riskScore += this.denialWeights.missing_codes * 100;
            riskFactors.push({
                factor: 'Missing Diagnosis Codes',
                code: 'CO-11',
                impact: 'high',
                weight: 20
            });
            recommendations.push('Add ICD-10 diagnosis codes');
        }

        if (!procedure_codes || procedure_codes.length === 0) {
            riskScore += (this.denialWeights.missing_codes * 50);
            riskFactors.push({
                factor: 'Missing Procedure Codes',
                code: 'CO-4',
                impact: 'medium',
                weight: 10
            });
            recommendations.push('Add procedure/CPT codes');
        }

        // Factor 5: Length of stay vs procedure
        if (length_of_stay > 7 && room_type === 'private') {
            riskScore += 10;
            riskFactors.push({
                factor: 'Extended Stay in Premium Room',
                code: 'CO-50',
                impact: 'low',
                weight: 10,
                details: `${length_of_stay} days in ${room_type}`
            });
            recommendations.push('Justify extended stay with clinical documentation');
        }

        // Factor 6: AI Clinical Correlation (Gemini Check)
        // Checks if Diagnosis matches Procedure matches Medications
        try {
            const clinicalAnalysis = await this.checkClinicalCorrelation(diagnosis_codes, procedure_codes, claim_amount);
            
            if (!clinicalAnalysis.medically_necessary) {
                riskScore += 30; // Significant penalty for clinical mismatch
                riskFactors.push({
                    factor: 'Clinical Mismatch (AI)',
                    code: 'CO-50', // Medical Necessity
                    impact: 'high',
                    weight: 30,
                    details: clinicalAnalysis.reasoning
                });
                recommendations.push(`Clinical Justification Needed: ${clinicalAnalysis.reasoning}`);
            }
        } catch (err) {
            console.warn('[AI Billing] Gemini Correlation Check Failed (Falling back to rules):', err.message);
        }

        // Normalize score
        riskScore = Math.min(Math.round(riskScore), 100);

        // Determine risk level
        let riskLevel = 'low';
        if (riskScore >= 70) riskLevel = 'critical';
        else if (riskScore >= 50) riskLevel = 'high';
        else if (riskScore >= 30) riskLevel = 'medium';

        // Store prediction
        await this.storePrediction({
            claim_amount,
            prediction_type: 'denial_risk',
            result: { riskScore, riskLevel, riskFactors },
            confidence: this.calculateConfidence(riskFactors.length)
        });

        return {
            riskScore,
            riskLevel,
            riskFactors,
            recommendations,
            confidence: this.calculateConfidence(riskFactors.length),
            predictedOutcome: riskScore >= 50 ? 'likely_denied' : 'likely_approved'
        };
    }

    calculateConfidence(factorCount) {
        // More factors = higher confidence in prediction
        if (factorCount >= 4) return 0.92;
        if (factorCount >= 3) return 0.85;
        if (factorCount >= 2) return 0.78;
        if (factorCount >= 1) return 0.70;
        return 0.65;
    }

    /**
     * AI Clinical Correlation Check
     * Uses LLM to sanity check medical necessity
     * Includes Retry Logic for 429 Rate Limits
     */
    async checkClinicalCorrelation(diagnoses, procedures, amount) {
        // Skip if missing data
        if (!diagnoses || diagnoses.length === 0 || !procedures || procedures.length === 0) {
            return { medically_necessary: true, reasoning: 'Insufficient data for AI check' };
        }

        const maxRetries = 3;
        let attempt = 0;

        while (attempt < maxRetries) {
            try {
                const prompt = `
                    Act as a Medical Insurance Auditor.
                    Evaluate the Medical Necessity of the following claim row.
                    
                    Diagnoses: ${JSON.stringify(diagnoses)}
                    Procedures: ${JSON.stringify(procedures)}
                    Total Amount: ${amount}
                    
                    Task:
                    1. Do the diagnoses justify the procedures?
                    2. Is the cost roughly appropriate (High/Low is fine)?
                    3. Are there any obvious mismatches (e.g. Male procedure on Female diagnosis)?

                    Output JSON ONLY:
                    {
                        "medically_necessary": boolean,
                        "reasoning": "string (max 15 words)"
                    }
                `;

                const result = await model.generateContent(prompt);
                const response = await result.response;
                const text = response.text().replace(/```json/g, '').replace(/```/g, '').trim();
                
                return JSON.parse(text);

            } catch (error) {
                attempt++;
                if (error.status === 429 || error.message.includes('429')) {
                    console.warn(`[AI Billing] Rate Limit Hit. Retrying (${attempt}/${maxRetries})...`);
                    await new Promise(r => setTimeout(r, 2000 * attempt)); // Backoff: 2s, 4s, 6s
                } else {
                    console.error('[AI Billing] LLM Error:', error.message);
                    return { medically_necessary: true, reasoning: 'AI Service Unavailable' }; // Fail open on non-retryable
                }
            }
        }
        
        return { medically_necessary: true, reasoning: 'AI Timeout' };
    }

    // ==========================================
    // ICD-10 AUTO-CODER
    // ==========================================

    /**
     * Suggest ICD-10 codes based on diagnosis text
     * @param {string} diagnosisText - Clinical diagnosis text
     * @returns {array} Suggested codes with confidence
     */
    async suggestICD10Codes(diagnosisText) {
        const text = diagnosisText.toLowerCase();
        const suggestions = [];

        // Search through ICD database
        for (const [code, data] of Object.entries(this.icdDatabase)) {
            let matchScore = 0;

            // Check for keyword matches
            for (const keyword of data.keywords) {
                if (text.includes(keyword.toLowerCase())) {
                    matchScore += keyword.length * 2;
                }
            }

            // Check description match
            if (text.includes(data.description.toLowerCase().split(' ')[0])) {
                matchScore += 10;
            }

            if (matchScore > 0) {
                suggestions.push({
                    code,
                    description: data.description,
                    category: data.category,
                    matchScore,
                    confidence: Math.min(matchScore / 30, 0.98)
                });
            }
        }

        // Sort by match score and take top 5
        suggestions.sort((a, b) => b.matchScore - a.matchScore);
        const topSuggestions = suggestions.slice(0, 5);

        // Log for training
        await this.logICD10Suggestion(diagnosisText, topSuggestions);

        return topSuggestions;
    }

    /**
     * Validate ICD-10 code
     * @param {string} code - ICD-10 code
     */
    validateICD10Code(code) {
        const normalized = code.toUpperCase().replace(/\./g, '');
        const icdEntry = this.icdDatabase[code] || this.icdDatabase[normalized];

        if (icdEntry) {
            return { valid: true, code, description: icdEntry.description };
        }

        return { valid: false, code, error: 'Invalid ICD-10 code' };
    }

    // ==========================================
    // PRICE OPTIMIZATION
    // ==========================================

    /**
     * Optimize billing based on market rates and TPA limits
     * @param {array} lineItems - Invoice line items
     * @param {object} tpaInfo - TPA pricing info
     */
    async optimizePricing(lineItems, tpaInfo = {}) {
        const optimizedItems = [];
        let totalSavings = 0;
        let totalOptimized = 0;

        for (const item of lineItems) {
            const benchmark = this.procedurePricing[item.code] || null;
            const originalAmount = item.amount || item.unit_price * (item.quantity || 1);

            let optimizedAmount = originalAmount;
            let optimization = null;

            if (benchmark) {
                // Check if priced above TPA limit
                const tpaLimit = tpaInfo.roomRentLimit || benchmark.tpa_median;

                if (originalAmount > benchmark.tpa_max) {
                    optimizedAmount = benchmark.tpa_max;
                    optimization = {
                        type: 'above_tpa_limit',
                        original: originalAmount,
                        optimized: optimizedAmount,
                        savings: originalAmount - optimizedAmount,
                        reason: 'Reduced to TPA maximum limit'
                    };
                } else if (originalAmount > benchmark.market_75th && item.negotiable) {
                    optimizedAmount = benchmark.market_75th;
                    optimization = {
                        type: 'market_adjustment',
                        original: originalAmount,
                        optimized: optimizedAmount,
                        savings: originalAmount - optimizedAmount,
                        reason: 'Adjusted to 75th percentile market rate'
                    };
                }
            }

            optimizedItems.push({
                ...item,
                originalAmount,
                optimizedAmount,
                optimization
            });

            if (optimization) {
                totalSavings += optimization.savings;
                totalOptimized++;
            }
        }

        return {
            items: optimizedItems,
            summary: {
                totalItems: lineItems.length,
                itemsOptimized: totalOptimized,
                totalOriginal: lineItems.reduce((sum, i) => sum + (i.amount || i.unit_price * (i.quantity || 1)), 0),
                totalOptimized: optimizedItems.reduce((sum, i) => sum + i.optimizedAmount, 0),
                totalSavings,
                optimizationRate: ((totalOptimized / lineItems.length) * 100).toFixed(1) + '%'
            }
        };
    }

    /**
     * Estimate claim approval amount
     * @param {object} claimData - Claim details
     */
    async estimateApprovalAmount(claimData) {
        const { claim_amount, preauth_amount, tpa_approval_rate, room_type, length_of_stay } = claimData;

        // Base estimation
        let estimatedApproval = claim_amount;
        const deductions = [];

        // Apply typical deductions
        if (room_type === 'private' && length_of_stay > 3) {
            const roomDeduction = (length_of_stay - 3) * 2000; // Excess room rent
            estimatedApproval -= roomDeduction;
            deductions.push({ type: 'room_rent_excess', amount: roomDeduction });
        }

        // TPA approval rate factor
        const approvalFactor = (tpa_approval_rate || 85) / 100;
        estimatedApproval *= approvalFactor;

        // Cap at preauth if available
        if (preauth_amount && estimatedApproval > preauth_amount) {
            deductions.push({
                type: 'preauth_cap',
                amount: estimatedApproval - preauth_amount
            });
            estimatedApproval = preauth_amount;
        }

        return {
            claimedAmount: claim_amount,
            estimatedApproval: Math.round(estimatedApproval),
            patientLiability: Math.round(claim_amount - estimatedApproval),
            deductions,
            confidence: 0.78
        };
    }

    // ==========================================
    // BILLING ANOMALY DETECTION
    // ==========================================

    /**
     * Detect billing anomalies
     * @param {object} invoiceData - Invoice details
     */
    async detectAnomalies(invoiceData) {
        const anomalies = [];

        // Check for duplicate charges
        const itemCodes = invoiceData.items?.map(i => i.code) || [];
        const duplicates = itemCodes.filter((code, i) => itemCodes.indexOf(code) !== i);
        if (duplicates.length > 0) {
            anomalies.push({
                type: 'duplicate_charges',
                severity: 'high',
                items: duplicates,
                message: 'Possible duplicate charges detected'
            });
        }

        // Check for unusual quantity
        invoiceData.items?.forEach(item => {
            if (item.quantity > 10) {
                anomalies.push({
                    type: 'high_quantity',
                    severity: 'medium',
                    item: item.description,
                    quantity: item.quantity,
                    message: `Unusually high quantity: ${item.quantity}`
                });
            }
        });

        // Check for procedure-diagnosis mismatch
        // Simplified check - in production, use a mapping table
        if (invoiceData.diagnosis_codes && invoiceData.procedure_codes) {
            const diagCategories = invoiceData.diagnosis_codes.map(d => d.charAt(0));
            // Add validation logic here
        }

        return {
            hasAnomalies: anomalies.length > 0,
            anomalies,
            riskLevel: anomalies.some(a => a.severity === 'high') ? 'high' :
                anomalies.some(a => a.severity === 'medium') ? 'medium' : 'low'
        };
    }

    // ==========================================
    // HELPER METHODS
    // ==========================================

    async storePrediction(predictionData) {
        try {
            await pool.query(`
                INSERT INTO ai_billing_predictions 
                (model_name, model_version, prediction_type, prediction_result, confidence_score)
                VALUES ('denial_predictor', '1.0', $1, $2, $3)
            `, [
                predictionData.prediction_type,
                JSON.stringify(predictionData.result),
                predictionData.confidence
            ]);
        } catch (error) {
            console.error('[AIBilling] Store prediction error:', error);
        }
    }

    async logICD10Suggestion(text, suggestions) {
        try {
            await pool.query(`
                INSERT INTO icd_code_suggestions 
                (diagnosis_text, suggested_codes)
                VALUES ($1, $2)
            `, [text, JSON.stringify(suggestions)]);
        } catch (error) {
            console.error('[AIBilling] Log ICD suggestion error:', error);
        }
    }

    initializeICDDatabase() {
        return {
            // Circulatory System (I00-I99)
            'I10': { description: 'Essential (primary) hypertension', category: 'Circulatory', keywords: ['hypertension', 'high blood pressure', 'htn', 'bp high'] },
            'I11.9': { description: 'Hypertensive heart disease without heart failure', category: 'Circulatory', keywords: ['hypertensive heart', 'cardiac hypertension'] },
            'I21.0': { description: 'ST elevation myocardial infarction of anterior wall', category: 'Circulatory', keywords: ['stemi', 'heart attack', 'anterior mi', 'myocardial infarction'] },
            'I21.4': { description: 'Non-ST elevation myocardial infarction', category: 'Circulatory', keywords: ['nstemi', 'unstable angina'] },
            'I25.10': { description: 'Atherosclerotic heart disease of native coronary artery', category: 'Circulatory', keywords: ['cad', 'coronary artery disease', 'ischemic heart'] },
            'I50.9': { description: 'Heart failure, unspecified', category: 'Circulatory', keywords: ['heart failure', 'chf', 'cardiac failure'] },

            // Endocrine (E00-E89)
            'E11.9': { description: 'Type 2 diabetes mellitus without complications', category: 'Endocrine', keywords: ['diabetes', 'type 2', 'dm', 'sugar'] },
            'E11.65': { description: 'Type 2 diabetes with hyperglycemia', category: 'Endocrine', keywords: ['diabetic', 'hyperglycemia', 'high sugar'] },
            'E78.5': { description: 'Hyperlipidemia, unspecified', category: 'Endocrine', keywords: ['cholesterol', 'hyperlipidemia', 'dyslipidemia'] },

            // Respiratory (J00-J99)
            'J18.9': { description: 'Pneumonia, unspecified organism', category: 'Respiratory', keywords: ['pneumonia', 'lung infection'] },
            'J44.1': { description: 'COPD with acute exacerbation', category: 'Respiratory', keywords: ['copd', 'chronic obstructive', 'emphysema'] },
            'J45.20': { description: 'Mild intermittent asthma, uncomplicated', category: 'Respiratory', keywords: ['asthma', 'bronchial asthma', 'wheezing'] },

            // Digestive (K00-K95)
            'K35.80': { description: 'Unspecified acute appendicitis', category: 'Digestive', keywords: ['appendicitis', 'appendix', 'acute appendix'] },
            'K80.20': { description: 'Calculus of gallbladder without cholecystitis', category: 'Digestive', keywords: ['gallstone', 'cholelithiasis', 'gall bladder stone'] },
            'K92.2': { description: 'Gastrointestinal hemorrhage, unspecified', category: 'Digestive', keywords: ['gi bleed', 'gastrointestinal bleeding', 'melena'] },

            // Genitourinary (N00-N99)
            'N18.3': { description: 'Chronic kidney disease, stage 3', category: 'Genitourinary', keywords: ['ckd', 'chronic kidney', 'renal disease'] },
            'N39.0': { description: 'Urinary tract infection', category: 'Genitourinary', keywords: ['uti', 'urinary infection', 'bladder infection'] },

            // Injury (S00-T88)
            'S72.001A': { description: 'Fracture of unspecified part of neck of right femur', category: 'Injury', keywords: ['hip fracture', 'femur fracture', 'neck of femur'] },
            'S52.501A': { description: 'Unspecified fracture of the lower end of right radius', category: 'Injury', keywords: ['wrist fracture', 'radius fracture', 'colles'] }
        };
    }

    initializeProcedurePricing() {
        return {
            'room_general': { market_median: 1500, market_75th: 2000, tpa_median: 1500, tpa_max: 2500 },
            'room_semi': { market_median: 3000, market_75th: 4000, tpa_median: 3500, tpa_max: 5000 },
            'room_private': { market_median: 5000, market_75th: 7000, tpa_median: 5000, tpa_max: 8000 },
            'room_icu': { market_median: 10000, market_75th: 15000, tpa_median: 12000, tpa_max: 20000 },
            'surgery_minor': { market_median: 15000, market_75th: 25000, tpa_median: 20000, tpa_max: 35000 },
            'surgery_major': { market_median: 75000, market_75th: 100000, tpa_median: 80000, tpa_max: 150000 },
            'anesthesia': { market_median: 8000, market_75th: 12000, tpa_median: 10000, tpa_max: 15000 },
            'lab_basic': { market_median: 500, market_75th: 800, tpa_median: 600, tpa_max: 1000 },
            'lab_advanced': { market_median: 2000, market_75th: 3000, tpa_median: 2500, tpa_max: 4000 },
            'imaging_xray': { market_median: 300, market_75th: 500, tpa_median: 400, tpa_max: 600 },
            'imaging_ct': { market_median: 4000, market_75th: 6000, tpa_median: 5000, tpa_max: 8000 },
            'imaging_mri': { market_median: 8000, market_75th: 12000, tpa_median: 10000, tpa_max: 15000 }
        };
    }

    /**
     * Get AI billing statistics
     */
    async getStats() {
        try {
            const result = await pool.query(`
                SELECT 
                    COUNT(*) as total_predictions,
                    AVG(confidence_score) as avg_confidence,
                    COUNT(*) FILTER (WHERE prediction_type = 'denial_risk') as denial_predictions,
                    (SELECT COUNT(*) FROM icd_code_suggestions) as icd_suggestions
                FROM ai_billing_predictions
                WHERE created_at > NOW() - INTERVAL '30 days'
            `);
            return result.rows[0];
        } catch (error) {
            console.error('[AIBilling] Get stats error:', error);
            return {};
        }
    }
}

// Singleton
let aiBillingInstance = null;

const getAIBillingEngine = () => {
    if (!aiBillingInstance) {
        aiBillingInstance = new AIBillingEngine();
    }
    return aiBillingInstance;
};

module.exports = { AIBillingEngine, getAIBillingEngine };
