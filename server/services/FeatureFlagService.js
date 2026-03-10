/**
 * Feature Flag Service
 * [PHASE 4] Hyper-Scale Infrastructure - Module Toggling
 * 
 * Allows dynamic enabling/disabling of features per hospital.
 * Small clinics don't need Mortuary or Radiology modules.
 */

const { pool } = require('../db');

class FeatureFlagService {
    
    // Default feature flags for new hospitals
    static DEFAULT_FLAGS = {
        // Core (always on)
        opd: true,
        ipd: true,
        billing: true,
        pharmacy: true,
        lab: true,
        
        // Optional Modules
        bloodBank: false,
        radiology: false,
        mortuary: false,
        dialysis: false,
        oncology: false,
        rehabilitation: false,
        
        // Premium AI Features
        aiClinicalCoPilot: true,
        aiBillingEngine: true,
        aiVoiceToAction: false,
        
        // Infrastructure
        labInstrumentIntegration: false,
        abdmIntegration: false,
        eRaktKoshIntegration: false,
        
        // Mobile Apps
        patientApp: true,
        staffApp: true,
        guardApp: false,
        doctorApp: true
    };

    /**
     * Get all feature flags for a hospital
     * @param {number} hospitalId - Hospital ID
     * @returns {Object} Feature flags
     */
    static async getFeatures(hospitalId) {
        try {
            const result = await pool.query(
                'SELECT features FROM hospitals WHERE id = $1',
                [hospitalId]
            );

            if (result.rows.length === 0) {
                return this.DEFAULT_FLAGS;
            }

            const storedFlags = result.rows[0].features || {};
            
            // Merge with defaults (new features get default value)
            return { ...this.DEFAULT_FLAGS, ...storedFlags };

        } catch (err) {
            console.error('[FeatureFlagService] Error getting features:', err);
            return this.DEFAULT_FLAGS;
        }
    }

    /**
     * Check if a specific feature is enabled
     * @param {number} hospitalId - Hospital ID
     * @param {string} featureName - Feature key
     * @returns {boolean} Is enabled
     */
    static async isEnabled(hospitalId, featureName) {
        const features = await this.getFeatures(hospitalId);
        return features[featureName] === true;
    }

    /**
     * Update feature flags for a hospital
     * @param {number} hospitalId - Hospital ID
     * @param {Object} updates - Features to update
     * @returns {Object} Updated features
     */
    static async updateFeatures(hospitalId, updates) {
        try {
            // Get current features
            const current = await this.getFeatures(hospitalId);
            
            // Merge updates
            const updated = { ...current, ...updates };

            // Update in database
            await pool.query(
                `UPDATE hospitals 
                 SET features = $1, updated_at = NOW() 
                 WHERE id = $2`,
                [JSON.stringify(updated), hospitalId]
            );

            // Log change
            await this.logFeatureChange(hospitalId, updates);

            return updated;

        } catch (err) {
            console.error('[FeatureFlagService] Error updating features:', err);
            throw err;
        }
    }

    /**
     * Enable a specific feature
     */
    static async enableFeature(hospitalId, featureName) {
        return this.updateFeatures(hospitalId, { [featureName]: true });
    }

    /**
     * Disable a specific feature
     */
    static async disableFeature(hospitalId, featureName) {
        return this.updateFeatures(hospitalId, { [featureName]: false });
    }

    /**
     * Get features for all hospitals (admin dashboard)
     */
    static async getAllHospitalFeatures() {
        try {
            const result = await pool.query(`
                SELECT h.id, h.name, h.code, h.features, h.subscription_tier,
                       (SELECT COUNT(*) FROM users WHERE hospital_id = h.id) as user_count,
                       (SELECT COUNT(*) FROM patients WHERE hospital_id = h.id) as patient_count
                FROM hospitals h
                ORDER BY h.id
            `);

            return result.rows.map(row => ({
                id: row.id,
                name: row.name,
                code: row.code,
                features: { ...this.DEFAULT_FLAGS, ...row.features },
                tier: row.subscription_tier || 'basic',
                usage: {
                    users: parseInt(row.user_count),
                    patients: parseInt(row.patient_count)
                }
            }));

        } catch (err) {
            console.error('[FeatureFlagService] Error getting all features:', err);
            return [];
        }
    }

    /**
     * Log feature changes for audit
     */
    static async logFeatureChange(hospitalId, changes) {
        try {
            await pool.query(`
                INSERT INTO audit_logs (action, entity_type, entity_id, changes, hospital_id, created_at)
                VALUES ('FEATURE_UPDATE', 'hospital', $1, $2, $1, NOW())
            `, [hospitalId, JSON.stringify(changes)]);
        } catch (err) {
            console.warn('[FeatureFlagService] Could not log feature change:', err.message);
        }
    }

    /**
     * Get available feature definitions (for admin UI)
     */
    static getFeatureDefinitions() {
        return [
            // Core
            { key: 'opd', name: 'Outpatient (OPD)', category: 'Core', locked: true },
            { key: 'ipd', name: 'Inpatient (IPD)', category: 'Core', locked: true },
            { key: 'billing', name: 'Billing & Finance', category: 'Core', locked: true },
            { key: 'pharmacy', name: 'Pharmacy', category: 'Core', locked: true },
            { key: 'lab', name: 'Laboratory', category: 'Core', locked: true },
            
            // Optional Modules
            { key: 'bloodBank', name: 'Blood Bank', category: 'Modules', locked: false },
            { key: 'radiology', name: 'Radiology', category: 'Modules', locked: false },
            { key: 'mortuary', name: 'Mortuary', category: 'Modules', locked: false },
            { key: 'dialysis', name: 'Dialysis', category: 'Modules', locked: false },
            { key: 'oncology', name: 'Oncology', category: 'Modules', locked: false },
            { key: 'rehabilitation', name: 'Rehabilitation', category: 'Modules', locked: false },
            
            // AI Features
            { key: 'aiClinicalCoPilot', name: 'AI Clinical Co-Pilot', category: 'AI', locked: false },
            { key: 'aiBillingEngine', name: 'AI Billing Engine', category: 'AI', locked: false },
            { key: 'aiVoiceToAction', name: 'Voice-to-Action', category: 'AI', locked: false },
            
            // Integrations
            { key: 'labInstrumentIntegration', name: 'Lab Instrument Integration', category: 'Integrations', locked: false },
            { key: 'abdmIntegration', name: 'ABDM Integration', category: 'Integrations', locked: false },
            { key: 'eRaktKoshIntegration', name: 'E-RaktKosh', category: 'Integrations', locked: false },
            
            // Mobile
            { key: 'patientApp', name: 'Patient App', category: 'Mobile', locked: false },
            { key: 'staffApp', name: 'Staff App', category: 'Mobile', locked: false },
            { key: 'guardApp', name: 'Guard App', category: 'Mobile', locked: false },
            { key: 'doctorApp', name: 'Doctor App', category: 'Mobile', locked: false }
        ];
    }

    /**
     * Apply subscription tier defaults
     * @param {number} hospitalId - Hospital ID
     * @param {string} tier - 'basic', 'professional', 'enterprise'
     */
    static async applyTierDefaults(hospitalId, tier) {
        const tierConfigs = {
            basic: {
                bloodBank: false,
                radiology: false,
                mortuary: false,
                aiClinicalCoPilot: false,
                aiBillingEngine: false,
                labInstrumentIntegration: false,
                abdmIntegration: false,
                guardApp: false
            },
            professional: {
                bloodBank: true,
                radiology: true,
                aiClinicalCoPilot: true,
                aiBillingEngine: true,
                labInstrumentIntegration: true,
                abdmIntegration: false,
                guardApp: false
            },
            enterprise: {
                bloodBank: true,
                radiology: true,
                mortuary: true,
                dialysis: true,
                oncology: true,
                aiClinicalCoPilot: true,
                aiBillingEngine: true,
                aiVoiceToAction: true,
                labInstrumentIntegration: true,
                abdmIntegration: true,
                eRaktKoshIntegration: true,
                guardApp: true
            }
        };

        const config = tierConfigs[tier] || tierConfigs.basic;
        
        await pool.query(
            'UPDATE hospitals SET subscription_tier = $1 WHERE id = $2',
            [tier, hospitalId]
        );
        
        return this.updateFeatures(hospitalId, config);
    }
}

module.exports = FeatureFlagService;
