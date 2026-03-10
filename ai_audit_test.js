require('dotenv').config({ path: './server/.env' });
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Mock Services
const SmartInventory = require('./server/services/SmartInventory');
const aiBillingEngine = require('./server/services/aiBillingEngine');
const ClinicalCoPilot = require('./server/services/ClinicalCoPilot');

console.log('🤖 Starting AI System Audit Simulation...');

async function testKeyLeakage() {
    console.log('\n🔐 Test 1: Checking for Hardcoded Keys...');
    
    // We can't easily inspect the 'genAI' private instance var, but we saw it in code.
    // instead, let's just check the file content programmatically to be sure.
    const fs = require('fs');
    const files = [
        './server/services/SmartInventory.js',
        './server/services/aiBillingEngine.js',
        './server/services/ClinicalCoPilot.js'
    ];

    let leaked = false;
    files.forEach(file => {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes('AIzaSy')) {
            console.log(`❌ CRITICAL: Hardcoded API Key detected in ${file}`);
            leaked = true;
        } else {
            console.log(`✅ ${file} is clean of hardcoded 'AIzaSy' keys.`);
        }
    });

    return leaked;
}

async function testClinicalPII() {
    console.log('\n🕵️ Test 2: Checking Clinical CoPilot PII Handling...');
    
    // We want to see if we can intercept what it sends.
    // For this test, we just check if it fails gracefully without a key.
    
    try {
        const result = await ClinicalCoPilot.generatePatientSummary('test-id', 1);
        if (result.error) {
            console.log('✅ ClinicalCoPilot handled missing key/data gracefully:', result.error);
        } else {
            console.log('⚠️ ClinicalCoPilot attempted generation (Check if PII was redacted).');
        }
    } catch (e) {
        console.log('❌ ClinicalCoPilot crashed:', e.message);
    }
}

async function run() {
    await testKeyLeakage();
    await testClinicalPII();
    console.log('\nAudit Simulation Complete.');
}

run();
