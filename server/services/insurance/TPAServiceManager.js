/**
 * TPA Service Manager
 * Unified interface for all TPA/Insurance providers
 * Supports dynamic onboarding of new TPAs from dashboard
 * WOLF HMS
 */

const { pool } = require('../../db');

// Import adapters
const NHCXAdapter = require('./adapters/NHCXAdapter');
const StarHealthAdapter = require('./adapters/StarHealthAdapter');
const MediAssistAdapter = require('./adapters/MediAssistAdapter');
const GenericTPAAdapter = require('./adapters/GenericTPAAdapter');
const PMJAYAdapter = require('./adapters/PMJAYAdapter');
const CGHSAdapter = require('./adapters/CGHSAdapter');
const ECHSAdapter = require('./adapters/ECHSAdapter');
const CAPFAdapter = require('./adapters/CAPFAdapter');

class TPAServiceManager {
    constructor() {
        this.adapters = new Map();
        this.initialized = false;
        this.adapterClasses = {
            'nhcx': NHCXAdapter,
            'star_health': StarHealthAdapter,
            'medi_assist': MediAssistAdapter,
            'pmjay': PMJAYAdapter,
            'cghs': CGHSAdapter,
            'echs': ECHSAdapter,
            'capf': CAPFAdapter,
            // Others use generic adapter with configuration
        };
    }

    /**
     * Initialize all active TPA adapters
     */
    async initialize() {
        if (this.initialized) return;

        try {
            // Load all active providers from database
            const providers = await this.getActiveProviders();

            for (const provider of providers) {
                try {
                    await this.initializeProvider(provider);
                } catch (error) {
                    console.warn(`[TPAServiceManager] Failed to initialize ${provider.code}:`, error.message);
                }
            }

            this.initialized = true;
            console.log(`[TPAServiceManager] Initialized with ${this.adapters.size} adapters`);
        } catch (error) {
            console.error('[TPAServiceManager] Initialization error:', error.message);
        }
    }

    /**
     * Initialize a single provider
     */
    async initializeProvider(provider) {
        const credentials = await this.getCredentials(provider.id);

        // Get appropriate adapter class
        let AdapterClass = this.adapterClasses[provider.code];

        if (!AdapterClass) {
            // Use generic adapter for dynamically added TPAs
            AdapterClass = GenericTPAAdapter;
        }

        const adapter = new AdapterClass(provider.code, provider.name);

        if (credentials && Object.keys(credentials).length > 0) {
            await adapter.initialize(credentials, provider.api_config || {});
        }

        this.adapters.set(provider.code, adapter);
        return adapter;
    }

    /**
     * Get adapter for a provider
     */
    getAdapter(providerCode) {
        const adapter = this.adapters.get(providerCode);
        if (!adapter) {
            throw new Error(`TPA adapter not found: ${providerCode}`);
        }
        return adapter;
    }

    /**
     * Refresh adapter (after credential update)
     */
    async refreshAdapter(providerCode) {
        const provider = await this.getProvider(providerCode);
        if (provider) {
            return await this.initializeProvider(provider);
        }
        throw new Error(`Provider not found: ${providerCode}`);
    }

    // ============================================
    // Provider Management (for Dashboard)
    // ============================================

    /**
     * Get all TPA providers
     */
    async getProviders(includeInactive = false) {
        const query = `
            SELECT * FROM tpa_providers
            ${includeInactive ? '' : 'WHERE is_active = true'}
            ORDER BY name
        `;
        const result = await pool.query(query);
        return result.rows;
    }

    /**
     * Get active providers
     */
    async getActiveProviders() {
        return await this.getProviders(false);
    }

    /**
     * Get provider by code
     */
    async getProvider(code) {
        const result = await pool.query(
            'SELECT * FROM tpa_providers WHERE code = $1',
            [code]
        );
        return result.rows[0];
    }

    /**
     * Add new TPA provider (dynamic onboarding)
     */
    async addProvider(providerData, createdBy = null) {
        const {
            code, name, shortName, integrationType = 'api',
            apiBaseUrl, sandboxUrl, apiConfig = {},
            supportsEligibility = true, supportsPreauth = true,
            supportsEclaim = true, supportsCashless = true,
            supportEmail, supportPhone, website
        } = providerData;

        const result = await pool.query(`
            INSERT INTO tpa_providers (
                code, name, short_name, integration_type,
                api_base_url, sandbox_url, api_config,
                supports_eligibility, supports_preauth, supports_eclaim, supports_cashless,
                support_email, support_phone, website, created_by
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *
        `, [
            code.toLowerCase().replace(/\s+/g, '_'),
            name, shortName, integrationType,
            apiBaseUrl, sandboxUrl, JSON.stringify(apiConfig),
            supportsEligibility, supportsPreauth, supportsEclaim, supportsCashless,
            supportEmail, supportPhone, website, createdBy
        ]);

        // Initialize the new adapter
        await this.initializeProvider(result.rows[0]);

        return result.rows[0];
    }

    /**
     * Update TPA provider
     */
    async updateProvider(code, updateData) {
        const fields = [];
        const values = [];
        let paramCount = 0;

        const allowedFields = [
            'name', 'short_name', 'api_base_url', 'sandbox_url',
            'api_config', 'supports_eligibility', 'supports_preauth',
            'supports_eclaim', 'supports_cashless', 'is_active',
            'support_email', 'support_phone', 'website'
        ];

        for (const [key, value] of Object.entries(updateData)) {
            const snakeKey = key.replace(/[A-Z]/g, m => '_' + m.toLowerCase());
            if (allowedFields.includes(snakeKey)) {
                paramCount++;
                fields.push(`${snakeKey} = $${paramCount}`);
                values.push(key === 'apiConfig' ? JSON.stringify(value) : value);
            }
        }

        if (fields.length === 0) {
            throw new Error('No valid fields to update');
        }

        paramCount++;
        values.push(code);

        const result = await pool.query(`
            UPDATE tpa_providers SET ${fields.join(', ')}, updated_at = NOW()
            WHERE code = $${paramCount}
            RETURNING *
        `, values);

        // Refresh adapter
        if (result.rows[0]) {
            await this.refreshAdapter(code);
        }

        return result.rows[0];
    }

    /**
     * Delete/deactivate TPA provider
     */
    async deactivateProvider(code) {
        await pool.query(
            'UPDATE tpa_providers SET is_active = false WHERE code = $1',
            [code]
        );
        this.adapters.delete(code);
    }

    // ============================================
    // Credential Management
    // ============================================

    /**
     * Get credentials for a provider
     */
    async getCredentials(providerId) {
        const result = await pool.query(`
            SELECT credential_key, credential_value_encrypted, is_production
            FROM tpa_credentials
            WHERE provider_id = $1
        `, [providerId]);

        const credentials = {};
        result.rows.forEach(row => {
            // In production, this should decrypt the value
            credentials[row.credential_key] = row.credential_value_encrypted;
            credentials.isProduction = row.is_production;
        });
        return credentials;
    }

    /**
     * Set credential for a provider
     */
    async setCredential(providerCode, credentialKey, credentialValue, isProduction = false, createdBy = null) {
        const provider = await this.getProvider(providerCode);
        if (!provider) {
            throw new Error(`Provider not found: ${providerCode}`);
        }

        // In production, encrypt the value before storing
        const encryptedValue = credentialValue; // TODO: Add encryption

        await pool.query(`
            INSERT INTO tpa_credentials (provider_id, credential_key, credential_value_encrypted, is_production, created_by)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (provider_id, credential_key, is_production) DO UPDATE SET
                credential_value_encrypted = $3,
                updated_at = NOW(),
                updated_by = $5
        `, [provider.id, credentialKey, encryptedValue, isProduction, createdBy]);

        // Refresh adapter with new credentials
        await this.refreshAdapter(providerCode);
    }

    /**
     * Delete credential
     */
    async deleteCredential(providerCode, credentialKey) {
        const provider = await this.getProvider(providerCode);
        if (!provider) throw new Error(`Provider not found: ${providerCode}`);

        await pool.query(
            'DELETE FROM tpa_credentials WHERE provider_id = $1 AND credential_key = $2',
            [provider.id, credentialKey]
        );
    }

    // ============================================
    // Core Insurance Operations
    // ============================================

    /**
     * Check patient eligibility
     */
    async checkEligibility(providerCode, patientData, policyNumber) {
        const adapter = this.getAdapter(providerCode);

        const startTime = Date.now();
        const result = await adapter.checkEligibility(patientData, policyNumber);

        // Log activity
        await this.logActivity(providerCode, 'eligibility_check', 'patient', patientData.id, {
            policyNumber,
            result
        });

        return result;
    }

    /**
     * Submit pre-authorization
     */
    async submitPreAuth(providerCode, preauthData) {
        const adapter = this.getAdapter(providerCode);
        const result = await adapter.submitPreAuth(preauthData);

        // Store in database
        await pool.query(`
            INSERT INTO insurance_preauth (
                preauth_number, patient_id, provider_id,
                treatment_type, estimated_cost, requested_amount,
                tpa_reference_id, status, request_payload, created_by
            ) VALUES ($1, $2, (SELECT id FROM tpa_providers WHERE code = $3),
                $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `, [
            result.preauthNumber || this.generatePreauthNumber(),
            preauthData.patientId,
            providerCode,
            preauthData.treatmentType,
            preauthData.estimatedCost,
            preauthData.requestedAmount,
            result.referenceId,
            result.status || 'pending',
            JSON.stringify(preauthData),
            preauthData.createdBy
        ]);

        await this.logActivity(providerCode, 'preauth_submit', 'preauth', result.referenceId, result);

        return result;
    }

    /**
     * Get pre-auth status
     */
    async getPreAuthStatus(providerCode, preauthId) {
        const adapter = this.getAdapter(providerCode);
        const result = await adapter.getPreAuthStatus(preauthId);

        // Update local record
        await pool.query(`
            UPDATE insurance_preauth SET
                status = $1,
                approved_amount = $2,
                response_at = NOW(),
                response_payload = $3
            WHERE tpa_reference_id = $4
        `, [result.status, result.approvedAmount, JSON.stringify(result), preauthId]);

        return result;
    }

    /**
     * Submit claim
     */
    async submitClaim(providerCode, claimData) {
        const adapter = this.getAdapter(providerCode);
        const result = await adapter.submitClaim(claimData);

        await pool.query(`
            INSERT INTO insurance_claims (
                claim_number, patient_id, provider_id,
                claim_type, billed_amount, claimed_amount,
                tpa_claim_id, status, request_payload, created_by
            ) VALUES ($1, $2, (SELECT id FROM tpa_providers WHERE code = $3),
                $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `, [
            result.claimNumber || this.generateClaimNumber(),
            claimData.patientId,
            providerCode,
            claimData.claimType || 'cashless',
            claimData.billedAmount,
            claimData.claimedAmount,
            result.referenceId,
            result.status || 'submitted',
            JSON.stringify(claimData),
            claimData.createdBy
        ]);

        await this.logActivity(providerCode, 'claim_submit', 'claim', result.referenceId, result);

        return result;
    }

    /**
     * Get claim status
     */
    async getClaimStatus(providerCode, claimId) {
        const adapter = this.getAdapter(providerCode);
        const result = await adapter.getClaimStatus(claimId);

        await pool.query(`
            UPDATE insurance_claims SET
                status = $1,
                approved_amount = $2,
                response_at = NOW(),
                response_payload = $3
            WHERE tpa_claim_id = $4
        `, [result.status, result.approvedAmount, JSON.stringify(result), claimId]);

        return result;
    }

    /**
     * Test TPA connection
     */
    async testConnection(providerCode) {
        const adapter = this.getAdapter(providerCode);
        return await adapter.testConnection();
    }

    // ============================================
    // Helper Methods
    // ============================================

    generatePreauthNumber() {
        return `PA${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    }

    generateClaimNumber() {
        return `CLM${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    }

    async logActivity(providerCode, activityType, refType, refId, payload) {
        try {
            const provider = await this.getProvider(providerCode);
            await pool.query(`
                INSERT INTO tpa_activity_log (provider_id, activity_type, reference_type, reference_id, response_payload)
                VALUES ($1, $2, $3, $4, $5)
            `, [provider?.id, activityType, refType, refId, JSON.stringify(payload)]);
        } catch (error) {
            console.warn('[TPAServiceManager] Failed to log activity:', error.message);
        }
    }
}

// Singleton
let tpaServiceInstance = null;

async function getTPAService() {
    if (!tpaServiceInstance) {
        tpaServiceInstance = new TPAServiceManager();
        await tpaServiceInstance.initialize();
    }
    return tpaServiceInstance;
}

module.exports = { TPAServiceManager, getTPAService };
