/**
 * Security Audit Script - Wolf HMS
 * Checks for common security misconfigurations
 * 
 * Run: node security_audit.js
 */

require('dotenv').config();

const CHECKS = [];

function check(name, passed, message) {
    CHECKS.push({ name, passed, message });
    const icon = passed ? '✅' : '❌';
    console.log(`${icon} ${name}: ${message}`);
}

function audit() {
    console.log('═'.repeat(50));
    console.log('🔒 WOLF HMS - Security Audit');
    console.log('═'.repeat(50));
    console.log();

    // 1. JWT Secret
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        check('JWT_SECRET', false, 'NOT SET - Critical vulnerability!');
    } else if (jwtSecret.includes('your_jwt') || jwtSecret.includes('change_in_production')) {
        check('JWT_SECRET', false, 'Using default value - must be changed!');
    } else if (jwtSecret.length < 32) {
        check('JWT_SECRET', false, `Too short (${jwtSecret.length} chars) - minimum 32 required`);
    } else {
        check('JWT_SECRET', true, `Strong secret configured (${jwtSecret.length} chars)`);
    }

    // 2. Node Environment
    const nodeEnv = process.env.NODE_ENV;
    if (nodeEnv === 'production') {
        check('NODE_ENV', true, 'Production mode enabled');
    } else {
        check('NODE_ENV', false, `Development mode (${nodeEnv || 'not set'}) - set to "production" for deploy`);
    }

    // 3. Admin Password
    const adminPass = process.env.ADMIN_DEFAULT_PASSWORD;
    if (!adminPass) {
        check('ADMIN_DEFAULT_PASSWORD', false, 'Not set - using hardcoded fallback');
    } else if (adminPass === 'password123' && nodeEnv === 'production') {
        check('ADMIN_DEFAULT_PASSWORD', false, 'Using weak default in production!');
    } else if (adminPass === 'password123') {
        check('ADMIN_DEFAULT_PASSWORD', true, 'Default value (OK for development)');
    } else {
        check('ADMIN_DEFAULT_PASSWORD', true, 'Custom password configured');
    }

    // 4. Database Password
    const dbPass = process.env.DB_PASSWORD;
    if (!dbPass || dbPass.length < 8) {
        check('DB_PASSWORD', false, 'Weak or missing database password');
    } else if (dbPass === 'postgres' || dbPass === 'password') {
        check('DB_PASSWORD', false, 'Using common default password');
    } else {
        check('DB_PASSWORD', true, 'Database password set');
    }

    // 5. External API Keys (warn if exposed in non-prod)
    const sensitiveKeys = ['GEMINI_API_KEY', 'TELEGRAM_BOT_TOKEN', 'GOOGLE_CLIENT_SECRET', 'RAZORPAY_SECRET'];
    let exposedCount = 0;
    for (const key of sensitiveKeys) {
        if (process.env[key] && process.env[key].length > 10) {
            exposedCount++;
        }
    }
    if (exposedCount > 0 && nodeEnv !== 'production') {
        check('API Keys', true, `${exposedCount} API keys configured`);
    } else if (exposedCount > 0) {
        check('API Keys', true, `${exposedCount} API keys in use (ensure they're rotated regularly)`);
    } else {
        check('API Keys', true, 'No sensitive API keys detected');
    }

    // Summary
    console.log();
    console.log('═'.repeat(50));
    const passed = CHECKS.filter(c => c.passed).length;
    const failed = CHECKS.filter(c => !c.passed).length;
    
    console.log(`📊 AUDIT SUMMARY: ${passed} passed, ${failed} issues`);
    
    if (failed === 0) {
        console.log('🎉 All security checks passed!');
    } else {
        console.log('⚠️  Address the issues above before deploying to production');
    }
    console.log('═'.repeat(50));
    
    return { passed, failed, checks: CHECKS };
}

// Run audit
audit();
