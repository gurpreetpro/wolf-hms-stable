/**
 * Wolf HMS — E2E Test Suite
 * Phase 5: S-Tier Backend Hardening
 * 
 * Tests critical patient flows end-to-end:
 * - Login / Authentication
 * - OPD Patient Registration → Visit → Prescription
 * - IPD Admission → Treatment → Billing → Discharge
 * - FHIR R4 API Compliance
 * - Drug Interaction Checking
 */

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5000';

// ─── Helper ───────────────────────────────────────────────
async function apiCall(method, path, body = null, token = null) {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const opts = { method, headers };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${BASE_URL}${path}`, opts);
    const data = await res.json();
    return { status: res.status, data };
}

let authToken = null;
let testPatientId = null;
let testAdmissionId = null;
const results = [];

function test(name, fn) {
    return async () => {
        try {
            await fn();
            results.push({ name, status: '✅ PASS' });
            console.log(`  ✅ ${name}`);
        } catch (err) {
            results.push({ name, status: '❌ FAIL', error: err.message });
            console.log(`  ❌ ${name}: ${err.message}`);
        }
    };
}

function assert(condition, message) {
    if (!condition) throw new Error(message || 'Assertion failed');
}

// ─── Test Suite ───────────────────────────────────────────

const tests = [
    // 1. Authentication
    test('Login with admin credentials', async () => {
        const { status, data } = await apiCall('POST', '/api/auth/login', {
            username: 'admin', password: 'admin123'
        });
        assert(status === 200, `Expected 200, got ${status}`);
        assert(data.token, 'Missing auth token');
        authToken = data.token;
    }),

    // 2. Patient Registration
    test('Register new OPD patient', async () => {
        const { status, data } = await apiCall('POST', '/api/patients', {
            name: `E2E Test Patient ${Date.now()}`,
            phone: `9${Math.floor(100000000 + Math.random() * 900000000)}`,
            age: 35, gender: 'Male',
            address: 'E2E Test Address'
        }, authToken);
        assert(status === 200 || status === 201, `Patient creation failed: ${status}`);
        testPatientId = data.data?.id || data.patient?.id || data.id;
        assert(testPatientId, 'Missing patient ID');
    }),

    // 3. Patient Retrieval
    test('Get patient by ID', async () => {
        const { status, data } = await apiCall('GET', `/api/patients/${testPatientId}`, null, authToken);
        assert(status === 200, `Expected 200, got ${status}`);
    }),

    // 4. IPD Admission
    test('Create IPD admission', async () => {
        const { status, data } = await apiCall('POST', '/api/ipd/admit', {
            patient_id: testPatientId,
            admission_type: 'Elective',
            diagnosis: 'E2E Test Diagnosis'
        }, authToken);
        assert(status === 200 || status === 201, `Admission failed: ${status}`);
        testAdmissionId = data.data?.id || data.admission?.id || data.id;
    }),

    // 5. FHIR R4 — Metadata
    test('FHIR CapabilityStatement returns 7 resources', async () => {
        const { status, data } = await apiCall('GET', '/fhir/metadata');
        assert(status === 200, `Expected 200, got ${status}`);
        assert(data.resourceType === 'CapabilityStatement', 'Wrong resource type');
        assert(data.fhirVersion === '4.0.1', 'Wrong FHIR version');
        const resources = data.rest?.[0]?.resource || [];
        assert(resources.length >= 7, `Expected 7+ resources, got ${resources.length}`);
    }),

    // 6. FHIR R4 — Patient Search
    test('FHIR Patient search returns Bundle', async () => {
        const { status, data } = await apiCall('GET', '/fhir/Patient?_count=5', null, authToken);
        assert(status === 200, `Expected 200, got ${status}`);
        assert(data.resourceType === 'Bundle', 'Expected FHIR Bundle');
    }),

    // 7. FHIR R4 — Encounter Search
    test('FHIR Encounter search returns Bundle', async () => {
        const { status, data } = await apiCall('GET', '/fhir/Encounter?_count=5', null, authToken);
        assert(status === 200, `Expected 200, got ${status}`);
        assert(data.resourceType === 'Bundle', 'Expected FHIR Bundle');
    }),

    // 8. Drug Interaction Check
    test('Drug interaction API detects Warfarin + Aspirin', async () => {
        const { status, data } = await apiCall('POST', '/api/analytics/drug-interactions/check', {
            medications: ['Warfarin', 'Aspirin']
        }, authToken);
        assert(status === 200, `Expected 200, got ${status}`);
        const interactions = data.data?.interactions || [];
        assert(interactions.length > 0, 'Expected at least 1 interaction');
        assert(interactions[0].severity === 'severe', 'Expected severe severity');
    }),

    // 9. Drug Interaction — Safe Combo
    test('Drug interaction API returns empty for safe combo', async () => {
        const { status, data } = await apiCall('POST', '/api/analytics/drug-interactions/check', {
            medications: ['Paracetamol', 'Cetirizine']
        }, authToken);
        assert(status === 200, `Expected 200, got ${status}`);
        const interactions = data.data?.interactions || [];
        assert(interactions.length === 0, 'Expected 0 interactions for safe combo');
    }),

    // 10. Readmission Risk API
    test('Readmission risk API returns data', async () => {
        const { status, data } = await apiCall('GET', '/api/analytics/readmission-risk', null, authToken);
        assert(status === 200, `Expected 200, got ${status}`);
    }),

    // 11. Bed Demand Forecast
    test('Bed demand forecast API returns data', async () => {
        const { status, data } = await apiCall('GET', '/api/analytics/bed-forecast', null, authToken);
        assert(status === 200, `Expected 200, got ${status}`);
    }),

    // 12. NABH Readiness
    test('NABH readiness API returns data', async () => {
        const { status, data } = await apiCall('GET', '/api/analytics/nabh-readiness', null, authToken);
        assert(status === 200, `Expected 200, got ${status}`);
    }),
];

// ─── Runner ───────────────────────────────────────────────
async function runTests() {
    console.log('\n🐺 Wolf HMS — E2E Test Suite (Phase 5)\n');
    console.log(`Target: ${BASE_URL}`);
    console.log('─'.repeat(50));

    for (const t of tests) {
        await t();
    }

    console.log('\n' + '─'.repeat(50));
    const passed = results.filter(r => r.status === '✅ PASS').length;
    const failed = results.filter(r => r.status === '❌ FAIL').length;
    console.log(`\n📊 Results: ${passed} passed, ${failed} failed, ${results.length} total`);
    
    if (failed > 0) {
        console.log('\n❌ Failed tests:');
        results.filter(r => r.status === '❌ FAIL').forEach(r => {
            console.log(`   - ${r.name}: ${r.error}`);
        });
    }

    console.log('\n🐺 Test suite complete.\n');
    process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(err => {
    console.error('Test runner failed:', err);
    process.exit(1);
});
