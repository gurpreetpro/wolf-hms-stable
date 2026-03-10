/**
 * Doctor Analytics Controller
 * Multi-Tenant support added
 */
const pool = require('../config/db');
const { getHospitalId } = require('../utils/tenantHelper');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

const getDoctorAnalytics = asyncHandler(async (req, res) => {
    const doctorId = req.user.id;
    const hospitalId = getHospitalId(req);
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const weekStart = new Date(); weekStart.setDate(weekStart.getDate() - weekStart.getDay() + 1); weekStart.setHours(0, 0, 0, 0);

    const safeQuery = async (query, params, defaultValue = 0) => {
        try { const result = await pool.query(query, params); return result.rows[0]?.count ? parseInt(result.rows[0].count) : defaultValue; }
        catch (err) { console.warn('Query failed:', err.message); return defaultValue; }
    };
    const safeArrayQuery = async (query, params) => {
        try { const result = await pool.query(query, params); return result.rows; }
        catch (err) { console.warn('Array query failed:', err.message); return []; }
    };

    const patientsToday = await safeQuery(`SELECT COUNT(DISTINCT patient_id) as count FROM opd_visits WHERE doctor_id = $1 AND status IN ('completed', 'in-consultation', 'waiting') AND DATE(visit_date) = CURRENT_DATE AND (hospital_id = $2 OR hospital_id IS NULL)`, [doctorId, hospitalId]);
    const patientsThisWeek = await safeQuery(`SELECT COUNT(DISTINCT patient_id) as count FROM opd_visits WHERE doctor_id = $1 AND status IN ('completed', 'in-consultation', 'waiting') AND visit_date >= $2 AND (hospital_id = $3 OR hospital_id IS NULL)`, [doctorId, weekStart.toISOString(), hospitalId]);
    const patientsThisMonth = await safeQuery(`SELECT COUNT(DISTINCT patient_id) as count FROM opd_visits WHERE doctor_id = $1 AND status IN ('completed', 'in-consultation', 'waiting') AND visit_date >= $2 AND (hospital_id = $3 OR hospital_id IS NULL)`, [doctorId, monthStart.toISOString(), hospitalId]);
    const waitingInQueue = await safeQuery(`SELECT COUNT(*) as count FROM opd_visits WHERE doctor_id = $1 AND status = 'waiting' AND (hospital_id = $2 OR hospital_id IS NULL)`, [doctorId, hospitalId]);
    const diagnosesRows = await safeArrayQuery(`SELECT diagnosis, COUNT(*) as count FROM opd_visits WHERE doctor_id = $1 AND diagnosis IS NOT NULL AND diagnosis != '' AND visit_date >= $2 AND (hospital_id = $3 OR hospital_id IS NULL) GROUP BY diagnosis ORDER BY count DESC LIMIT 5`, [doctorId, monthStart.toISOString(), hospitalId]);
    const trendRows = await safeArrayQuery(`SELECT DATE(visit_date) as date, COUNT(DISTINCT patient_id) as count FROM opd_visits WHERE doctor_id = $1 AND visit_date >= NOW() - INTERVAL '7 days' AND (hospital_id = $2 OR hospital_id IS NULL) GROUP BY DATE(visit_date) ORDER BY date`, [doctorId, hospitalId]);
    const labOrdersThisMonth = await safeQuery(`SELECT COUNT(*) as count FROM lab_orders WHERE ordered_by = $1 AND created_at >= $2 AND (hospital_id = $3 OR hospital_id IS NULL)`, [doctorId, monthStart.toISOString(), hospitalId]);
    const prescriptionsThisMonth = await safeQuery(`SELECT COUNT(*) as count FROM opd_visits WHERE doctor_id = $1 AND visit_date >= $2 AND status = 'completed' AND (hospital_id = $3 OR hospital_id IS NULL)`, [doctorId, monthStart.toISOString(), hospitalId]);

    ResponseHandler.success(res, {
        overview: { patientsToday, patientsThisWeek, patientsThisMonth, waitingInQueue, labOrdersThisMonth, prescriptionsThisMonth, avgConsultTime: '12 mins' },
        topDiagnoses: diagnosesRows.map(row => ({ name: row.diagnosis, count: parseInt(row.count) })),
        dailyTrend: trendRows.map(row => ({ date: row.date, count: parseInt(row.count) }))
    });
});

const getDepartmentAnalytics = asyncHandler(async (req, res) => {
    const { department } = req.params;
    const hospitalId = getHospitalId(req);
    const monthStart = new Date(); monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);

    const deptQuery = await pool.query(`
        SELECT u.name as doctor_name, COUNT(DISTINCT v.patient_id) as patients FROM opd_visits v
        JOIN users u ON v.doctor_id = u.id
        WHERE u.department = $1 AND v.visit_date >= $2::date AND (v.hospital_id = $3 OR v.hospital_id IS NULL)
        GROUP BY u.name ORDER BY patients DESC
    `, [department, monthStart.toISOString(), hospitalId]);

    ResponseHandler.success(res, { department, doctorStats: deptQuery.rows });
});

module.exports = { getDoctorAnalytics, getDepartmentAnalytics };
