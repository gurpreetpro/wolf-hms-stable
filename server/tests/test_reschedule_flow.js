const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

async function runTest() {
    try {
        console.log('1. Logging in as admin...');
        const loginRes = await axios.post(`${BASE_URL}/auth/login`, {
            username: 'admin_user',
            password: 'password123'
        });
        const token = loginRes.data.token;
        console.log('✅ Login successful');

        // 2. Create a dummy patient & visit
        console.log('2. Registering dummy patient...');
        const uniquePhone = '999' + Date.now().toString().slice(-7);
        const registerRes = await axios.post(`${BASE_URL}/opd/register`, {
            name: 'Reschedule Test',
            age: 30,
            gender: 'Male',
            phone: uniquePhone,
            complaint: 'Testing Reschedule',
            doctor_id: 2 // Assuming Dr. Demo exists or logic handles it
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const visitId = registerRes.data.visit.id;
        console.log(`✅ Patient registered. Visit ID: ${visitId}`);

        // 3. Attempt Reschedule
        console.log('3. Attempting reschedule...');
        const rescheduleRes = await axios.post(`${BASE_URL}/opd/reschedule`, {
            visit_id: visitId,
            new_doctor_id: 2, // Same doctor for simplicity
            reason: 'Automated Test',
            new_date: new Date().toISOString().split('T')[0] // Today
        }, {
            headers: { Authorization: `Bearer ${token}` }
        });

        console.log('✅ Reschedule Response:', rescheduleRes.data);

    } catch (error) {
        console.error('❌ Test Failed:', error.response ? error.response.data : error.message);
        if (error.response && error.response.data) {
            console.error('Full Error:', JSON.stringify(error.response.data, null, 2));
        }
    }
}

runTest();
