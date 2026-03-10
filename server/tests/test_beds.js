const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
let token = '';
let wardId = '';

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

        // 2. Create Ward
        console.log('\n2. Creating Ward...');
        const wardRes = await axios.post(`${API_URL}/beds/wards`, {
            name: 'Test Ward',
            type: 'General',
            capacity: 10,
            description: 'Test Description'
        }, { headers: { Authorization: `Bearer ${token}` } });
        wardId = wardRes.data.id;
        console.log('✅ Ward Created (ID: ' + wardId + ')');

        // 3. Add Bed
        console.log('\n3. Adding Bed...');
        await axios.post(`${API_URL}/beds/wards/${wardId}/beds`, {
            bed_number: 'TEST-1'
        }, { headers: { Authorization: `Bearer ${token}` } });
        console.log('✅ Bed Added');

        // 4. Get Wards
        console.log('\n4. Fetching Wards...');
        const wardsRes = await axios.get(`${API_URL}/beds/wards`, {
            headers: { Authorization: `Bearer ${token}` }
        });
        const foundWard = wardsRes.data.find(w => w.id === wardId);
        if (foundWard && parseInt(foundWard.total_beds) === 1) {
            console.log('✅ Ward Found with correct bed count');
        } else {
            throw new Error('Ward verification failed');
        }

    } catch (error) {
        console.error('❌ Test Failed:', error.response ? error.response.data : error.message);
        process.exit(1);
    }
}

runTests();
