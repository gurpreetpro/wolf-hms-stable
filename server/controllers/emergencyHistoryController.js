/**
 * Emergency history + KPI summary controller
 * ==========================================
 * Backs the `/admin/emergency` Emergency Command Center, which previously rendered
 * hardcoded rows (EM-2026-041, Ramesh Gupta P-1045 …) and static KPIs (2.5 min / 96%).
 *
 * GET /api/emergency/history  →
 *   { active: [...], resolved: [...], summary: { activeCount, resolvedTodayCount,
 *     triggeredToday, avgResponseMinutes, compliancePct } }
 *
 * Implemented as a sibling of emergencyController.js so the existing controller file
 * (which is CRLF-formatted and large) is not rewritten.
 */
const { pool } = require('../config/db');
const { getHospitalId } = require('../utils/tenantHelper');
const ResponseHandler = require('../utils/responseHandler');
const { asyncHandler } = require('../middleware/errorHandler');

const getEmergencyHistory = asyncHandler(async (req, res) => {
    const hospitalId = getHospitalId(req) || 1;

    const activeRes = await pool.query(
        `SELECT el.id, el.code, el.location, el.status, el.triggered_at, el.patient_id, el.notes,
                p.name AS patient_name, u.username AS triggered_by_name,
                GREATEST(0, ROUND(EXTRACT(EPOCH FROM (NOW() - el.triggered_at)) / 60))::int AS elapsed_minutes
           FROM emergency_logs el
           LEFT JOIN patients p ON p.id = el.patient_id
           LEFT JOIN users u ON u.id = el.triggered_by
          WHERE el.hospital_id = $1 AND el.status = 'Active'
          ORDER BY el.triggered_at DESC LIMIT 50`,
        [hospitalId]
    );

    const resolvedRes = await pool.query(
        `SELECT el.id, el.code, el.location, el.triggered_at, el.resolved_at, el.status,
                el.patient_id, el.resolution_notes,
                p.name AS patient_name, u.username AS triggered_by_name, ru.username AS resolved_by_name,
                GREATEST(1, ROUND(EXTRACT(EPOCH FROM (el.resolved_at - el.triggered_at)) / 60))::int AS duration_minutes
           FROM emergency_logs el
           LEFT JOIN patients p ON p.id = el.patient_id
           LEFT JOIN users u ON u.id = el.triggered_by
           LEFT JOIN users ru ON ru.id = el.resolved_by
          WHERE el.hospital_id = $1 AND el.status = 'Resolved'
          ORDER BY el.resolved_at DESC NULLS LAST LIMIT 50`,
        [hospitalId]
    );

    const metrics = await pool.query(
        `SELECT COUNT(*) FILTER (WHERE status = 'Active')::int AS active_count,
                COUNT(*) FILTER (WHERE status = 'Resolved' AND resolved_at >= CURRENT_DATE)::int AS resolved_today,
                COUNT(*) FILTER (WHERE triggered_at >= CURRENT_DATE)::int AS triggered_today,
                ROUND(AVG(EXTRACT(EPOCH FROM (resolved_at - triggered_at)) / 60)
                      FILTER (WHERE status = 'Resolved' AND resolved_at IS NOT NULL), 1) AS avg_response_minutes
           FROM emergency_logs WHERE hospital_id = $1`,
        [hospitalId]
    );

    const m = metrics.rows[0] || {};
    const triggeredToday = Number(m.triggered_today || 0);
    const resolvedToday = Number(m.resolved_today || 0);

    ResponseHandler.success(res, {
        active: activeRes.rows,
        resolved: resolvedRes.rows,
        summary: {
            activeCount: Number(m.active_count || 0),
            resolvedTodayCount: resolvedToday,
            triggeredToday,
            avgResponseMinutes: m.avg_response_minutes != null ? Number(m.avg_response_minutes) : null,
            compliancePct: triggeredToday > 0 ? Math.round((resolvedToday / triggeredToday) * 1000) / 10 : null,
        },
    });
});

module.exports = { getEmergencyHistory };
