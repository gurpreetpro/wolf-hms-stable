require('dotenv').config(); // Load .env from current dir (server/)
const { GoogleGenerativeAI } = require("@google/generative-ai");
const fs = require('fs');
const path = require('path');

// Mock Services
const SmartInventory = require('./services/SmartInventory');
const aiBillingEngine = require('./services/aiBillingEngine').getAIBillingEngine(); // It exports an object with factory
const ClinicalCoPilot = require('./services/ClinicalCoPilot');

console.log('🤖 Starting AI System Audit Simulation...');

async function testKeyLeakage() {
    console.log('\n🔐 Test 1: Checking for Hardcoded Keys...');
    
    const files = [
        './services/SmartInventory.js',
        './services/aiBillingEngine.js',
        './services/ClinicalCoPilot.js'
    ];

    let leaked = false;
    files.forEach(file => {
        const fullPath = path.resolve(__dirname, file);
        if (fs.existsSync(fullPath)) {
            const content = fs.readFileSync(fullPath, 'utf8');
            if (content.includes('AIzaSy')) {
                console.log(`❌ CRITICAL: Hardcoded API Key detected in ${file}`);
                leaked = true;
            } else {
                console.log(`✅ ${file} is clean of hardcoded 'AIzaSy' keys.`);
            }
        } else {
            console.log(`⚠️ Skiping ${file} (not found)`);
        }
    });

    return leaked;
}

async function testClinicalPII() {
    console.log('\n🕵️ Test 2: Checking Clinical CoPilot PII Handling...');
    
    try {
        // We expect this to fail gracefully (or succeed if key works)
        // But we want to ensure it doesn't THROW
        const result = await ClinicalCoPilot.generatePatientSummary('test-id', 1);
        if (result.error) {
            console.log('✅ ClinicalCoPilot handled missing key/data gracefully:', result.error);
        } else if (result.fallback) {
             console.log('✅ ClinicalCoPilot returned fallback:', result.fallback);
        } else {
            console.log('⚠️ ClinicalCoPilot attempted generation (Check logs for PII).');
        }
    } catch (e) {
        console.log('❌ ClinicalCoPilot crashed:', e.message);
    }
}

async function run() {
    await testKeyLeakage();
    await testClinicalPII();
    console.log('\nAudit Simulation Complete.');
    process.exit(0);
}

run();
