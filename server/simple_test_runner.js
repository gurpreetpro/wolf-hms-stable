// Simple Test Runner for Virtual Hospital System
// Run this with: node simple_test_runner.js

const axios = require('axios');
const BASE_URL = 'http://localhost:5000/api';

let testResults = [];
let testRun = 1;

async function runTest(name, testFn) {
    try {
        await testFn();
        console.log(`✅ ${name}`);
        testResults.push({ test: name, status: 'PASS', error: null });
        return true;
    } catch (error) {
        console.log(`❌ ${name} - ${error.message}`);
        testResults.push({ test: name, status: 'FAIL', error: error.message });
        return false;
    }
}

async function runHospitalSimulation() {
    console.log(`\n🏥 ========== Hospital Simulation - Run ${testRun} ==========\n`);

    let tokens = {};
    let patientId, admissionId;

    // Test 1: Login Admin
    await runTest('Login Admin', async () => {
        const res = await axios.post(`${BASE_URL}/auth/login`, {
            username: 'admin_user',
            password: 'password123'
        });
        tokens.admin = res.data.token;
        if (!tokens.admin) throw new Error('No token received');
    });

    // Test 2: Login Doctor
    await runTest('Login Doctor', async () => {
        const res = await axios.post(`${BASE_URL}/auth/login`, {
            username: 'doctor_user',
            password: 'password123'
        });
        tokens.doctor = res.data.token;
        if (!tokens.doctor) throw new Error('No token received');
    });

    // Test 3: Login Nurse
    await runTest('Login Nurse', async () => {
        const res = await axios.post(`${BASE_URL}/auth/login`, {
            username: 'nurse_user',
            password: 'password123'
        });
        tokens.nurse = res.data.token;
        if (!tokens.nurse) throw new Error('No token received');
    });

    // Test 4: Login Receptionist
    await runTest('Login Receptionist', async () => {
        const res = await axios.post(`${BASE_URL}/auth/login`, {
            username: 'receptionist_user',
            password: 'password123'
        });
        tokens.receptionist = res.data.token;
        if (!tokens.receptionist) throw new Error('No token received');
    });

    // Test 5: Register OPD Patient
    await runTest('Register OPD Patient', async () => {
        const res = await axios.post(`${BASE_URL}/opd/register`, {
            name: `Test Patient ${testRun}`,
            age: 25 + testRun,
            gender: 'Male',
            phone: `123456${testRun}000`,
            complaint: 'Fever and headache'
        }, {
            headers: { 'Authorization': `Bearer ${tokens.receptionist}` }
        });
        patientId = res.data.patient_id;
        console.log(`   Patient ID: ${patientId}`);
        if (!patientId) throw new Error('No patient ID returned');
    });

    // Test 6: Admit Patient
    await runTest('Admit Patient to Ward', async () => {
        const res = await axios.post(`${BASE_URL}/admissions/admit`, {
            patient_id: patientId,
            ward: 'General',
            bed_number: `B-0${testRun}`
        }, {
            headers: { 'Authorization': `Bearer ${tokens.receptionist}` }
        });
        admissionId = res.data.admission_id;
        console.log(`   Admission ID: ${admissionId}`);
        if (!admissionId) throw new Error('No admission ID returned');
    });

    // Test 7: Log Vitals
    await runTest('Log Patient Vitals', async () => {
        await axios.post(`${BASE_URL}/clinical/vitals`, {
            admission_id: admissionId,
            bp: '120/80',
            temp: '98.6',
            spo2: '98',
            heart_rate: '75'
        }, {
            headers: { 'Authorization': `Bearer ${tokens.nurse}` }
        });
    });

    // Test 8: Doctor Prescribes
    await runTest('Doctor Prescribes Medication', async () => {
        await axios.post(`${BASE_URL}/clinical/prescribe`, {
            patient_id: patientId,
            admission_id: admissionId,
            medications: [
                { name: 'Paracetamol', dose: '500mg', freq: 'TID' }
            ]
        }, {
            headers: { 'Authorization': `Bearer ${tokens.doctor}` }
        });
    });

    // Test 9: Order Lab Test
    await runTest('Order CBC Lab Test', async () => {
        await axios.post(`${BASE_URL}/lab/order`, {
            admission_id: admissionId,
            patient_id: patientId,
            test_type: 'CBC'
        }, {
            headers: { 'Authorization': `Bearer ${tokens.doctor}` }
        });
    });

    // Test 10: Generate Invoice
    await runTest('Generate Patient Invoice', async () => {
        const res = await axios.post(`${BASE_URL}/finance/generate`, {
            admission_id: admissionId,
            patient_id: patientId
        }, {
            headers: { 'Authorization': `Bearer ${tokens.admin}` }
        });
        console.log(`   Invoice Total: $${res.data.invoice?.total_amount || 'N/A'}`);
    });

    // Test 11: Discharge Patient
    await runTest('Discharge Patient', async () => {
        await axios.post(`${BASE_URL}/admissions/discharge`, {
            admission_id: admissionId
        }, {
            headers: { 'Authorization': `Bearer ${tokens.receptionist}` }
        });
    });

    const passed = testResults.filter(r => r.status === 'PASS').length;
    const failed = testResults.filter(r => r.status === 'FAIL').length;

    console.log(`\n📊 Results for Run ${testRun}: ${passed} passed, ${failed} failed\n`);
    testRun++;
}

async function main() {
    console.log('🚀 Starting Virtual Hospital Simulation Tests\n');
    console.log('⚠️  Make sure the server is running on http://localhost:5000\n');

    for (let i = 1; i <= 5; i++) {
        await runHospitalSimulation();
        await new Promise(resolve => setTimeout(resolve, 1000)); // 1 second delay between runs
    }

    // Generate Summary Report
    console.log('\n' + '='.repeat(70));
    console.log('📈 FINAL TEST SUMMARY');
    console.log('='.repeat(70));

    const totalTests = testResults.length;
    const totalPassed = testResults.filter(r => r.status === 'PASS').length;
    const totalFailed = testResults.filter(r => r.status === 'FAIL').length;
    const successRate = ((totalPassed / totalTests) * 100).toFixed(2);

    console.log(`\nTotal Tests Run: ${totalTests}`);
    console.log(`Passed: ${totalPassed} (${successRate}%)`);
    console.log(`Failed: ${totalFailed}`);

    // Group failures
    const failures = testResults.filter(r => r.status === 'FAIL');
    if (failures.length > 0) {
        console.log(`\n❌ Failed Tests:`);
        const failureMap = {};
        failures.forEach(f => {
            if (!failureMap[f.test]) failureMap[f.test] = 0;
            failureMap[f.test]++;
        });

        Object.entries(failureMap).forEach(([test, count]) => {
            console.log(`  - ${test}: Failed ${count} time(s)`);
        });
    }

    console.log('\n' + '='.repeat(70));

    // Save to file
    const fs = require('fs');
    const report = {
        timestamp: new Date().toISOString(),
        totalRuns: 5,
        totalTests,
        totalPassed,
        totalFailed,
        successRate: `${successRate}%`,
        results: testResults
    };

    fs.writeFileSync('test_report.json', JSON.stringify(report, null, 2));
    console.log('\n💾 Full report saved to: test_report.json');
}

main().catch(err => {
    console.error('❌ Fatal Error:', err.message);
    process.exit(1);
});
