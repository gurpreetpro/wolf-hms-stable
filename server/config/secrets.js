/**
 * secrets.js — Centralized Secrets and Environment Configuration Vault
 * 
 * Part of Wolf HMS Phase 2 Hardening.
 * Eliminates scattered process.env fallbacks and enforces fail-fast validation.
 */

const logger = require('../utils/logger');

const parseAllowedOrigins = (originsStr) => {
    if (!originsStr) {
        return [
            'http://185.213.27.158',
            'http://localhost:5173',
            'http://localhost:3000'
        ];
    }
    return originsStr
        .split(',')
        .map(s => s.trim().replace(/\/$/, ''))
        .filter(Boolean);
};

const REQUIRED_KEYS = [
    'JWT_SECRET',
    'DB_PASSWORD',
    'SETUP_KEY',
    'MIGRATION_CLI_TOKEN'
];

const getSecrets = () => {
    const allowedOrigins = parseAllowedOrigins(process.env.ALLOWED_ORIGINS);

    return {
        // Core Secrets
        JWT_SECRET: process.env.JWT_SECRET || null,
        DB_PASSWORD: process.env.DB_PASSWORD || null,
        SETUP_KEY: process.env.SETUP_KEY || null,
        MIGRATION_CLI_TOKEN: process.env.MIGRATION_CLI_TOKEN || null,
        ADMIN_MIGRATE_SECRET: process.env.ADMIN_MIGRATE_SECRET || null,

        // JWT Configuration
        JWT_EXPIRES: process.env.JWT_EXPIRES || '8h',
        JWT_ISSUER: process.env.JWT_ISSUER || 'wolf-hms',
        JWT_AUDIENCE: process.env.JWT_AUDIENCE || 'wolf-hms-api',

        // Networking & CORS
        ALLOWED_ORIGINS: allowedOrigins,
        PORT: parseInt(process.env.PORT, 10) || 8080,
        NODE_ENV: process.env.NODE_ENV || 'development'
    };
};

/**
 * Validates existence of required keys in process.env.
 * @param {Object} options
 * @param {boolean} options.failFast - If true, throws Error when required keys are missing.
 * @returns {{ valid: boolean, missingKeys: string[] }}
 */
const validateSecrets = (options = { failFast: false }) => {
    const secrets = getSecrets();
    const missingKeys = REQUIRED_KEYS.filter(key => !secrets[key]);

    if (missingKeys.length > 0) {
        const msg = `[Secrets Vault] Missing required environment secrets: ${missingKeys.join(', ')}`;
        if (options.failFast) {
            throw new Error(msg);
        } else {
            logger.warn(`⚠️  ${msg}`);
        }
        return { valid: false, missingKeys };
    }

    return { valid: true, missingKeys: [] };
};

/**
 * Checks whether an incoming origin is permitted by the CORS allowlist.
 * @param {string|undefined} origin 
 * @returns {boolean}
 */
const isOriginAllowed = (origin) => {
    if (!origin) return true; // Same-origin or server-to-server requests without Origin header
    const normalized = origin.trim().replace(/\/$/, '');
    const secrets = getSecrets();
    return secrets.ALLOWED_ORIGINS.includes(normalized);
};

module.exports = {
    getSecrets,
    validateSecrets,
    isOriginAllowed,
    parseAllowedOrigins,
    REQUIRED_KEYS
};
