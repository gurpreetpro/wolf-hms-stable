/**
 * Insurance Factory - WolfBridge
 * Dynamically loads and configures insurance adapters
 */

const LRUCache = require('lru-cache');
const TenantConfigService = require('./TenantConfigService');

// Adapter Imports
const NHCXAdapter = require('./adapters/NHCXAdapter');
const PMJAYAdapter = require('./adapters/PMJAYAdapter');
const GenericTPAAdapter = require('./adapters/GenericTPAAdapter');
const StarHealthAdapter = require('./adapters/StarHealthAdapter');
const MediAssistAdapter = require('./adapters/MediAssistAdapter');

// 1. Configure Cache (Max 100 items, 10 min TTL)
const adapterCache = new LRUCache({
    max: 100,
    ttl: 1000 * 60 * 10
});

class InsuranceFactory {

    /**
     * Get Configured Adapter Instance
     * @param {number} hospitalId 
     * @param {string} providerCode 
     */
    static async getProvider(hospitalId, providerCode) {
        if (!hospitalId || !providerCode) throw new Error('Missing Factory Params');

        const cacheKey = `adapter:${hospitalId}:${providerCode}`;
        
        // 1. Check Cache
        if (adapterCache.has(cacheKey)) {
            // console.log(`[Factory] Cache Hit: ${cacheKey}`);
            return adapterCache.get(cacheKey);
        }

        // 2. Fetch Credentials from Vault
        const config = await TenantConfigService.getProviderConfig(hospitalId, providerCode);
        
        if (!config) {
            throw new Error(`Insurance Provider ${providerCode} not configured for Hospital ${hospitalId}`);
        }

        // 3. Instantiate Adapter
        let adapter;
        switch(providerCode) {
            case 'HCX': 
                adapter = new NHCXAdapter(); 
                break;
            case 'PMJAY': 
                adapter = new PMJAYAdapter(); 
                break;
            case 'STAR': 
                adapter = new StarHealthAdapter(); 
                break;
            case 'MEDI_ASSIST': 
                adapter = new MediAssistAdapter(); 
                break;
            default: 
                adapter = new GenericTPAAdapter();
        }

        // 4. Initialize with Decrypted Credentials
        await adapter.initialize({
            participant_code: config.participantCode,
            api_key: config.clientSecret,
            signing_key: config.privateKey,
            tier_level: config.tierLevel, // e.g. GOLD, PLATINUM
            base_url: process.env[`${providerCode}_BASE_URL`] // Fallback to env for global URLs
        });

        // 5. Save to Cache
        adapterCache.set(cacheKey, adapter);
        // console.log(`[Factory] Cache Miss -> Initialized: ${cacheKey}`);

        return adapter;
    }
}

module.exports = InsuranceFactory;
