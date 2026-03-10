const axios = require('axios');

const BASE_URL = 'http://localhost:5001/api';

async function runTest() {
    try {
        // 1. Login
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            username: 'nurse_user',
            password: 'password123'
        });
        const token = loginRes.data.token;
        const headers = { Authorization: `Bearer ${token}` };
        console.log('Login successful');

        // 2. Get Ward Overview to find admission
        const wardRes = await axios.get(`${BASE_URL}/nurse/ward-overview`, { headers });
        const admission = wardRes.data.admissions[0];
        if (!admission) {
            console.log('No admissions found. Cannot test patient features.');
            return;
        }
        const admissionId = admission.admission_id;
        const patientId = admission.patient_id;
        console.log(`Testing with Admission ID: ${admissionId}`);

        // 3. Get Consumables
        const consRes = await axios.get(`${BASE_URL}/nurse/consumables`, { headers });
        console.log('Consumables:', consRes.data.consumables.length);
        const item = consRes.data.consumables[0];

        // 4. Record Usage
        await axios.post(`${BASE_URL}/nurse/consumables/use`, {
            admission_id: admissionId,
            patient_id: patientId,
            item_id: item.id,
            quantity: 1
        }, { headers });
        console.log('Recorded consumable usage');

        // 5. Get History
        const histRes = await axios.get(`${BASE_URL}/nurse/consumables/history/${admissionId}`, { headers });
        console.log('Consumable History:', histRes.data.history.length);

        // 6. Administer Med
        await axios.post(`${BASE_URL}/nurse/medications/administer`, {
            admission_id: admissionId,
            patient_id: patientId,
            medication_name: 'Test Med',
            dosage: '10mg',
            notes: 'Test note'
        }, { headers });
        console.log('Administered medication');

        // 7. Get Med History
        const medHistRes = await axios.get(`${BASE_URL}/nurse/medications/history/${admissionId}`, { headers });
        console.log('Medication History:', medHistRes.data.history.length);

        console.log('ALL TESTS PASSED');
    } catch (err) {
        console.error('Test Failed:', err.response?.data || err.message);
    }
}

runTest();
