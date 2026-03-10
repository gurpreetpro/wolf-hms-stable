const dotenv = require('dotenv');
const path = require('path');
const fs = require('fs');

// Load environment variables
const envPath = path.join(__dirname, 'server', '.env');
if (!fs.existsSync(envPath)) {
    console.error('❌ CRITICAL: server/.env file missing!');
    process.exit(1);
}
dotenv.config({ path: envPath });

const requiredVars = [
    'NODE_ENV',
    'PORT',
    'DATABASE_URL',
    'JWT_SECRET',
    'RAZORPAY_KEY_ID',
    'RAZORPAY_KEY_SECRET',
    'RAZORPAY_WEBHOOK_SECRET',
    'GEMINI_API_KEY'
];

let hasErrors = false;

console.log('🔍 Starting Environment Audit...');
console.log('--------------------------------');

requiredVars.forEach(key => {
    if (!process.env[key]) {
        console.error(`❌ MISSING: ${key}`);
        hasErrors = true;
    } else {
        const val = process.env[key];
        let status = '✅ OK';
        if (key === 'NODE_ENV' && val !== 'production') {
            status = `⚠️  WARNING (Current: ${val})`;
        }
        if (val.length < 10 && (key.includes('SECRET') || key.includes('KEY'))) {
            status = '⚠️  WARNING (Too short)';
        }
        console.log(`${key.padEnd(25)}: ${status}`);
    }
});

console.log('--------------------------------');
if (hasErrors) {
    console.error('🚨 AUDIT FAILED: Missing critical environment variables.');
    process.exit(1);
} else {
    console.log('✅ AUDIT PASSED: All required variables present.');
}
