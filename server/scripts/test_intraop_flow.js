const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

async function testIntraOpFlow() {
    console.log('\n💉 Testing Intra-Op Anesthesia Flow...\n');

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
        
        // 1. Start Case (Generic ID for test)
        const surgeryId = 99999 + Math.floor(Math.random() * 1000); // Random fake surgery ID to avoid unique constraint collision on re-runs
        
        process.stdout.write(`1. Starting Case (Surgery ID: ${surgeryId})... `);
        const startRes = await axios.post(`${API_URL}/intraop/start`, {
            surgery_id: surgeryId,
            patient_id: 1, // Dummy patient
            anaesthetist_id: 'TestBot',
            technique: 'General',
            asa_grade: 'I'
        }, authHeaders);
        const recordId = startRes.data.id;
        console.log(`OK (Record #${recordId} Created)`);

        // 2. Log Vitals
        process.stdout.write('2. Logging Vitals... ');
        await axios.post(`${API_URL}/intraop/log`, {
            record_id: recordId,
            type: 'Vitals',
            data: { hr: 75, bp_sys: 120, bp_dia: 80, spo2: 99 },
            logged_by: 'TestBot'
        }, authHeaders);
        console.log('OK');

        // 3. Log Drug
        process.stdout.write('3. Logging Drug (Propofol)... ');
        await axios.post(`${API_URL}/intraop/log`, {
            record_id: recordId,
            type: 'Drug',
            data: { name: 'Propofol', dose: '150mg' },
            logged_by: 'TestBot'
        }, authHeaders);
        console.log('OK');

        // 4. Verify Timeline
        process.stdout.write('4. Verifying Timeline... ');
        const chartRes = await axios.get(`${API_URL}/intraop/chart/${recordId}`, authHeaders);
        const timeline = chartRes.data.timeline;
        
        if (timeline.length >= 2) {
            console.log(`OK (${timeline.length} events found)`);
        } else {
            console.log(`FAILED (Expected >= 2 events, found ${timeline.length})`);
        }

        // 5. End Case
        process.stdout.write('5. Ending Case... ');
        await axios.put(`${API_URL}/intraop/end/${recordId}`, {}, authHeaders);
        console.log('OK');

    } catch (error) {
        console.error(`\n❌ Error: ${error.message}`);
        console.error(error.response?.data);
    } finally {
        process.exit(0);
    }
}

testIntraOpFlow();
