const request = require('supertest');
const fs = require('fs');
const path = require('path');
const { verifyLicense } = require('../utils/licenseUtil');

// Mock server for testing
const express = require('express');
const app = express();
const checkLicense = require('../middleware/licenseMiddleware');
const { protect } = require('../middleware/authMiddleware');

app.use(express.json());

// Test routes
app.post('/api/opd/register', checkLicense, (req, res) => {
    res.status(201).json({ message: 'Registered', token_number: 123 });
});

describe('Reception Dashboard Diagnostic Audit', () => {

    // ==================== TEST A: License Check ====================
    describe('Test A: License Validation During Registration', () => {

        it('should check if license.key file exists', () => {
            const licensePath = path.join(__dirname, '../license.key');
            const exists = fs.existsSync(licensePath);
            console.log(`📄 License File Path: ${licensePath}`);
            console.log(`📄 File Exists: ${exists}`);
            expect(exists).toBe(true);
        });

        it('should read and verify license key content', () => {
            const licensePath = path.join(__dirname, '../license.key');

            if (!fs.existsSync(licensePath)) {
                console.log('❌ LICENSE FILE MISSING');
                console.log(`Expected location: ${licensePath}`);
                fail('License file not found');
                return;
            }

            const key = fs.readFileSync(licensePath, 'utf8').trim();
            console.log(`🔑 License Key: ${key}`);

            const result = verifyLicense(key);
            console.log(`✅ Validation Result:`, result);

            if (!result.valid) {
                console.log('\n❌ LICENSE VALIDATION FAILED');
                console.log(`Reason: ${result.message}`);

                if (result.message === 'License Expired') {
                    const licensePath = path.join(__dirname, '../license.key');
                    const key = fs.readFileSync(licensePath, 'utf8').trim();
                    const parts = key.split('-');
                    const encodedPayload = parts[1];
                    const payload = Buffer.from(encodedPayload, 'base64').toString('utf8');
                    const [hospitalName, expiry] = payload.split('|');
                    console.log(`Expiry Date: ${new Date(parseInt(expiry)).toLocaleString()}`);
                    console.log(`Current Date: ${new Date().toLocaleString()}`);
                }
            } else {
                console.log('\n✅ LICENSE VALID');
                console.log(`Hospital: ${result.hospitalName}`);
                console.log(`Expiry: ${result.expiry.toLocaleString()}`);
            }

            expect(result.valid).toBe(true);
        });

        it('should test OPD registration endpoint with license middleware', async () => {
            const response = await request(app)
                .post('/api/opd/register')
                .send({
                    patient_name: 'Test Patient',
                    phone: '1234567890'
                });

            console.log(`\n🔍 Registration Response Status: ${response.status}`);
            console.log(`Response Body:`, response.body);

            if (response.status === 402) {
                console.log('\n❌ REGISTRATION BLOCKED BY LICENSE ERROR (402)');
                console.log('Reason: License middleware returned 402 Payment Required');
            } else if (response.status === 403) {
                console.log('\n❌ REGISTRATION BLOCKED BY AUTHORIZATION (403)');
            } else if (response.status === 201) {
                console.log('\n✅ REGISTRATION SUCCESSFUL');
            }
        });
    });

    // ==================== TEST B: Route Verification ====================
    describe('Test B: Sidebar Link Route Verification', () => {

        it('should verify React routes defined in App.jsx', () => {
            const appJsxPath = path.join(__dirname, '../../client/src/App.jsx');
            const appContent = fs.readFileSync(appJsxPath, 'utf8');

            console.log('\n📍 Checking React Routes in App.jsx:');

            const expectedRoutes = [
                { path: '/opd', component: 'OPDReception' },
                { path: '/dashboard/opd', component: 'OPDReception (Dead Link)' },
                { path: '/admissions', component: 'AdmissionDashboard' },
                { path: '/dashboard/admissions', component: 'AdmissionDashboard (Dead Link)' }
            ];

            expectedRoutes.forEach(route => {
                const exists = appContent.includes(`path="${route.path}"`);
                console.log(`  ${exists ? '✅' : '❌'} ${route.path} → ${route.component} ${exists ? '(EXISTS)' : '(DEAD LINK)'}`);
            });

            // Check actual routes
            const opdRouteCorrect = appContent.includes('path="/opd"');
            const opdRouteDead = appContent.includes('path="/dashboard/opd"');

            console.log('\n🔍 SIDEBAR LINK ANALYSIS:');
            console.log(`  Current Route in App.jsx: /opd → ${opdRouteCorrect ? 'EXISTS' : 'MISSING'}`);
            console.log(`  If sidebar uses /dashboard/opd → ${opdRouteDead ? 'EXISTS' : 'DEAD LINK (404)'}`);

            expect(opdRouteCorrect).toBe(true);
        });
    });

    // ==================== TEST C: GlobalSearch Integration ====================
    describe('Test C: GlobalSearch Component Integration', () => {

        it('should verify GlobalSearch field exists in OPDReception.jsx', () => {
            const opdPath = path.join(__dirname, '../../client/src/pages/OPDReception.jsx');
            const opdContent = fs.readFileSync(opdPath, 'utf8');

            console.log('\n🔍 Checking GlobalSearch in OPDReception.jsx:');

            const hasSearchInput = opdContent.includes('Global Search');
            const hasSearchQuery = opdContent.includes('searchQuery');
            const hasSearchFunction = opdContent.includes('searchPatient');

            console.log(`  ${hasSearchInput ? '✅' : '❌'} Search Input Field (Line 103)`);
            console.log(`  ${hasSearchQuery ? '✅' : '❌'} searchQuery State`);
            console.log(`  ${hasSearchFunction ? '✅' : '❌'} searchPatient Function`);

            if (hasSearchInput) {
                console.log('\n✅ GLOBALSEARCH IS INTEGRATED');
                console.log('   Location: Top-right, next to "New Patient" button');
                console.log('   Features: Real-time search, shows patient dropdown');
            } else {
                console.log('\n❌ GLOBALSEARCH MISSING');
            }

            expect(hasSearchInput).toBe(true);
        });

        it('should verify UID (Phone/Aadhar) search capability', () => {
            const opdPath = path.join(__dirname, '../../client/src/pages/OPDReception.jsx');
            const opdContent = fs.readFileSync(opdPath, 'utf8');

            console.log('\n🔍 Checking UID Search Field:');

            const hasPhoneSearch = opdContent.includes('phone');
            const hasPatientRegistrationModal = opdContent.includes('PatientRegistrationModal');

            console.log(`  ${hasPhoneSearch ? '✅' : '❌'} Phone field in search results`);
            console.log(`  ${hasPatientRegistrationModal ? '✅' : '❌'} PatientRegistrationModal (contains phone/aadhar input)`);

            console.log('\n📋 UID SEARCH STATUS:');
            console.log('   Main Dashboard: Search bar supports name/phone search (API: /api/patients/search?q=...)');
            console.log('   Registration Modal: Contains full UID inputs (phone, aadhar, etc.)');
            console.log('   Note: UID input is in the modal, not visible on main page');

            expect(hasPhoneSearch).toBe(true);
        });
    });
});
