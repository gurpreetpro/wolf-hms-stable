/**
 * NEWS2 (National Early Warning Score 2) Calculator
 * Standardized system for the assessment of acute illness severity.
 * Based on Royal College of Physicians (UK) standards.
 */

const calculateNEWS2 = (vitals) => {
    let score = 0;
    const breakdown = {};

    // 1. Respiration Rate (breaths/min)
    if (vitals.respiratory_rate) {
        const rr = parseFloat(vitals.respiratory_rate);
        if (rr <= 8) { score += 3; breakdown.rr = 3; }
        else if (rr >= 9 && rr <= 11) { score += 1; breakdown.rr = 1; }
        else if (rr >= 12 && rr <= 20) { score += 0; breakdown.rr = 0; }
        else if (rr >= 21 && rr <= 24) { score += 2; breakdown.rr = 2; }
        else if (rr >= 25) { score += 3; breakdown.rr = 3; }
    }

    // 2. Oxygen Saturation (SpO2 %) - Scale 1 (Standard)
    // TODO: Implement Scale 2 for CO2 retainers if 'copd' flag is passed
    if (vitals.spo2) {
        const spo2 = parseFloat(vitals.spo2);
        if (spo2 <= 91) { score += 3; breakdown.spo2 = 3; }
        else if (spo2 >= 92 && spo2 <= 93) { score += 2; breakdown.spo2 = 2; }
        else if (spo2 >= 94 && spo2 <= 95) { score += 1; breakdown.spo2 = 1; }
        else if (spo2 >= 96) { score += 0; breakdown.spo2 = 0; }
    }

    // 3. Air or Oxygen?
    // Expecting boolean or string 'Air'/'Oxygen'
    if (vitals.oxygen_supplement) {
        const onO2 = vitals.oxygen_supplement === true || 
                     vitals.oxygen_supplement === 'yes' || 
                     (typeof vitals.oxygen_supplement === 'string' && vitals.oxygen_supplement.toLowerCase().includes('oxy'));
        
        if (onO2) { score += 2; breakdown.o2 = 2; }
        else { score += 0; breakdown.o2 = 0; }
    }

    // 4. Systolic Blood Pressure (mmHg)
    if (vitals.bp_systolic) {
        const sbp = parseFloat(vitals.bp_systolic);
        if (sbp <= 90) { score += 3; breakdown.sbp = 3; }
        else if (sbp >= 91 && sbp <= 100) { score += 2; breakdown.sbp = 2; }
        else if (sbp >= 101 && sbp <= 110) { score += 1; breakdown.sbp = 1; }
        else if (sbp >= 111 && sbp <= 219) { score += 0; breakdown.sbp = 0; }
        else if (sbp >= 220) { score += 3; breakdown.sbp = 3; }
    }

    // 5. Pulse (bpm)
    if (vitals.heart_rate) {
        const hr = parseFloat(vitals.heart_rate);
        if (hr <= 40) { score += 3; breakdown.pulse = 3; }
        else if (hr >= 41 && hr <= 50) { score += 1; breakdown.pulse = 1; }
        else if (hr >= 51 && hr <= 90) { score += 0; breakdown.pulse = 0; }
        else if (hr >= 91 && hr <= 110) { score += 1; breakdown.pulse = 1; }
        else if (hr >= 111 && hr <= 130) { score += 2; breakdown.pulse = 2; }
        else if (hr >= 131) { score += 3; breakdown.pulse = 3; }
    }

    // 6. Consciousness (AVPU)
    // Expect: 'Alert', 'Voice', 'Pain', 'Unresponsive' or 'Confusion'
    if (vitals.consciousness) {
        const state = vitals.consciousness.toLowerCase();
        if (state === 'alert' || state === 'a') { score += 0; breakdown.cns = 0; }
        else { score += 3; breakdown.cns = 3; } // Any confusion/V/P/U is auto 3
    }

    // 7. Temperature (C)
    if (vitals.temperature) {
        const temp = parseFloat(vitals.temperature);
        if (temp <= 35.0) { score += 3; breakdown.temp = 3; }
        else if (temp >= 35.1 && temp <= 36.0) { score += 1; breakdown.temp = 1; }
        else if (temp >= 36.1 && temp <= 38.0) { score += 0; breakdown.temp = 0; }
        else if (temp >= 38.1 && temp <= 39.0) { score += 1; breakdown.temp = 1; }
        else if (temp >= 39.1) { score += 2; breakdown.temp = 2; }
    }

    return {
        score,
        breakdown,
        riskLevel: getRiskLevel(score, breakdown),
        clinicalAction: getAction(score)
    };
};

const getRiskLevel = (score, breakdown) => {
    // Red flag rule: A score of 3 in any single sub-parameter implies at least Medium risk
    const hasRedFlag = Object.values(breakdown).some(val => val === 3);

    if (score >= 7) return 'High';
    if (score >= 5 || hasRedFlag) return 'Medium';
    return 'Low';
};

const getAction = (score) => {
    if (score >= 7) return 'Emergency Assessment (Critical Care Team)';
    if (score >= 5) return 'Urgent Review (Doctor/Ward Leader)';
    if (score >= 1) return 'Increased Monitoring (Nurse)';
    return 'Routine Monitoring';
};

module.exports = { calculateNEWS2 };
