/**
 * i18n Service
 * Multi-language support
 * Phase 6: Advanced Features (Gold Standard HMS)
 */

const pool = require('../config/db');

// Cache translations
const translationCache = new Map();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes

/**
 * Get translations for a locale
 */
const getTranslations = async (locale = 'en', hospitalId = null) => {
    const cacheKey = `${locale}:${hospitalId || 'global'}`;
    
    // Check cache
    if (translationCache.has(cacheKey)) {
        const cached = translationCache.get(cacheKey);
        if (Date.now() - cached.timestamp < CACHE_TTL) {
            return cached.data;
        }
    }

    try {
        // Get global + hospital-specific translations
        const result = await pool.query(`
            SELECT key, value FROM translations
            WHERE locale = $1 AND (hospital_id IS NULL OR hospital_id = $2)
            ORDER BY hospital_id NULLS FIRST
        `, [locale, hospitalId]);

        // Build lookup object (hospital overrides global)
        const translations = {};
        result.rows.forEach(row => {
            translations[row.key] = row.value;
        });

        translationCache.set(cacheKey, { data: translations, timestamp: Date.now() });
        return translations;
    } catch (error) {
        console.error('[i18n] Error fetching translations:', error.message);
        return {};
    }
};

/**
 * Translate a key
 */
const translate = async (key, locale = 'en', hospitalId = null, params = {}) => {
    const translations = await getTranslations(locale, hospitalId);
    let value = translations[key] || key;
    
    // Replace parameters {name} -> value
    Object.entries(params).forEach(([k, v]) => {
        value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), v);
    });
    
    return value;
};

/**
 * Add or update a translation
 */
const setTranslation = async (locale, key, value, hospitalId = null, context = null) => {
    try {
        await pool.query(`
            INSERT INTO translations (locale, key, value, hospital_id, context)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (locale, key, hospital_id) DO UPDATE SET value = $3
        `, [locale, key, value, hospitalId, context]);

        // Clear cache
        translationCache.clear();
        return true;
    } catch (error) {
        console.error('[i18n] Error setting translation:', error.message);
        return false;
    }
};

/**
 * Get supported locales
 */
const getSupportedLocales = async () => {
    try {
        const result = await pool.query('SELECT DISTINCT locale FROM translations ORDER BY locale');
        return result.rows.map(r => r.locale);
    } catch (error) {
        return ['en'];
    }
};

/**
 * Clear translation cache
 */
const clearCache = () => {
    translationCache.clear();
};

module.exports = {
    getTranslations,
    translate,
    setTranslation,
    getSupportedLocales,
    clearCache
};
