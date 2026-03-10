const { pool } = require('../db');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

// Calculate NEWS Score (National Early Warning Score)
const calculateNEWS = (vitals) => {
    let score = 0;
    
    // RR (Respiratory Rate)
    const rr = parseInt(vitals.resp_rate);
    if (rr <= 8 || rr >= 25) score += 3;
    else if (rr >= 21) score += 2;
    else if (rr >= 9 && rr <= 11) score += 1;

    // SpO2
    const spo2 = parseInt(vitals.spo2);
    if (spo2 <= 91) score += 3;
    else if (spo2 >= 92 && spo2 <= 93) score += 2;
    else if (spo2 >= 94 && spo2 <= 95) score += 1;
    
    // Temp
    const temp = parseFloat(vitals.temp);
    if (temp <= 35.0) score += 3;
    else if (temp >= 39.1) score += 2;
    else if (temp >= 38.1 || temp <= 36.0) score += 1;
    
    // BP (Systolic)
    const sys = parseInt(vitals.bp_systolic); // Assuming bp passed as "120/80" - handled in logs
    if (sys <= 90 || sys >= 220) score += 3; // 220 is not standard NEWS but high risk
    else if (sys >= 91 && sys <= 100) score += 2;
    else if (sys >= 101 && sys <= 110) score += 1;
    
    // Heart Rate
    const hr = parseInt(vitals.heart_rate);
    if (hr <= 40 || hr >= 131) score += 3;
    else if (hr >= 111 && hr <= 130) score += 2;
    else if (hr >= 41 && hr <= 50 || hr >= 91 && hr <= 110) score += 1;

    return score;
};

const getRiskLevel = (score) => {
    if (score >= 7) return 'HIGH (Critical Care Review)';
    if (score >= 5) return 'MEDIUM (Urgent Response)';
    if (score >= 1) return 'LOW (Ward Monitoring)';
    return 'NORMAL';
};

// Log Vitals with Auto-Score
const logVitals = asyncHandler(async (req, res) => {
    const { patient_id, admission_id, bp, temp, spo2, heart_rate, resp_rate } = req.body;
    const recorded_by = req.user.id;
    const hospitalId = req.hospital_id;

    // Parse BP
    let bp_systolic = 120;
    if (bp && bp.includes('/')) {
        bp_systolic = parseInt(bp.split('/')[0]);
    }

    const news_score = calculateNEWS({ bp_systolic, temp, spo2, heart_rate, resp_rate });
    const risk_level = getRiskLevel(news_score);

    const result = await pool.query(
        `INSERT INTO vitals_logs (patient_id, admission_id, bp, temp, spo2, heart_rate, resp_rate, news_score, recorded_by, hospital_id) 
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
        [patient_id, admission_id, bp, temp, spo2, heart_rate, resp_rate, news_score, recorded_by, hospitalId]
    );

    // [INTEGRATION] Trigger Alert if High Risk
    if (news_score >= 7) {
        // Create Alert Task
        await pool.query(
            `INSERT INTO care_tasks (patient_id, admission_id, type, description, status, priority, hospital_id) 
             VALUES ($1, $2, 'Alert', $3, 'Pending', 'High', $4)`,
            [patient_id, admission_id, `CRITICAL VITALS (NEWS: ${news_score}) - Immediate Review Required`, hospitalId]
        );
    }

    ResponseHandler.success(res, { log: result.rows[0], risk_level }, 201);
});

const getVitalsHistory = asyncHandler(async (req, res) => {
    const { patient_id, admission_id } = req.query;
    const hospitalId = req.hospital_id;
    
    let query = `SELECT v.*, u.username as recorded_by_name 
                 FROM vitals_logs v 
                 LEFT JOIN users u ON v.recorded_by = u.id 
                 WHERE v.hospital_id = $1`;
    const params = [hospitalId];

    if (patient_id) {
        params.push(patient_id);
        query += ` AND v.patient_id = $${params.length}`;
    }
    if (admission_id) {
        params.push(admission_id);
        query += ` AND v.admission_id = $${params.length}`;
    }
    
    query += ` ORDER BY v.created_at DESC LIMIT 50`;

    const result = await pool.query(query, params);
    ResponseHandler.success(res, result.rows);
});

module.exports = { logVitals, getVitalsHistory };
