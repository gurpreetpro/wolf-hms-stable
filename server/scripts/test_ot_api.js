const axios = require('axios');

async function testOTEndpoints() {
    const baseUrl = 'http://localhost:8080/api';
    
    // First login to get token
    console.log('1. Logging in...');
    try {
        const loginRes = await axios.post(`${baseUrl}/users/login`, {
            email: 'audit@wolfhms.com',
            password: 'password123'
        });
        const token = loginRes.data.token;
        console.log('   ✅ Login successful\n');

        // Test /api/ot/rooms
        console.log('2. Testing GET /api/ot/rooms...');
        try {
            const roomsRes = await axios.get(`${baseUrl}/ot/rooms`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('   ✅ Rooms Response:', JSON.stringify(roomsRes.data, null, 2));
        } catch (err) {
            console.log('   ❌ Rooms Error:', err.response?.status, err.response?.data || err.message);
        }

        // Test /api/ot/schedule
        console.log('\n3. Testing GET /api/ot/schedule...');
        try {
            const scheduleRes = await axios.get(`${baseUrl}/ot/schedule`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            console.log('   ✅ Schedule Response:', JSON.stringify(scheduleRes.data, null, 2));
        } catch (err) {
            console.log('   ❌ Schedule Error:', err.response?.status, err.response?.data || err.message);
        }

    } catch (err) {
        console.log('   ❌ Login failed:', err.response?.status, err.response?.data || err.message);
    }
}

testOTEndpoints();
