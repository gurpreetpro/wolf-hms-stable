const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api'; // Adjust to your running backend port
let token = '';

// Configuration for Stress Level
const CONCURRENT_PATIENTS = 30; 

async function runSimulation() {
    console.log("🚀 STARTING WOLF HMS FULL-SCALE CHAOS SIMULATION...\n");

    try {
        // 1. Authenticate as Admin
        console.log("🔐 Authenticating Admin...");
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            username: 'admin_user',
            password: 'password123'
        });
        token = loginRes.data.token;
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        axios.defaults.headers.common['x-hospital-id'] = '1'; // Simulate multi-tenancy
        console.log("✅ Admin Authenticated successfully.\n");

        // 2. Launch Concurrent Patient Lifecycles
        console.log(`⚡ Launching ${CONCURRENT_PATIENTS} simultaneous patient journeys...`);
        const promises = [];
        for (let i = 0; i < CONCURRENT_PATIENTS; i++) {
            promises.push(simulatePatientJourney(i));
        }

        const results = await Promise.allSettled(promises);
        
        // 3. Analyze Failures
        let passed = 0;
        let failed = 0;
        results.forEach((res, index) => {
            if (res.status === 'fulfilled') passed++;
            else {
                failed++;
                console.error(`❌ Journey ${index} Failed:`, res.reason.message);
            }
        });

        console.log("\n==================================================");
        console.log(`📊 SIMULATION REPORT:`);
        console.log(`   🟩 Successful Journeys: ${passed}/${CONCURRENT_PATIENTS}`);
        console.log(`   🟥 Broken Paths/Crashes: ${failed}/${CONCURRENT_PATIENTS}`);
        console.log("==================================================");

        // 4. Trigger End-of-Day Financial Processing Test
        console.log("\n🔄 Testing Project Titan & ERP Sync Processing...");
        // Simulating the Tally ledger/B2B aggregation triggers
        const syncRes = await axios.post(`${BASE_URL}/finance/invoice`, {
            patient_id: 1,
            items: [{ name: "Surgical Package", price: 45000 }],
            total: 45000,
            status: 'B2B_PENDING'
        });
        console.log("✅ Financial Interceptor execution complete.");

    } catch (error) {
        console.error("💥 Critical Failure running the master simulation loop:", error.message);
    }
}

async function simulatePatientJourney(index) {
    const uniquePhone = `98765${String(index).padStart(5, '0')}`;
    
    // Step A: OPD Registration (Tests Fuzzy Duplicates & Database Write Lock)
    const register = await axios.post(`${BASE_URL}/opd/register`, {
        name: `Simulated Patient ${index}`,
        age: 34,
        gender: 'Male',
        phone: uniquePhone,
        address: 'Ludhiana, Punjab',
        blood_group: 'O+'
    });
    const patientId = register.data.patient?.id || register.data.id;

    // Step B: Record Vitals (Tests Clinical EWS Threshold Checking Engine)
    await axios.post(`${BASE_URL}/clinical/vitals`, {
        patient_id: patientId,
        bp: '140/90',
        pulse: 110,  // Elevated vital parameter to stress-test alert gateways
        temp: 99.2,
        spo2: 94
    });

    // Step C: Trigger Financial Invoice Generation (Tests Relational Data integrity)
    await axios.post(`${BASE_URL}/finance/invoice`, {
        patient_id: patientId,
        items: [
            { name: "OPD Consultation Fee", price: 500 },
            { name: "CBC Lab Investigation", price: 350 }
        ],
        total: 850,
        status: 'PAID'
    });
}

runSimulation();