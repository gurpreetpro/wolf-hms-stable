const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
let token = '';

async function runTests() {
    try {
        // 1. Login
        console.log('1. Logging in...');
        const loginRes = await axios.post(`${API_URL}/auth/login`, {
            username: 'admin_user',
            password: 'password123'
        });
        token = loginRes.data.token;
        console.log('✅ Login successful');

        // 2. Get Doctor Stats
        console.log('\n2. Fetching Doctor Stats...');
        const docRes = await axios.get(`${API_URL}/analytics/doctors`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`✅ Retrieved stats for ${docRes.data.length} doctors`);
        if (docRes.data.length > 0) {
            console.log('   Top doctor:', docRes.data[0].doctor_name, 'Patients:', docRes.data[0].total_patients);
        }

        // 3. Get Patient Stats
        console.log('\n3. Fetching Patient Stats...');
        const patRes = await axios.get(`${API_URL}/analytics/patients`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log(`✅ Retrieved stats for ${patRes.data.length} days`);
        if (patRes.data.length > 0) {
            console.log('   Latest date:', patRes.data[patRes.data.length - 1].date, 'Count:', patRes.data[patRes.data.length - 1].count);
        }

    } catch (error) {
        console.error('❌ Test Failed:', error.response ? error.response.data : error.message);
        process.exit(1);
    }
}

runTests();
