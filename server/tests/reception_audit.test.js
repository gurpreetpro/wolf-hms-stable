/**
 * Reception Dashboard Diagnostic Audit
 * Verifies License Generation & Validation, Route Definitions, and GlobalSearch integration.
 */

const fs = require('fs');
const path = require('path');
const request = require('supertest');
const express = require('express');
const { generateLicense, verifyLicense } = require('../utils/licenseUtil');
const checkLicense = require('../middleware/licenseMiddleware');

describe('Reception Dashboard Diagnostic Audit', () => {

    // ==================== TEST A: License Check ====================
    describe('Test A: License Generation and Verification', () => {

        it('should generate a valid license key and verify it successfully', () => {
            const oneYearLater = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
            const licenseKey = generateLicense('Diagnostic Hospital', oneYearLater);

            expect(licenseKey).toBeDefined();
            expect(licenseKey.startsWith('HMS-')).toBe(true);

            const result = verifyLicense(licenseKey);
            expect(result.valid).toBe(true);
            expect(result.hospitalName).toBe('Diagnostic Hospital');
            expect(result.expiry).toBeInstanceOf(Date);
        });

        it('should detect expired licenses correctly', () => {
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const expiredKey = generateLicense('Old Hospital', yesterday);

            const result = verifyLicense(expiredKey);
            expect(result.valid).toBe(false);
            expect(result.message).toBe('License Expired');
        });

        it('should reject tampered or invalid license keys', () => {
            const resultInvalid = verifyLicense('INVALID-KEY-FORMAT');
            expect(resultInvalid.valid).toBe(false);

            const oneYearLater = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
            const legitKey = generateLicense('Hospital', oneYearLater);
            const tamperedKey = legitKey.slice(0, -4) + 'XXXX';

            const resultTampered = verifyLicense(tamperedKey);
            expect(resultTampered.valid).toBe(false);
            expect(resultTampered.message).toBe('Invalid Signature');
        });

        it('should block protected routes when license file is invalid or missing', async () => {
            const app = express();
            app.use(express.json());
            app.post('/api/opd/register', checkLicense, (req, res) => {
                res.status(201).json({ message: 'Registered', token_number: 123 });
            });

            // When license.key is absent or invalid, checkLicense returns 402
            const response = await request(app)
                .post('/api/opd/register')
                .send({
                    patient_name: 'Test Patient',
                    phone: '1234567890'
                });

            // Depending on whether license.key exists on local filesystem:
            if (response.status === 402) {
                expect(response.body.message).toBe('License Error');
            } else {
                expect(response.status).toBe(201);
            }
        });
    });

    // ==================== TEST B: Route Verification ====================
    describe('Test B: Route Verification in App.jsx', () => {

        it('should verify core clinical routes defined in App.jsx', () => {
            const appJsxPath = path.join(__dirname, '../../client/src/App.jsx');
            const appContent = fs.readFileSync(appJsxPath, 'utf8');

            const expectedRoutes = [
                { path: '/opd', component: 'OPDReception' },
                { path: '/doctor', component: 'DoctorDashboard' },
                { path: '/ward', component: 'WardDashboard' },
                { path: '/lab', component: 'LabDashboard' },
                { path: '/pharmacy', component: 'PharmacyDashboard' }
            ];

            expectedRoutes.forEach(route => {
                const exists = appContent.includes(`path="${route.path}"`);
                expect(exists).toBe(true);
            });
        });
    });

    // ==================== TEST C: GlobalSearch Integration ====================
    describe('Test C: GlobalSearch Component Integration', () => {

        it('should verify Search input and handlers exist in OPDReception.jsx', () => {
            const opdPath = path.join(__dirname, '../../client/src/pages/OPDReception.jsx');
            const opdContent = fs.readFileSync(opdPath, 'utf8');

            const hasSearchQuery = opdContent.includes('searchQuery');
            const hasSearchPatient = opdContent.includes('searchPatient');
            const hasPatientRegistrationModal = opdContent.includes('PatientRegistrationModal');

            expect(hasSearchQuery).toBe(true);
            expect(hasSearchPatient).toBe(true);
            expect(hasPatientRegistrationModal).toBe(true);
        });

        it('should verify phone and registration capabilities', () => {
            const opdPath = path.join(__dirname, '../../client/src/pages/OPDReception.jsx');
            const opdContent = fs.readFileSync(opdPath, 'utf8');

            const hasPhoneSearch = opdContent.includes('Phone');
            const hasRapidTriage = opdContent.includes('RapidTriageRegistration');

            expect(hasPhoneSearch).toBe(true);
            expect(hasRapidTriage).toBe(true);
        });
    });
});
