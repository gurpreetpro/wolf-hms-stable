/**
 * Tenant Config Service
 * Fetches and Decrypts Insurance Credentials from the Vault
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const CryptoUtils = require('../../utils/CryptoUtils');

class TenantConfigService {
    /**
     * Get Provider Config for a Hospital
     * @param {number} hospitalId 
     * @param {string} providerCode ('HCX', 'PMJAY', 'TPA')
     */
    static async getProviderConfig(hospitalId, providerCode) {
        if (!hospitalId || !providerCode) throw new Error('Invalid Hospital ID or Provider Code');

        // 1. Fetch from DB
        const config = await prisma.TenantIntegration.findUnique({
            where: {
                hospitalId_providerCode: {
                    hospitalId: parseInt(hospitalId),
                    providerCode: providerCode
                }
            }
        });

        if (!config) {
            console.warn(`[TenantConfig] No config found for Hosp: ${hospitalId}, Provider: ${providerCode}`);
            return null;
        }

        if (!config.isActive) {
            throw new Error(`Integration for ${providerCode} is inactive for this hospital.`);
        }

        // 2. Decrypt Secrets (Null-safe)
        let clientSecret = null;
        if (config.clientSecretData && config.clientSecretIv && config.clientSecretTag) {
            clientSecret = CryptoUtils.decrypt(
                config.clientSecretData, 
                config.clientSecretIv, 
                config.clientSecretTag
            );
        }

        let privateKey = null;
        if (config.privateKeyData && config.privateKeyIv && config.privateKeyTag) {
            privateKey = CryptoUtils.decrypt(
                config.privateKeyData, 
                config.privateKeyIv, 
                config.privateKeyTag
            );
        }

        // 3. Return Clean Config Object
        return {
            providerCode: config.providerCode,
            participantCode: config.hfrId || config.clientId, // HFR ID usually maps to participant code
            clientId: config.clientId,
            clientSecret: clientSecret, // PLAIN TEXT NOW
            privateKey: privateKey,     // PLAIN TEXT NOW
            tierLevel: config.tierLevel
        };
    }
}

module.exports = TenantConfigService;
