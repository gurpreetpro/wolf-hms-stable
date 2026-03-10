const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function testPACFlow() {
    console.log('\n🩺 Testing PAC Management Flow...\n');

    try {
        // 0. Login
        process.stdout.write('0. Authenticating... ');
        let token;
        try {
            const loginRes = await axios.post(`${API_URL}/auth/login`, {
                username: 'admin',
                password: 'password'
            });
            token = loginRes.data.token;
            console.log('OK (Token received)');
        } catch (err) {
            console.log(`FAILED (Login): ${err.message}`);
             process.exit(1);
        }

        const authHeaders = { headers: { Authorization: `Bearer ${token}` } };
        
        // 1. Get Pending PAC List
        process.stdout.write('1. Fetching Pending PACs... ');
        const pendingRes = await axios.get(`${API_URL}/pac/pending`, authHeaders);
        
        // We need a surgery to test. If none pending, we can't fully test.
        // We'll proceed if generic test bookings exist.
        if (pendingRes.data.length === 0) {
            console.log('WARN: No pending surgeries found. Cannot test Form Submission.');
            console.log('HINT: Run test_ot_flow.js first to create a booking.');
            process.exit(0);
        } else {
            console.log(`OK (${pendingRes.data.length} pending)`);
            const target = pendingRes.data[0];

            // 2. Submit Assessment
            process.stdout.write(`2. Assessing Surgery ID ${target.surgery_id}... `);
            const assessmentData = {
                patient_id: target.patient_id,
                surgery_id: target.surgery_id,
                anaesthetist_id: 'TestBot', 
                mallampati_score: 'II', 
                asa_grade: 'I', 
                airway_assessment: { mouth_opening: '3 Finger', neck_movement: 'Full' }, 
                comorbidities: ['None'], 
                medications: [], 
                fitness_status: 'Fit', 
                remarks: 'Cleared by AutoTest' 
            };
            
            await axios.post(`${API_URL}/pac/save`, assessmentData, authHeaders);
            console.log('OK');

            // 3. Verify Update
            process.stdout.write('3. Verifying Status Update... ');
            const updatedList = await axios.get(`${API_URL}/pac/pending`, authHeaders);
            const updatedItem = updatedList.data.find(s => s.surgery_id === target.surgery_id);
            
            if (updatedItem && updatedItem.current_status === 'Fit') {
                console.log('OK (Status is now Fit)');
            } else {
                console.log(`FAILED (Status is ${updatedItem?.current_status})`);
            }
        }

    } catch (error) {
        console.error(`\n❌ Error: ${error.message}`);
        console.error(error.response?.data);
    } finally {
        process.exit(0);
    }
}

testPACFlow();
