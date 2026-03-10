/**
 * Wolf Vault - Integration Test Script
 * Tests the complete flow of the Beyond Gold architecture
 * 
 * Run with: node scripts/test-wolf-vault.js
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const CryptoUtils = require('../utils/CryptoUtils');
const TenantConfigService = require('../services/insurance/TenantConfigService');
const InsuranceFactory = require('../services/insurance/InsuranceFactory');
const { ClaimsAuditor, scrubPII } = require('../services/ai/ClaimsAuditor');

const prisma = new PrismaClient();

async function runTests() {
    console.log('\n========================================');
    console.log('🐺 WOLF VAULT - INTEGRATION TEST SUITE');
    console.log('========================================\n');

    let testsPassed = 0;
    let testsFailed = 0;

    try {
        // ==========================================
        // TEST 1: CryptoUtils Encryption/Decryption
        // ==========================================
        console.log('TEST 1: CryptoUtils AES-256-GCM');
        const secret = 'my-super-secret-api-key-12345';
        const encrypted = CryptoUtils.encrypt(secret);
        console.log('  - Encrypted data length:', encrypted.data?.length);
        console.log('  - IV length:', encrypted.iv?.length);
        console.log('  - AuthTag length:', encrypted.tag?.length);
        
        const decrypted = CryptoUtils.decrypt(encrypted.data, encrypted.iv, encrypted.tag);
        if (decrypted === secret) {
            console.log('  ✅ PASS: Encryption/Decryption round-trip successful');
            testsPassed++;
        } else {
            console.log('  ❌ FAIL: Decrypted value does not match original');
            testsFailed++;
        }

        // Test hash for logging
        const hash = CryptoUtils.hashForLog(secret);
        console.log('  - Safe hash for logging:', hash);

        // ==========================================
        // TEST 2: Database Connection & Tables
        // ==========================================
        console.log('\nTEST 2: Database Tables Exist');
        
        const tables = await prisma.$queryRaw`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name IN ('tenant_integrations', 'invoice_split_ledger', 'tenant_package_rates')
        `;
        
        if (tables.length === 3) {
            console.log('  ✅ PASS: All 3 Wolf Vault tables exist');
            testsPassed++;
        } else {
            console.log(`  ❌ FAIL: Expected 3 tables, found ${tables.length}`);
            console.log('    Found:', tables.map(t => t.table_name).join(', '));
            testsFailed++;
        }

        // ==========================================
        // TEST 3: TenantConfigService - Save & Retrieve
        // ==========================================
        console.log('\nTEST 3: TenantConfigService Save & Retrieve');
        
        // Save a test integration
        const testConfig = {
            hospitalId: 1,
            providerCode: 'TEST_PROVIDER',
            clientId: 'test-client-id',
            clientSecret: 'test-client-secret-xyz',
            privateKey: 'test-private-key-pem-content',
            hfrId: 'TEST-HFR-001',
            tierLevel: 'NABH'
        };

        const saved = await TenantConfigService.saveConfig(testConfig);
        console.log('  - Saved integration:', saved.id ? 'OK' : 'FAILED');

        // Retrieve and verify decryption
        const retrieved = await TenantConfigService.getConfig(1, 'TEST_PROVIDER');
        
        if (retrieved && retrieved.clientSecret === testConfig.clientSecret) {
            console.log('  ✅ PASS: Credentials encrypted in DB and decrypted correctly');
            testsPassed++;
        } else {
            console.log('  ❌ FAIL: Credential retrieval/decryption failed');
            testsFailed++;
        }

        // Verify secret is NOT stored in plain text
        const rawRecord = await prisma.tenant_integrations.findFirst({
            where: { provider_code: 'TEST_PROVIDER' }
        });
        
        if (rawRecord.client_secret_data !== testConfig.clientSecret) {
            console.log('  ✅ PASS: Secret is encrypted in database (not plaintext)');
            testsPassed++;
        } else {
            console.log('  ❌ FAIL: Secret stored in plaintext!');
            testsFailed++;
        }

        // ==========================================
        // TEST 4: PII Scrubbing
        // ==========================================
        console.log('\nTEST 4: PII Scrubbing (DPDP Act Compliance)');
        
        const patientData = {
            patientName: 'Rahul Sharma',
            mobile: '9876543210',
            aadhaarNumber: '1234-5678-9012',
            abhaId: '12-3456-7890-1234',
            email: 'rahul@example.com',
            address: '123 Main Street, Mumbai',
            procedureCode: 'SG1001',
            amount: 50000
        };

        const scrubbedData = scrubPII(patientData);
        
        const piiRemoved = 
            scrubbedData.patientName === '[REDACTED-PATIENT]' &&
            scrubbedData.mobile === 'XX-XXXX-XXXX' &&
            scrubbedData.aadhaarNumber === 'XXXX-XXXX-XXXX' &&
            scrubbedData.procedureCode === 'SG1001' && // Non-PII preserved
            scrubbedData.amount === 50000; // Non-PII preserved

        if (piiRemoved) {
            console.log('  ✅ PASS: PII fields redacted, non-PII preserved');
            testsPassed++;
        } else {
            console.log('  ❌ FAIL: PII scrubbing incomplete');
            console.log('    Scrubbed:', JSON.stringify(scrubbedData, null, 2));
            testsFailed++;
        }

        // ==========================================
        // TEST 5: Claims Auditor
        // ==========================================
        console.log('\nTEST 5: Claims Auditor Rule-Based Engine');
        
        const claimData = {
            patientName: 'Test Patient',
            procedureCode: 'SG1001',
            totalAmount: 30000,
            items: [
                { description: 'Surgery Charges', quantity: 1, unit_price: 25000 },
                { description: 'Gloves', quantity: 10, unit_price: 50 }, // NME!
                { description: 'Cotton', quantity: 5, unit_price: 20 }  // NME!
            ]
        };

        const auditResult = await ClaimsAuditor.auditClaim(1, claimData, 'PMJAY');
        
        console.log('  - Risk Score:', auditResult.riskScore);
        console.log('  - Flags:', auditResult.flags?.length || 0);
        console.log('  - Recommendation:', auditResult.recommendation);

        if (auditResult.flags?.some(f => f.type === 'NME_VIOLATION')) {
            console.log('  ✅ PASS: NME violations correctly detected');
            testsPassed++;
        } else {
            console.log('  ⚠️ PARTIAL: NME detection may not be working');
            testsFailed++;
        }

        // ==========================================
        // CLEANUP
        // ==========================================
        console.log('\nCLEANUP: Removing test data');
        await TenantConfigService.deactivate(1, 'TEST_PROVIDER');
        await prisma.tenant_integrations.deleteMany({
            where: { provider_code: 'TEST_PROVIDER' }
        });
        console.log('  - Test integration removed');

    } catch (error) {
        console.error('\n❌ TEST ERROR:', error);
        testsFailed++;
    } finally {
        await prisma.$disconnect();
    }

    // ==========================================
    // SUMMARY
    // ==========================================
    console.log('\n========================================');
    console.log('📊 TEST SUMMARY');
    console.log('========================================');
    console.log(`  ✅ Passed: ${testsPassed}`);
    console.log(`  ❌ Failed: ${testsFailed}`);
    console.log(`  📈 Success Rate: ${Math.round((testsPassed / (testsPassed + testsFailed)) * 100)}%`);
    console.log('========================================\n');

    process.exit(testsFailed > 0 ? 1 : 0);
}

runTests();
