/**
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * Wolf HMS — Phase 8, Pillar 4
 * OPERATIONAL COMMAND CENTER
 * ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
 * 
 * Sub-modules:
 *  1. Real-Time Bed Intelligence — occupancy prediction & discharge ETA
 *  2. Staff Workload Balancer — nurse-to-patient ratio optimizer
 *  3. ER Surge Predictor — forecasts ER load from admission patterns
 *  4. Hospital Performance Scorecard — live KPI dashboard data
 */

const pool = require('../../config/db');

class OperationalCommandCenter {

    // ════════════════════════════════════════════════════════
    // 1. REAL-TIME BED INTELLIGENCE
    // ════════════════════════════════════════════════════════

    /**
     * Get real-time bed occupancy with predictions.
     * 
     * @param {number} hospitalId
     * @returns {Object} { occupancy, byWard[], predictedDischarges[], bottlenecks[] }
     */
    static async getBedIntelligence(hospitalId) {
        // Current bed occupancy
        const occupancy = await pool.query(`
            SELECT 
                COUNT(*) FILTER (WHERE status = 'Occupied') as occupied,
                COUNT(*) FILTER (WHERE status = 'Available') as available,
                COUNT(*) FILTER (WHERE status = 'Maintenance') as maintenance,
                COUNT(*) FILTER (WHERE status = 'Reserved') as reserved,
                COUNT(*) as total
            FROM beds
            WHERE hospital_id = $1
        `, [hospitalId]);

        const occ = occupancy.rows[0] || { occupied: 0, available: 0, total: 0 };
        const occupancyRate = occ.total > 0 ? ((Number(occ.occupied) / Number(occ.total)) * 100).toFixed(1) : 0;

        // By ward breakdown
        const byWard = await pool.query(`
            SELECT 
                ward_type as ward,
                COUNT(*) as total,
                COUNT(*) FILTER (WHERE status = 'Occupied') as occupied,
                COUNT(*) FILTER (WHERE status = 'Available') as available,
                ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'Occupied') / NULLIF(COUNT(*), 0), 1) as occupancy_pct
            FROM beds
            WHERE hospital_id = $1
            GROUP BY ward_type
            ORDER BY occupancy_pct DESC
        `, [hospitalId]);

        // Predicted discharges (next 24h based on expected LOS)
        const predictedDischarges = await pool.query(`
            SELECT a.id as admission_id, p.name as patient_name,
                   a.ward, a.bed_number, a.admitted_at,
                   tp.stay_days as expected_los,
                   a.admitted_at + (tp.stay_days || 3) * INTERVAL '1 day' as expected_discharge,
                   EXTRACT(HOURS FROM (a.admitted_at + (tp.stay_days || 3) * INTERVAL '1 day') - NOW()) as hours_until_discharge
            FROM admissions a
            LEFT JOIN patients p ON a.patient_id = p.id
            LEFT JOIN patient_packages pp ON pp.patient_id = a.patient_id AND pp.status = 'active'
            LEFT JOIN treatment_packages tp ON pp.package_id = tp.id
            WHERE a.hospital_id = $1 
              AND a.status = 'Admitted'
              AND a.admitted_at + COALESCE(tp.stay_days, 3) * INTERVAL '1 day' <= NOW() + INTERVAL '24 hours'
            ORDER BY hours_until_discharge ASC
            LIMIT 20
        `, [hospitalId]);

        // Bottleneck detection
        const bottlenecks = [];
        for (const ward of byWard.rows) {
            if (Number(ward.occupancy_pct) > 90) {
                bottlenecks.push({
                    ward: ward.ward,
                    occupancy: `${ward.occupancy_pct}%`,
                    severity: Number(ward.occupancy_pct) >= 100 ? 'CRITICAL' : 'HIGH',
                    message: `${ward.ward} at ${ward.occupancy_pct}% capacity — ${ward.available} beds available.`,
                    action: ward.available == 0 ? 'Expedite discharges or arrange ward transfers' : 'Monitor closely'
                });
            }
        }

        return {
            hospitalId,
            overall: {
                occupied: Number(occ.occupied),
                available: Number(occ.available),
                maintenance: Number(occ.maintenance),
                reserved: Number(occ.reserved),
                total: Number(occ.total),
                occupancyRate: `${occupancyRate}%`
            },
            byWard: byWard.rows,
            predictedDischarges: predictedDischarges.rows,
            bottlenecks,
            timestamp: new Date().toISOString()
        };
    }

    // ════════════════════════════════════════════════════════
    // 2. STAFF WORKLOAD BALANCER
    // ════════════════════════════════════════════════════════

    /**
     * Analyze nurse-to-patient ratio by ward and flag understaffing.
     * 
     * Indian NABH Standard:
     *  - General Ward: 1:6
     *  - ICU/HDU: 1:2
     *  - NICU: 1:3
     *  - Labour Room: 1:1
     * 
     * @param {number} hospitalId
     * @returns {Object} { wards[], alerts[], overallScore }
     */
    static async analyzeStaffWorkload(hospitalId) {
        const NABH_RATIOS = {
            'General Ward': 6,
            'Semi-Private': 5,
            'Private': 4,
            'ICU': 2,
            'HDU': 2,
            'NICU': 3,
            'Labour Room': 1,
            'Emergency': 4,
            'default': 5
        };

        // Current patients per ward
        const patientsByWard = await pool.query(`
            SELECT ward, COUNT(*) as patient_count
            FROM admissions
            WHERE hospital_id = $1 AND status = 'Admitted'
            GROUP BY ward
        `, [hospitalId]);

        // Current active nurse assignments
        const nursesByWard = await pool.query(`
            SELECT ward, COUNT(DISTINCT user_id) as nurse_count
            FROM nurse_assignments
            WHERE hospital_id = $1 
              AND status = 'Active'
              AND shift_end > NOW()
            GROUP BY ward
        `, [hospitalId]);

        const nurseMap = {};
        nursesByWard.rows.forEach(r => { nurseMap[r.ward] = Number(r.nurse_count); });

        const wards = [];
        const alerts = [];
        let totalScore = 0;

        for (const row of patientsByWard.rows) {
            const ward = row.ward;
            const patients = Number(row.patient_count);
            const nurses = nurseMap[ward] || 0;
            const idealRatio = NABH_RATIOS[ward] || NABH_RATIOS['default'];
            const requiredNurses = Math.ceil(patients / idealRatio);
            const deficit = Math.max(requiredNurses - nurses, 0);
            const actualRatio = nurses > 0 ? `1:${Math.round(patients / nurses)}` : 'No staff';
            const score = nurses >= requiredNurses ? 100 : Math.round((nurses / Math.max(requiredNurses, 1)) * 100);

            wards.push({
                ward,
                patients,
                nurses,
                requiredNurses,
                deficit,
                actualRatio,
                idealRatio: `1:${idealRatio}`,
                score,
                status: deficit === 0 ? '🟢 Adequate' : deficit <= 1 ? '🟡 Borderline' : '🔴 Understaffed'
            });

            totalScore += score;

            if (deficit > 0) {
                alerts.push({
                    ward,
                    severity: deficit >= 2 ? 'CRITICAL' : 'WARNING',
                    message: `${ward}: ${patients} patients, ${nurses} nurses (need ${requiredNurses}). Deficit: ${deficit} nurse(s).`,
                    action: `Reassign ${deficit} nurse(s) from lower-load wards or call in on-call staff.`
                });
            }
        }

        return {
            hospitalId,
            wards: wards.sort((a, b) => a.score - b.score),
            alerts,
            overallScore: wards.length > 0 ? Math.round(totalScore / wards.length) : 100,
            nabhCompliant: alerts.filter(a => a.severity === 'CRITICAL').length === 0,
            analyzedAt: new Date().toISOString()
        };
    }

    // ════════════════════════════════════════════════════════
    // 3. ER SURGE PREDICTOR
    // ════════════════════════════════════════════════════════

    /**
     * Predict ER load based on historical patterns.
     * 
     * @param {number} hospitalId
     * @returns {Object} { prediction, historicalPattern, recommendation }
     */
    static async predictERSurge(hospitalId) {
        // Get ER admissions pattern by day-of-week and hour
        const pattern = await pool.query(`
            SELECT 
                EXTRACT(DOW FROM admitted_at) as day_of_week,
                EXTRACT(HOUR FROM admitted_at) as hour,
                COUNT(*) as er_count
            FROM admissions
            WHERE hospital_id = $1 
              AND ward ILIKE '%emergency%'
              AND admitted_at >= NOW() - INTERVAL '90 days'
            GROUP BY EXTRACT(DOW FROM admitted_at), EXTRACT(HOUR FROM admitted_at)
            ORDER BY day_of_week, hour
        `, [hospitalId]);

        // Current day/hour
        const now = new Date();
        const currentDow = now.getDay();
        const currentHour = now.getHours();
        const nextHours = [0, 1, 2, 3, 4, 5].map(h => (currentHour + h) % 24);

        // Find predicted load for next 6 hours
        const predictions = nextHours.map(h => {
            const match = pattern.rows.find(r => Number(r.day_of_week) === currentDow && Number(r.hour) === h);
            const avgPerDay = match ? Number(match.er_count) / 13 : 0; // 90 days / ~7 = 13 weeks
            return {
                hour: h,
                predictedArrivals: Math.round(avgPerDay * 10) / 10,
                confidence: match ? 'MODERATE' : 'LOW'
            };
        });

        const peakPredicted = Math.max(...predictions.map(p => p.predictedArrivals));
        const totalPredicted = predictions.reduce((s, p) => s + p.predictedArrivals, 0);

        // Current ER occupancy
        const currentER = await pool.query(`
            SELECT COUNT(*) as count FROM admissions
            WHERE hospital_id = $1 AND ward ILIKE '%emergency%' AND status = 'Admitted'
        `, [hospitalId]);

        return {
            hospitalId,
            currentERPatients: Number(currentER.rows[0]?.count || 0),
            next6Hours: predictions,
            totalPredicted: Math.round(totalPredicted),
            peakHour: predictions.find(p => p.predictedArrivals === peakPredicted)?.hour,
            peakLoad: Math.round(peakPredicted),
            recommendation: totalPredicted > 10 
                ? '🔴 High ER load expected. Ensure full ER staffing and keep resus bay clear.'
                : totalPredicted > 5 
                    ? '🟡 Moderate ER load. Standard staffing should suffice.'
                    : '🟢 Low ER load expected.',
            predictedAt: new Date().toISOString()
        };
    }

    // ════════════════════════════════════════════════════════
    // 4. HOSPITAL PERFORMANCE SCORECARD
    // ════════════════════════════════════════════════════════

    /**
     * Generate a live hospital performance scorecard.
     * 
     * @param {number} hospitalId
     * @returns {Object} { kpis, grade, period }
     */
    static async getPerformanceScorecard(hospitalId) {
        const today = 'CURRENT_DATE';
        const month = "NOW() - INTERVAL '30 days'";

        // KPI 1: Average Length of Stay
        const alos = await pool.query(`
            SELECT AVG(EXTRACT(DAY FROM (discharged_at - admitted_at))) as alos
            FROM admissions
            WHERE hospital_id = $1 AND discharged_at IS NOT NULL 
              AND admitted_at >= ${month}
        `, [hospitalId]);

        // KPI 2: Bed Occupancy Rate
        const bor = await pool.query(`
            SELECT 
                ROUND(100.0 * COUNT(*) FILTER (WHERE status = 'Occupied') / NULLIF(COUNT(*), 0), 1) as rate
            FROM beds WHERE hospital_id = $1
        `, [hospitalId]);

        // KPI 3: ER Wait Time (avg time from registration to first doctor consult)
        const erWait = await pool.query(`
            SELECT AVG(EXTRACT(MINUTES FROM (first_seen_at - registered_at))) as avg_wait
            FROM emergency_logs
            WHERE hospital_id = $1 AND registered_at >= ${month}
        `, [hospitalId]);

        // KPI 4: Pending Invoice Clearance (collections)
        const pendingInv = await pool.query(`
            SELECT COUNT(*) as count, COALESCE(SUM(total_amount), 0) as amount
            FROM invoices
            WHERE hospital_id = $1 AND status = 'Pending' AND created_at >= ${month}
        `, [hospitalId]);

        // KPI 5: Patient Discharge Rate (today)
        const discharges = await pool.query(`
            SELECT COUNT(*) as count FROM admissions
            WHERE hospital_id = $1 AND discharged_at::date = CURRENT_DATE
        `, [hospitalId]);

        // KPI 6: OPD volume (today)
        const opdToday = await pool.query(`
            SELECT COUNT(*) as count FROM opd_visits
            WHERE hospital_id = $1 AND visit_date = CURRENT_DATE
        `, [hospitalId]);

        const kpis = {
            alos: { value: Number(alos.rows[0]?.alos || 0).toFixed(1), unit: 'days', benchmark: '4.0', status: Number(alos.rows[0]?.alos || 0) <= 5 ? '🟢' : '🔴' },
            bedOccupancy: { value: `${bor.rows[0]?.rate || 0}%`, benchmark: '80-85%', status: Number(bor.rows[0]?.rate || 0) >= 70 && Number(bor.rows[0]?.rate || 0) <= 90 ? '🟢' : '🟡' },
            erAvgWait: { value: `${Number(erWait.rows[0]?.avg_wait || 0).toFixed(0)} min`, benchmark: '<30 min', status: Number(erWait.rows[0]?.avg_wait || 0) <= 30 ? '🟢' : '🔴' },
            pendingInvoices: { value: Number(pendingInv.rows[0]?.count || 0), amount: Number(pendingInv.rows[0]?.amount || 0), status: Number(pendingInv.rows[0]?.count || 0) < 50 ? '🟢' : '🔴' },
            dischargesToday: { value: Number(discharges.rows[0]?.count || 0), status: '📊' },
            opdVolume: { value: Number(opdToday.rows[0]?.count || 0), status: '📊' },
        };

        // Calculate overall grade
        let score = 0;
        if (kpis.alos.status === '🟢') score += 25;
        if (kpis.bedOccupancy.status === '🟢') score += 25;
        if (kpis.erAvgWait.status === '🟢') score += 25;
        if (kpis.pendingInvoices.status === '🟢') score += 25;

        return {
            hospitalId,
            period: 'Last 30 days',
            kpis,
            overallScore: score,
            grade: score >= 90 ? 'A+' : score >= 75 ? 'A' : score >= 60 ? 'B' : score >= 40 ? 'C' : 'D',
            generatedAt: new Date().toISOString()
        };
    }
}

module.exports = OperationalCommandCenter;
