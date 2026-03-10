const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function testPacuFlow() {
    console.log('\n🛌 Testing PACU Recovery Flow...\n');

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
        
        // 1. Get Dashboard (Check Beds)
        process.stdout.write('1. Checking Dashboard... ');
        const dash1 = await axios.get(`${API_URL}/pacu/dashboard`, authHeaders);
        const bed1 = dash1.data.beds.find(b => b.name === 'Bay 1');
        console.log('OK');

        // 2. Admit Mock Patient (Need surgery ID)
        // We'll insert a fake row into pacu_records directly via admit API? 
        // No, controller checks nothing. Perfect for test.
        const fakeSurgeryId = 88888 + Math.floor(Math.random() * 1000);
        
        process.stdout.write(`2. Admitting Patient (Surgery ${fakeSurgeryId})... `);
        const admitRes = await axios.post(`${API_URL}/pacu/admit`, {
            surgery_id: fakeSurgeryId,
            patient_id: 1, // Dummy
            bed_id: bed1.id
        }, authHeaders);
        const recordId = admitRes.data.recordId;
        console.log(`OK (Record #${recordId})`);

        // 3. Score Patient (Aldrete)
        process.stdout.write('3. Scoring Patient (Aldrete 10/10)... ');
        await axios.post(`${API_URL}/pacu/score`, {
            record_id: recordId,
            activity: 2, respiration: 2, circulation: 2, consciousness: 2, o2: 2,
            assessed_by: 'TestBot'
        }, authHeaders);
        console.log('OK');

        // 4. Verify Score on Dashboard
        process.stdout.write('4. Verifying Score Update... ');
        const dash2 = await axios.get(`${API_URL}/pacu/dashboard`, authHeaders);
        const updatedBed = dash2.data.beds.find(b => b.id === bed1.id);
        if (updatedBed.last_aldrete_score === 10) {
            console.log('OK (Score is 10)');
        } else {
            console.log(`FAILED (Score is ${updatedBed.last_aldrete_score})`);
        }

        // 5. Discharge
        process.stdout.write('5. Discharging Patient... ');
        await axios.post(`${API_URL}/pacu/discharge`, {
            record_id: recordId,
            destination: 'Ward A'
        }, authHeaders);
        console.log('OK');

        // 6. Verify Bed Empty
        process.stdout.write('6. Verifying Bed Status... ');
        const dash3 = await axios.get(`${API_URL}/pacu/dashboard`, authHeaders);
        const finalBed = dash3.data.beds.find(b => b.id === bed1.id);
        if (finalBed.status === 'Available') {
            console.log('OK (Bed Available)');
        } else {
            console.log(`FAILED (Status: ${finalBed.status})`);
        }

    } catch (error) {
        console.error(`\n❌ Error: ${error.message}`);
        console.error(error.response?.data);
    } finally {
        process.exit(0);
    }
}

testPacuFlow();
