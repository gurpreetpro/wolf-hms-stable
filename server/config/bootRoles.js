/**
 * bootRoles.js — Database Role Management & Boot DDL Gating
 * 
 * Part of Wolf HMS Phase 7 Hardening (W1).
 * Manages the transition from superuser 'wolf' to non-superuser 'wolf_app'
 * for runtime application pools while preserving local development defaults.
 */

const dotenv = require('dotenv');
dotenv.config();

/**
 * Resolves the effective database role and credentials for the application pool.
 * 
 * Rules:
 * - If APP_DB_ROLE === 'wolf_app' and WOLF_APP_DB_PASSWORD is provided:
 *     Connects as 'wolf_app' with WOLF_APP_DB_PASSWORD.
 * - Otherwise:
 *     Falls back to DB_USER (default 'postgres') and DB_PASSWORD (default 'password').
 * 
 * @param {Object} envOverride - Optional environment object for testing
 * @returns {{ role: string, user: string, password: string, isAppRole: boolean }}
 */
function getAppDbCredentials(envOverride = process.env) {
    const appDbRole = envOverride.APP_DB_ROLE;
    const wolfAppPass = envOverride.WOLF_APP_DB_PASSWORD;

    if (appDbRole === 'wolf_app' && wolfAppPass) {
        return {
            role: 'wolf_app',
            user: 'wolf_app',
            password: wolfAppPass,
            isAppRole: true
        };
    }

    const defaultUser = envOverride.DB_USER || 'postgres';
    const defaultPassword = envOverride.DB_PASSWORD || 'password';

    return {
        role: defaultUser,
        user: defaultUser,
        password: defaultPassword,
        isAppRole: false
    };
}

/**
 * Checks whether boot-time schema DDL / auto-migrations are permitted.
 * 
 * In production under a non-superuser role (wolf_app), auto-DDL on startup
 * will fail or violate principle of least privilege.
 * Gated strictly behind BOOT_DDL === 'true' (default: false).
 * 
 * @param {Object} envOverride - Optional environment object for testing
 * @returns {boolean}
 */
function isBootDdlEnabled(envOverride = process.env) {
    return envOverride.BOOT_DDL === 'true';
}

/**
 * Gets role summary information for telemetry and logging.
 * 
 * @param {Object} envOverride - Optional environment object for testing
 * @returns {{ effectiveRole: string, isAppRole: boolean, bootDdlEnabled: boolean }}
 */
function getBootRoleSummary(envOverride = process.env) {
    const creds = getAppDbCredentials(envOverride);
    const bootDdl = isBootDdlEnabled(envOverride);
    return {
        effectiveRole: creds.role,
        isAppRole: creds.isAppRole,
        bootDdlEnabled: bootDdl
    };
}

module.exports = {
    getAppDbCredentials,
    isBootDdlEnabled,
    getBootRoleSummary
};
