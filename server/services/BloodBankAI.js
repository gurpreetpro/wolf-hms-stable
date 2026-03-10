/**
 * Blood Bank AI Service
 * WOLF HMS - Phase 3: AI-Powered Features
 * 
 * Features:
 * - Demand Forecasting
 * - Expiry Prevention
 * - Donor Scheduling Optimization
 */

const db = require('../db');

class BloodBankAI {
    
    // ============================================
    // DEMAND FORECASTING
    // ============================================
    
    /**
     * Predict blood demand for next 7 days
     * Based on: historical usage, scheduled surgeries, seasonal patterns
     */
    static async forecastDemand() {
        try {
            // Get historical usage (last 30 days)
            const historicalUsage = await db.pool.query(`
                SELECT 
                    blood_group,
                    DATE(issued_date) as issue_date,
                    COUNT(*) as units_used
                FROM blood_units
                WHERE issued_date >= CURRENT_DATE - INTERVAL '30 days'
                    AND status = 'Issued'
                GROUP BY blood_group, DATE(issued_date)
                ORDER BY blood_group, issue_date
            `);

            // Get scheduled surgeries (next 7 days)
            const scheduledSurgeries = await db.pool.query(`
                SELECT COUNT(*) as count
                FROM ot_schedules
                WHERE scheduled_date >= CURRENT_DATE 
                    AND scheduled_date <= CURRENT_DATE + INTERVAL '7 days'
                    AND status != 'Cancelled'
            `);
            const surgeryCount = parseInt(scheduledSurgeries.rows[0]?.count || 0);

            // Calculate average daily usage per blood group
            const usageByGroup = {};
            const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
            
            bloodGroups.forEach(group => {
                const groupData = historicalUsage.rows.filter(r => r.blood_group === group);
                const totalUsed = groupData.reduce((sum, r) => sum + parseInt(r.units_used), 0);
                const avgDaily = groupData.length > 0 ? totalUsed / 30 : 0;
                usageByGroup[group] = avgDaily;
            });

            // Current stock
            const currentStock = await db.pool.query(`
                SELECT blood_group, COUNT(*) as units
                FROM blood_units
                WHERE status = 'Available'
                GROUP BY blood_group
            `);

            const stockByGroup = {};
            currentStock.rows.forEach(r => {
                stockByGroup[r.blood_group] = parseInt(r.units);
            });

            // Generate forecast
            const forecast = bloodGroups.map(group => {
                const avgDaily = usageByGroup[group] || 0;
                // Adjust for surgeries (assume 20% increase per 10 surgeries)
                const surgeryFactor = 1 + (surgeryCount / 10) * 0.2;
                // Seasonal adjustment (simplified)
                const month = new Date().getMonth();
                const seasonalFactor = (month >= 5 && month <= 7) ? 1.1 : 1.0; // Summer spike
                
                const predicted7Day = Math.ceil(avgDaily * 7 * surgeryFactor * seasonalFactor);
                const currentUnits = stockByGroup[group] || 0;
                const shortage = Math.max(0, predicted7Day - currentUnits);
                const confidence = avgDaily > 0 ? Math.min(0.95, 0.5 + (historicalUsage.rows.filter(r => r.blood_group === group).length / 30) * 0.5) : 0.3;

                return {
                    blood_group: group,
                    current_stock: currentUnits,
                    predicted_demand_7day: predicted7Day,
                    avg_daily_usage: Math.round(avgDaily * 100) / 100,
                    shortage_risk: shortage,
                    status: shortage > 0 ? 'CRITICAL' : currentUnits < predicted7Day * 1.5 ? 'LOW' : 'ADEQUATE',
                    confidence: Math.round(confidence * 100),
                    recommendation: shortage > 0 
                        ? `URGENT: Arrange ${shortage} units of ${group}` 
                        : currentUnits < predicted7Day * 1.5 
                            ? `Schedule donation camp for ${group}`
                            : 'Stock levels adequate'
                };
            });

            return {
                forecast_date: new Date().toISOString(),
                forecast_period: '7 days',
                factors_considered: ['historical_usage', 'scheduled_surgeries', 'seasonal_patterns'],
                surgery_count_next_7_days: surgeryCount,
                predictions: forecast,
                summary: {
                    critical_groups: forecast.filter(f => f.status === 'CRITICAL').map(f => f.blood_group),
                    low_groups: forecast.filter(f => f.status === 'LOW').map(f => f.blood_group),
                    total_predicted_demand: forecast.reduce((sum, f) => sum + f.predicted_demand_7day, 0),
                    total_current_stock: forecast.reduce((sum, f) => sum + f.current_stock, 0)
                }
            };
        } catch (error) {
            console.error('Demand forecast error:', error);
            throw error;
        }
    }

    // ============================================
    // EXPIRY PREVENTION
    // ============================================

    /**
     * Get units at risk of expiry with reallocation suggestions
     */
    static async getExpiryRiskAnalysis() {
        try {
            // Get units expiring in next 7 days
            const expiringUnits = await db.pool.query(`
                SELECT bu.*, 
                       bd.name as donor_name,
                       bct.name as component_name, bct.code as component_code,
                       CAST(EXTRACT(DAY FROM Age(bu.expiry_date, CURRENT_DATE)) AS INTEGER) as days_to_expiry
                FROM blood_units bu
                LEFT JOIN blood_donors bd ON bu.donor_id = bd.id
                LEFT JOIN blood_component_types bct ON bu.component_type_id = bct.id
                WHERE bu.status = 'Available'
                    AND bu.expiry_date <= CURRENT_DATE + INTERVAL '7 days'
                ORDER BY bu.expiry_date ASC
            `);

            // Get pending requests that could use these units
            const pendingRequests = await db.pool.query(`
                SELECT br.*, p.name as patient_name
                FROM blood_requests br
                LEFT JOIN patients p ON br.patient_id = p.id
                WHERE br.status IN ('Pending', 'Approved')
                ORDER BY 
                    CASE br.priority 
                        WHEN 'Emergency' THEN 1 
                        WHEN 'Urgent' THEN 2 
                        ELSE 3 
                    END
            `);

            // Match expiring units to requests
            const suggestions = [];
            
            for (const unit of expiringUnits.rows) {
                const daysLeft = parseInt(unit.days_to_expiry);
                const matchingRequest = pendingRequests.rows.find(
                    r => r.blood_group_required === unit.blood_group
                );

                let action = 'No immediate match';
                let priority = 'Medium';
                let matchedRequest = null;

                if (matchingRequest) {
                    action = `Match with request ${matchingRequest.request_id} for ${matchingRequest.patient_name}`;
                    priority = matchingRequest.priority;
                    matchedRequest = matchingRequest.request_id;
                } else if (daysLeft <= 2) {
                    action = 'URGENT: Consider inter-hospital transfer or component separation';
                    priority = 'Critical';
                } else if (daysLeft <= 5) {
                    action = 'Schedule for priority issue or donation camp notification';
                    priority = 'High';
                }

                suggestions.push({
                    unit_id: unit.unit_id,
                    blood_group: unit.blood_group,
                    component: unit.component_name,
                    days_to_expiry: daysLeft,
                    expiry_date: unit.expiry_date,
                    donor_name: unit.donor_name,
                    priority,
                    action,
                    matched_request: matchedRequest,
                    wastage_risk: daysLeft <= 2 ? 'HIGH' : daysLeft <= 5 ? 'MEDIUM' : 'LOW'
                });
            }

            // Calculate potential wastage
            const potentialWastage = suggestions.filter(s => s.days_to_expiry <= 3).length;
            const estimatedSavings = potentialWastage * 1500; // Avg cost per unit

            return {
                analysis_date: new Date().toISOString(),
                total_expiring_units: expiringUnits.rows.length,
                expiring_within_3_days: suggestions.filter(s => s.days_to_expiry <= 3).length,
                expiring_within_7_days: suggestions.length,
                potential_wastage_cost: `₹${estimatedSavings.toLocaleString()}`,
                suggestions: suggestions,
                summary: {
                    by_blood_group: this.groupBy(suggestions, 'blood_group'),
                    high_priority_actions: suggestions.filter(s => s.priority === 'Critical' || s.priority === 'High').length
                }
            };
        } catch (error) {
            console.error('Expiry analysis error:', error);
            throw error;
        }
    }

    // ============================================
    // DONOR SCHEDULING
    // ============================================

    /**
     * Get optimal donor recall list based on eligibility and demand
     */
    static async getDonorRecallSuggestions() {
        try {
            // Get current demand (from forecast)
            const forecast = await this.forecastDemand();
            const criticalGroups = forecast.summary.critical_groups;
            const lowGroups = forecast.summary.low_groups;
            const priorityGroups = [...criticalGroups, ...lowGroups];

            // Get eligible donors (last donation > 90 days ago)
            const eligibleDonors = await db.pool.query(`
                SELECT d.*,
                       (CURRENT_DATE - d.last_donation_date) as days_since_donation,
                       COALESCE(d.total_donations, 0) as donation_count
                FROM blood_donors d
                WHERE d.is_eligible = true
                    AND (d.last_donation_date IS NULL OR d.last_donation_date <= CURRENT_DATE - INTERVAL '90 days')
                    AND (d.deferral_until IS NULL OR d.deferral_until < CURRENT_DATE)
                ORDER BY 
                    CASE WHEN d.blood_group = ANY($1) THEN 0 ELSE 1 END,
                    d.last_donation_date ASC NULLS FIRST
                LIMIT 100
            `, [priorityGroups]);

            // Score and rank donors
            const scoredDonors = eligibleDonors.rows.map(donor => {
                let priorityScore = 0;
                
                // Blood group priority
                if (criticalGroups.includes(donor.blood_group)) priorityScore += 50;
                else if (lowGroups.includes(donor.blood_group)) priorityScore += 30;
                
                // Loyalty bonus (more donations = higher priority)
                priorityScore += Math.min(20, donor.donation_count * 2);
                
                // Time since last donation (longer = higher priority)
                const daysSince = parseInt(donor.days_since_donation) || 365;
                if (daysSince > 180) priorityScore += 10;
                else if (daysSince > 120) priorityScore += 5;

                // Universal donor bonus
                if (donor.blood_group === 'O-') priorityScore += 15;

                return {
                    donor_id: donor.donor_id,
                    name: donor.name,
                    phone: donor.phone,
                    blood_group: donor.blood_group,
                    last_donation: donor.last_donation_date,
                    days_since_donation: daysSince,
                    total_donations: donor.donation_count,
                    priority_score: priorityScore,
                    urgency: criticalGroups.includes(donor.blood_group) ? 'CRITICAL' 
                           : lowGroups.includes(donor.blood_group) ? 'HIGH' : 'NORMAL',
                    suggested_action: criticalGroups.includes(donor.blood_group) 
                        ? 'Call immediately for donation' 
                        : lowGroups.includes(donor.blood_group)
                            ? 'Send SMS reminder this week'
                            : 'Add to monthly camp invitation list'
                };
            });

            // Sort by priority score
            scoredDonors.sort((a, b) => b.priority_score - a.priority_score);

            return {
                analysis_date: new Date().toISOString(),
                critical_blood_groups: criticalGroups,
                low_stock_groups: lowGroups,
                total_eligible_donors: scoredDonors.length,
                immediate_recall_count: scoredDonors.filter(d => d.urgency === 'CRITICAL').length,
                donors: scoredDonors.slice(0, 50), // Top 50
                sms_campaign_suggestion: {
                    target_groups: priorityGroups,
                    estimated_donors: scoredDonors.filter(d => priorityGroups.includes(d.blood_group)).length,
                    message_template: `Dear {name}, your blood type {blood_group} is urgently needed. Please visit our blood bank at your earliest convenience. Thank you!`
                }
            };
        } catch (error) {
            console.error('Donor scheduling error:', error);
            throw error;
        }
    }

    // ============================================
    // COMPATIBILITY AI
    // ============================================

    /**
     * Calculate AI-enhanced compatibility score
     */
    static calculateCompatibilityScore(patientData, unitData, crossMatchResult) {
        let score = 100;
        const factors = [];

        // Basic ABO/Rh compatibility
        if (crossMatchResult === 'Incompatible') {
            score = 0;
            factors.push({ factor: 'Cross-match incompatible', impact: -100 });
            return { score, factors, recommendation: 'DO NOT TRANSFUSE' };
        }

        // Previous transfusion reactions
        if (patientData.previous_reaction) {
            score -= 20;
            factors.push({ factor: 'Previous transfusion reaction', impact: -20 });
        }

        // Antibody detected
        if (crossMatchResult.antibody_detected) {
            score -= 15;
            factors.push({ factor: 'Antibody detected', impact: -15 });
        }

        // Unit age factor (fresher is better)
        const unitAgeDays = Math.floor((new Date() - new Date(unitData.collection_date)) / (1000 * 60 * 60 * 24));
        if (unitAgeDays > 28) {
            score -= 10;
            factors.push({ factor: 'Unit older than 28 days', impact: -10 });
        } else if (unitAgeDays > 21) {
            score -= 5;
            factors.push({ factor: 'Unit older than 21 days', impact: -5 });
        }

        // Component match bonus
        if (patientData.requested_component === unitData.component_type) {
            score += 5;
            factors.push({ factor: 'Exact component match', impact: +5 });
        }

        // Cap score at 100
        score = Math.min(100, Math.max(0, score));

        let recommendation = 'Safe to transfuse';
        if (score < 50) recommendation = 'Proceed with caution - monitor closely';
        if (score < 30) recommendation = 'Consider alternative unit';

        return { score, factors, recommendation };
    }

    // Helper: Group array by key
    static groupBy(array, key) {
        return array.reduce((result, item) => {
            const group = item[key];
            result[group] = (result[group] || 0) + 1;
            return result;
        }, {});
    }
}

module.exports = BloodBankAI;
