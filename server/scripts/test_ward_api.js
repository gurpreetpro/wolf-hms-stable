const axios = require('axios');

async function testWardEndpoints() {
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

        const endpoints = [
            'ward/wards',
            'ward/beds',
            'ward/consumables',
            'ward/charges'
        ];

        for (const ep of endpoints) {
            console.log(`Testing GET /api/${ep}...`);
            try {
                const res = await axios.get(`${baseUrl}/${ep}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = res.data.data || res.data || [];
                console.log(`   ✅ Success: ${Array.isArray(data) ? data.length + ' items' : JSON.stringify(data).slice(0,100)}\n`);
            } catch (err) {
                console.log(`   ❌ Error:`, err.response?.status, err.response?.data || err.message, '\n');
            }
        }

    } catch (err) {
        console.log('   ❌ Login failed:', err.response?.status, err.response?.data || err.message);
    }
}

testWardEndpoints();
