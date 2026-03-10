/**
 * RiskCalculator Service
 * Implements NEWS2 (National Early Warning Score 2) calculation
 * 
 * NEWS2 Parameters:
 * - Respiration rate
 * - Oxygen saturation (SpO2)
 * - Systolic blood pressure
 * - Pulse rate
 * - Consciousness level (AVPU)
 * - Temperature
 * 
 * Score Range: 0-20
 * Clinical Response:
 * - 0-4: Ward-based response
 * - 5-6 or 3 in any single parameter: Urgent response
 * - 7+: Emergency response
 */

const calculateNEWS2 = (vitals) => {
    let score = 0;
    const breakdown = {};

    // Respiration Rate Score
    const rr = vitals.respiratory_rate || vitals.rr || 16; // Default normal
    if (rr <= 8) { score += 3; breakdown.rr = 3; }
    else if (rr <= 11) { score += 1; breakdown.rr = 1; }
    else if (rr <= 20) { score += 0; breakdown.rr = 0; }
    else if (rr <= 24) { score += 2; breakdown.rr = 2; }
    else { score += 3; breakdown.rr = 3; }

    // SpO2 Score (Scale 1 - Air)
    const spo2 = parseInt(vitals.spo2) || 98;
    if (spo2 <= 91) { score += 3; breakdown.spo2 = 3; }
    else if (spo2 <= 93) { score += 2; breakdown.spo2 = 2; }
    else if (spo2 <= 95) { score += 1; breakdown.spo2 = 1; }
    else { score += 0; breakdown.spo2 = 0; }

    // Systolic Blood Pressure Score
    const bpStr = vitals.bp || '120/80';
    const systolic = parseInt(bpStr.split('/')[0]) || 120;
    if (systolic <= 90) { score += 3; breakdown.bp = 3; }
    else if (systolic <= 100) { score += 2; breakdown.bp = 2; }
    else if (systolic <= 110) { score += 1; breakdown.bp = 1; }
    else if (systolic <= 219) { score += 0; breakdown.bp = 0; }
    else { score += 3; breakdown.bp = 3; } // >= 220

    // Pulse Rate Score
    const hr = parseInt(vitals.heart_rate) || parseInt(vitals.pulse) || 80;
    if (hr <= 40) { score += 3; breakdown.pulse = 3; }
    else if (hr <= 50) { score += 1; breakdown.pulse = 1; }
    else if (hr <= 90) { score += 0; breakdown.pulse = 0; }
    else if (hr <= 110) { score += 1; breakdown.pulse = 1; }
    else if (hr <= 130) { score += 2; breakdown.pulse = 2; }
    else { score += 3; breakdown.pulse = 3; }

    // Temperature Score
    const temp = parseFloat(vitals.temp) || 98.6;
    // Convert to Celsius if in Fahrenheit
    const tempC = temp > 50 ? (temp - 32) * 5 / 9 : temp;
    if (tempC <= 35) { score += 3; breakdown.temp = 3; }
    else if (tempC <= 36) { score += 1; breakdown.temp = 1; }
    else if (tempC <= 38) { score += 0; breakdown.temp = 0; }
    else if (tempC <= 39) { score += 1; breakdown.temp = 1; }
    else { score += 2; breakdown.temp = 2; }

    // Consciousness Score (AVPU)
    const avpu = vitals.consciousness || vitals.avpu || 'A';
    if (avpu === 'A' || avpu === 'Alert') { score += 0; breakdown.consciousness = 0; }
    else { score += 3; breakdown.consciousness = 3; } // V, P, U all score 3

    // Determine Clinical Risk
    let riskLevel, riskColor, clinicalResponse;
    const maxSingle = Math.max(...Object.values(breakdown));

    if (score >= 7) {
        riskLevel = 'HIGH';
        riskColor = 'danger';
        clinicalResponse = 'Emergency response - Continuous monitoring, escalate to critical care team';
    } else if (score >= 5 || maxSingle === 3) {
        riskLevel = 'MEDIUM';
        riskColor = 'warning';
        clinicalResponse = 'Urgent response - Hourly observations, inform doctor immediately';
    } else if (score >= 1) {
        riskLevel = 'LOW-MEDIUM';
        riskColor = 'info';
        clinicalResponse = 'Minimum 4-6 hourly observations, inform nurse in charge';
    } else {
        riskLevel = 'LOW';
        riskColor = 'success';
        clinicalResponse = 'Minimum 12 hourly observations';
    }

    return {
        score,
        breakdown,
        riskLevel,
        riskColor,
        clinicalResponse,
        maxSingleParameter: maxSingle
    };
};

/**
 * Check for Sepsis indicators
 * qSOFA criteria: RR >= 22, altered mentation, systolic BP <= 100
 */
const checkSepsisRisk = (vitals, labResults = {}) => {
    const warnings = [];
    let qsofaScore = 0;

    // Respiratory rate >= 22
    const rr = vitals.respiratory_rate || vitals.rr || 16;
    if (rr >= 22) {
        qsofaScore++;
        warnings.push('Elevated respiratory rate (>=22)');
    }

    // Systolic BP <= 100
    const bpStr = vitals.bp || '120/80';
    const systolic = parseInt(bpStr.split('/')[0]) || 120;
    if (systolic <= 100) {
        qsofaScore++;
        warnings.push('Low systolic blood pressure (<=100)');
    }

    // Temperature check
    const temp = parseFloat(vitals.temp) || 98.6;
    const tempC = temp > 50 ? (temp - 32) * 5 / 9 : temp;
    if (tempC > 38.5 || tempC < 36) {
        warnings.push(`Abnormal temperature (${tempC.toFixed(1)}°C)`);
    }

    // Lab indicators (if available)
    if (labResults.wbc && labResults.wbc > 12000) {
        warnings.push(`Elevated WBC (${labResults.wbc})`);
    }
    if (labResults.lactate && labResults.lactate > 2) {
        warnings.push(`Elevated Lactate (${labResults.lactate})`);
    }

    const isSepsisRisk = qsofaScore >= 2 || (warnings.length >= 2 && (tempC > 38.5 || tempC < 36));

    return {
        qsofaScore,
        isSepsisRisk,
        warnings,
        recommendation: isSepsisRisk ?
            'SEPSIS ALERT: Consider sepsis workup - Blood cultures, Lactate, Broad-spectrum antibiotics' :
            null
    };
};

module.exports = {
    calculateNEWS2,
    checkSepsisRisk
};
