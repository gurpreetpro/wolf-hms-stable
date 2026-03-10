/**
 * Platform Owner Configuration
 * 
 * CRITICAL: This file contains the hardcoded list of Platform Administrators
 * who can access the Master Command Centre. These users bypass normal
 * role checks and have "God Mode" access.
 * 
 * SECURITY: This file should be treated as sensitive. In production,
 * consider moving to environment variables or a secure vault.
 */

const PLATFORM_CONFIG = {
    // Platform Owners - These emails have unrestricted access
    ADMIN_EMAILS: [
        'gurpreetpro@gmail.com',  // Primary Platform Owner
        'gurpreetpc@gmail.com',    // Backup Platform Owner
        'developer@wolfhms.com',   // Developer Account
        'admin@admin.com',         // Legacy
        'admin@wolfhms.com'        // Default Super Admin (Seeded)
    ],

    // Recovery Contact (for emergency lockout recovery)
    RECOVERY_PHONE: '+91-7009688863',

    // MFA Settings
    MFA: {
        REQUIRED: false,                   // Disabled for initial setup
        ISSUER: 'WolfHMS Platform',        // Shows in Google Authenticator
        ALGORITHM: 'sha1',                 // Standard for Google Authenticator
        DIGITS: 6,                         // 6-digit codes
        STEP: 30,                          // 30-second validity window
        WINDOW: 1                          // Allow 1 step drift (±30 seconds)
    },

    // Session Security
    SESSION: {
        PLATFORM_TOKEN_EXPIRY: '15m',      // Short-lived tokens for platform
        REGULAR_TOKEN_EXPIRY: '24h',       // Regular user tokens
        REQUIRE_IP_BINDING: false          // Set true for IP-locked sessions
    },

    // Rate Limiting for Platform Endpoints
    RATE_LIMITS: {
        PLATFORM_REQUESTS_PER_MINUTE: 30,
        MFA_ATTEMPTS_BEFORE_LOCKOUT: 5,
        LOCKOUT_DURATION_MINUTES: 15
    },

    // IP Whitelist (optional - empty = allow all)
    // Add your office/home IPs here for production
    IP_WHITELIST: [
        // '1.2.3.4',  // Office IP
        // '5.6.7.8'   // Home IP
    ],

    // Bypass Codes (Emergency access if TOTP device is lost)
    // These are ONE-TIME USE codes. After use, they should be invalidated.
    // Generate new ones if needed: crypto.randomBytes(4).toString('hex')
    BYPASS_CODES: [
        'WOLF-A7B3-X9K2',
        'WOLF-M4P8-J6L1',
        'WOLF-C2D5-N8Q4',
        'WOLF-E9F1-R3T7',
        'WOLF-G6H0-S5V2'
    ]
};

// Validate configuration
const validateConfig = () => {
    if (!PLATFORM_CONFIG.ADMIN_EMAILS.length) {
        console.error('[SECURITY] CRITICAL: No platform admin emails configured!');
        return false;
    }
    console.log(`[Security] Platform configured with ${PLATFORM_CONFIG.ADMIN_EMAILS.length} admin(s)`);
    return true;
};

// Check if email is a platform admin
const isPlatformAdmin = (email) => {
    if (!email) return false;
    return PLATFORM_CONFIG.ADMIN_EMAILS.includes(email.toLowerCase());
};

// Check if email is in allowed list for platform access
const isEmailWhitelisted = (email) => {
    return isPlatformAdmin(email);
};

module.exports = {
    PLATFORM_CONFIG,
    validateConfig,
    isPlatformAdmin,
    isEmailWhitelisted
};
